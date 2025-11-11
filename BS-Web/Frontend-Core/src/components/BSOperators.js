import { Autocomplete, TextField } from "@mui/material";
import { useEffect, useState } from "react";

const BSOperators = ({
    label,
    field,
    value,
    onValueChange,
    type = "string", // "string" | "number" | "date"
    operators = [], // custom operators [{ value, code }]
    borderRightRadius = null,
    ...props
}) => {
    const [operatorValue, setOperatorValue] = useState(null);

    // 🔹 default operator สำหรับแต่ละ type
    const defaultOperators = {
        string: [
            { value: "contains", code: "contains" },
            { value: "startsWith", code: "starts with" },
            { value: "endsWith", code: "ends with" },
            { value: "equals / is", code: "equals / is" },
            { value: "notEquals", code: "notEquals" },
            { value: "isEmpty", code: "isEmpty" },
            { value: "isNotEmpty", code: "isNotEmpty" },
            { value: "isAnyOf", code: "isAnyOf" },
            { value: "isBetween", code: "isBetween" },
        ],
        number: [
            { value: "equals", code: "equals" },
            { value: "notEquals", code: "notEquals" },
            { value: "greaterThan", code: "greaterThan" },
            { value: "greaterThanOrEqual", code: "greaterThanOrEqual" },
            { value: "lessThan", code: "lessThan" },
            { value: "lessThanOrEqual", code: "lessThanOrEqual" },
            { value: "isBetween", code: "isBetween" },
            { value: "isEmpty", code: "isEmpty" },
            { value: "isNotEmpty", code: "isNotEmpty" },
            { value: "isAnyOf", code: "isAnyOf" },
        ],
        date: [
            { value: "is", code: "is" },
            { value: "onOrAfter", code: "onOrAfter" },
            { value: "onOrBefore", code: "onOrBefore" },
            { value: "isBetween", code: "isBetween" },
            { value: "isEmpty", code: "isEmpty" },
            { value: "isNotEmpty", code: "isNotEmpty" },
        ],
        dropdown: [
            { value: "=", code: "=" },
            { value: "!=", code: "!=" }
        ],
    };

    const ops =
        operators.length > 0 ? operators : defaultOperators[type] || defaultOperators.string;

    // ✅ ตั้งค่าเริ่มต้นและ sync เมื่อ value เปลี่ยน
    useEffect(() => {
        // ถ้ายังไม่มีค่า operator ให้ใช้ตัวแรกเป็น default
        if (!value) {
            setOperatorValue(ops[0]);
            onValueChange({ field, operator: ops[0] });
        } else if (typeof value === "string") {
            // ถ้ามีค่าเป็น string เช่น "=" → map ให้ตรงกับ object
            const found = ops.find((op) => op.code === value || op.value === value);
            setOperatorValue(found || ops[0]);
        } else {
            // ถ้าเป็น object อยู่แล้ว
            setOperatorValue(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

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
            sx={{
                ...(borderRightRadius && {
                    "& .MuiInputBase-root": {
                        borderTopRightRadius: borderRightRadius,
                        borderBottomRightRadius: borderRightRadius,
                    },
                }),

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
