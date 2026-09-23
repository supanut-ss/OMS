import React from "react";
import Button from "@mui/material/Button";
import { ButtonConfigs } from "../../utils/ButtonConfigs";
import CloseIcon from "@mui/icons-material/Close";

const BSCloseOutlinedButton = React.forwardRef(
  ({ children, sx, ...props }, ref) => {
    const { ACTION_BUTTON_THEMES } = ButtonConfigs();

    return (
      <Button
        ref={ref}
        variant="contained"
        sx={{
          ...(ACTION_BUTTON_THEMES.close || {}),
          color: "#FFFFFF",
          "&:focus-visible": {
            boxShadow: "0 0 0 3px rgba(100, 116, 139, 0.35)",
          },
          ...sx,
        }}
        {...props}
        startIcon={<CloseIcon />}
      >
        {children}
      </Button>
    );
  },
);

BSCloseOutlinedButton.displayName = "BSCloseOutlinedButton";

export default BSCloseOutlinedButton;
