import secureStorage from "../utils/SecureStorage";

export const useResource = () => {

    const getResource = async (resource_group, resource_name) => {
        let response = null;
        const resourceData = secureStorage.get("resource") || null;
        const lang = secureStorage.get("lang");
        if (resourceData) {
            let data = {};
            data = resourceData.find(r => r.resource_group === resource_group && r.resource_name === resource_name);
            response = data ? lang === "EN" ? data.resource_en : lang === "TH" ? data.resource_th : data.resource_other : null;
        }
        return response;
    }
    const getResources = async (resource_group) => {
        let response = [];
        const resourceData = secureStorage.get("resource") || null;
        const lang = secureStorage.get("lang");
        if (resourceData) {
            let data = [];
            data = resourceData.filter(r => r.resource_group === resource_group);
            data.map(item =>
                response.push({
                    resource_name: item.resource_name,
                    resource_value: lang === "en" ? item.resource_en : lang === "th" ? item.resource_th : item.resource_other
                })
            );
        }
        return response;
    }
    return { getResource, getResources };
}