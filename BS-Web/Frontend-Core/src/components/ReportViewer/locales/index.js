import { enLocale } from "./en";
import { thLocale } from "./th";

/**
 * Get locale text for ReportViewer based on current language setting
 * @param {string} [lang] - Language code ("en" | "th"). Defaults to "en".
 * @returns {object} Locale text object
 */
export const getLocaleText = (lang = "en") => {
  if (lang === "th") return thLocale;
  return enLocale;
};

export { enLocale, thLocale };
