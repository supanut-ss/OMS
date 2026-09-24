export const formatDate = (value, locale) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatAmount = (value, currency, locale) => {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);

  const currencyCode = String(currency || "THB").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currencyCode}`;
  }
};

const BADGE_PALETTES = {
  success: { backgroundColor: "#d4edda", color: "#155724" },
  warning: { backgroundColor: "#fff3cd", color: "#856404" },
  danger: { backgroundColor: "#f8d7da", color: "#721c24" },
  info: { backgroundColor: "#cce5ff", color: "#004085" },
  neutral: { backgroundColor: "#e2e3e5", color: "#383d41" },
};

const normalizeBadgeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

export const getPlatformBadgeSx = (value) => {
  const platform = normalizeBadgeValue(value);
  const backgroundColor = platform.includes("shopee")
    ? "#ee4d2d"
    : platform.includes("lazada")
      ? "#0f156d"
      : platform.includes("tiktok")
        ? "#000000"
        : "#5b6472";

  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 1,
    px: 1.125,
    py: 0.375,
    bgcolor: backgroundColor,
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
};

export const getWm3StatusPalette = (value) => {
  const status = normalizeBadgeValue(value);
  if (
    ["cancel", "void", "reject", "fail", "error"].some((part) =>
      status.includes(part),
    )
  ) {
    return BADGE_PALETTES.danger;
  }
  if (
    ["pending", "mapped", "processing", "hold", "await", "queue"].some(
      (part) => status.includes(part),
    )
  ) {
    return BADGE_PALETTES.warning;
  }
  if (status === "close" || status === "closed") return BADGE_PALETTES.info;
  if (
    ["open", "ready", "ship", "complete", "deliver", "success"].some(
      (part) => status.includes(part),
    )
  ) {
    return BADGE_PALETTES.success;
  }
  return BADGE_PALETTES.neutral;
};

export const getSyncStatusPalette = (value) => {
  const status = normalizeBadgeValue(value);
  if (
    ["error", "fail", "invalid"].some((part) => status.includes(part))
  ) {
    return BADGE_PALETTES.danger;
  }
  if (
    ["pending", "mapped", "processing", "retry", "queue"].some((part) =>
      status.includes(part),
    )
  ) {
    return BADGE_PALETTES.warning;
  }
  if (
    ["sent", "sync", "complete", "success"].some((part) =>
      status.includes(part),
    )
  ) {
    return BADGE_PALETTES.success;
  }
  return BADGE_PALETTES.neutral;
};
