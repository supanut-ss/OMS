import React from "react";
import { FormControl } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers-pro/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers-pro/AdapterDayjs";
import muiLicenseManager from "../utils/muiLicenseManager";
import Logger from "../utils/logger";
import { DateRangePicker, DateTimePicker, DateTimeRangePicker, SingleInputDateTimeRangeField } from "@mui/x-date-pickers-pro";
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
  const licenseStatus = muiLicenseManager.getLicenseStatus();
  Logger.log("🔐 MUI X License Status:", licenseStatus);

  if (licenseStatus.hasLicenseKey) {
    Logger.log("✅ MUI X Pro features are available");
  } else {
    Logger.warn("⚠️ MUI X Pro license not found - some features may be limited");
  }
  return (
    isRange ? (
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
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: error ? 'red' : undefined,
                      },
                    }
                  }
                }
              }}
              label={label}
              format={format}
              onChange={(newValue) => {
                onChange(newValue);
              }}
              slots={{ field: SingleInputDateTimeRangeField }}
              calendars={2}
              readOnly={props.readOnly}
            />) :
            <DateTimeRangePicker value={value || [null, null]}
              label={label}
              disablePast={error}
              format={format}
              onChange={(newValue) => {
                onChange(newValue);
              }}
              slots={{ field: SingleInputDateTimeRangeField }}
              calendars={2}
            />}

        </LocalizationProvider>
      </FormControl>

    ) : (
      <FormControl fullWidth error={error}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label={label}
            value={value}
            onChange={onChange}
            format={format}
            slotProps={{
              textField: {
                required,
                error: error,
                helperText: helperText,
                fullWidth: true,
                sx: {
                  ...(borderLeftRadius && {
                    "& .MuiPickersInputBase-root": {
                      borderTopLeftRadius: borderLeftRadius,
                      borderBottomLeftRadius: borderLeftRadius,
                     '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: error ? 'red' : undefined,
                      },
                    }},
                  }),
                },
              },
            }}
          />
        </LocalizationProvider>
      </FormControl>)
  );
};

export default BSDatepicker;
