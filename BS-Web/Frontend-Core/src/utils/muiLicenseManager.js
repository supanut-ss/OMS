import { LicenseInfo } from "@mui/x-license";
import secureStorage from "./SecureStorage";
import Logger from "./logger";

/**
 * MUI X License Manager
 * จัดการ license key สำหรับ MUI X components อย่างปลอดภัย
 */
class MUILicenseManager {
  constructor() {
    this.storageKey = "mui_license_key";
    this.licenseKey = null;
    this.isInitialized = false;
  }

  /**
   * ตั้งค่า license key
   * @param {string} key - MUI X license key
   */
  setLicenseKey(key) {
    try {
      if (!key || typeof key !== "string") {
        Logger.warn("Invalid MUI X license key provided");
        return false;
      }

      // Store encrypted license key
      secureStorage.set(this.storageKey, key);
      this.licenseKey = key;

      // Apply license to MUI X
      LicenseInfo.setLicenseKey(key);

      Logger.log("✅ MUI X license key applied successfully");
      this.isInitialized = true;
      return true;
    } catch (error) {
      Logger.error("❌ Failed to set MUI X license key:", error);
      return false;
    }
  }

  /**
   * โหลด license key จาก secure storage
   */
  loadLicenseKey() {
    try {
      const storedKey = secureStorage.get(this.storageKey);

      if (storedKey) {
        this.licenseKey = storedKey;
        LicenseInfo.setLicenseKey(storedKey);
        this.isInitialized = true;
        Logger.log("✅ MUI X license key loaded from storage");
        return true;
      } else {
        // Try to load from environment variables
        const envKey = process.env.REACT_APP_MUI_X_LICENSE_KEY;
        if (envKey) {
          return this.setLicenseKey(envKey);
        }

        Logger.warn("⚠️ No MUI X license key found");
        return false;
      }
    } catch (error) {
      Logger.error("❌ Failed to load MUI X license key:", error);
      return false;
    }
  }

  /**
   * ลบ license key
   */
  clearLicenseKey() {
    try {
      secureStorage.remove(this.storageKey);
      this.licenseKey = null;
      this.isInitialized = false;
      Logger.log("🗑️ MUI X license key cleared");
      return true;
    } catch (error) {
      Logger.error("❌ Failed to clear MUI X license key:", error);
      return false;
    }
  }

  /**
   * ตรวจสอบสถานะ license
   */
  getLicenseStatus() {
    return {
      isInitialized: this.isInitialized,
      hasLicenseKey: !!this.licenseKey,
      keyLength: this.licenseKey ? this.licenseKey.length : 0,
      maskedKey: this.licenseKey
        ? `${this.licenseKey.substring(0, 8)}...${this.licenseKey.substring(
            this.licenseKey.length - 8
          )}`
        : null,
    };
  }

  /**
   * Auto-initialize license on app startup
   */
  initialize() {
    Logger.log("🔧 Initializing MUI X License Manager...");

    // Try to load existing license first
    if (this.loadLicenseKey()) {
      return true;
    }

    // If no license found, check if we're in development
    if (process.env.NODE_ENV === "development") {
      Logger.warn("⚠️ Running in development mode without MUI X Pro license");
      Logger.warn(
        "   Some advanced features may show watermarks or be limited"
      );
      Logger.warn(
        '   To add license: window.muiLicenseManager.setLicenseKey("your-key")'
      );
    }

    return false;
  }

  /**
   * Validate license key format (basic validation)
   */
  validateLicenseKey(key) {
    if (!key || typeof key !== "string") {
      return { valid: false, reason: "Invalid key format" };
    }

    // Basic format validation for MUI X license keys
    // MUI X keys typically start with specific patterns
    const muiKeyPattern =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

    if (!muiKeyPattern.test(key)) {
      return { valid: false, reason: "Key does not match expected format" };
    }

    return { valid: true };
  }

  /**
   * Get development helper methods
   */
  getDevHelpers() {
    return {
      setKey: (key) => this.setLicenseKey(key),
      loadKey: () => this.loadLicenseKey(),
      clearKey: () => this.clearLicenseKey(),
      status: () => this.getLicenseStatus(),
      validate: (key) => this.validateLicenseKey(key),
    };
  }
}

// Create singleton instance
const muiLicenseManager = new MUILicenseManager();

// Make available globally for development
if (process.env.NODE_ENV === "development") {
  window.muiLicenseManager = muiLicenseManager.getDevHelpers();
}

export default muiLicenseManager;
