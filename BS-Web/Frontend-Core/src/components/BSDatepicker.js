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
  ...props
}) => {
  // const licenseStatus = muiLicenseManager.getLicenseStatus();
  // Logger.log("🔐 MUI X License Status:", licenseStatus);

  // if (licenseStatus.hasLicenseKey) {
  //   Logger.log("✅ MUI X Pro features are available");
  // } else {
  //   Logger.warn("⚠️ MUI X Pro license not found - some features may be limited");
  // }
  return isRange ===true? (
    <FormControl fullWidth error={error} sx={{ mb: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {isDateOnly ? (
          <DateRangePicker
            value={value || [null, null]}
            slotProps={{
              textField: {
                error: error,
                helperText: helperText,
                sx: {
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: error ? "red" : undefined,
                    },
                  },
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
            calendars={2}
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
                required,
                readOnly: props.readOnly,
                disabled: props.disabled,
                error: error,
                helperText: helperText,
                fullWidth: true,
                sx: {
                  ...(borderLeftRadius && {
                    "& .MuiPickersInputBase-root": {
                      borderTopLeftRadius: borderLeftRadius,
                      borderBottomLeftRadius: borderLeftRadius,
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: error ? "red" : undefined,
                        },
                      },
                    },
                  }),
                },
              },
            }}
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
                required,
                readOnly: props.readOnly,
                error: error,
                helperText: helperText,
                disabled: props.disabled,
                fullWidth: true,
                sx: {
                  ...(borderLeftRadius && {
                    "& .MuiPickersInputBase-root": {
                      borderTopLeftRadius: borderLeftRadius,
                      borderBottomLeftRadius: borderLeftRadius,
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: error ? "red" : undefined,
                        },
                      },
                    },
                  }),
                },
              },
            }}
            {...props}
          />
        )}
      </LocalizationProvider>
    </FormControl>
  );
};

export default BSDatepicker;
