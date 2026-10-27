import { Box, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const STATUS_FLOWS = {
  shopee: [
    "UNPAID",
    "READY_TO_SHIP",
    "PROCESSED",
    "SHIPPED",
    "TO_CONFIRM_RECEIVE",
    "COMPLETED",
  ],
  lazada: [
    "UNPAID",
    "PENDING",
    "PACKED",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
  ],
  tiktok: [
    "UNPAID",
    "ON_HOLD",
    "AWAITING_SHIPMENT",
    "PARTIALLY_SHIPPING",
    "AWAITING_COLLECTION",
    "IN_TRANSIT",
    "DELIVERED",
    "COMPLETED",
  ],
};

const ALIASES = {
  shopee: {
    INVOICE_PENDING: "UNPAID",
    RETRY_SHIP: "READY_TO_SHIP",
    TO_RETURN: "SHIPPED",
  },
  lazada: {
    TOPACK: "PENDING",
    TOSHIP: "READY_TO_SHIP",
    REPACKED: "PACKED",
  },
};

const CANCELLED_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "IN_CANCEL",
  "FAILED",
  "FAILED_DELIVERY",
]);

const RETURN_STATUSES = new Set([
  "RETURNED",
  "TO_RETURN",
  "REVERSE",
  "REFUNDED",
  "RETURN_REFUND",
]);

export const normalizeOrderPlatform = (value) => {
  const platform = String(value || "").trim().toLowerCase();
  if (platform.includes("shopee")) return "shopee";
  if (platform.includes("lazada")) return "lazada";
  if (platform.includes("tiktok")) return "tiktok";
  return platform;
};

export const normalizePlatformStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const compactStatusLabel = (status) => {
  const labels = {
    READY_TO_SHIP: "READY",
    TO_CONFIRM_RECEIVE: "TO RECEIVE",
    AWAITING_SHIPMENT: "AWAIT SHIP",
    PARTIALLY_SHIPPING: "PARTIAL",
    AWAITING_COLLECTION: "AWAIT PICKUP",
  };
  return labels[status] || status.replaceAll("_", " ");
};

const resolveProgress = (platformValue, statusValue) => {
  const platform = normalizeOrderPlatform(platformValue);
  const rawStatus = normalizePlatformStatus(statusValue);
  const steps = STATUS_FLOWS[platform] || [];
  const resolvedStatus = ALIASES[platform]?.[rawStatus] || rawStatus;
  const currentIndex = steps.indexOf(resolvedStatus);
  const exceptionType = CANCELLED_STATUSES.has(rawStatus)
    ? "cancelled"
    : RETURN_STATUSES.has(rawStatus)
      ? "return"
      : currentIndex < 0 && rawStatus
        ? "unknown"
        : null;

  return { currentIndex, exceptionType, platform, rawStatus, steps };
};

const statusColor = (theme, state) => {
  if (state === "done") return theme.palette.success.main;
  if (state === "current") return theme.palette.primary.main;
  return alpha(theme.palette.text.secondary, 0.16);
};

const statusTextColor = (theme, state) => {
  if (state === "done" || state === "current") {
    return theme.palette.getContrastText(
      state === "done" ? theme.palette.success.main : theme.palette.primary.main,
    );
  }
  return theme.palette.text.secondary;
};

const OrderStatusProgress = ({
  platform,
  status,
  compact = false,
  lang = "th",
}) => {
  const theme = useTheme();
  const progress = resolveProgress(platform, status);
  const exceptionColor =
    progress.exceptionType === "return"
      ? theme.palette.warning.main
      : progress.exceptionType === "unknown"
        ? theme.palette.grey[600]
        : theme.palette.error.main;

  if (progress.steps.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        {progress.rawStatus || "—"}
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        role="progressbar"
        aria-label={
          lang === "th"
            ? `สถานะคำสั่งซื้อ ${progress.rawStatus || "ไม่ทราบ"}`
            : `Order status ${progress.rawStatus || "unknown"}`
        }
        sx={{ display: "flex", alignItems: "stretch", minWidth: 0 }}
      >
        {progress.steps.map((step, index) => {
          const state =
            progress.currentIndex === index
              ? "current"
              : progress.currentIndex > index
                ? "done"
                : "pending";
          const label = compact ? compactStatusLabel(step) : step;

          return (
            <Tooltip key={step} title={step.replaceAll("_", " ")} arrow>
              <Box
                sx={{
                  position: "relative",
                  zIndex: progress.steps.length - index,
                  flex: "1 1 0",
                  minWidth: 0,
                  ml: index === 0 ? 0 : "-4px",
                  px: compact ? 0.55 : 1.2,
                  py: compact ? 0.65 : 1,
                  bgcolor: statusColor(theme, state),
                  color: statusTextColor(theme, state),
                  clipPath:
                    index === 0
                      ? "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%, 7px 50%)"
                      : "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%, 7px 50%)",
                  outline:
                    state === "current"
                      ? `1px solid ${alpha(theme.palette.primary.dark, 0.35)}`
                      : "none",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    fontSize: compact ? 8 : 10.5,
                    fontWeight: state === "current" ? 800 : 650,
                    lineHeight: 1.25,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {progress.exceptionType && (
          <Tooltip title={progress.rawStatus.replaceAll("_", " ")} arrow>
            <Box
              sx={{
                flex: "0 0 auto",
                ml: 0.5,
                px: compact ? 0.8 : 1.25,
                py: compact ? 0.65 : 1,
                borderRadius: 1,
                bgcolor: exceptionColor,
                color: theme.palette.getContrastText(exceptionColor),
              }}
            >
              <Typography
                component="span"
                sx={{ fontSize: compact ? 8 : 10.5, fontWeight: 800, lineHeight: 1.25 }}
              >
                {compactStatusLabel(progress.rawStatus)}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
          {lang === "th" ? "สถานะปัจจุบัน" : "Current status"}: {progress.rawStatus || "—"}
        </Typography>
      )}
    </Box>
  );
};

export default OrderStatusProgress;
