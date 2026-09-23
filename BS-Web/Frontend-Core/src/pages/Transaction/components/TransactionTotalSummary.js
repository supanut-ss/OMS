import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import SubjectOutlinedIcon from "@mui/icons-material/SubjectOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import { motion } from "framer-motion";
import Config from "../../../utils/Config";
import { useResource } from "../../../hooks/useResource";

const RESOURCE_GROUP = "total_summary";

const LABEL_DEFS = {
  totalSummary: ["TotalSummary", "Total Summary"],
  collapseSummary: ["CollapseSummary", "Collapse summary"],
  expandSummary: ["ExpandSummary", "Expand summary"],
  statusProgress: ["StatusProgress", "Status Progress"],
  overallProgress: ["OverallProgress", "Overall Progress"],
  totalLines: ["TotalLines", "Total Lines"],
  planQuantity: ["PlanQuantity", "Plan Quantity"],
  receiveQuantity: ["ReceiveQuantity", "Receive Quantity"],
  outstanding: ["Outstanding", "Outstanding"],
  shipQuantity: ["ShipQuantity", "Ship Quantity"],
};

const defaultSummary = {
  totalLines: 0,
  planQty: 0,
  receiveQty: 0,
  outstanding: 0,
  progressPct: 0,
};

const cardItems = [
  {
    key: "totalLines",
    label: "Total Lines",
    iconBg: "#ede9fe",
    iconColor: "#7c3aed",
    valueColor: undefined,
    icon: SubjectOutlinedIcon,
  },
  {
    key: "planQty",
    label: "Plan Quantity",
    iconBg: "#fff3cd",
    iconColor: "#d97706",
    valueColor: undefined,
    icon: Inventory2OutlinedIcon,
  },
  {
    key: "receiveQty",
    label: "Receive Quantity",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    valueColor: "#059669",
    icon: CheckCircleOutlineIcon,
  },
  {
    key: "outstanding",
    label: "Outstanding",
    iconBg: "#fee2e2",
    iconColor: "#dc2626",
    valueColor: "#dc2626",
    icon: PendingActionsOutlinedIcon,
  },
];

const getProgressBarColor = (value) => {
  if (value >= 100) return "#059669";
  if (value >= 50) return "#eab308";
  return "#dc2626";
};

