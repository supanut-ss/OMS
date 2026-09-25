import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AccessTimeRounded,
  ArrowForwardRounded,
  AutoGraphRounded,
  CheckCircleOutlineRounded,
  ErrorOutlineRounded,
  HubOutlined,
  Inventory2Outlined,
  OpenInNewRounded,
  RefreshRounded,
  ScheduleRounded,
  StorefrontRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import AxiosMaster from "../../utils/AxiosMaster";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Filler);

const ORDER_PAGE_SIZE = 1000;
const RECENT_ORDER_LIMIT = 10;
const DATA_LIMITS = { runs: 100, history: 100 };
const ORDER_COLUMNS = ["order_record_id", "platform", "shop_id", "platform_order_id", "shop_name", "status", "sync_status", "total_amount", "currency", "order_created_date", "last_sync_date"];
const ORDER_SORT = [{ field: "order_record_id", sort: "asc" }];
const PLATFORM_COLORS = {
  shopee: "#EE4D2D",
  lazada: "#7357E8",
  tiktok: "#159B9C",
};
const PLATFORM_LOGOS = {
  shopee: "shopee.svg",
  lazada: "lazada.svg",
  tiktok: "tiktok.svg",
};
const PERIODS = [
  { value: "today", th: "วันนี้", en: "Today" },
  { value: "7d", th: "7 วัน", en: "7 days" },
  { value: "30d", th: "30 วัน", en: "30 days" },
  { value: "all", th: "ทั้งหมด", en: "All" },
];

function unwrapRows(response) {
  const body = response?.data ?? {};
  const rows = Array.isArray(body.rows) ? body.rows.map((row) => row?.data ?? row?.Data ?? row) : [];
  const parsedCount = Number(body.rowCount);
  const hasRowCount = body.rowCount !== null && body.rowCount !== undefined && body.rowCount !== "" && Number.isInteger(parsedCount) && parsedCount >= 0;
  return { rows, rowCount: hasRowCount ? parsedCount : rows.length, hasRowCount };
}

