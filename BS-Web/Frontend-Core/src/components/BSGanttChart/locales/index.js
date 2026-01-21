import { enLocale } from "./en";
import { thLocale } from "./th";
import secureStorage from "../../../utils/SecureStorage";

/**
 * Get locale text for BSGanttChart based on current language setting
 * @returns {object} Locale text object
 */
export const getLocaleText = () => {
  const lang = secureStorage.get("lang") || "th";
  
  if (lang === "en") {
    return enLocale;
  }
  return thLocale;
};

export { enLocale, thLocale };
