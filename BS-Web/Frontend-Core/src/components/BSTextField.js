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
  precision = 18, // จำนวนหลักทั้งหมด เช่น decimal(18,2)
  scale = 2, // จำนวนหลักทศนิยม เช่น decimal(18,2)
  borderLeftRadius = null,
  disblsed = false,
  variant = "standard",
  readOnly = false,
  ...props
}) => {
  const handleChange = (e) => {
    let val = e.target.value;

    if (type === "int") {
      val = val.replace(/\D/g, "");
    } else if (type === "float" || type === "decimal") {
      val = val.replace(/[^\d.]/g, ""); // อนุญาตเฉพาะตัวเลขและจุด
      const parts = val.split(".");
      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");

      // ตัดให้ไม่เกินจำนวนทศนิยมที่กำหนด
      if (parts[1]?.length > scale)
        val = parts[0] + "." + parts[1].substring(0, scale);

      // รวมจำนวนหลักก่อนและหลังจุดให้ไม่เกิน precision
      const totalDigits = val.replace(".", "").length;
      if (totalDigits > precision) {
        // ถ้าเกิน precision ให้ตัดตัวหลังสุดออก
        const excess = totalDigits - precision;
        val = val.slice(0, val.length - excess);
      }
    }

    onChange?.(val);
  };

  return (
    <FormControl fullWidth error={error} >
      <TextField
        error={error}
        variant={variant}
        disabled={disblsed}
        fullWidth
        label={label}
        required={required}
        value={value || ""}
        onChange={handleChange}
        size={props.size || "Normal"}
        sx={{
          ...(borderLeftRadius && {
            "& .MuiInputBase-root": {
              borderTopLeftRadius: borderLeftRadius,
              borderBottomLeftRadius: borderLeftRadius,
            },
          }),
        }}
        slotProps={{
          input: {
            readOnly: readOnly,
          },
        }}
        multiline={props.multiline || false}
        minRows={props.minRows || 1}
        maxRows={props.maxRows || 4}
        {...props}
      />
      {error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BSTextField;
