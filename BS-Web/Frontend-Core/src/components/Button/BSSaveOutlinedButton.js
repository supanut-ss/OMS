import React from "react";
import Button from "@mui/material/Button";
import { logActivity } from "../../utils/ActivityLogger";
import { ButtonConfigs } from "../../utils/ButtonConfigs";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

const resolveButtonText = (children) => {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    const textChild = children.find((child) => typeof child === "string");
    return textChild || "Save";
  }
  return "Save";
};

const BSSaveOutlinedButton = React.forwardRef(
  ({ onClick, children, sx, ...props }, ref) => {
    const { ACTION_BUTTON_THEMES } = ButtonConfigs();

    const handleClick = (event) => {
      logActivity({
        action_type: "SAVE_CLICK",
        page: window.location.pathname,
        entity: resolveButtonText(children),
        entity_id: "-",
        description: "Save button clicked",
      });

      if (onClick) {
        onClick(event);
      }
    };

    return (
      <Button
        ref={ref}
        variant="contained"
        startIcon={<SaveOutlinedIcon />}
        onClick={handleClick}
        sx={{
          ...(ACTION_BUTTON_THEMES.success || {}),
          color: "#FFFFFF",
          "&:focus-visible": {
            boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.35)",
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

BSSaveOutlinedButton.displayName = "BSSaveOutlinedButton";

export default BSSaveOutlinedButton;
