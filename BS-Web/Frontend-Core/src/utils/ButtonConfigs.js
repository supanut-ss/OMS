export const ButtonConfigs = () => {
  const ACTION_BUTTON_BASE_SX = {
    minHeight: 33,
    px: 2,
    py: 0.7,
    fontWeight: 400,
    "&:hover": {
      boxShadow: "0 12px 26px rgba(15, 23, 42, 0.24)",
      filter: "brightness(1.04)",
    },
  };
  const ACTION_BUTTON_THEMES = {
    success: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #10B981 0%, #10B981 100%)",
    },
    close: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #64748B 0%, #64748B 100%)",
    },
    warning: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #F59E0B 0%, #F59E0B 100%)",
    },
    error: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #EF4444 0%, #EF4444 100%)",
    },
    info: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #3B82F6 0%, #3B82F6 100%)",
    },
    primary: {
      ...ACTION_BUTTON_BASE_SX,
      background: "primary.main",
    },
    clear: {
      ...ACTION_BUTTON_BASE_SX,
    },
  };
  return { ACTION_BUTTON_THEMES };
};
