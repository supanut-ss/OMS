export const ConfigsFormatter = () => {
    const getEnvDecimalPlaces = () => {
        const envVal = process.env.REACT_APP_DECIMAL_PLACES;
        if (envVal !== undefined && envVal !== null && envVal !== "") {
            const parsed = parseInt(envVal, 10);
            if (!Number.isNaN(parsed) && parsed >= 0) {
                return parsed;
            }
        }
        return 2;
    };
    const formatDecimalValue = (value, decimalPlaces = getEnvDecimalPlaces()) => {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
            return value === null || value === undefined ? "" : String(value);
        }
        return numericValue.toFixed(decimalPlaces);
    };

    return {
        formatDecimalValue
    };
}