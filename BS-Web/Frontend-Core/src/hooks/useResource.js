import secureStorage from "../utils/SecureStorage";

export const useResource = () => {

    const getResource = (resourceData, resource_name) => {
        let response = null;
        if (resourceData) {
            response = resourceData?.find(r => r.resource_name === resource_name)?.resource_value ?? resource_name;
        }
        return response;
    }
    const getResourceDescription = (resourceData, resource_name) => {
        let response = null;
        if (resourceData) {
            response = resourceData?.find(r => r.resource_name === resource_name)?.resource_description ?? resource_name;
        }
        return response;
    }
    const getResources = async (resource_group, locale = null) => {
        let response = [];
        const resourceData = secureStorage.get("resource") || null;
        // Use provided locale parameter if available, otherwise fall back to storage
        const lang = locale || secureStorage.get("lang");
        console.log(`🌐 getResources called: group="${resource_group}", locale param="${locale}", resolved lang="${lang}"`);
        if (resourceData) {
            let data = [];
            data = resourceData.filter(r => r.resource_group === resource_group);
            console.log(`🌐 getResources: Found ${data.length} resources for group "${resource_group}"`);
            data.map(item =>
                response.push({
                    resource_name: item.resource_name,
                    resource_value: lang === "en" ? item.resource_en : lang === "th" ? item.resource_th : item.resource_other,
                    resource_description: lang === "en" ? item.description_en : lang === "th" ? item.description_th : item.description_other
                })
            );
            if (response.length > 0) {
                console.log(`🌐 getResources: Sample translations for ${resource_group}:`, response.slice(0, 3));
            }
        }
        return response;
    }
    return { getResource, getResourceDescription, getResources };
}