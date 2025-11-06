import React from "react";
import { FormControl, FormHelperText } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const BSDatepicker = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = "",
  format = "DD/MM/YYYY",
}) => {
  return (
    <FormControl fullWidth error={error}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={label}
          value={value}
          onChange={onChange}
          format={format}
          slotProps={{
            textField: {
              required,
            //  size: "small",
              fullWidth: true,
              sx: {
             //   "& .MuiOutlinedInput-root": { height: "3.5rem" }
              },
            },
          }}
        />
      </LocalizationProvider>
      {error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BSDatepicker;
