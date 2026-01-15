import React from "react";
import {
  TextField,
  FormControl,
  FormHelperText,
  Box,
  Typography,
} from "@mui/material";
import { getLocaleText } from "./BSDataGrid/locales";

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
  variant = "outlined",
  readOnly = false,
  showCharacterCount = false, // แสดงจำนวนตัวอักษร
  maxLength = null, // ความยาวสูงสุด (ถ้าไม่กำหนด จะแสดงเฉพาะจำนวนตัวอักษร)
  locale = "th", // ภาษาสำหรับแสดงข้อความ
  ...props
}) => {
  // Get locale text
  const localeText = getLocaleText(locale);
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

    // จำกัดความยาวสูงสุดถ้ามีกำหนด maxLength
    if (maxLength && val && val.length > maxLength) {
      val = val.substring(0, maxLength);
    }

    onChange?.(val);
  };

  // คำนวณจำนวนตัวอักษร
  const currentLength = value?.length || 0;
  const characterCountText = maxLength
    ? `${currentLength}/${maxLength}`
    : `${currentLength} ${localeText.bsCharacters || "characters"}`;

  return (
    <FormControl fullWidth error={error}>
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
        {...(props.maxRows && { maxRows: props.maxRows })}
        {...props}
      />
      {/* Helper text and character count */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 0.5,
          px: 1.5,
        }}
      >
        {error ? (
          <FormHelperText sx={{ m: 0 }}>{helperText}</FormHelperText>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
        {showCharacterCount && (
          <Typography
            variant="caption"
            color={
              maxLength && currentLength >= maxLength
                ? "error"
                : "text.secondary"
            }
          >
            {characterCountText}
          </Typography>
        )}
      </Box>
    </FormControl>
  );
};

export default BSTextField;
