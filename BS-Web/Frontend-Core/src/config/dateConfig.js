/**
 * Date/Time Format Configuration
 * Centralized configuration for date and time formatting across the application
 * Values are read from environment variables with sensible defaults
 */

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
