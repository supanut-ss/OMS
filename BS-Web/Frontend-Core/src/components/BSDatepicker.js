import React, { useState } from "react";
import { FormControl, FormHelperText, FormLabel } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const BSDatepicker = ({
  label,
  value,
  onChange,
  required = false,
  error,
  helperText,
  minDate,
  maxDate,
  format = "DD/MM/YYYY",
  disableFuture = false,
  disablePast = false,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const [localError, setLocalError] = useState("");

  const handleChange = (newValue) => {
    if (required && !newValue) {
      setLocalError("กรุณาเลือกวันที่");
    } else {
      setLocalError("");
    }

    // ส่งค่าออกไปในรูปแบบ dayjs หรือ string
    onChange?.(newValue);
  };

  return (
    <FormControl fullWidth error={!!(error || localError)}>
      {label && <FormLabel>{label}</FormLabel>}

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          {...props}
          value={value ? dayjs(value) : null}
          onChange={handleChange}
          minDate={minDate ? dayjs(minDate) : undefined}
          maxDate={maxDate ? dayjs(maxDate) : undefined}
          format={format}
          disableFuture={disableFuture}
          disablePast={disablePast}
          slotProps={{
            textField: {
              fullWidth: true,
              variant: props.variant || "outlined",
              error: !!(error || localError),
              sx: {
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#555" : "#ccc",
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
              },
            },
          }}
        />
      </LocalizationProvider>

      {(helperText || localError) && (
        <FormHelperText>{localError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default BSDatepicker;
