import React from "react";
import { TextField, FormControl, FormHelperText } from "@mui/material";

const BSTextField = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = "",
  type = "string",
  decimals = 2,
}) => {
  const handleChange = (e) => {
    let val = e.target.value;

    if (type === "int") {
      val = val.replace(/\D/g, "");
    } else if (type === "float" || type === "decimal") {
      val = val.replace(/[^\d.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
      if (parts[1]?.length > decimals)
        val = parts[0] + "." + parts[1].substring(0, decimals);
    }

    onChange?.(val);
  };

  return (
    <FormControl fullWidth error={error}>
      <TextField
        fullWidth
       // size="small"
        label={label}
        required={required}
        value={value || ""}
        onChange={handleChange}
        sx={{
         // "& .MuiOutlinedInput-root": { height: "3.5rem" },
        }}
      />
      {error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BSTextField;
