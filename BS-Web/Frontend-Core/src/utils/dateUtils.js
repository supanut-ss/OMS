import { DATE_FORMAT, DATETIME_FORMAT } from "../config/dateConfig";

const pad2 = (value) => String(value).padStart(2, "0");

const formatWithPattern = (date, pattern, locale) => {
  const isThai = locale === "th";
  const year = date.getFullYear() + (isThai ? 543 : 0);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const replacements = {
    YYYY: String(year),
    yyyy: String(year),
    YY: String(year).slice(-2),
    yy: String(year).slice(-2),
    DD: pad2(day),
    dd: pad2(day),
    D: String(day),
    d: String(day),
    MM: pad2(month),
    M: String(month),
    HH: pad2(hours24),
    H: String(hours24),
    hh: pad2(hours12),
    h: String(hours12),
    mm: pad2(minutes),
    m: String(minutes),
    ss: pad2(seconds),
    s: String(seconds),
    A: hours24 >= 12 ? "PM" : "AM",
    a: hours24 >= 12 ? "pm" : "am",
  };

  return String(pattern || DATE_FORMAT).replace(
    /YYYY|yyyy|YY|yy|DD|dd|D|d|MM|M|HH|H|hh|h|mm|m|ss|s|A|a/g,
    (token) => replacements[token] ?? token,
  );
};

/**
 * Date Utility Functions
 * Shared date formatting utilities for consistent date display across the application
 */

/**
 * Format date to "dd/MM/yyyy" or "dd/MM/yyyy HH:mm" format
 * Supports Thai Buddhist Era (พ.ศ.) when locale is "th"
 *
 * @param {Date|string|number} dateValue - Date value to format (Date object, ISO string, or timestamp)
 * @param {Object} options - Formatting options
 * @param {boolean} [options.includeTime=false] - Include time (HH:mm) in output
 * @param {string} [options.locale="en"] - Locale for formatting ("th" for Buddhist Era, others for Gregorian)
 * @returns {string} Formatted date string or empty string if invalid
 *
 * @example
 * // Basic date formatting
 * formatDate(new Date()) // "17/12/2024"
 *
 * // With time
 * formatDate(new Date(), { includeTime: true }) // "17/12/2024 14:30"
 *
 * // Thai Buddhist Era
 * formatDate(new Date(), { locale: "th" }) // "17/12/2567"
 *
 * // Thai with time
 * formatDate(new Date(), { includeTime: true, locale: "th" }) // "17/12/2567 14:30"
 */
export const formatDate = (dateValue, options = {}) => {
  const { includeTime = false, locale = "en", format } = options;

  if (!dateValue) return "";

  try {
    // Convert to Date object if needed
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

    // Validate date
    if (isNaN(date.getTime())) return "";

    const defaultFormat = includeTime ? DATETIME_FORMAT : DATE_FORMAT;
    return formatWithPattern(date, format || defaultFormat, locale);
  } catch {
    return "";
  }
};

/**
 * Format datetime to "dd/MM/yyyy HH:mm" format
 * Shorthand for formatDate with includeTime: true
 *
 * @param {Date|string|number} dateValue - Date value to format
 * @param {string} [locale="en"] - Locale for formatting
 * @returns {string} Formatted datetime string
 *
 * @example
 * formatDateTime(new Date()) // "17/12/2024 14:30"
 * formatDateTime(new Date(), "th") // "17/12/2567 14:30"
 */
export const formatDateTime = (dateValue, locale = "en") => {
  return formatDate(dateValue, { includeTime: true, locale });
};

/**
 * Format date only to "dd/MM/yyyy" format
 * Shorthand for formatDate without time
 *
 * @param {Date|string|number} dateValue - Date value to format
 * @param {string} [locale="en"] - Locale for formatting
 * @returns {string} Formatted date string
 *
 * @example
 * formatDateOnly(new Date()) // "17/12/2024"
 * formatDateOnly(new Date(), "th") // "17/12/2567"
 */
export const formatDateOnly = (dateValue, locale = "en") => {
  return formatDate(dateValue, { includeTime: false, locale });
};

/**
 * Parse date string in "dd/MM/yyyy" or "dd/MM/yyyy HH:mm" format to Date object
 *
 * @param {string} dateString - Date string to parse
 * @param {Object} options - Parse options
 * @param {string} [options.locale="en"] - Locale for parsing ("th" for Buddhist Era)
 * @returns {Date|null} Parsed Date object or null if invalid
 *
 * @example
 * parseDate("17/12/2024") // Date object
 * parseDate("17/12/2567", { locale: "th" }) // Date object (converted from Buddhist Era)
 */
export const parseDate = (dateString, options = {}) => {
  const { locale = "en" } = options;

  if (!dateString || typeof dateString !== "string") return null;

  try {
    // Split date and time parts
    const parts = dateString.trim().split(" ");
    const datePart = parts[0];
    const timePart = parts[1];

    // Parse date components
    const [day, month, year] = datePart.split("/").map(Number);

    if (!day || !month || !year) return null;

    // Convert Buddhist Era to Gregorian if Thai locale
    const isThai = locale === "th";
    const gregorianYear = isThai ? year - 543 : year;

    // Parse time if available
    let hours = 0;
    let minutes = 0;
    if (timePart) {
      const [h, m] = timePart.split(":").map(Number);
      hours = h || 0;
      minutes = m || 0;
    }

    const date = new Date(gregorianYear, month - 1, day, hours, minutes);

    // Validate the parsed date
    if (isNaN(date.getTime())) return null;

    return date;
  } catch {
    return null;
  }
};

/**
 * Check if a value is a valid date
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a valid date
 */
export const isValidDate = (value) => {
  if (!value) return false;

  try {
    const date = value instanceof Date ? value : new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

const dateUtils = {
  formatDate,
  formatDateTime,
  formatDateOnly,
  parseDate,
  isValidDate,
};

export default dateUtils;
