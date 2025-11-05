import React, { useState } from "react";
import {
  TextField,
  FormControl,
  FormHelperText,
  FormLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const BSTextField = ({
  label,
  value,
  onChange,
  required = false,
  type = "string", // "string" | "int" | "float"
  decimals = 2, // จำนวนทศนิยมสูงสุด
  error,
  helperText,
  min,
  max,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const [localError, setLocalError] = useState("");

  // 🔍 ฟังก์ชัน validate
  const validateValue = (val) => {
    let msg = "";

    if (required && (val === "" || val === null || val === undefined)) {
      msg = "จำเป็นต้องกรอกข้อมูล";
    } else if (type === "int" && val && !/^-?\d+$/.test(val)) {
      msg = "กรอกได้เฉพาะตัวเลขจำนวนเต็ม";
    } else if (type === "float" && val) {
      if (!/^-?\d*(\.\d*)?$/.test(val)) {
        msg = "กรอกได้เฉพาะตัวเลขทศนิยม";
      } else {
        // ตรวจสอบจำนวนทศนิยม
        const decimalPart = val.split(".")[1];
        if (decimalPart && decimalPart.length > decimals) {
          msg = `กรอกทศนิยมไม่เกิน ${decimals} ตำแหน่ง`;
        }
      }
    }

    // ตรวจสอบ min/max
    const numVal = parseFloat(val);
    if (min !== undefined && !isNaN(numVal) && numVal < min)
      msg = `ค่าต้องไม่น้อยกว่า ${min}`;
    if (max !== undefined && !isNaN(numVal) && numVal > max)
      msg = `ค่าต้องไม่มากกว่า ${max}`;

    setLocalError(msg);
    return msg === "";
  };

  // 🔄 handleChange
  const handleChange = (e) => {
    let val = e.target.value;

    // ปรับค่าตามประเภท
    if (type === "int") {
      val = val.replace(/[^0-9-]/g, "");
    } else if (type === "float") {
      // อนุญาตเฉพาะตัวเลข จุด และเครื่องหมายลบตอนต้น
      val = val.replace(/(?!^-)[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) {
        // กันผู้ใช้ใส่หลายจุด
        val = parts[0] + "." + parts.slice(1).join("");
      }
    }

    onChange?.(val);
    validateValue(val);
  };

  return (
    <FormControl fullWidth error={!!(error || localError)}>
      {label && <FormLabel>{label}</FormLabel>}

      <TextField
        {...props}
        value={value ?? ""}
        onChange={handleChange}
        variant={props.variant || "outlined"}
        error={!!(error || localError)}
        inputProps={{
          inputMode: type === "float" || type === "int" ? "decimal" : "text",
          ...props.inputProps,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: theme.palette.mode === "dark" ? "#555" : "#ccc",
            },
            "&:hover fieldset": {
              borderColor: theme.palette.primary.main,
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
          "& .MuiInputBase-input": {
            color: theme.palette.text.primary,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.02)",
            borderRadius: 1,
            padding: "10px 12px",
          },
          "& .MuiInputLabel-root": {
            color: theme.palette.text.secondary,
          },
          ...sx,
        }}
      />

      {(helperText || localError) && (
        <FormHelperText>{localError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default BSTextField;
