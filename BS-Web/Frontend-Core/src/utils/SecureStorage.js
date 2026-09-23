import SecureLS from "secure-ls";
import Logger from "./logger";
import Config from "./Config";

// กำหนดค่าเพื่อความปลอดภัยสูงสุด
const createLS = () =>
  new SecureLS({
    encodingType: "aes",
    isCompression: true,
    encryptionSecret: Config.LICENSE_KEY || "default-secret-2025",
    encryptionNamespace: Config.ENCRYPYION,
  });

let ls = createLS();

// รีเซ็ต SecureLS เมื่อ metadata เสียหาย (ลบเฉพาะ SecureLS keys)
const resetLS = () => {
  try {
    ls.clear();
  } catch (_) {
    // ถ้า clear() ล้มเหลว ให้ลบ keys ที่เกี่ยวข้องออกจาก localStorage โดยตรง
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.includes(Config.ENCRYPYION) || k === "_secure__ls__metadata")
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (__) { }
  }
  try {
    ls = createLS();
  } catch (e) {
    Logger.error("Failed to reinitialize SecureLS:", e);
  }
};

const memoryCache = {};
const STORAGE_CHANGE_EVENT = "secureStorageChange";
const STORAGE_SIGNAL_KEY = "__bs_secure_storage_signal__";

const notifyStorageChange = (key, value = null) => {
  try {
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, {
        detail: { key, value },
      }),
    );
  } catch (_) { }

  try {
    localStorage.setItem(
      STORAGE_SIGNAL_KEY,
      JSON.stringify({ key, timestamp: Date.now() }),
    );
  } catch (_) { }
};

const secureStorage = {
  set: (key, value) => {
    try {
      // ตรวจสอบความถูกต้องของ key และ value
      if (!key || typeof key !== "string") {
        throw new Error("Invalid key provided");
      }

      // เพิ่ม timestamp เพื่อติดตามเวลาที่เก็บข้อมูล
      const dataWithTimestamp = {
        data: value,
        timestamp: Date.now(),
        version: "1.0",
      };

      ls.set(key, dataWithTimestamp);
      memoryCache[key] = value; // Cache in memory
      notifyStorageChange(key, value);
      return true;
    } catch (error) {
      Logger.error(`Error setting secure storage key ${key}:`, error);
      // ถ้า SecureLS มี metadata เสียหาย ให้รีเซ็ตแล้วลองใหม่
      try {
        Logger.warn(
          `SecureLS set failed for key ${key}, resetting and retrying...`,
        );
        resetLS();
        const dataWithTimestamp = {
          data: value,
          timestamp: Date.now(),
          version: "1.0",
        };
        ls.set(key, dataWithTimestamp);
        memoryCache[key] = value; // Cache in memory on retry
        notifyStorageChange(key, value);
        return true;
      } catch (retryError) {
        Logger.error(`Retry set failed for key ${key}:`, retryError);
      }
      return false;
    }
  },

  get: (key) => {
    try {
      if (!key || typeof key !== "string") {
        return null;
      }

      // Check memory cache first
      const skipCacheKeys = [
        "token",
        "refresh_token",
        "refresh_lock",
        "refresh_result"
      ];

      if (
        !skipCacheKeys.includes(key) &&
        memoryCache.hasOwnProperty(key)
      ) {
        return memoryCache[key];
      }

      const storedData = ls.get(key);

      // ถ้าข้อมูลเป็น format เก่า (ไม่มี timestamp) ให้คืนค่าตรงๆ
      if (
        !storedData ||
        typeof storedData !== "object" ||
        !storedData.hasOwnProperty("data")
      ) {
        memoryCache[key] = storedData; // Cache in memory
        return storedData;
      }

      // ตรวจสอบ version และ timestamp
      const { data, timestamp } = storedData;

      // ตรวจสอบว่าข้อมูลไม่เก่าเกินไป (30 วัน)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (timestamp && Date.now() - timestamp > thirtyDaysInMs) {
        Logger.warn(`Stored data for key ${key} is older than 30 days`);
        // อาจจะลบข้อมูลเก่าออก
        // this.remove(key);
        // return null;
      }

      memoryCache[key] = data; // Cache in memory
      return data;
    } catch (error) {
      Logger.warn(`Error getting key ${key} from SecureLS:`, error);

      // Check if this is a Malformed UTF-8 error
      if (error.message && error.message.includes("Malformed UTF-8")) {
        Logger.error(
          `🚨 Detected corrupted data for key ${key}, removing it...`,
        );
        try {
          // Remove corrupted data
          secureStorage.remove(key);
        } catch (removeError) {
          Logger.error(`Failed to remove corrupted key ${key}:`, removeError);
        }
      }

      return null;
    }
  },

  remove: (key) => {
    try {
      if (!key || typeof key !== "string") {
        return false;
      }

      ls.remove(key);
      delete memoryCache[key]; // Remove from cache
      notifyStorageChange(key);
      return true;
    } catch (error) {
      Logger.error(`Error removing key ${key} from SecureLS:`, error);
      return false;
    }
  },

  clear: () => {
    try {
      ls.clear();
      // Clear memory cache
      Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
      return true;
    } catch (error) {
      Logger.error("Error clearing SecureLS:", error);
      return false;
    }
  },

  // ฟังก์ชันเพิ่มเติมสำหรับความปลอดภัย
  getAllKeys: () => {
    try {
      return ls.getAllKeys() || [];
    } catch (error) {
      Logger.error("Error getting all keys:", error);
      return [];
    }
  },

  // ตรวจสอบว่ามี key นี้อยู่หรือไม่
  hasKey: (key) => {
    try {
      return ls.get(key) !== null;
    } catch (error) {
      return false;
    }
  },

  // ตรวจสอบขนาดของข้อมูลที่เก็บ
  getStorageSize: () => {
    try {
      let totalSize = 0;
      const keys = ls.getAllKeys();

      keys.forEach((key) => {
        const value = ls.get(key);
        totalSize += JSON.stringify(value).length;
      });

      return totalSize;
    } catch (error) {
      Logger.error("Error calculating storage size:", error);
      return 0;
    }
  },
  clearLogout: () => {
    try {
      const keysToClear = [
        "isAuthenticated",
        "menu",
        "refresh_token",
        "role",
        "token",
        "userInfo",
        "multi",
        "select",
        "signle",
        "client_device_id",
        "client_ip_info"
      ];
      keysToClear.forEach((key) => {
        ls.remove(key);
        delete memoryCache[key];
      });
      return true;
    } catch (error) {
      return false;
    }
  },
};
window.addEventListener("storage", (event) => {
  if (!event.key) return;

  if (event.key === STORAGE_SIGNAL_KEY) {
    try {
      const payload = JSON.parse(event.newValue || "{}");
      if (payload?.key) {
        delete memoryCache[payload.key];
        window.dispatchEvent(
          new CustomEvent(STORAGE_CHANGE_EVENT, {
            detail: { key: payload.key },
          }),
        );
      }
    } catch (_) { }
    return;
  }

  delete memoryCache[event.key];
});
export default secureStorage;
