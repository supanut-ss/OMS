import { Autocomplete, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

const BSOperators = ({
    label,
    field,
    value,
    onValueChange,
    type = "string", // "string" | "number" | "date"
    md = 3,
    operators = [], // custom operator เช่น [{value:'=',label:'เท่ากับ'}]
}) => {
    const [operatorValue, setOperatorValue] = useState();
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
    const ops = operators.length > 0 ? operators : defaultOperators[type] || defaultOperators.string
    useEffect(() => {
        if (!value) {
            setOperatorValue(ops[0] || {})
            onValueChange({ field: field, operator: ops[0] })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    return <>
        <Autocomplete
            disableClearable
            options={ops}
            getOptionLabel={(option) => option.value || ""}
            value={operatorValue || null}
            onChange={(event, newValue) => {
                setOperatorValue(newValue);
                onValueChange({ field: field, operator: newValue })
            }}
            sx={{
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
                // sx={{
                //     "& .MuiOutlinedInput-root": {
                //         height: 40,
                //     },
                // }}
                />
            )}
        />
    </>
}
export default BSOperators;