function formatError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function statusBucket(value) {
  const status = normalize(value);
  if (["SYNCED", "SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status)) return "synced";
  if (["PENDING", "PROCESSING", "QUEUED", "RETRY"].includes(status)) return "pending";
  if (["ERROR", "FAILED", "FAIL"].includes(status)) return "error";
  return "other";
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  const sqlDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/);
  if (sqlDate) {
    const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = "0"] = sqlDate;
    const date = new Date(
      Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute),
      Number(second), Number((fraction + "000").slice(0, 3)),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function platformIdentity(name, fallbackColor) {
  const label = String(name ?? "").trim() || "Unknown platform";
  const key = label.toLocaleLowerCase();
  const brandKey = ["shopee", "lazada", "tiktok"].find((brand) => key.includes(brand));
  return {
    key,
    label,
    brandKey,
    color: PLATFORM_COLORS[brandKey] || fallbackColor,
    logo: PLATFORM_LOGOS[brandKey] || null,
    mark: label.slice(0, 1).toUpperCase(),
  };
}

function PlatformLogo({ platform, size = 32 }) {
  if (!platform.logo) return null;
  return (
    <Box
      component="img"
      src={`${process.env.PUBLIC_URL}/platform-logos/${platform.logo}`}
      alt={`${platform.label} logo`}
      sx={{
        width: platform.brandKey === "lazada" ? size * 1.25 : size,
        height: platform.brandKey === "lazada" ? size * 0.8 : size,
        objectFit: "contain",
      }}
    />
  );
}

function formatDateTime(value, locale) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

function formatAmount(value, currency, locale) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const currencyCode = String(currency ?? "").trim().toUpperCase();
  try {
    if (/^[A-Z]{3}$/.test(currencyCode)) {
      return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(amount);
    }
  } catch {
    // Fall through for currency codes that are not supported by this browser.
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)}${currencyCode ? ` ${currencyCode}` : ""}`;
}

function detailIsError(detail) {
  return [detail?.run_status, detail?.action].some((value) =>
    ["ERROR", "FAILED", "FAIL"].includes(normalize(value)),
  );
}

function Panel({ children, sx }) {
  return (
    <Card elevation={0} sx={{
      p: { xs: 2, md: 2.75 }, borderRadius: "22px", height: "100%",
      border: "1px solid", borderColor: "divider", minWidth: 0, ...sx,
    }}>
      {children}
    </Card>
  );
}

function SectionTitle({ eyebrow, title, accessory }) {
  return (
    <Stack direction="row" gap={1.5} alignItems="center" justifyContent="space-between" mb={2.5}>
      <Box>
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, color: "text.secondary", mb: 0.5 }}>{eyebrow}</Typography>
        <Typography component="h2" sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700 }}>{title}</Typography>
      </Box>
      {accessory}
    </Stack>
  );
}

function makeRequest(tableName, selectColumns, sortModel, start, end, filterModel = { items: [], logicOperator: "and", quickFilterValues: "" }) {
  return AxiosMaster.post("/dynamic/datagrid", {
    tableName,
    schemaName: "oms",
    start,
    end,
    selectColumns,
    sortModel,
    filterModel,
    userLookup: { table: "", idField: "", displayFields: [] },
  }).then(unwrapRows);
}

const EMPTY_DATA = {
  orders: { rows: [], rowCount: 0 },
  allOrders: { rows: [], rowCount: 0 },
  runs: { rows: [], rowCount: 0 },
  history: { rows: [], rowCount: 0 },
};

export default function Dashboard({ lang = "th" }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const palette = theme.palette;
  const thai = lang === "th";
  const locale = thai ? "th-TH" : "en-US";
  const copy = (th, en) => (thai ? th : en);
  const requestSequence = useRef(0);
  const orderRequestSequence = useRef(0);
  const mounted = useRef(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [sourceErrors, setSourceErrors] = useState({});
  const [ordersError, setOrdersError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersLoadingScope, setOrdersLoadingScope] = useState("recent");
  const [orderProgress, setOrderProgress] = useState({ loaded: 0, total: null });
  const [recentOrdersLoaded, setRecentOrdersLoaded] = useState(false);
  const [allOrdersLoaded, setAllOrdersLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [period, setPeriod] = useState("30d");

  const loadDashboardData = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setSourceErrors({});

    const requests = [
      makeRequest(
        "t_oms_sync_log",
        ["sync_log_id", "sync_type", "sync_source", "platform", "shop_id", "sync_status", "total_fetched", "total_inserted", "total_updated", "total_failed", "start_date", "end_date", "duration_ms", "error_message", "create_date"],
        [{ field: "start_date", sort: "desc" }, { field: "sync_log_id", sort: "desc" }],
        0,
        DATA_LIMITS.runs,
      ),
      makeRequest(
        "vw_oms_order_sync_history",
        ["sync_log_detail_id", "sync_log_id", "order_record_id", "platform", "platform_order_id", "run_status", "action", "detail_message", "run_error_message", "display_message", "detail_create_date"],
        [{ field: "detail_create_date", sort: "desc" }, { field: "sync_log_detail_id", sort: "desc" }],
        0,
        DATA_LIMITS.history,
        {
          items: [
            { field: "run_status", operator: "equals", value: "ERROR" },
            { field: "action", operator: "equals", value: "ERROR" },
          ],
          logicOperator: "or",
          quickFilterValues: "",
        },
      ),
    ];
    const results = await Promise.allSettled(requests);
    if (!mounted.current || requestId !== requestSequence.current) return;

    const keys = ["runs", "history"];
    const successfulData = {};
    const nextErrors = {};
    let hasSuccessfulSource = false;
    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === "fulfilled") {
        successfulData[key] = result.value;
        hasSuccessfulSource = true;
      } else {
        nextErrors[key] = formatError(result.reason);
      }
    });
    if (hasSuccessfulSource) setData((previousData) => ({ ...previousData, ...successfulData }));
    setSourceErrors(nextErrors);
    if (hasSuccessfulSource) setLastUpdated(new Date());
    setLoading(false);
  }, []);

  const loadOrders = useCallback(async (scope) => {
    const requestId = ++orderRequestSequence.current;
    const isAll = scope === "all";
    setOrdersLoading(true);
    setOrdersLoadingScope(scope);
    setOrdersError("");
    setOrderProgress({ loaded: 0, total: null });
    if (isAll) setAllOrdersLoaded(false);
    else setRecentOrdersLoaded(false);

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 29);
    const filterModel = isAll
      ? { items: [], logicOperator: "and", quickFilterValues: "" }
      : {
        items: [{ field: "order_created_date", operator: ">=", value: `${dateKey(cutoff)}T00:00:00` }],
        logicOperator: "and",
        quickFilterValues: "",
      };

    try {
      const rowsById = new Map();
      let offset = 0;
      let totalCount = null;

      while (totalCount === null || offset < totalCount) {
        if (!mounted.current || requestId !== orderRequestSequence.current) return;
        const page = await makeRequest(
          "t_oms_order",
          ORDER_COLUMNS,
          ORDER_SORT,
          offset,
          offset + ORDER_PAGE_SIZE,
          filterModel,
        );
        if (!mounted.current || requestId !== orderRequestSequence.current) return;
        if (totalCount === null) {
          if (!page.hasRowCount) throw new Error("The order query did not return a total row count, so all orders cannot be confirmed.");
          totalCount = page.rowCount;
          setOrderProgress({ loaded: 0, total: totalCount });
        } else if (page.hasRowCount && page.rowCount !== totalCount) {
          throw new Error("The order count changed while loading. Refresh to get a consistent result.");
        }
        if (!page.rows.length) break;
        const pageOffset = offset;
        page.rows.forEach((row, index) => {
          const key = row.order_record_id ?? `${pageOffset}-${index}`;
          rowsById.set(String(key), row);
        });
        offset += page.rows.length;
        setOrderProgress({ loaded: rowsById.size, total: totalCount });
        if (page.rows.length < ORDER_PAGE_SIZE && offset < totalCount) break;
      }

      if (!mounted.current || requestId !== orderRequestSequence.current) return;
      if (rowsById.size < totalCount) {
        throw new Error(`Loaded ${rowsById.size} of ${totalCount} orders; refresh to retry.`);
      }
      const result = { rows: [...rowsById.values()], rowCount: totalCount };
      if (isAll) {
        setData((previousData) => ({ ...previousData, allOrders: result }));
        setAllOrdersLoaded(true);
      } else {
        setData((previousData) => ({ ...previousData, orders: result }));
        setRecentOrdersLoaded(true);
      }
      setLastUpdated(new Date());
    } catch (error) {
      if (!mounted.current || requestId !== orderRequestSequence.current) return;
      setOrdersError(formatError(error));
    } finally {
      if (mounted.current && requestId === orderRequestSequence.current) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadDashboardData();
    loadOrders("recent");
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
      orderRequestSequence.current += 1;
    };
  }, [loadDashboardData, loadOrders]);

  const handlePeriodChange = (_, value) => {
    if (!value || value === period) return;
    setOrdersError("");
    setPeriod(value);
    if (value === "all") {
      if (!allOrdersLoaded && !(ordersLoading && ordersLoadingScope === "all")) loadOrders("all");
      return;
    }
    if (ordersLoading && ordersLoadingScope === "all") {
      orderRequestSequence.current += 1;
      setOrdersLoading(false);
      if (!recentOrdersLoaded) loadOrders("recent");
    } else if (!recentOrdersLoaded && !(ordersLoading && ordersLoadingScope === "recent")) {
      loadOrders("recent");
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
    if (period === "all") {
      setData((previousData) => ({ ...previousData, allOrders: { rows: [], rowCount: 0 } }));
      loadOrders("all");
    } else {
      setAllOrdersLoaded(false);
      setData((previousData) => ({ ...previousData, allOrders: { rows: [], rowCount: 0 } }));
      loadOrders("recent");
    }
  };

  const platformOptions = useMemo(() => {
    const platforms = new Map();
    [...data.orders.rows, ...data.allOrders.rows, ...data.runs.rows].forEach((row) => {
      const identity = platformIdentity(row.platform, palette.primary.main);
      if (identity.label !== "Unknown platform" && !platforms.has(identity.key)) {
        platforms.set(identity.key, identity);
      }
    });
    return [...platforms.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [data.orders.rows, data.allOrders.rows, data.runs.rows, palette.primary.main]);

  const orderRows = useMemo(() => (period === "all"
    ? (allOrdersLoaded ? data.allOrders.rows : [])
    : (allOrdersLoaded ? data.allOrders.rows : data.orders.rows)),
  [allOrdersLoaded, data.allOrders.rows, data.orders.rows, period]);

  const scopedOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 0;
    const startDate = days ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1) : null;
    return orderRows.filter((order) => {
      if (selectedPlatform !== "all" && String(order.platform ?? "").trim().toLowerCase() !== selectedPlatform) return false;
      if (!startDate) return true;
      const created = parseDate(order.order_created_date);
      return Boolean(created && created >= startDate && created < new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    });
  }, [orderRows, period, selectedPlatform]);

  const visibleRuns = useMemo(() => data.runs.rows.filter((run) =>
    selectedPlatform === "all" || String(run.platform ?? "").trim().toLowerCase() === selectedPlatform,
  ), [data.runs.rows, selectedPlatform]);

  const platforms = useMemo(() => {
    const scopedNames = new Map();
    scopedOrders.forEach((order) => {
      const identity = platformIdentity(order.platform, palette.primary.main);
      scopedNames.set(identity.key, identity);
    });
    visibleRuns.forEach((run) => {
      const identity = platformIdentity(run.platform, palette.primary.main);
      if (!scopedNames.has(identity.key)) scopedNames.set(identity.key, identity);
    });
    return [...scopedNames.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [palette.primary.main, scopedOrders, visibleRuns]);

  const recentOrders = useMemo(() => [...scopedOrders]
    .sort((a, b) => (parseDate(b.order_created_date)?.getTime() ?? 0) - (parseDate(a.order_created_date)?.getTime() ?? 0)
      || Number(b.order_record_id || 0) - Number(a.order_record_id || 0))
    .slice(0, RECENT_ORDER_LIMIT), [scopedOrders]);

  const latestRuns = useMemo(() => [...visibleRuns]
    .sort((a, b) => (parseDate(b.start_date)?.getTime() ?? 0) - (parseDate(a.start_date)?.getTime() ?? 0))
    .slice(0, 6), [visibleRuns]);

  const errorDetailsByRun = useMemo(() => {
    const map = new Map();
    data.history.rows.filter(detailIsError).forEach((detail) => {
      const key = String(detail.sync_log_id ?? "");
      if (!key || map.has(key)) return;
      map.set(key, detail);
    });
    return map;
  }, [data.history.rows]);

  const counts = useMemo(() => scopedOrders.reduce((total, order) => {
    total[statusBucket(order.sync_status)] += 1;
    total.orders += 1;
    return total;
  }, { orders: 0, synced: 0, pending: 0, error: 0, other: 0 }), [scopedOrders]);

  const rate = counts.orders ? (counts.synced / counts.orders) * 100 : 0;
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  const statCards = [
    { label: copy("ออเดอร์ในช่วงที่เลือก", "Orders in selected period"), value: counts.orders, icon: Inventory2Outlined, color: palette.primary.main, tag: "ORDERS" },
    { label: copy("Sync สำเร็จ", "Synced"), value: counts.synced, icon: CheckCircleOutlineRounded, color: palette.success.main, tag: "SYNCED" },
    { label: copy("รอดำเนินการ", "Pending"), value: counts.pending, icon: ScheduleRounded, color: palette.warning.main, tag: "PENDING" },
    { label: copy("Sync ผิดพลาด", "Sync errors"), value: counts.error, icon: ErrorOutlineRounded, color: palette.error.main, tag: "ERROR" },
  ];
  const statusRows = [
    { key: "synced", label: copy("Sync สำเร็จ", "Synced"), value: counts.synced, color: palette.success.main },
    { key: "pending", label: copy("รอดำเนินการ", "Pending"), value: counts.pending, color: palette.warning.main },
    { key: "error", label: copy("ผิดพลาด", "Error"), value: counts.error, color: palette.error.main },
    { key: "other", label: copy("สถานะอื่น / ไม่ระบุ", "Other / unknown"), value: counts.other, color: palette.info.main },
  ];
  let accumulated = 0;
  const donutGradient = statusRows.map((item) => {
    const start = accumulated;
    accumulated += counts.orders ? item.value / counts.orders * 100 : 0;
    return `${item.color} ${start}% ${accumulated}%`;
  }).join(", ");

  const trend = useMemo(() => {
    const keys = [];
    if (period === "all") {
      const seenDates = new Set();
      scopedOrders.forEach((order) => {
        const key = dateKey(parseDate(order.order_created_date));
        if (key && !seenDates.has(key)) {
          seenDates.add(key);
          keys.push(key);
        }
      });
      keys.sort();
    } else {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (period === "today" ? 0 : period === "7d" ? 6 : 29));
      for (let day = 0; day < (period === "today" ? 1 : period === "7d" ? 7 : 30); day += 1) {
        const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
        keys.push(dateKey(current));
      }
    }
    return { keys, rows: scopedOrders };
  }, [period, scopedOrders]);

  const chartData = useMemo(() => ({
    labels: trend.keys.map((key) => {
      const date = parseDate(key);
      return date ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date) : key;
    }),
    datasets: platforms.map((platform) => {
      const dailyCounts = new Map();
      trend.rows.forEach((order) => {
        if (String(order.platform ?? "").trim().toLowerCase() !== platform.key) return;
        const key = dateKey(parseDate(order.order_created_date));
        if (key) dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
      });
      return {
        label: platform.label,
        data: trend.keys.map((key) => dailyCounts.get(key) || 0),
        borderColor: platform.color,
        backgroundColor: (context) => {
          const area = context.chart.chartArea;
          if (!area) return alpha(platform.color, 0.07);
          const gradient = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          gradient.addColorStop(0, alpha(platform.color, 0.18));
          gradient.addColorStop(1, alpha(platform.color, 0.005));
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: trend.keys.length === 1 ? 4 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: platform.color,
        pointHoverBorderColor: palette.background.paper,
        pointHoverBorderWidth: 3,
      };
    }),
  }), [locale, palette.background.paper, platforms, trend]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { padding: 12, cornerRadius: 10 } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: {
        color: palette.text.secondary,
        maxTicksLimit: 8,
        font: { family: theme.typography.fontFamily, size: 11 },
      } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: alpha(palette.text.secondary, 0.09) },
        ticks: { color: palette.text.secondary, maxTicksLimit: 5, precision: 0, padding: 10 } },
    },
  }), [palette.text.secondary, theme.typography.fontFamily]);

  const runsTruncated = data.runs.rowCount > data.runs.rows.length;
  const historyTruncated = data.history.rowCount > data.history.rows.length;
  const displayedErrors = { ...sourceErrors, ...(ordersError ? { orders: ordersError } : {}) };
  const ordersUnavailable = Boolean(ordersError) && !ordersLoading && orderRows.length === 0;
  const ordersViewPending = period === "all" && ordersLoading && ordersLoadingScope === "all" && !allOrdersLoaded;
  const sourceNames = {
    orders: copy("ออเดอร์", "orders"),
    runs: copy("รอบ Sync", "sync runs"),
    history: copy("รายละเอียดประวัติ", "sync history details"),
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1760, mx: "auto", color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: "13px", bgcolor: alpha(palette.primary.main, 0.09), color: "primary.main" }}><HubOutlined sx={{ fontSize: 21 }} /></Box>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "primary.main" }}>OMS / OVERVIEW</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{copy("ภาพรวมคำสั่งซื้อ", "Order overview")}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={copy("ข้อมูลจากฐานข้อมูล OMS", "Live OMS data")} color="success" variant="outlined" sx={{ fontSize: 11, borderRadius: "7px" }} />
            {lastUpdated && <Typography variant="caption" color="text.secondary">{copy("ดึงข้อมูลเมื่อ", "Fetched")}&nbsp;{formatDateTime(lastUpdated, locale)}</Typography>}
            <Tooltip title={copy("โหลดข้อมูลใหม่", "Refresh data")}>
            <span><IconButton onClick={handleRefresh} disabled={loading || ordersLoading} size="small" aria-label={copy("โหลดข้อมูลใหม่", "Refresh data")}>
                {loading || ordersLoading ? <CircularProgress size={19} /> : <RefreshRounded fontSize="small" />}
              </IconButton></span>
            </Tooltip>
          </Stack>
        </Stack>

        {(loading || ordersLoading) && <LinearProgress
          variant={ordersLoading && orderProgress.total !== null ? "determinate" : "indeterminate"}
          value={ordersLoading && orderProgress.total ? Math.min(100, (orderProgress.loaded / orderProgress.total) * 100) : 0}
          sx={{ borderRadius: 4 }} />}
        {ordersLoading && <Alert severity="info">
          {ordersLoadingScope === "all"
            ? (orderProgress.total === null
              ? copy("กำลังตรวจสอบจำนวนออเดอร์ทั้งหมด…", "Counting all orders…")
              : copy(`กำลังโหลดออเดอร์ทั้งหมด ${number(orderProgress.loaded)} / ${number(orderProgress.total)} รายการ อาจใช้เวลาตามปริมาณข้อมูล`, `Loading all orders: ${number(orderProgress.loaded)} / ${number(orderProgress.total)}. Time depends on data volume.`))
            : copy(`กำลังโหลดออเดอร์ 30 วันล่าสุด ${number(orderProgress.loaded)}${orderProgress.total === null ? "" : ` / ${number(orderProgress.total)}`} รายการ`, `Loading orders from the last 30 days ${number(orderProgress.loaded)}${orderProgress.total === null ? "" : ` / ${number(orderProgress.total)}`}`)}
        </Alert>}
        {Object.keys(displayedErrors).length > 0 && (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={handleRefresh}>{copy("ลองอีกครั้ง", "Retry")}</Button>}>
            <Typography variant="body2" fontWeight={700}>{copy("ดึงข้อมูลบางส่วนไม่สำเร็จ", "Some dashboard data could not be loaded")}</Typography>
            {Object.entries(displayedErrors).map(([key, message]) => (
              <Typography variant="caption" display="block" key={key}>{sourceNames[key]}: {message}</Typography>
            ))}
          </Alert>
        )}

        <Box sx={{
          position: "relative", overflow: "hidden", p: { xs: 3, md: 4, xl: 4.5 }, borderRadius: "26px", color: "#fff",
          background: `radial-gradient(ellipse at 90% 0%, ${alpha(palette.primary.light, 0.3)}, transparent 55%), linear-gradient(115deg, #0B1026, #151F46 65%, ${alpha(palette.primary.dark, 0.3)}), #0B1026`,
          boxShadow: `0 16px 40px ${alpha(palette.primary.dark, 0.16)}`,
          "&::before": { content: '""', position: "absolute", width: 460, height: 460, border: "1px solid rgba(255,255,255,.075)", borderRadius: "50%", right: -80, top: -290, pointerEvents: "none" },
          "&::after": { content: '""', position: "absolute", width: 600, height: 600, border: "1px solid rgba(255,255,255,.055)", borderRadius: "50%", right: -150, top: -360, pointerEvents: "none" },
        }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr" }, gap: { xs: 3, lg: 6 }, alignItems: "center", position: "relative", zIndex: 1 }}>
            <Box>
              <Stack direction="row" gap={1} alignItems="center" mb={2.25}>
                <Box sx={{ width: 22, height: 2, bgcolor: "#A9BEFF" }} />
                <Typography sx={{ color: "#B8C9FF", fontSize: 10, fontWeight: 700, letterSpacing: 2.7 }}>OMS OPERATIONS</Typography>
              </Stack>
              <Typography component="h1" sx={{ fontSize: { xs: 29, sm: 38, xl: 44 }, fontWeight: 700, lineHeight: 1.35, letterSpacing: thai ? -0.8 : -1.5 }}>
                {copy("ทุกออเดอร์", "Every order.")}<br />
                <Box component="span" sx={{ color: "#B6C9FF" }}>{copy("เห็นสถานะได้ในที่เดียว", "One connected view.")}</Box>
              </Typography>
              <Typography sx={{ color: "#B8C4DF", fontSize: 13, lineHeight: 1.8, mt: 1.75, maxWidth: 440 }}>
                {copy("ภาพรวมคำสั่งซื้อและผลการ Sync จากข้อมูล OMS พร้อมประวัติรอบทำงานล่าสุด", "Order and sync status from OMS, together with the latest integration runs.")}
              </Typography>
              <Stack direction="row" gap={1} alignItems="center" mt={3} flexWrap="wrap">
                {platforms.map((platform) => <Box key={platform.key} sx={{ px: 1.2, py: 0.65, borderRadius: "8px", display: "flex", gap: 0.8, alignItems: "center", bgcolor: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
                  <Box sx={{ width: 20, height: 20, flexShrink: 0, borderRadius: "5px", bgcolor: "#fff", display: "grid", placeItems: "center" }}>
                    {platform.logo ? <PlatformLogo platform={platform} size={15} /> : <Typography aria-hidden="true" sx={{ color: platform.color, fontSize: 10, fontWeight: 800 }}>{platform.mark}</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: "#E2E8F8" }}>{platform.label}</Typography>
                </Box>)}
                {platforms.length === 0 && <Typography sx={{ fontSize: 11, color: "#C4CEE4" }}>{copy("ยังไม่มีข้อมูลแพลตฟอร์ม", "No platform data yet")}</Typography>}
                {platforms.length > 0 && <ArrowForwardRounded sx={{ color: "#94A9D7", fontSize: 16 }} />}
                <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#D7E3FF" }}>OMS</Typography>
              </Stack>
            </Box>
            <Box sx={{ borderRadius: "20px", p: { xs: 2.5, md: 3 }, border: "1px solid rgba(255,255,255,.14)", background: "linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025))" }}>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#C6D3ED" }}>{copy("ออเดอร์ในช่วงที่เลือก", "ORDERS IN SELECTED PERIOD")}</Typography>
                <Inventory2Outlined sx={{ fontSize: 21, color: "#A9BEFF" }} />
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="baseline" mt={1.5}>
              <Typography sx={{ fontSize: { xs: 48, sm: 62 }, fontWeight: 750, letterSpacing: -2, lineHeight: 1.2 }}>{ordersUnavailable || ordersViewPending ? "—" : number(counts.orders)}</Typography>
                <Typography sx={{ fontSize: 12, color: "#B8C4DF" }}>{copy("ออเดอร์", "orders")}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#B8C4DF", mt: 0.5 }}>
                {PERIODS.find((item) => item.value === period)?.[thai ? "th" : "en"]}
                {selectedPlatform !== "all" ? ` · ${platformOptions.find((item) => item.key === selectedPlatform)?.label || selectedPlatform}` : ""}
              </Typography>
              <Box sx={{ display: "flex", height: 6, gap: "3px", mt: 2.5, mb: 2, borderRadius: 5, overflow: "hidden" }}>
                {statusRows.filter((item) => item.value > 0).map((item) => <Box key={item.key} sx={{ width: `${counts.orders ? item.value / counts.orders * 100 : 0}%`, bgcolor: item.color }} />)}
                {counts.orders === 0 && <Box sx={{ width: "100%", bgcolor: "rgba(255,255,255,.18)" }} />}
              </Box>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                <Stack direction="row" spacing={0.8} alignItems="center"><CheckCircleOutlineRounded sx={{ color: "#9AE6CB", fontSize: 17 }} /><Typography sx={{ fontSize: 12, color: "#DBE8E6" }}>{ordersUnavailable || ordersViewPending ? "—" : `${rate.toFixed(1)}%`} {copy("Sync สำเร็จ", "synced")}</Typography></Stack>
                <Typography sx={{ fontSize: 11, color: "#B8C4DF" }}>{platforms.length} {copy("แพลตฟอร์ม", "platforms")}</Typography>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{copy("ภาพรวมการดำเนินงาน", "Operational overview")}</Typography>
            <Typography variant="caption" color="text.secondary">{copy("กรองตามแพลตฟอร์มและช่วงเวลาของออเดอร์", "Filter by marketplace and order date")}</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
            <Box sx={{ maxWidth: "100%", overflowX: "auto", p: 0.5 }}>
              <ToggleButtonGroup exclusive value={period} onChange={handlePeriodChange} size="small" aria-label={copy("กรองช่วงเวลา", "Filter date range")}
                sx={{ bgcolor: "action.hover", borderRadius: "12px", p: 0.5, gap: 0.4,
                  "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: "9px !important", m: "0 !important" },
                  "& .MuiToggleButton-root": { px: 1.25, py: 0.7, fontSize: 12, whiteSpace: "nowrap", textTransform: "none", color: "text.secondary",
                    "&.Mui-selected": { bgcolor: "background.paper", color: "primary.main", boxShadow: `0 2px 7px ${alpha(palette.common.black, 0.07)}`, fontWeight: 700 },
                    "&.Mui-selected:hover": { bgcolor: "background.paper" },
                  }}}>
                {PERIODS.map((item) => <ToggleButton value={item.value} key={item.value}>{thai ? item.th : item.en}</ToggleButton>)}
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ maxWidth: "100%", overflowX: "auto", p: 0.5 }}>
              <ToggleButtonGroup exclusive value={selectedPlatform} onChange={(_, value) => value && setSelectedPlatform(value)} size="small" aria-label={copy("กรองแพลตฟอร์ม", "Filter platform")}
                sx={{ bgcolor: "action.hover", borderRadius: "12px", p: 0.5, gap: 0.4,
                  "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: "9px !important", m: "0 !important" },
                  "& .MuiToggleButton-root": { px: 1.4, py: 0.7, fontSize: 12, whiteSpace: "nowrap", textTransform: "none", color: "text.secondary",
                    "&.Mui-selected": { bgcolor: "background.paper", color: "primary.main", boxShadow: `0 2px 7px ${alpha(palette.common.black, 0.07)}`, fontWeight: 700 },
                    "&.Mui-selected:hover": { bgcolor: "background.paper" },
                  }}}>
                <ToggleButton value="all">{copy("ทุกแพลตฟอร์ม", "All platforms")}</ToggleButton>
                {platformOptions.map((platform) => <ToggleButton key={platform.key} value={platform.key}>{platform.label}</ToggleButton>)}
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          {statCards.map(({ label, value, icon: Icon, color, tag }) => <Panel key={tag} sx={{ position: "relative", overflow: "hidden" }}>
            <Box aria-hidden="true" sx={{ position: "absolute", right: -15, bottom: -25, color: alpha(color, 0.045), pointerEvents: "none" }}><Icon sx={{ fontSize: 125 }} /></Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box sx={{ width: 38, height: 38, borderRadius: "12px", bgcolor: alpha(color, 0.1), color, display: "grid", placeItems: "center" }}><Icon sx={{ fontSize: 21 }} /></Box>
              <Typography sx={{ fontSize: 9, letterSpacing: 1.4, color: "text.secondary", fontWeight: 700 }}>{tag}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 750, letterSpacing: -1, lineHeight: 1.3, mt: 0.4 }}>{ordersUnavailable || ordersViewPending ? "—" : number(value)}</Typography>
            <Stack direction="row" spacing={0.7} alignItems="center" mt={1.25}>
              <Box sx={{ width: 5, height: 5, flexShrink: 0, borderRadius: "50%", bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">{ordersUnavailable || ordersViewPending ? "—" : tag === "ORDERS" ? PERIODS.find((item) => item.value === period)?.[thai ? "th" : "en"] : `${counts.orders ? (value / counts.orders * 100).toFixed(1) : "0.0"}% ${copy("ของออเดอร์", "of orders")}`}</Typography>
            </Stack>
          </Panel>)}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.85fr) minmax(0, 1fr)" }, gap: 2.5 }}>
          <Panel>
            <SectionTitle eyebrow="ORDER MOMENTUM" title={copy("แนวโน้มออเดอร์ตามวันที่สร้าง", "Order volume by created date")} accessory={<AutoGraphRounded sx={{ color: "primary.main" }} />} />
            <Stack direction="row" gap={2.5} flexWrap="wrap" mb={2}>
              {!ordersViewPending && platforms.map((platform) => <Stack key={platform.key} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: platform.color }} />
                <Typography variant="caption" color="text.secondary">{platform.label}</Typography>
                <Typography variant="caption" fontWeight={700}>{number(scopedOrders.filter((order) => String(order.platform ?? "").trim().toLowerCase() === platform.key).length)}</Typography>
              </Stack>)}
            </Stack>
            {ordersViewPending ? <Alert severity="info">{copy("กำลังโหลดออเดอร์ทั้งหมดเพื่อแสดงกราฟ", "Loading all orders for the chart")}</Alert> : ordersUnavailable ? <Alert severity="warning">{copy("ยังโหลดออเดอร์ไม่สำเร็จ จึงแสดงกราฟไม่ได้", "Orders could not be loaded, so the chart is unavailable")}</Alert> : (
              <Box sx={{ height: { xs: 250, md: 275 }, minWidth: 0 }}>
                <Line data={chartData} options={chartOptions} role="img" aria-label={copy("จำนวนออเดอร์ตามวันที่สร้าง", "Order count by created date")} />
              </Box>
            )}
            {scopedOrders.length === 0 && !loading && !ordersLoading && !ordersUnavailable && !ordersViewPending && <Typography color="text.secondary" variant="body2" textAlign="center" sx={{ mt: 1 }}>{copy("ไม่มีออเดอร์ในช่วงที่เลือก", "No orders in the selected range")}</Typography>}
            <Stack direction="row" justifyContent="space-between" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">{period === "all" ? copy("ออเดอร์ทั้งหมดในฐานข้อมูล", "All orders in the database") : copy("อ้างอิงวันที่สร้างออเดอร์", "Based on order creation date")}</Typography>
              <Typography variant="caption" color="text.secondary">{ordersUnavailable || ordersViewPending ? "—" : number(scopedOrders.length)} {copy("รายการ", "records")}</Typography>
            </Stack>
          </Panel>
          <Panel>
            <SectionTitle eyebrow="SYNC STATUS" title={copy("สถานะ Sync", "Sync status breakdown")} />
            <Box sx={{ position: "relative", width: 186, height: 186, mx: "auto", mt: 1, mb: 3 }}>
              <Box role="img" aria-label={`${ordersUnavailable || ordersViewPending ? "—" : `${rate.toFixed(1)}%`} ${copy("Sync สำเร็จ", "synced")}`} sx={{
                width: "100%", height: "100%", p: "13px", borderRadius: "50%",
                background: counts.orders ? `conic-gradient(${donutGradient})` : `conic-gradient(${alpha(palette.text.secondary, 0.16)} 0 100%)`,
              }}>
                <Stack alignItems="center" justifyContent="center" sx={{ width: "100%", height: "100%", bgcolor: "background.paper", borderRadius: "50%", border: "6px solid", borderColor: "background.paper", boxShadow: `inset 0 0 0 1px ${palette.divider}` }}>
                  <TrendingUpRounded sx={{ fontSize: 21, color: "success.main", mb: 0.5 }} />
                  <Typography sx={{ fontSize: 33, fontWeight: 750, letterSpacing: -1 }}>{ordersUnavailable || ordersViewPending ? "—" : `${rate.toFixed(1)}%`}</Typography>
                  <Typography variant="caption" color="text.secondary">{copy("Sync สำเร็จ", "synced")}</Typography>
                </Stack>
              </Box>
            </Box>
            <Stack spacing={1.15}>
              {statusRows.map((item) => <Stack direction="row" key={item.key} spacing={1} alignItems="center">
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: item.color }} />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{item.label}</Typography>
                <Typography variant="body2" fontWeight={700}>{ordersUnavailable || ordersViewPending ? "—" : number(item.value)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42, textAlign: "right" }}>{ordersUnavailable || ordersViewPending ? "—" : `${(counts.orders ? item.value / counts.orders * 100 : 0).toFixed(1)}%`}</Typography>
              </Stack>)}
            </Stack>
          </Panel>
        </Box>

        <Box>
          <SectionTitle eyebrow="CHANNEL PERFORMANCE" title={copy("สรุปตามแพลตฟอร์ม", "Marketplace summary")}
            accessory={<Chip size="small" icon={<StorefrontRounded />} label={`${platforms.length} ${copy("แพลตฟอร์ม", "platforms")}`} variant="outlined" sx={{ fontSize: 11 }} />} />
          {ordersViewPending ? <Panel><Typography color="text.secondary">{copy("กำลังโหลดออเดอร์ทั้งหมด…", "Loading all orders…")}</Typography></Panel> : platforms.length === 0 && !loading && !ordersLoading && !ordersUnavailable ? <Panel><Typography color="text.secondary">{copy("ยังไม่มีข้อมูลออเดอร์ในช่วงที่เลือก", "No marketplace data in the selected range")}</Typography></Panel> : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${Math.max(platforms.length, 1)}, minmax(0, 1fr))` }, gap: 2 }}>
              {platforms.map((platform) => {
                const orders = scopedOrders.filter((order) => String(order.platform ?? "").trim().toLowerCase() === platform.key);
                const platformCounts = orders.reduce((total, order) => { total[statusBucket(order.sync_status)] += 1; return total; }, { synced: 0, pending: 0, error: 0, other: 0 });
                const platformRuns = visibleRuns
                  .filter((run) => String(run.platform ?? "").trim().toLowerCase() === platform.key)
                  .sort((a, b) => (parseDate(b.start_date)?.getTime() ?? 0) - (parseDate(a.start_date)?.getTime() ?? 0));
                const lastRun = platformRuns[0];
                const lastRunBucket = statusBucket(lastRun?.sync_status);
                const percent = orders.length ? platformCounts.synced / orders.length * 100 : 0;
                return <Panel key={platform.key} sx={{ position: "relative", overflow: "hidden", backgroundImage: `linear-gradient(135deg, ${alpha(platform.color, 0.055)}, transparent 65%)` }}>
                  <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: platform.color }} />
                  <Stack direction="row" spacing={1.2} alignItems="center" mb={2.5} flexWrap="wrap" useFlexGap>
                    <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: "14px", bgcolor: "background.paper", border: "1px solid", borderColor: alpha(platform.color, 0.18), display: "grid", placeItems: "center", boxShadow: `0 4px 12px ${alpha(platform.color, 0.1)}` }}>
                      {platform.logo ? <PlatformLogo platform={platform} size={30} /> : <Typography aria-hidden="true" sx={{ color: platform.color, fontWeight: 800, fontSize: 22 }}>{platform.mark}</Typography>}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 100 }}><Typography fontWeight={700}>{platform.label}</Typography><Typography sx={{ fontSize: 10, letterSpacing: 0.7, color: "text.secondary" }}>MARKETPLACE</Typography></Box>
                    {lastRun && <Chip size="small" color={lastRunBucket === "error" ? "error" : lastRunBucket === "synced" ? "success" : "default"} variant="outlined" label={String(lastRun.sync_status || copy("ไม่ระบุผล", "Unknown result"))} sx={{ height: 22, fontSize: 10, borderRadius: "6px" }} />}
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} mb={1.5}>
                    <Typography sx={{ fontSize: 32, fontWeight: 750, letterSpacing: -0.6 }}>{number(orders.length)} <Box component="span" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 400, letterSpacing: 0 }}>{copy("ออเดอร์", "orders")}</Box></Typography>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">{percent.toFixed(1)}% {copy("สำเร็จ", "synced")}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={percent} sx={{ height: 5, borderRadius: 5, bgcolor: alpha(platform.color, 0.12), "& .MuiLinearProgress-bar": { bgcolor: platform.color } }} />
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1, my: 2.25 }}>
                    {[
                      { label: copy("สำเร็จ", "Synced"), value: platformCounts.synced },
                      { label: copy("รอ", "Pending"), value: platformCounts.pending },
                      { label: copy("ผิดพลาด", "Errors"), value: platformCounts.error },
                      { label: copy("อื่น ๆ", "Other"), value: platformCounts.other },
                    ].map((item, index) => <Box key={item.label} sx={{ borderLeft: index ? "1px solid" : "none", borderColor: "divider", pl: index ? 1 : 0 }}>
                      <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{item.label}</Typography><Typography sx={{ fontSize: 18, fontWeight: 700 }}>{number(item.value)}</Typography>
                    </Box>)}
                  </Box>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center" mt={1.75}>
                    <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{copy("รอบ Sync ล่าสุด", "Latest sync run")}</Typography>
                    <Typography sx={{ fontSize: 10, color: "text.secondary", whiteSpace: "nowrap" }}>{lastRun ? formatDateTime(lastRun.start_date, locale) : "—"}</Typography>
                  </Stack>
                </Panel>;
              })}
            </Box>
          )}
        </Box>

        <Panel>
          <SectionTitle eyebrow="INTEGRATION TIMELINE" title={copy("รอบ Sync ล่าสุด", "Latest sync runs")}
            accessory={<Chip size="small" variant="outlined" label={copy(`แสดง ${latestRuns.length} จาก ${visibleRuns.length} รอบ`, `Showing ${latestRuns.length} of ${visibleRuns.length} runs`)} sx={{ fontSize: 10 }} />} />
          {latestRuns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{loading ? copy("กำลังโหลดประวัติ Sync…", "Loading sync history…") : copy("ไม่พบประวัติ Sync ในข้อมูลที่โหลด", "No sync runs in the loaded data")}</Typography>
          ) : <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 260px" }, gap: { xs: 3, lg: 5 } }}>
            <Box>
              {latestRuns.map((run, index) => {
                const runBucket = statusBucket(run.sync_status);
                const failed = runBucket === "error";
                const errorDetail = errorDetailsByRun.get(String(run.sync_log_id ?? ""));
                const errorMessage = errorDetail?.display_message || errorDetail?.detail_message || errorDetail?.run_error_message || run.error_message;
                const iconColor = failed ? palette.error.main : runBucket === "synced" ? palette.success.main : palette.info.main;
                const platform = platformIdentity(run.platform, palette.primary.main);
                const countsText = [
                  ["F", run.total_fetched], ["I", run.total_inserted], ["U", run.total_updated], ["E", run.total_failed],
                ].filter(([, value]) => value !== null && value !== undefined).map(([label, value]) => `${label}: ${number(Number(value) || 0)}`).join(" · ");
                const duration = Number(run.duration_ms);
                return <Stack key={run.sync_log_id ?? `${run.platform}-${run.start_date}-${index}`} direction="row" spacing={1.5} sx={{ position: "relative", pb: index < latestRuns.length - 1 ? 2.5 : 0 }}>
                  {index < latestRuns.length - 1 && <Box aria-hidden="true" sx={{ position: "absolute", left: 17, top: 37, bottom: 0, width: 1, borderLeft: "1px solid", borderColor: "divider" }} />}
                  <Box sx={{ width: 35, height: 35, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "12px", color: iconColor, bgcolor: alpha(iconColor, 0.09) }}>
                    {failed ? <ErrorOutlineRounded sx={{ fontSize: 18 }} /> : <CheckCircleOutlineRounded sx={{ fontSize: 18 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={0.5} alignItems={{ sm: "center" }}>
                      <Typography variant="body2" fontWeight={600}>{platform.label} · {run.sync_type || run.sync_source || copy("Sync", "Sync")}</Typography>
                      <Chip size="small" color={failed ? "error" : runBucket === "synced" ? "success" : "default"} label={String(run.sync_status || copy("ไม่ระบุผล", "Unknown result"))} sx={{ height: 20, fontSize: 10, alignSelf: "flex-start" }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.45 }}>
                      {[run.sync_source, countsText, Number.isFinite(duration) && duration >= 0 ? `${number(duration)} ms` : ""].filter(Boolean).join(" · ") || copy("ไม่มีรายละเอียดเพิ่มเติม", "No additional run details")}
                    </Typography>
                    {failed && errorMessage && <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.45, overflowWrap: "anywhere" }}>{errorMessage}</Typography>}
                    {failed && errorDetail?.order_record_id && Number(errorDetail.order_record_id) > 0 && (
                      <Button size="small" endIcon={<OpenInNewRounded />} onClick={() => navigate(`/orderlist/orderlist/${Number(errorDetail.order_record_id)}`)} sx={{ mt: 0.35, px: 0, minWidth: 0, textTransform: "none" }}>
                        {copy("เปิดออเดอร์ที่ผิดพลาด", "Open affected order")}
                      </Button>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", pt: 0.2 }}>{formatDateTime(run.start_date, locale)}</Typography>
                </Stack>;
              })}
            </Box>
            <Box sx={{ borderRadius: "17px", p: 2.5, bgcolor: alpha(palette.primary.main, 0.04), border: "1px solid", borderColor: alpha(palette.primary.main, 0.1), alignSelf: "start" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "primary.main" }}>{copy("สรุปออเดอร์", "ORDER SNAPSHOT")}</Typography><ArrowForwardRounded sx={{ color: "primary.main", fontSize: 18 }} /></Stack>
              <Typography sx={{ fontSize: 30, fontWeight: 750 }}>{ordersUnavailable || ordersViewPending ? "—" : number(counts.pending + counts.error + counts.other)}</Typography>
              <Typography variant="body2" fontWeight={600}>{copy("ยังไม่อยู่ในสถานะ Sync สำเร็จ", "Not marked as synced")}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.8 }}>
                {ordersUnavailable || ordersViewPending ? copy("รอการโหลดข้อมูลให้ครบ", "Waiting for a complete order load") : copy(`รอดำเนินการ ${number(counts.pending)} · ผิดพลาด ${number(counts.error)} · สถานะอื่น ${number(counts.other)}`, `${number(counts.pending)} pending · ${number(counts.error)} errors · ${number(counts.other)} other / unknown`)}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={0.8} alignItems="center"><AccessTimeRounded sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">{lastUpdated ? formatDateTime(lastUpdated, locale) : copy("ยังไม่มีเวลาโหลดข้อมูล", "No fetch time yet")}</Typography></Stack>
            </Box>
          </Box>}
        </Panel>

        <Panel>
          <SectionTitle eyebrow="RECENT ORDERS" title={copy("ออเดอร์ล่าสุด", "Recent orders")} accessory={<Chip size="small" variant="outlined" label={`${ordersUnavailable || ordersViewPending ? "—" : recentOrders.length} ${copy("รายการ", "records")}`} sx={{ fontSize: 10 }} />} />
          {ordersUnavailable ? <Typography variant="body2" color="text.secondary">{copy("ไม่สามารถโหลดออเดอร์ได้", "Orders are unavailable")}</Typography> : recentOrders.length === 0 ? <Typography variant="body2" color="text.secondary">{ordersLoading ? copy("กำลังโหลดออเดอร์…", "Loading orders…") : copy("ไม่พบออเดอร์ในช่วงที่เลือก", "No orders in the selected range")}</Typography> : (
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 760 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(130px, 0.8fr) minmax(190px, 1.4fr) minmax(100px, 0.8fr) minmax(105px, 0.85fr) minmax(100px, 0.8fr) 36px", gap: 1.5, px: 1, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  {[copy("แพลตฟอร์ม", "Platform"), copy("เลขออเดอร์", "Order number"), copy("สถานะออเดอร์", "Order status"), copy("สถานะ Sync", "Sync status"), copy("ยอดรวม", "Total"), ""].map((label, index) => <Typography key={`${label}-${index}`} variant="caption" fontWeight={700} color="text.secondary" textAlign={index === 4 ? "right" : "left"}>{label}</Typography>)}
                </Box>
                {recentOrders.map((order, index) => {
                  const platform = platformIdentity(order.platform, palette.primary.main);
                  const bucket = statusBucket(order.sync_status);
                  const color = bucket === "synced" ? palette.success.main : bucket === "pending" ? palette.warning.main : bucket === "error" ? palette.error.main : palette.info.main;
                  return <Box key={order.order_record_id ?? order.platform_order_id ?? index} onClick={() => order.order_record_id && navigate(`/orderlist/orderlist/${Number(order.order_record_id)}`)} role={order.order_record_id ? "button" : undefined} tabIndex={order.order_record_id ? 0 : undefined}
                    onKeyDown={(event) => { if (order.order_record_id && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); navigate(`/orderlist/orderlist/${Number(order.order_record_id)}`); } }}
                    sx={{ display: "grid", gridTemplateColumns: "minmax(130px, 0.8fr) minmax(190px, 1.4fr) minmax(100px, 0.8fr) minmax(105px, 0.85fr) minmax(100px, 0.8fr) 36px", gap: 1.5, alignItems: "center", px: 1, py: 1.25, borderBottom: index < recentOrders.length - 1 ? "1px solid" : "none", borderColor: "divider", cursor: order.order_record_id ? "pointer" : "default", "&:hover": order.order_record_id ? { bgcolor: "action.hover" } : undefined }}>
                    <Box sx={{ justifySelf: "start", maxWidth: 130, minWidth: 0, display: "inline-flex", alignItems: "center", gap: 0.65, px: 0.9, py: 0.45, borderRadius: 999, bgcolor: alpha(platform.color, 0.1), color: platform.color, border: `1px solid ${alpha(platform.color, 0.28)}` }}>
                      {platform.logo ? <PlatformLogo platform={platform} size={16} /> : <Typography aria-hidden="true" sx={{ fontSize: 11, fontWeight: 700 }}>{platform.mark}</Typography>}
                      <Typography variant="caption" fontWeight={600} noWrap>{platform.label}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={600} noWrap>{order.platform_order_id || "—"}</Typography><Typography variant="caption" color="text.secondary" noWrap>{order.shop_name || "—"}</Typography></Box>
                    <Typography variant="caption" noWrap>{order.status || "—"}</Typography>
                    <Chip size="small" label={order.sync_status || copy("ไม่ระบุ", "Unknown")} sx={{ justifySelf: "start", maxWidth: 115, height: 23, color, bgcolor: alpha(color, 0.1), fontSize: 10, fontWeight: 700 }} />
                    <Typography variant="body2" textAlign="right" noWrap>{formatAmount(order.total_amount, order.currency, locale)}</Typography>
                    <Tooltip title={copy("ดูรายละเอียด", "View details")}><IconButton size="small" aria-label={copy("ดูรายละเอียด", "View details")} disabled={!order.order_record_id} onClick={(event) => { event.stopPropagation(); navigate(`/orderlist/orderlist/${Number(order.order_record_id)}`); }}><OpenInNewRounded fontSize="small" /></IconButton></Tooltip>
                  </Box>;
                })}
              </Box>
            </Box>
          )}
        </Panel>

        {(runsTruncated || historyTruncated) && <Alert severity="info">
          <Typography variant="body2" fontWeight={700}>{copy("ประวัติแสดงเฉพาะรายการล่าสุดที่โหลดได้", "Sync history shows the latest loaded entries")}</Typography>
          {runsTruncated && <Typography variant="caption" display="block">{copy(`รอบ Sync: โหลด ${number(data.runs.rows.length)} จากทั้งหมด ${number(data.runs.rowCount)} รอบ`, `Sync runs: loaded ${number(data.runs.rows.length)} of ${number(data.runs.rowCount)}`)}</Typography>}
          {historyTruncated && <Typography variant="caption" display="block">{copy(`รายละเอียดประวัติ: โหลด ${number(data.history.rows.length)} จากทั้งหมด ${number(data.history.rowCount)} รายการ`, `Sync history details: loaded ${number(data.history.rows.length)} of ${number(data.history.rowCount)}`)}</Typography>}
        </Alert>}
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ pb: 1 }}>
          {copy("OMS Dashboard • สถิติคำนวณจากช่วงเวลาที่เลือก", "OMS Dashboard • Metrics reflect the selected date range")}
        </Typography>
      </Stack>
    </Box>
  );
}
