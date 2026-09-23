import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SouthWestRoundedIcon from "@mui/icons-material/SouthWestRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import { Bar, Pie } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import AxiosMaster from "../../utils/AxiosMaster";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const sanitizeBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

const DEFAULT_API_BASE_URL = "";
const AUTO_GENERATE_PATH = "/dashboard/auto-generate";

const getContextByLanguage = (lang) => (lang === "th" ? "ภาษาไทย" : "english");

const extractJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  const text = String(value).trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

// Enhanced color palettes for charts
const vibrantColors = [
  "#2563EB", // blue
  "#22D3EE", // cyan
  "#F43F5E", // rose
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#10B981", // emerald
  "#E11D48", // red
  "#6366F1", // indigo
  "#F472B6", // fuchsia
  "#FBBF24", // yellow
  "#0EA5E9", // sky
  "#A3E635", // lime
  "#F87171", // light red
  "#818CF8", // light indigo
];

const pastelColors = [
  "#BFDBFE", // blue-200
  "#A7F3D0", // emerald-200
  "#FBCFE8", // pink-200
  "#FDE68A", // yellow-200
  "#DDD6FE", // violet-200
  "#FECACA", // red-200
  "#C7D2FE", // indigo-200
  "#F9A8D4", // fuchsia-200
  "#FDE68A", // amber-200
  "#BBF7D0", // green-200
  "#FCD34D", // yellow-300
  "#BAE6FD", // sky-200
  "#D1FAE5", // teal-100
  "#FECACA", // rose-200
  "#E0E7FF", // indigo-100
];

const normalizeDataset = (dataset, idx = 0, type = "bar") => {
  const data = Array.isArray(dataset?.data) ? dataset.data : [];
  let backgroundColor = dataset?.backgroundColor || dataset?.background_color;
  if (!backgroundColor) {
    if (type === "pie") {
      backgroundColor = pastelColors.slice(0, Math.max(1, data.length));
    } else {
      // For bar/line, use vibrant color for each dataset
      backgroundColor = vibrantColors[idx % vibrantColors.length];
    }
  }
  return {
    label: dataset?.label || "Value",
    data,
    backgroundColor,
    borderColor:
      dataset?.borderColor ||
      dataset?.border_color ||
      (type === "pie" ? "#fff" : "#1D4ED8"),
    borderWidth: 1.5,
    borderRadius: type === "bar" ? 8 : 0,
    hoverBackgroundColor: Array.isArray(backgroundColor)
      ? backgroundColor.map((c) => c + "CC")
      : backgroundColor + "CC",
  };
};

const normalizeDashboardPayload = (rawData) => {
  const parsed = extractJsonObject(rawData);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response is not valid JSON");
  }

  const widgets = Array.isArray(parsed?.widgets)
    ? parsed.widgets.map((widget, index) => {
        const type = String(widget?.type || "").toLowerCase();
        return {
          type,
          title: widget?.title || `Widget ${index + 1}`,
          data: {
            labels: Array.isArray(widget?.data?.labels)
              ? widget.data.labels
              : [],
            datasets: Array.isArray(widget?.data?.datasets)
              ? widget.data.datasets.map((ds, i) =>
                  normalizeDataset(ds, i, type),
                )
              : [],
          },
        };
      })
    : [];

  return {
    title: parsed?.title || "WMS Inventory Overview",
    description:
      parsed?.description || "Real-time warehouse stock and flow monitoring",
    riskSummary: {
      level: parsed?.risk_summary?.level || "OK",
      criticalCount: Number(parsed?.risk_summary?.critical_count || 0),
      lowStockCount: Number(parsed?.risk_summary?.low_stock_count || 0),
    },
    dataInsights: {
      total: Number(parsed?.data_insights?.total || 0),
      critical: Number(parsed?.data_insights?.critical || 0),
      lowStock: Number(parsed?.data_insights?.low_stock || 0),
      inbound: Number(parsed?.data_insights?.inbound || 0),
      outbound: Number(parsed?.data_insights?.outbound || 0),
      riskPercent: Number(parsed?.data_insights?.risk_percent || 0),
    },
    widgets,
    generatedAt: parsed?.generated_at || null,
  };
};

const getRiskSeverity = (level) => {
  const normalized = String(level || "").toUpperCase();
  if (normalized === "CRITICAL") return "error";
  if (normalized === "WARN" || normalized === "WARNING") return "warning";
  return "success";
};

const getRiskMeta = (level) => {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "CRITICAL") {
    return {
      color: "#7F1D1D",
      bg: "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)",
    };
  }

  if (normalized === "WARN" || normalized === "WARNING") {
    return {
      color: "#92400E",
      bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
    };
  }

  return {
    color: "#166534",
    bg: "linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)",
  };
};

