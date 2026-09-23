import React from "react";
import { FormControl } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers-pro/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers-pro/AdapterDayjs";
// import muiLicenseManager from "../utils/muiLicenseManager";
// import Logger from "../utils/logger";
import {
  DateRangePicker,
  DatePicker,
  DateTimePicker,
  DateTimeRangePicker,
  SingleInputDateTimeRangeField,
} from "@mui/x-date-pickers-pro";

const compactDateInputSx = {
  "& .MuiInputBase-root:not(.MuiInputBase-multiline), & .MuiOutlinedInput-root:not(.MuiInputBase-multiline), & .MuiPickersInputBase-root": {
    minHeight: 44,
    alignItems: "center",
  },
  "& .MuiInputBase-input, & .MuiOutlinedInput-input, & .MuiInputBase-inputSizeSmall, & .MuiOutlinedInput-inputSizeSmall, & .MuiPickersInputBase-input": {
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
};

const BSDatepicker = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = "",
  format = "DD/MM/YYYY",
  borderLeftRadius = null,
  isRange = false,
  isDateOnly = false,
  size = "small",
  slotProps,
  sx,
  placeholder,
  ...props
}) => {
  const joinedInputSx = {
    ...compactDateInputSx,
    ...(borderLeftRadius && {
      "& .MuiInputBase-root, & .MuiOutlinedInput-root, & .MuiPickersInputBase-root": {
        borderTopLeftRadius: borderLeftRadius,
        borderBottomLeftRadius: borderLeftRadius,
      },
      "& .MuiInputBase-root fieldset, & .MuiOutlinedInput-root fieldset, & .MuiPickersInputBase-root fieldset": {
        borderTopLeftRadius: borderLeftRadius,
        borderBottomLeftRadius: borderLeftRadius,
      },
    }),
    position: "relative",
    zIndex: 1,
    "&:focus-within": {
      zIndex: 2,
    },
  };
  // const licenseStatus = muiLicenseManager.getLicenseStatus();
  // Logger.log("🔐 MUI X License Status:", licenseStatus);

  // if (licenseStatus.hasLicenseKey) {
  //   Logger.log("✅ MUI X Pro features are available");
  // } else {
  //   Logger.warn("⚠️ MUI X Pro license not found - some features may be limited");
  // }
  return isRange === true ? (
    <FormControl fullWidth error={error} sx={{ mb: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {isDateOnly ? (
          <DateRangePicker
            value={value || [null, null]}
            slotProps={{
              textField: {
                ...slotProps?.textField,
                error: error,
                helperText: helperText,
                fullWidth: true,
                size: size,
                placeholder: placeholder,
                sx: {
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: error ? "red" : undefined,
                    },
                  },
                  ...joinedInputSx,
                  ...slotProps?.textField?.sx,
                },
              },
            }}
            label={label}
            format={format}
            onChange={(newValue) => {
              onChange(newValue);
            }}
            slots={{ field: SingleInputDateTimeRangeField }}
            calendars={2}
            readOnly={props.readOnly}
          />
        ) : (
          <DateTimeRangePicker
            value={value || [null, null]}
            label={label}
            disablePast={error}
            format={format}
            onChange={(newValue) => {
              onChange(newValue);
            }}
            slots={{ field: SingleInputDateTimeRangeField }}
            slotProps={{
              textField: {
                ...slotProps?.textField,
                error: error,
                helperText: helperText,
                fullWidth: true,
                size: size,
                placeholder: placeholder,
                sx: {
                  ...joinedInputSx,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: error ? "red" : undefined,
                    },
                  },
                  ...slotProps?.textField?.sx,
                },
              },
            }}
            calendars={2}
            sx={{
              ...joinedInputSx,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: error ? "red" : undefined,
                },
              },
              ...sx,
            }}

          />
        )}
      </LocalizationProvider>
    </FormControl>
  ) : (
    <FormControl fullWidth error={error}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {isDateOnly === true ? (
          <DatePicker
            label={label}
            value={value}
            onChange={onChange}
            format={format}
            readOnly={props.readOnly}
            disabled={props.disabled}
            slotProps={{
              textField: {
                ...slotProps?.textField,
                required,
                readOnly: props.readOnly,
                disabled: props.disabled,
                error: error,
                helperText: helperText,
                fullWidth: true,
                size: size,
                placeholder: placeholder,
                sx: {
                  ...joinedInputSx,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: error ? "red" : undefined,
                    },
                  },
                  ...slotProps?.textField?.sx,
                },
              },
            }}
            sx={sx}
            {...props}
          />
        ) : (
          <DateTimePicker
            label={label}
            value={value}
            onChange={onChange}
            format={format}
            readOnly={props.readOnly}
            disabled={props.disabled}
            slotProps={{
              textField: {
                ...slotProps?.textField,
                required,
                readOnly: props.readOnly,
                error: error,
                helperText: helperText,
                disabled: props.disabled,
                fullWidth: true,
                size: size,
                placeholder: placeholder,
                sx: {
                  ...joinedInputSx,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: error ? "red" : undefined,
                    },
                  },
                  ...slotProps?.textField?.sx,
                },
              },
            }}
            sx={sx}
            {...props}
          />
        )}
      </LocalizationProvider>
    </FormControl>
  );
};

export default BSDatepicker;