const formatQuantityWithCommas = (value, decimalPlaces = Config.SCALE) => {
  if (value === null || value === undefined || value === "") return "-";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

const TransactionTotalSummary = ({
  summaryExpanded = true,
  onToggleExpand,
  formattedDate = "-",
  statusProgressLabel = "Status Progress",
  activeStep = 0,
  steps = [],
  summary = defaultSummary,
  planQuantityLabel = "Plan Quantity",
  receiveQuantityLabel = "Receive Quantity",
  shipQuantityLabel = null,
  decimalPlaces = 2,
  lang = null,
}) => {
  const { getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  useEffect(() => {
    let alive = true;

    const loadResources = async () => {
      try {
        const res = await getResources(RESOURCE_GROUP, lang);
        if (alive) setResourceData(res || []);
      } catch (error) {
        if (alive) setResourceData([]);
        console.error(`getResources(${RESOURCE_GROUP}) error:`, error);
      }
    };

    loadResources();

    return () => {
      alive = false;
    };
  }, [getResources, lang]);

  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(LABEL_DEFS).map(([key, [resourceName, fallback]]) => [
          key,
          resourceData?.find((res) => res.resource_name === resourceName)
            ?.resource_value || fallback,
        ]),
      ),
    [resourceData],
  );

  const mergedSummary = {
    ...defaultSummary,
    ...(summary || {}),
  };
  const roundedProgressPct = Math.max(
    0,
    Math.min(100, Math.round(Number(mergedSummary.progressPct || 0))),
  );

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        sx={{
          borderRadius: 2,
          p: summaryExpanded ? 2.5 : 1.25,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: summaryExpanded ? 1.25 : 0,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SummarizeOutlinedIcon sx={{ color: "#3b56c5" }} />
            <Typography
              variant="h5"
              sx={{
                color: "#3b56c5",
                fontWeight: 700,
                fontSize: summaryExpanded ? 18 : 16,
                lineHeight: 1.2,
              }}
            >
              {labels.totalSummary}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip
              title={
                summaryExpanded ? labels.collapseSummary : labels.expandSummary
              }
              placement="bottom"
            >
              <IconButton
                size="small"
                onClick={onToggleExpand}
                aria-label={
                  summaryExpanded
                    ? labels.collapseSummary
                    : labels.expandSummary
                }
                aria-expanded={summaryExpanded}
                sx={{
                  color: "#3b56c5",
                  borderRadius: 1,
                  boxShadow: summaryExpanded
                    ? "0 1px 6px rgba(59,86,197,0.12)"
                    : undefined,
                  border: "1px solid",
                  borderColor: summaryExpanded
                    ? "rgba(59,86,197,0.12)"
                    : "transparent",
                }}
              >
                {summaryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={summaryExpanded} unmountOnExit>
          <Divider sx={{ mb: 2.25 }} />
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.75, color: "text.secondary" }}
            >
              {statusProgressLabel || labels.statusProgress}
            </Typography>
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              sx={{
                "& .MuiStepIcon-root": {
                  transition: "all 260ms ease",
                },
                "& .MuiStepIcon-root.Mui-active": {
                  color: "#3b56c5",
                  filter: "drop-shadow(0 0 6px rgba(59,86,197,0.45))",
                  animation: "summaryStepBlink 1.2s ease-in-out infinite",
                },
                "& .MuiStepLabel-label.Mui-active": {
                  color: "#3b56c5",
                  fontWeight: 700,
                  animation: "summaryStepBlink 1.2s ease-in-out infinite",
                },
                "@keyframes summaryStepBlink": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.6 },
                  "100%": { opacity: 1 },
                },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                mm: "repeat(4, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              alignItems: "stretch",
              gap: 2,
              mb: 2.5,
            }}
          >
            {cardItems.map((item) => {
              const IconComponent = item.icon;
              const cardLabel =
                item.key === "planQty"
                  ? labels.planQuantity || planQuantityLabel || item.label
                  : item.key === "receiveQty"
                    ? (shipQuantityLabel
                      ? labels.shipQuantity || shipQuantityLabel
                      : labels.receiveQuantity || receiveQuantityLabel) ||
                    labels.receiveQuantity ||
                    item.label
                    : labels[item.key] || item.label;
              const displayValue =
                item.key === "totalLines"
                  ? formatQuantityWithCommas(mergedSummary[item.key], 0)
                  : formatQuantityWithCommas(
                    mergedSummary[item.key],
                    decimalPlaces,
                  );
              const displayValueLength = String(displayValue || "").length;
              const valueFontSize =
                displayValueLength >= 13
                  ? "clamp(0.72rem, 1vw, 0.95rem)"
                  : displayValueLength >= 11
                    ? "clamp(0.82rem, 1.15vw, 1.05rem)"
                    : displayValueLength >= 9
                      ? "clamp(0.92rem, 1.45vw, 1.2rem)"
                      : displayValueLength >= 6
                        ? "clamp(0.92rem, 1.9vw, 1.35rem)"
                        : "clamp(1.00rem, 2.2vw, 1.45rem)";

              return (
                <motion.div
                  key={item.key}
                  style={{ height: "100%" }}
                  whileHover={{ y: -4 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{ borderRadius: 2, p: 2, height: "100%" }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          backgroundColor: item.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent sx={{ color: item.iconColor }} />
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "clamp(0.7rem, 0.9vw, 0.85rem)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cardLabel}
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color={item.valueColor}
                          sx={{
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "clip",
                            letterSpacing: "-0.02em",
                           fontSize: {
                              xs: "clamp(1.00rem, 2.5vw, 1.25rem)",
                              sm: "clamp(1.05rem, 2.5vw, 1.35rem)",
                              md: "clamp(1.15rem, 2.5vw, 1.45rem)",
                              mm: "clamp(1.25rem, 2.5vw, 1.55rem)",
                              lg: valueFontSize,
                           },
                          }}
                        >
                          {displayValue}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              );
            })}
            <motion.div
              style={{ height: "100%" }}
              whileHover={{ y: -4 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <Paper
                variant="outlined"
                sx={{ borderRadius: 2, p: 2, height: "100%" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      backgroundColor: "#eef2ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AutoGraphOutlinedIcon sx={{ color: "#3b56c5" }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.75,
                        width: "100%",
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        letterSpacing={1}
                        sx={{
                          textTransform: "uppercase",
                          flex: 1,
                          minWidth: 0,        // สำคัญมาก
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {labels.overallProgress}
                      </Typography>

                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="#3b56c5"
                        sx={{
                          flexShrink: 0,      // ไม่ให้ตัวเลขถูกบีบ
                          fontSize: "clamp(0.8rem, 1.05vw, 1rem)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatQuantityWithCommas(roundedProgressPct, 0)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={roundedProgressPct}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: "#e5e7eb",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          backgroundColor: getProgressBarColor(
                            roundedProgressPct,
                          ),
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          </Box>
        </Collapse>
      </Paper>
    </motion.div>
  );
};

export default memo(TransactionTotalSummary);
