import SecureStorage from "./SecureStorage";
import Logger from "./logger";

/**
 * Storage Recovery Utility
 * ยูทิลิตี้สำหรับจัดการกับปัญหา storage ที่เสียหาย
 */
class StorageRecovery {
  /**
   * ตรวจสอบและล้างข้อมูลที่เสียหายใน SecureStorage
   */
  static async diagnoseAndCleanStorage() {
    Logger.log("🔍 Starting storage diagnosis...");

    const issues = [];
    const keys = ["token", "refresh_token", "user_data", "settings"];

    for (const key of keys) {
      try {
        const value = SecureStorage.get(key);
        if (value !== null && typeof value === "string") {
          // Test if value contains valid characters
          const hasInvalidChars = /[^\x20-\x7E]/.test(value);
          if (hasInvalidChars) {
            issues.push({ key, issue: "Invalid characters detected" });
          }

          // For tokens, validate JWT format
          if (key.includes("token")) {
            const isValidJWT =
              /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(value);
            if (!isValidJWT) {
              issues.push({ key, issue: "Invalid JWT format" });
            }
          }
        }
      } catch (error) {
        issues.push({ key, issue: error.message });
      }
    }

    if (issues.length > 0) {
      Logger.warn("🚨 Storage issues detected:", issues);
      await this.cleanCorruptedData(issues.map((i) => i.key));
      return { hasIssues: true, issues };
    }

    Logger.log("✅ Storage diagnosis complete - no issues found");
    return { hasIssues: false, issues: [] };
  }

  /**
   * ล้างข้อมูลที่เสียหาย
   */
  static async cleanCorruptedData(keys = []) {
    Logger.log("🧹 Cleaning corrupted storage data...");

    const cleanedKeys = [];

    // Clean specific keys if provided
    if (keys.length > 0) {
      for (const key of keys) {
        try {
          SecureStorage.remove(key);
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          cleanedKeys.push(key);
        } catch (error) {
          Logger.error(`Failed to clean key ${key}:`, error);
        }
      }
    } else {
      // Clean all known token keys
      const tokenKeys = ["token", "refresh_token", "access_token"];
      for (const key of tokenKeys) {
        try {
          SecureStorage.remove(key);
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          cleanedKeys.push(key);
        } catch (error) {
          Logger.error(`Failed to clean token key ${key}:`, error);
        }
      }
    }

    Logger.log("✅ Storage cleanup completed. Cleaned keys:", cleanedKeys);
    return cleanedKeys;
  }

  /**
   * รีเซ็ต storage ทั้งหมด
   */
  static async resetAllStorage() {
    Logger.log("🔄 Resetting all storage...");

    try {
      // Clear SecureStorage
      SecureStorage.clear();

      // Clear other storage
      localStorage.clear();
      sessionStorage.clear();

      Logger.log("✅ All storage cleared successfully");
      return true;
    } catch (error) {
      Logger.error("❌ Failed to reset storage:", error);
      return false;
    }
  }

  /**
   * ตรวจสอบสุขภาพของ token
   */
  static validateToken(token) {
    if (!token || typeof token !== "string") {
      return { valid: false, reason: "Token is null or not a string" };
    }

    // Check for invalid HTTP header characters
    const hasInvalidChars = /[^\x20-\x7E]/.test(token);
    if (hasInvalidChars) {
      return {
        valid: false,
        reason: "Token contains invalid characters for HTTP headers",
      };
    }

    // Check JWT format
    const isValidJWT =
      /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(token);
    if (!isValidJWT) {
      return { valid: false, reason: "Token is not in valid JWT format" };
    }

    // Try to decode JWT header (basic validation)
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return { valid: false, reason: "JWT must have 3 parts" };
      }

      // Decode header
      const header = JSON.parse(
        atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"))
      );
      if (!header.alg) {
        return { valid: false, reason: "JWT header missing algorithm" };
      }

      return { valid: true, header };
    } catch (error) {
      return { valid: false, reason: `Failed to decode JWT: ${error.message}` };
    }
  }

  /**
   * ตรวจสอบและแก้ไขปัญหา token อัตโนมัติ
   */
  static async autoFixTokenIssues() {
    Logger.log("🔧 Auto-fixing token issues...");

    const issues = [];
    const fixes = [];

    // Check token
    try {
      const token = SecureStorage.get("token");
      if (token) {
        const validation = this.validateToken(token);
        if (!validation.valid) {
          issues.push({ type: "token", issue: validation.reason });
          SecureStorage.remove("token");
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          fixes.push("Removed invalid token");
        }
      }
    } catch (error) {
      issues.push({ type: "token", issue: error.message });
      await this.cleanCorruptedData(["token"]);
      fixes.push("Cleaned corrupted token");
    }

    // Check refresh token
    try {
      const refreshToken = SecureStorage.get("refresh_token");
      if (refreshToken) {
        const validation = this.validateToken(refreshToken);
        if (!validation.valid) {
          issues.push({ type: "refresh_token", issue: validation.reason });
          SecureStorage.remove("refresh_token");
          localStorage.removeItem("refresh_token");
          sessionStorage.removeItem("refresh_token");
          fixes.push("Removed invalid refresh token");
        }
      }
    } catch (error) {
      issues.push({ type: "refresh_token", issue: error.message });
      await this.cleanCorruptedData(["refresh_token"]);
      fixes.push("Cleaned corrupted refresh token");
    }

    Logger.log("🔧 Auto-fix completed:", { issues, fixes });
    return { issues, fixes };
  }
}

export default StorageRecovery;
