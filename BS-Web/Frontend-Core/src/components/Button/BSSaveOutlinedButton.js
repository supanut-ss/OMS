import React from "react";
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { logActivity } from '../../utils/ActivityLogger';

const StyledSaveOutlinedButton = styled(Button)(({ theme }) => ({
  borderColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
  color: theme.palette.custom?.saveButton || theme.palette.primary.main,
  '&:hover': {
    borderColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
    backgroundColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&.Mui-focusVisible': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&:active': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  }
}));

const resolveButtonText = (children) => {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    const textChild = children.find((child) => typeof child === "string");
    return textChild || "Save";
  }
  return "Save";
};

const BSSaveOutlinedButton = React.forwardRef(({ onClick, children, ...props }, ref) => {
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
    <StyledSaveOutlinedButton ref={ref} onClick={handleClick} {...props}>
      {children}
    </StyledSaveOutlinedButton>
  );
});

BSSaveOutlinedButton.displayName = "BSSaveOutlinedButton";

export default BSSaveOutlinedButton;
