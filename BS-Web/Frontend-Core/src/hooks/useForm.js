import { useCallback, useState } from "react";

export default function useForm(initialData, requiredFields = []) {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});

    const updateField = useCallback((field, value) => {
        setFormData((prev) => {
            if (prev[field] === value) {
                return prev;
            }

            return {
                ...prev,
                [field]: value,
            };
        });
    }, []);

    const validate = useCallback(() => {
        const newErrors = {};
        requiredFields.forEach((f) => {
            if (!formData[f] || formData[f] === "") {
                newErrors[f] = "This field is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, requiredFields]);

    return {
        formData,
        errors,
        updateField,
        validate,
        setFormData,
        setErrors
    };
}
