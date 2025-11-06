import { Autocomplete, TextField } from "@mui/material";
import { useEffect, useState } from "react";

const BSOperators = ({
    label,
    field,
    value,
    onValueChange,
    type = "string", // "string" | "number" | "date"
    operators = [], // custom operators [{ value, label }]
}) => {
    const [operatorValue, setOperatorValue] = useState(null);

    // 🔹 default operator สำหรับแต่ละ type
    const defaultOperators = {
        string: [
            { value: "=", code: "=" },
            { value: "!=", code: "!=" },
            { value: "contains", code: "contains" },
            { value: "startsWith", code: "starts with" },
            { value: "endsWith", code: "ends with" },
        ],
        number: [
            { value: "=", code: "=" },
            { value: "!=", code: "!=" },
            { value: ">", code: ">" },
            { value: "<", code: "<" },
            { value: ">=", code: ">=" },
            { value: "<=", code: "<=" },
        ],
        date: [
            { value: "=", code: "=" },
            { value: "!=", code: "!=" },
            { value: ">", code: ">" },
            { value: "<", code: "<" },
            { value: ">=", code: ">=" },
            { value: "<=", code: "<=" },
        ],
    };

    const ops =
        operators.length > 0 ? operators : defaultOperators[type] || defaultOperators.string;

    // ✅ เรียก onValueChange แค่ตอน mount ครั้งแรก
    useEffect(() => {
        if (!value) {
            setOperatorValue(ops[0] || {})
            onValueChange({ field: field, operator: ops[0] })
        }
    }, [value])

    return (
        <Autocomplete
            disableClearable
            options={ops}
            getOptionLabel={(option) => option?.value || ""}
            value={operatorValue || null}
            onChange={(event, newValue) => {
                setOperatorValue(newValue);
                onValueChange({ field, operator: newValue });
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    variant="outlined"
                    inputProps={{
                        ...params.inputProps,
                        readOnly: true,
                    }}
                />
            )}
        />
    );
};

export default BSOperators;
