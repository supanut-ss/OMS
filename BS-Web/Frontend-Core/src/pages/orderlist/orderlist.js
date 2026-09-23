import { useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { motion } from "framer-motion";

const MotionCard = motion(Card);

const MOCK_ORDERS = [
  { no: "SO-2026-00128", customer: "Central Retail Co.", warehouse: "Bangkok DC", items: 12, total: "฿48,920", status: "Ready to ship", created: "23 Sep 2026, 10:42" },
  { no: "SO-2026-00127", customer: "Siam Market Group", warehouse: "Chonburi DC", items: 8, total: "฿21,480", status: "Processing", created: "23 Sep 2026, 10:18" },
  { no: "SO-2026-00126", customer: "North Star Trading", warehouse: "Chiang Mai DC", items: 5, total: "฿12,750", status: "Pending", created: "23 Sep 2026, 09:56" },
  { no: "SO-2026-00125", customer: "Blue Basket Co.", warehouse: "Bangkok DC", items: 16, total: "฿72,600", status: "Completed", created: "23 Sep 2026, 09:21" },
  { no: "SO-2026-00124", customer: "Everyday Supply", warehouse: "Chonburi DC", items: 9, total: "฿29,840", status: "Processing", created: "23 Sep 2026, 08:45" },
  { no: "SO-2026-00123", customer: "Urban Home Store", warehouse: "Bangkok DC", items: 7, total: "฿18,390", status: "Completed", created: "22 Sep 2026, 17:32" },
];

const STATUS_META = {
  Pending: { color: "warning", progress: 24 },
  Processing: { color: "info", progress: 58 },
  "Ready to ship": { color: "primary", progress: 82 },
  Completed: { color: "success", progress: 100 },
};

const OrderList = ({ lang = "th" }) => {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const isThai = lang === "th";
  const custom = theme.palette.custom || {};

  const labels = {
    eyebrow: isThai ? "การขายและการจัดส่ง" : "SALES & FULFILLMENT",
    title: isThai ? "รายการคำสั่งซื้อ" : "Order List",
    subtitle: isThai ? "ติดตามสถานะคำสั่งซื้อและการจัดส่งในภาพรวม" : "Track order status and fulfillment progress.",
    add: isThai ? "สร้างคำสั่งซื้อ" : "Create order",
    search: isThai ? "ค้นหาเลขที่ออเดอร์หรือลูกค้า" : "Search order or customer",
    all: isThai ? "ทุกสถานะ" : "All statuses",
    order: isThai ? "เลขที่คำสั่งซื้อ" : "Order no.",
    customer: isThai ? "ลูกค้า" : "Customer",
    warehouse: isThai ? "คลังสินค้า" : "Warehouse",
    items: isThai ? "รายการ" : "Items",
    total: isThai ? "มูลค่ารวม" : "Total",
    status: isThai ? "สถานะ" : "Status",
    created: isThai ? "สร้างเมื่อ" : "Created",
  };

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return MOCK_ORDERS.filter((order) => {
      const matchesStatus = status === "All" || order.status === status;
      const matchesSearch = !keyword || `${order.no} ${order.customer} ${order.warehouse}`.toLowerCase().includes(keyword);
      return matchesStatus && matchesSearch;
    });
  }, [search, status]);

  const summary = [
    [isThai ? "รอดำเนินการ" : "Pending", "1", ScheduleRoundedIcon, theme.palette.warning.main],
    [isThai ? "กำลังจัดเตรียม" : "Processing", "2", ShoppingCartOutlinedIcon, theme.palette.info.main],
    [isThai ? "พร้อมจัดส่ง" : "Ready to ship", "1", LocalShippingOutlinedIcon, theme.palette.primary.main],
    [isThai ? "เสร็จสิ้น" : "Completed", "2", CheckCircleRoundedIcon, theme.palette.success.main],
  ];

  const cardSx = {
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
    boxShadow: custom.glass?.shadow || theme.shadows[2],
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100%", px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, bgcolor: "background.default" }}>
      <Stack spacing={2.5}>
        <MotionCard initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} sx={{ ...cardSx, overflow: "hidden", background: `linear-gradient(115deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.08)})` }}>
          <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
              <Stack spacing={0.55}>
                <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1.1 }}>{labels.eyebrow}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{labels.title}</Typography>
                <Typography variant="body2" color="text.secondary">{labels.subtitle}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => { setSearch(""); setStatus("All"); }}>
                  {isThai ? "รีเซ็ต" : "Reset"}
                </Button>
                <Button variant="contained" startIcon={<AddRoundedIcon />}>{labels.add}</Button>
              </Stack>
            </Stack>
          </CardContent>
        </MotionCard>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {summary.map(([label, value, Icon, color]) => (
            <MotionCard key={label} whileHover={{ y: -3 }} transition={{ duration: 0.18 }} sx={cardSx}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack spacing={0.5}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography></Stack>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: alpha(color, 0.12), color }}><Icon /></Box>
                </Stack>
              </CardContent>
            </MotionCard>
          ))}
        </Box>

        <Card sx={cardSx}>
          <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                <TextField
                  size="small"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={labels.search}
                  sx={{ width: { xs: "100%", md: 360 } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                />
                <Select size="small" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 170 }}>
                  <MenuItem value="All">{labels.all}</MenuItem>
                  {Object.keys(STATUS_META).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </Select>
              </Stack>
              <Divider />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[labels.order, labels.customer, labels.warehouse, labels.items, labels.total, labels.status, labels.created, ""].map((heading) => <TableCell key={heading} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{heading}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const meta = STATUS_META[order.status];
                      return (
                        <TableRow key={order.no} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{order.no}</Typography></TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{order.customer}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{order.warehouse}</TableCell>
                          <TableCell>{order.items}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{order.total}</TableCell>
                          <TableCell sx={{ minWidth: 150 }}><Stack spacing={0.65}><Chip size="small" label={order.status} color={meta.color} variant="outlined" sx={{ width: "fit-content" }} /><LinearProgress variant="determinate" value={meta.progress} color={meta.color} sx={{ height: 5, borderRadius: 99 }} /></Stack></TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}><Typography variant="caption" color="text.secondary">{order.created}</Typography></TableCell>
                          <TableCell><IconButton size="small" aria-label={`More actions for ${order.no}`}><MoreHorizRoundedIcon fontSize="small" /></IconButton></TableCell>
                        </TableRow>
                      );
                    })}
                    {!filteredOrders.length && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>{isThai ? "ไม่พบคำสั่งซื้อ" : "No orders found"}</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default OrderList;
