import SecureLS from "secure-ls";
import Logger from "./logger";
import Config from "./Config";

// กำหนดค่าเพื่อความปลอดภัยสูงสุด
const ls = new SecureLS({
  encodingType: "aes",
  isCompression: true, // บีบอัดข้อมูลเพื่อประสิทธิภาพ
  encryptionSecret: Config.LICENSE_KEY || "default-secret-2025",
  encryptionNamespace: Config.ENCRYPYION,
});

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
      return true;
    } catch (error) {
      Logger.error(`Error setting secure storage key ${key}:`, error);
      return false;
    }
  },

  get: (key) => {
    try {
      if (!key || typeof key !== "string") {
        return null;
      }

      const storedData = ls.get(key);

      // ถ้าข้อมูลเป็น format เก่า (ไม่มี timestamp) ให้คืนค่าตรงๆ
      if (
        !storedData ||
        typeof storedData !== "object" ||
        !storedData.hasOwnProperty("data")
      ) {
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

      return data;
    } catch (error) {
      Logger.warn(`Error getting key ${key} from SecureLS:`, error);

      // Check if this is a Malformed UTF-8 error
      if (error.message && error.message.includes("Malformed UTF-8")) {
        Logger.error(
          `🚨 Detected corrupted data for key ${key}, removing it...`
        );
        try {
          // Remove corrupted data
          this.remove(key);
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
      return true;
    } catch (error) {
      Logger.error(`Error removing key ${key} from SecureLS:`, error);
      return false;
    }
  },

  clear: () => {
    try {
      ls.clear();
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
      ls.remove("isAuthenticated");
      ls.remove("menu");
      ls.remove("refresh_token");
      ls.remove("role");
      ls.remove("token");
      ls.remove("userInfo");
      ls.remove("multi");
      ls.remove("select");
      ls.remove("signle");
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default secureStorage;
