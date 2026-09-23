import React, { useEffect, useRef, useState } from "react";
import {
  TextField,
  FormControl,
  FormHelperText,
  Box,
  Typography,
} from "@mui/material";
import { getLocaleText } from "./BSDataGrid/locales";
import Config from "../utils/Config";

const compactTextFieldSx = {
  "& .MuiInputBase-root:not(.MuiInputBase-multiline), & .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": {
    minHeight: 44,
    alignItems: "center",
  },
  "& .MuiInputBase-input, & .MuiOutlinedInput-input, & .MuiInputBase-inputSizeSmall, & .MuiOutlinedInput-inputSizeSmall": {
    height: "20px",
    pt: "0 !important",
    pb: "0 !important",
    lineHeight: "20px",
  },
  "& .MuiInputLabel-root": {
    transform: "translate(14px, 10px) scale(1)",
  },
  "& .MuiInputLabel-shrink": {
    transform: "translate(14px, -9px) scale(0.75)",
  },
  "& .MuiInputBase-multiline": {
    py: 1.1,
  },
  "& .MuiInputBase-multiline .MuiInputBase-input": {
    pt: "0 !important",
    pb: "0 !important",
  },
};

const BSTextField = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = "",
  type = "string",
  precision = 18, // จำนวนหลักทั้งหมด เช่น decimal(18,2)
  scale = Config?.SCALE ?? 2, // จำนวนหลักทศนิยม เช่น decimal(18,2)
  maxIntegerDigits = null, // จำนวนหลักจำนวนเต็มสูงสุด
  maxDecimalDigits = null, // จำนวนหลักทศนิยมสูงสุด (override scale)
  maxNumericLength = null, // ความยาวรวมสูงสุด (รวมจุดทศนิยม)
  borderLeftRadius = null,
  disblsed = false,
  variant = "outlined",
  readOnly = false,
  showCharacterCount = false, // แสดงจำนวนตัวอักษร
  maxLength = null, // ความยาวสูงสุด (ถ้าไม่กำหนด จะแสดงเฉพาะจำนวนตัวอักษร)
  updateDelayMs = 150,
  locale = "th", // ภาษาสำหรับแสดงข้อความ
  size = "small",
  labelAbove = false,
  slotProps,
  sx,
  ...props
}) => {
  const normalizeToText = (input) =>
    input == null ? "" : typeof input === "string" ? input : String(input);

  const [localValue, setLocalValue] = useState(normalizeToText(value));
  const lastEmittedValueRef = useRef(localValue);
  const changeTimerRef = useRef(null);

  const emitChange = (nextValue) => {
    lastEmittedValueRef.current = nextValue;
    onChange?.(nextValue);
  };

  const flushPendingChange = (nextValue = null) => {
    if (changeTimerRef.current) {
      clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }

    if (nextValue !== null) {
      emitChange(nextValue);
    }
  };

  useEffect(() => {
    const nextValue = normalizeToText(value);

    if (nextValue === lastEmittedValueRef.current) {
      return;
    }

    setLocalValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [value]);

  useEffect(
    () => () => {
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
        changeTimerRef.current = null;
      }
    },
    [],
  );

  // Get locale text
  const localeText = getLocaleText(locale);
  const handleChange = (e) => {
    let val = e.target.value;

    if (type === "int") {
      val = val.replace(/\D/g, "");
    } else if (type === "float" || type === "decimal" || type === "number") {
      val = val.replace(/[^\d.]/g, ""); // อนุญาตเฉพาะตัวเลขและจุด

      const rawParts = val.split(".");
      if (rawParts.length > 2) {
        val = rawParts[0] + "." + rawParts.slice(1).join("");
      }

      const hasDecimalPoint = val.includes(".");
      const [rawIntegerPart = "", rawDecimalPart = ""] = val.split(".");

      const effectiveDecimalDigits =
        maxDecimalDigits === null || maxDecimalDigits === undefined
          ? scale
          : maxDecimalDigits;

      let integerPart = rawIntegerPart;
      let decimalPart = rawDecimalPart;

      // ตัดให้ไม่เกินจำนวนทศนิยมที่กำหนด
      if (decimalPart.length > effectiveDecimalDigits) {
        decimalPart = decimalPart.substring(0, effectiveDecimalDigits);
      }

      if (
        maxIntegerDigits !== null &&
        maxIntegerDigits !== undefined &&
        maxIntegerDigits >= 0 &&
        integerPart.length > maxIntegerDigits
      ) {
        integerPart = integerPart.substring(0, maxIntegerDigits);
      }

      val = hasDecimalPoint
        ? `${integerPart}.${decimalPart}`
        : integerPart;

      // รวมจำนวนหลักก่อนและหลังจุดให้ไม่เกิน precision
      const totalDigits = val.replace(".", "").length;
      if (totalDigits > precision) {
        // ถ้าเกิน precision ให้ตัดตัวหลังสุดออก
        const excess = totalDigits - precision;
        val = val.slice(0, val.length - excess);
      }

      if (
        maxNumericLength !== null &&
        maxNumericLength !== undefined &&
        maxNumericLength >= 0 &&
        val.length > maxNumericLength
      ) {
        val = val.substring(0, maxNumericLength);
      }
    }

    // จำกัดความยาวสูงสุดถ้ามีกำหนด maxLength
    if (maxLength && val && val.length > maxLength) {
      val = val.substring(0, maxLength);
    }

    setLocalValue(val);

    const shouldDelayParentUpdate =
      updateDelayMs > 0 &&
      !props.select &&
      type !== "date" &&
      type !== "datetime-local";

    if (!shouldDelayParentUpdate) {
      flushPendingChange(val);
      return;
    }

    if (changeTimerRef.current) {
      clearTimeout(changeTimerRef.current);
    }

    changeTimerRef.current = setTimeout(() => {
      changeTimerRef.current = null;
      emitChange(val);
    }, updateDelayMs);
  };

  // คำนวณจำนวนตัวอักษร
  const currentLength = localValue?.length || 0;
  const characterCountText = maxLength
    ? `${currentLength}/${maxLength}`
    : `${currentLength} ${localeText.bsCharacters || "characters"}`;

  return (
    <FormControl fullWidth error={error}>
      {labelAbove && (
        <Typography
          component="label"
          variant="caption"
          sx={{
            mb: 0.65,
            color: error ? "error.main" : "text.secondary",
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: "error.main", ml: 0.35 }}>
              *
            </Box>
          )}
        </Typography>
      )}
      <TextField
        {...props}
        error={error}
        variant={variant}
        disabled={props.disabled ?? disblsed}
        fullWidth
        label={labelAbove ? undefined : label}
        required={required}
        value={localValue}
        onChange={handleChange}
        onBlur={(event) => {
          if (lastEmittedValueRef.current !== localValue) {
            flushPendingChange(localValue);
          } else {
            flushPendingChange();
          }
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          if (localValue === "0") {
            // Select default zero immediately so users can type over it with a single click.
            setTimeout(() => {
              event.target.select();
            }, 0);
          }
         // props.onFocus?.(event);
        }}
        size={size}
        sx={{
          ...compactTextFieldSx,
          ...(borderLeftRadius && {
            "& .MuiInputBase-root": {
              borderTopLeftRadius: borderLeftRadius,
              borderBottomLeftRadius: borderLeftRadius,
            },
          }),
          position: "relative",
          zIndex: 1,
          "&:focus-within": {
            zIndex: 2,
          },
          ...sx,
        }}
        slotProps={{
          ...slotProps,
          input: {
            ...slotProps?.input,
            readOnly: readOnly,
          },
        }}
        multiline={props.multiline || false}
        minRows={props.minRows || 1}
        {...(props.maxRows && { maxRows: props.maxRows })}
      />
      {/* Helper text and character count */}
      {(error || helperText || showCharacterCount) && (
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
      )}
    </FormControl>
  );
};

export default BSTextField;
