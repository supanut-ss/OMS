/**
 * Date/Time Format Configuration
 * Centralized configuration for date and time formatting across the application
 * Values are read from environment variables with sensible defaults
 */

import secureStorage from "../utils/SecureStorage";

// Default formats if not specified in .env
const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";
const DEFAULT_DATETIME_FORMAT = "DD/MM/YYYY HH:mm";
const DEFAULT_USE_24_HOUR = true;

/**
 * Get date format from environment or use default
 * @returns {string} Date format string (e.g., "DD/MM/YYYY")
 */
export const getDateFormat = () => {
  return process.env.REACT_APP_DATE_FORMAT || DEFAULT_DATE_FORMAT;
};

/**
 * Get datetime format from environment or use default
 * @returns {string} Datetime format string (e.g., "DD/MM/YYYY HH:mm")
 */
export const getDateTimeFormat = () => {
  return process.env.REACT_APP_DATETIME_FORMAT || DEFAULT_DATETIME_FORMAT;
};

/**
 * Check if 24-hour format should be used
 * @returns {boolean} true for 24-hour format, false for 12-hour AM/PM
 */
export const is24HourFormat = () => {
  const value = process.env.REACT_APP_USE_24_HOUR;
  if (value === undefined || value === null) return DEFAULT_USE_24_HOUR;
  return value === "true" || value === true;
};

/**
 * Get all date/time configuration
 * @returns {Object} Configuration object with all date/time settings
 */
export const getDateConfig = () => ({
  dateFormat: getDateFormat(),
  dateTimeFormat: getDateTimeFormat(),
  is24Hour: is24HourFormat(),
  // Also provide lowercase versions for compatibility with formatDate utility
  dateFormatLower: getDateFormat().toLowerCase(),
  dateTimeFormatLower: getDateTimeFormat().toLowerCase(),
});
export const FormatTimeToText = (date) => {
  const lang = secureStorage.get("lang") === "th" ? "th" : "en";

  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // ---- JUST NOW ----
  if (diffSec < 30) {
    return lang === "th" ? "ล่าสุด" : "Just now";
  }

  // ---- MINUTES ----
  if (diffMin < 60) {
    return lang === "th"
      ? `${diffMin} นาทีที่แล้ว`
      : `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  }

  // ---- HOURS ----
  if (diffHour < 24) {
    return lang === "th"
      ? `${diffHour} ชั่วโมงที่แล้ว`
      : `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  }

  // ---- YESTERDAY ----
  if (diffDay === 1) {
    return lang === "th" ? "เมื่อวาน" : "Yesterday";
  }

  // ---- DAYS ----
  if (diffDay < 7) {
    return lang === "th"
      ? `${diffDay} วันที่แล้ว`
      : `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  }

  // ---- FALLBACK → แสดงวันที่ปกติ ----
  return past.toLocaleDateString(
    lang === "th" ? "th-TH" : "en-EN",
    { dateStyle: "short" }
  );
};

// Export individual format strings for direct import
export const DATE_FORMAT = getDateFormat();
export const DATETIME_FORMAT = getDateTimeFormat();
export const USE_24_HOUR = is24HourFormat();

export default {
  DATE_FORMAT,
  DATETIME_FORMAT,
  USE_24_HOUR,
  getDateFormat,
  getDateTimeFormat,
  is24HourFormat,
  getDateConfig,
};
