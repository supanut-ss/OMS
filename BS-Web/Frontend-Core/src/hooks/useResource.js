import { useCallback } from "react";
import secureStorage from "../utils/SecureStorage";

export const useResource = () => {
  const getResource = useCallback((resourceData, resource_name) => {
    let response = null;
    if (resourceData) {
      response =
        resourceData?.find((r) => r.resource_name === resource_name)
          ?.resource_value ?? resource_name;
    }
    return response;
  }, []);

  const getResourceDescription = useCallback((resourceData, resource_name) => {
    let response = null;
    if (resourceData) {
      response =
        resourceData?.find((r) => r.resource_name === resource_name)
          ?.resource_description ?? resource_name;
    }
    return response;
  }, []);

  const getResources = useCallback(async (resource_group, locale = null) => {
    let response = [];
    const resourceData = secureStorage.get("resource") || null;
    // Use provided locale parameter if available, otherwise fall back to storage
    const lang = locale || secureStorage.get("lang");
    console.log(
      `🌐 getResources called: group="${resource_group}", locale param="${locale}", resolved lang="${lang}"`
    );
    if (resourceData) {
      let data = [];
      data = resourceData.filter((r) => r.resource_group === resource_group);
      console.log(
        `🌐 getResources: Found ${data.length} resources for group "${resource_group}"`
      );
      data.map((item) =>
        response.push({
          resource_name: item.resource_name,
          resource_value:
            lang === "en"
              ? item.resource_en
              : lang === "th"
              ? item.resource_th
              : item.resource_other,
          resource_description:
            lang === "en"
              ? item.description_en
              : lang === "th"
              ? item.description_th
              : item.description_other,
        })
      );
      if (response.length > 0) {
        console.log(
          `🌐 getResources: Sample translations for ${resource_group}:`,
          response.slice(0, 3)
        );
      }
    }
    return response;
  }, []);

  /**
   * Fetch resource value by resource_group, resource_name, and lang from secureStorage
   * @param {string} resource_group - Resource group to filter by
   * @param {string} resource_name - Specific resource name to fetch
   * @param {string} lang - Language code (en/th/other) for translation
   * @returns {object} Object containing resource_value and resource_description
   */
  const getResourceByGroupAndName = useCallback(
    (resource_group, resource_name, lang = null) => {
      const resourceData = secureStorage.get("resource") || [];
      const resolvedLang = lang || secureStorage.get("lang");

      const resource = resourceData.find(
        (r) =>
          r.resource_group === resource_group &&
          r.resource_name === resource_name
      );

      if (!resource) {
        return {
          resource_value: resource_name,
          resource_description: resource_name,
        };
      }

      return {
        resource_value:
          resolvedLang === "en"
            ? resource.resource_en
            : resolvedLang === "th"
            ? resource.resource_th
            : resource.resource_other,
        resource_description:
          resolvedLang === "en"
            ? resource.description_en
            : resolvedLang === "th"
            ? resource.description_th
            : resource.description_other,
      };
    },
    []
  );

  /**
   * Returns resource utility functions that fetch and format values from secureStorage
   * - getResource: Get a specific resource value by resource_name from resourceData
   * - getResourceDescription: Get a specific resource description by resource_name from resourceData
   * - getResources: Get all resources for a resource_group with language-specific translations
   * - getResourceByGroupAndName: Get resource value and description by resource_group, resource_name, and lang
   */
  return {
    getResource,
    getResourceDescription,
    getResources,
    getResourceByGroupAndName,
  };
};
