import React from "react";
import { Box, Typography, Switch, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

// iOS-style Switch Component
const IOSSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 2,
    transitionDuration: "300ms",
    "&.Mui-checked": {
      transform: "translateX(16px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        backgroundColor: theme.palette.mode === "dark" ? "#2ECA45" : "#65C466",
        opacity: 1,
        border: 0,
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.5,
      },
    },
    "&.Mui-focusVisible .MuiSwitch-thumb": {
      color: "#33cf4d",
      border: "6px solid #fff",
    },
    "&.Mui-disabled .MuiSwitch-thumb": {
      color:
        theme.palette.mode === "light"
          ? theme.palette.grey[100]
          : theme.palette.grey[600],
    },
    "&.Mui-disabled + .MuiSwitch-track": {
      opacity: theme.palette.mode === "light" ? 0.7 : 0.3,
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 22,
    height: 22,
  },
  "& .MuiSwitch-track": {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === "light" ? "#E9E9EA" : "#39393D",
    opacity: 1,
    transition: theme.transitions.create(["background-color"], {
      duration: 500,
    }),
  },
}));

/**
 * BSSwitchField - iOS-style Switch component for boolean fields (is_active, is_*)
 * Designed to match MUI TextField height with floating label style
 *
 * @param {string} columnName - The column/field name
 * @param {string} label - Display label for the switch
 * @param {string|boolean|number} value - Current value (YES/NO, true/false, 1/0)
 * @param {function} onChange - Callback when value changes
 * @param {boolean} disabled - Whether the switch is disabled
 * @param {boolean} required - Whether the field is required
 * @param {string} description - Tooltip description
 * @param {string} yesValue - Value to use when switch is ON (default: "YES")
 * @param {string} noValue - Value to use when switch is OFF (default: "NO")
 * @param {object} localeText - Locale text object for translations
 */
const BSSwitchField = ({
  columnName,
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  description,
  yesValue = "YES",
  noValue = "NO",
  localeText,
}) => {
  // Convert value to boolean for Switch
  const isChecked =
    value === yesValue ||
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true";

  const handleChange = (event) => {
    // Convert boolean back to YES/NO string
    onChange(event.target.checked ? yesValue : noValue);
  };

  const switchContent = (
    <Box
      sx={{
        position: "relative",
        border: "none",
        borderColor: disabled ? "action.disabled" : "rgba(0, 0, 0, 0.23)",
        borderRadius: 1,
        px: 1.5,
        py: 1,
        minHeight: 38,
        display: "flex",
        alignItems: "center",
        backgroundColor: disabled ? "action.disabledBackground" : "transparent",
        "&:hover": {
          borderColor: disabled ? "action.disabled" : "text.primary",
        },
      }}
    >
      {/* Floating Label */}
      <Typography
        component="label"
        sx={{
          position: "absolute",
          top: -14,
          left: 12,
          px: 0.5,
          fontSize: "0.75rem",
          color: disabled ? "text.disabled" : "text.secondary",
          backgroundColor: "transparent",
          lineHeight: 1,
        }}
      >
        {label}
        {required && (
          // <Typography component="span" color="error.main" sx={{ ml: 0.25 }}>
          <Typography component="span" sx={{ ml: 0.25 }}>
            *
          </Typography>
        )}
      </Typography>

      {/* Switch and Label */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <IOSSwitch
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          inputProps={{ "aria-label": label }}
        />
        <Typography
          variant="body2"
          color={isChecked ? "success.main" : "text.secondary"}
          sx={{
            fontWeight: isChecked ? 500 : 400,
            fontSize: "0.875rem",
          }}
        >
          {isChecked ? localeText?.bsYes || "YES" : localeText?.bsNo || "NO"}
        </Typography>
      </Box>
    </Box>
  );

  // Wrap with Tooltip if description is provided
  return description ? (
    <Tooltip title={description} arrow placement="top">
      {switchContent}
    </Tooltip>
  ) : (
    switchContent
  );
};

export { IOSSwitch, BSSwitchField };
export default BSSwitchField;
