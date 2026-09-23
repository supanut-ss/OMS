import { Autocomplete, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import secureStorage from "../utils/SecureStorage";

const BSOperators = ({
    label,
    field,
    value,
    onValueChange,
    type = "string", // "string" | "number" | "date"
    operators = [], // custom operators [{ value, code }]
    borderRightRadius = null,
    size = "medium", // added size prop
    hideLabel = false,
    bsLang,
    ...props
}) => {
    const [operatorValue, setOperatorValue] = useState(null);

    const translations = {
        th: {
            contains: "ประกอบด้วย",
            startsWith: "เริ่มต้นด้วย",
            endsWith: "ลงท้ายด้วย",
            "equals / is": "เท่ากับ / คือ",
            equals: "เท่ากับ",
            notEquals: "ไม่เท่ากับ",
            isEmpty: "ว่างเปล่า",
            isNotEmpty: "ไม่ว่างเปล่า",
            isAnyOf: "เป็นหนึ่งใน",
            isBetween: "อยู่ระหว่าง",
            greaterThan: "มากกว่า",
            greaterThanOrEqual: "มากกว่าหรือเท่ากับ",
            lessThan: "น้อยกว่า",
            lessThanOrEqual: "น้อยกว่าหรือเท่ากับ",
            is: "คือ",
            onOrAfter: "ในหรือหลังจาก",
            onOrBefore: "ในหรือก่อน",
        },
        en: {
            contains: "Contains",
            startsWith: "Starts with",
            endsWith: "Ends with",
            "equals / is": "Equals / Is",
            equals: "Equals",
            notEquals: "Not equals",
            isEmpty: "Is empty",
            isNotEmpty: "Is not empty",
            isAnyOf: "Is any of",
            isBetween: "Is between",
            greaterThan: "Greater than",
            greaterThanOrEqual: "Greater than or equal to",
            lessThan: "Less than",
            lessThanOrEqual: "Less than or equal to",
            is: "Is",
            onOrAfter: "On or after",
            onOrBefore: "On or before",
        }
    };

    const activeLang = bsLang || (secureStorage?.get ? secureStorage.get("lang") || "th" : "th");
    const lang = activeLang === "en" ? "en" : "th";

    const getLabel = (key) => {
        return translations[lang]?.[key] || key;
    };

    // 🔹 default operator สำหรับแต่ละ type
    // ponytail: memoized by lang so `ops` keeps a stable reference across renders —
    // otherwise the [value, ops] effect below re-fires every render → infinite setState loop.
    const defaultOperators = useMemo(() => ({
        string: [
            { value: getLabel("contains"), code: "contains" },
            { value: getLabel("startsWith"), code: "startsWith" },
            { value: getLabel("endsWith"), code: "endsWith" },
            { value: getLabel("equals"), code: "equals" },
            { value: getLabel("notEquals"), code: "!=" },
            { value: getLabel("isEmpty"), code: "isEmpty" },
            { value: getLabel("isNotEmpty"), code: "isNotEmpty" },
            { value: getLabel("isAnyOf"), code: "isAnyOf" },
            { value: getLabel("isBetween"), code: "isBetween" },
        ],
        number: [
            { value: getLabel("equals"), code: "equals" },
            { value: getLabel("notEquals"), code: "notEquals" },
            { value: getLabel("greaterThan"), code: "greaterThan" },
            { value: getLabel("greaterThanOrEqual"), code: "greaterThanOrEqual" },
            { value: getLabel("lessThan"), code: "lessThan" },
            { value: getLabel("lessThanOrEqual"), code: "lessThanOrEqual" },
            { value: getLabel("isBetween"), code: "isBetween" },
            { value: getLabel("isEmpty"), code: "isEmpty" },
            { value: getLabel("isNotEmpty"), code: "isNotEmpty" },
            { value: getLabel("isAnyOf"), code: "isAnyOf" },
        ],
        date: [
            { value: getLabel("is"), code: "is" },
            { value: getLabel("onOrAfter"), code: "onOrAfter" },
            { value: getLabel("onOrBefore"), code: "onOrBefore" },
            { value: getLabel("isBetween"), code: "isBetween" },
            { value: getLabel("isEmpty"), code: "isEmpty" },
            { value: getLabel("isNotEmpty"), code: "isNotEmpty" },
        ],
        dropdown: [
            { value: "=", code: "=" },
            { value: "!=", code: "!=" },
            { value: ">", code: ">" },
            { value: "<", code: "<" },
            { value: ">=", code: ">=" },
            { value: "<=", code: "<=" },
        ],
    }), [lang]);

    const ops =
        operators.length > 0 ? operators : defaultOperators[type] || defaultOperators.string;

    // ✅ ตั้งค่าเริ่มต้นและ sync เมื่อ value เปลี่ยน
    useEffect(() => {
        const valueCode = value?.code || value;
        if (!valueCode) {
            setOperatorValue(ops[0]);
            onValueChange({ field, operator: ops[0] });
        } else {
            const found = ops.find((op) => op.code === valueCode);
            setOperatorValue(found || ops[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, ops]);

    return (
        <Autocomplete
            disableClearable
            options={ops}
            getOptionLabel={(option) => option?.value || ""}
            value={operatorValue || null}
            size={size}
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
                marginRight: { md: "-1px" },
                position: "relative",
                zIndex: 1,
                "&:focus-within": {
                    zIndex: 2,
                },
                ...props.sx,
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={hideLabel ? "" : label}
                    variant="outlined"
                    size={size}
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
