// import SecureLS from 'secure-ls';

// const ls = new SecureLS({ encodingType: 'aes' });

// const SecureStorage = {
//   set: (key, value) => {
//     ls.set(key, value);
//   },

//   get: (key) => {
//     try {
//       return ls.get(key);
//     } catch (e) {
//       console.warn(`Error getting key ${key} from SecureLS`, e);
//       return null;
//     }
//   },

//   remove: (key) => {
//     ls.remove(key);
//   },

//   clear: () => {
//     ls.clear();
//   }
// };

// export default SecureStorage;

import SecureLS from "secure-ls";
import Logger from "./logger";

// กำหนดค่าเพื่อความปลอดภัยสูงสุด
const ls = new SecureLS({
  encodingType: "aes",
  isCompression: true, // บีบอัดข้อมูลเพื่อประสิทธิภาพ
  encryptionSecret:
    process.env.REACT_APP_STORAGE_SECRET || "default-secret-2025",
  encryptionNamespace: "TimeSheet-App",
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
};

export default secureStorage;