const DashboardAI = ({ lang = "th" }) => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const hasAutoLoaded = useRef(false);

  const apiBaseUrl = useMemo(() => {
    const resolvedBaseUrl =
      process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL;
    return sanitizeBaseUrl(resolvedBaseUrl);
  }, []);


  const fetchDashboard = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setApiError("");

    try {
      const response = await AxiosMaster.post(
        AUTO_GENERATE_PATH,
        { context: getContextByLanguage(lang) },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      setDashboardData(normalizeDashboardPayload(response?.data));
    } catch (error) {
      setApiError(
        error?.response?.data?.message ||
          error?.message ||
          (lang === "th"
            ? "ไม่สามารถสร้าง Dashboard จาก AI ได้"
            : "Cannot generate dashboard from AI"),
      );
    } finally {
      setLoading(false);
    }
  }, [ lang, loading]);

  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    fetchDashboard();
  }, [fetchDashboard]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 14,
            padding: 14,
            color: "#334155",
            font: {
              family: "Prompt, Sarabun, sans-serif",
              size: 12,
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#475569",
            font: {
              family: "Prompt, Sarabun, sans-serif",
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
          ticks: {
            color: "#475569",
            font: {
              family: "Prompt, Sarabun, sans-serif",
            },
          },
        },
      },
    }),
    [],
  );

  const statsCards = useMemo(
    () => [
      {
        key: "total",
        label: lang === "th" ? "จำนวนข้อมูลทั้งหมด" : "Total Data",
        value: dashboardData?.dataInsights?.total ?? 0,
        icon: <Inventory2OutlinedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
        shadow: "0 14px 28px rgba(37, 99, 235, 0.26)",
      },
      {
        key: "inbound",
        label: "Inbound",
        value: dashboardData?.dataInsights?.inbound ?? 0,
        icon: <SouthWestRoundedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
        shadow: "0 14px 28px rgba(13, 148, 136, 0.26)",
      },
      {
        key: "outbound",
        label: "Outbound",
        value: dashboardData?.dataInsights?.outbound ?? 0,
        icon: <NorthEastRoundedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #E11D48 0%, #9F1239 100%)",
        shadow: "0 14px 28px rgba(225, 29, 72, 0.26)",
      },
      {
        key: "critical",
        label: "Critical",
        value: dashboardData?.dataInsights?.critical ?? 0,
        icon: <WarningAmberRoundedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
        shadow: "0 14px 28px rgba(245, 158, 11, 0.28)",
      },
      {
        key: "lowStock",
        label: "Low Stock",
        value: dashboardData?.dataInsights?.lowStock ?? 0,
        icon: <ShieldOutlinedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
        shadow: "0 14px 28px rgba(124, 58, 237, 0.26)",
      },
      {
        key: "riskPercent",
        label: "Risk %",
        value: `${dashboardData?.dataInsights?.riskPercent ?? 0}%`,
        icon: <PercentRoundedIcon fontSize="large" />,
        bg: "linear-gradient(135deg, #DB2777 0%, #9D174D 100%)",
        shadow: "0 14px 28px rgba(219, 39, 119, 0.26)",
      },
    ],
    [dashboardData, lang],
  );

  const riskMeta = getRiskMeta(dashboardData?.riskSummary?.level);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: "100%",
        width: "100%",
        background:
          "radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0) 44%), radial-gradient(circle at 100% 15%, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0) 40%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        "@keyframes dashFadeUp": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Stack spacing={2.5} sx={{ width: "100%" }}>
        <Card
          sx={{
            overflow: "hidden",
            bgcolor: "#FFFFFF",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: { xs: 1.8, md: 2.2 },
              background:
                "linear-gradient(102deg, #E0F2FE 0%, #DBEAFE 45%, #EDE9FE 100%)",
              color: "#0F172A",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <AutoAwesomeIcon />
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{ fontFamily: "Prompt, Sarabun, sans-serif" }}
                  >
                    AI Dashboard Command Center
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#334155",
                    fontFamily: "Sarabun, Prompt, sans-serif",
                  }}
                >
                  {lang === "th"
                    ? "ภาพรวมคลังสินค้าแบบเรียลไทม์ พร้อมสัญญาณความเสี่ยงและแนวโน้มสำคัญ"
                    : "Real-time inventory intelligence with risk signals and trend highlights."}
                </Typography>
              </Stack>

              <Button
                variant="contained"
                startIcon={
                  loading ? <CircularProgress size={18} /> : <RefreshIcon />
                }
                onClick={fetchDashboard}
                disabled={loading}
                sx={{
                  whiteSpace: "nowrap",
                  minWidth: 190,
                  borderRadius: 999,
                  fontWeight: 700,
                  textTransform: "none",
                  background:
                    "linear-gradient(90deg, #0EA5E9 0%, #2563EB 55%, #1D4ED8 100%)",
                  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.32)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #0284C7 0%, #1D4ED8 55%, #1E40AF 100%)",
                  },
                }}
              >
                {loading
                  ? lang === "th"
                    ? "กำลังสร้าง Dashboard"
                    : "Generating"
                  : lang === "th"
                    ? "โหลดข้อมูลใหม่"
                    : "Reload Dashboard"}
              </Button>
            </Stack>
          </Box>
        </Card>

        {apiError ? <Alert severity="error">{apiError}</Alert> : null}

        {dashboardData ? (
          <>
            <Card
              sx={{
                bgcolor: "#FFFFFF",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                boxShadow: "0 12px 26px rgba(15, 23, 42, 0.07)",
              }}
            >
              <CardContent>
                <Grid container spacing={2} alignItems="stretch">
                  <Grid item xs={12} md={8}>
                    <Stack spacing={1.2}>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{
                          fontFamily: "Prompt, Sarabun, sans-serif",
                          color: "#0F172A",
                        }}
                      >
                        {dashboardData.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "Sarabun, Prompt, sans-serif",
                          color: "#475569",
                        }}
                      >
                        {dashboardData.description}
                      </Typography>
                      <Alert
                        severity={getRiskSeverity(
                          dashboardData?.riskSummary?.level,
                        )}
                      >
                        {lang === "th"
                          ? `สถานะความเสี่ยง: ${dashboardData?.riskSummary?.level} | Critical ${dashboardData?.riskSummary?.criticalCount} | Low Stock ${dashboardData?.riskSummary?.lowStockCount}`
                          : `Risk Level: ${dashboardData?.riskSummary?.level} | Critical ${dashboardData?.riskSummary?.criticalCount} | Low Stock ${dashboardData?.riskSummary?.lowStockCount}`}
                      </Alert>
                      {dashboardData.generatedAt ? (
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                          {lang === "th"
                            ? `สร้างเมื่อ: ${new Date(dashboardData.generatedAt).toLocaleString()}`
                            : `Generated at: ${new Date(dashboardData.generatedAt).toLocaleString()}`}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        height: "100%",
                        minHeight: 120,
                        borderRadius: 2,
                        px: 2,
                        py: 1.6,
                        background: riskMeta.bg,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(15, 23, 42, 0.72)",
                          fontWeight: 700,
                        }}
                      >
                        RISK STATUS
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          color: riskMeta.color,
                          lineHeight: 1.1,
                        }}
                      >
                        {dashboardData?.riskSummary?.level}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.4, color: "#334155" }}
                      >
                        {lang === "th"
                          ? "ภาพรวมความเสี่ยงล่าสุดของคลังสินค้า"
                          : "Current warehouse risk posture"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(6, 1fr)",
                },
                gap: { xs: 1.5, sm: 2.25 },
                width: "100%",
                alignItems: "stretch",
                mb: 1.5,
              }}
            >
              {statsCards.map((card, index) => (
                <Card
                  key={card.key}
                  sx={{
                    height: { xs: 120, sm: 140, md: 150 },
                    minHeight: 100,
                    border: "none",
                    borderRadius: 3,
                    background: card.bg,
                    boxShadow: card.shadow,
                    color: "#FFFFFF",
                    position: "relative",
                    overflow: "hidden",
                    animation: "dashFadeUp 0.45s ease both",
                    animationDelay: `${index * 70}ms`,
                    transition: "transform 0.22s ease, box-shadow 0.22s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "stretch",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(120deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%)",
                      pointerEvents: "none",
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      height: "100%",
                      p: 2.2,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: "rgba(255, 255, 255, 0.9)",
                          letterSpacing: 0.25,
                        }}
                      >
                        {card.label}
                      </Typography>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          lineHeight: 1.05,
                          fontFamily: "Prompt, Sarabun, sans-serif",
                          color: "#FFFFFF",
                        }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(255, 255, 255, 0.18)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                      }}
                    >
                      {card.icon}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Grid container spacing={2}>
              {dashboardData.widgets.map((widget, index) => (
                <Grid
                  item
                  xs={12}
                  md={
                    dashboardData.widgets.length % 2 === 1 &&
                    index === dashboardData.widgets.length - 1
                      ? 12
                      : 6
                  }
                  key={`${widget.title}-${index}`}
                >
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: "#FFFFFF",
                      border: "1px solid rgba(148, 163, 184, 0.4)",
                      boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1.2}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{
                            fontFamily: "Prompt, Sarabun, sans-serif",
                            color: "#0F172A",
                          }}
                        >
                          {widget.title}
                        </Typography>
                        <Divider />
                        <Box sx={{ height: 320 }}>
                          {widget.type === "pie" ? (
                            <Pie
                              data={widget.data}
                              options={{
                                ...chartOptions,
                                scales: undefined,
                              }}
                            />
                          ) : (
                            <Bar data={widget.data} options={chartOptions} />
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Alert severity="info">
            {lang === "th"
              ? "กำลังเตรียม Dashboard อัจฉริยะ กรุณารอสักครู่"
              : "Preparing intelligent dashboard. Please wait."}
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default DashboardAI;
