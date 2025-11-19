/**
 * BSDataGrid Localization
 * Centralized locale text for MUI X DataGrid
 *
 * Usage:
 * import { getLocaleText } from './BSDataGrid/locales';
 * const localeText = getLocaleText('th'); // or 'en'
 */

import { thaiLocaleText } from "./th";
import { englishLocaleText } from "./en";

/**
 * Get locale text for BSDataGrid based on locale code
 * @param {string} locale - Locale code ('th', 'en', etc.)
 * @returns {object} Locale text object for MUI X DataGrid
 */
export const getLocaleText = (locale) => {
  switch (locale) {
    case "th":
      return thaiLocaleText;
    case "en":
    default:
      return englishLocaleText;
  }
};

// Export individual locale texts for direct import if needed
export { thaiLocaleText } from "./th";
export { englishLocaleText } from "./en";
