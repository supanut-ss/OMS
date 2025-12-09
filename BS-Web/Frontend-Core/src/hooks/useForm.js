import { useState } from "react";

export default function useForm(initialData, requiredFields = []) {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validate = () => {
        let newErrors = {};
        requiredFields.forEach(f => {
            if (!formData[f] || formData[f] === "") {
                newErrors[f] = "This field is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    return {
        formData,
        errors,
        updateField,
        validate,
        setFormData,
        setErrors
    };
}
