import { useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Box, Card, Chip, Divider, LinearProgress, Stack, ToggleButton,
  ToggleButtonGroup, Typography,
} from "@mui/material";
import {
  CheckCircleOutlineRounded, ErrorOutlineRounded, HubOutlined,
  Inventory2Outlined, ScheduleRounded, TrendingUpRounded,
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// One fixed demo snapshot: totals and chart series come from the same records.
const CHANNELS = [
  { id: "shopee", name: "Shopee", mark: "S", color: "#EE4D2D", orders: 512, sent: 500, pending: 10, errors: 2,
    token: 26, sync: "14:32", series: [22, 35, 58, 74, 92, 86, 81, 64] },
  { id: "lazada", name: "Lazada", mark: "L", color: "#7357E8", orders: 398, sent: 380, pending: 13, errors: 5,
    token: 9, sync: "14:30", series: [14, 26, 43, 61, 79, 63, 60, 52] },
  { id: "tiktok", name: "TikTok Shop", mark: "T", color: "#159B9C", orders: 338, sent: 321, pending: 8, errors: 9,
    token: 0, sync: "09:10", series: [84, 98, 91, 65, 0, 0, 0, 0] },
];

const EVENTS = [
  { channel: "tiktok", time: "14:32", error: true, th: "Refresh Token ไม่สำเร็จ", en: "Token refresh failed",
    detailTh: "Token หมดอายุ ต้องเชื่อมต่อบัญชีใหม่", detailEn: "Access token expired. Reauthorization required." },
  { channel: "shopee", time: "14:32", th: "ส่งเข้า WM3 สำเร็จ 24 ออเดอร์", en: "24 orders delivered to WM3",
    detailTh: "ตรวจสอบและแปลงข้อมูลครบถ้วน", detailEn: "Validation and field mapping completed." },
  { channel: "lazada", time: "14:30", th: "Sync สำเร็จ 18 ออเดอร์", en: "18 orders synced successfully",
    detailTh: "อีก 2 ออเดอร์รอข้อมูลที่อยู่", detailEn: "2 additional orders await address details." },
  { channel: "lazada", time: "13:58", error: true, th: "Order LZD-88213 ส่งไม่สำเร็จ", en: "Order LZD-88213 could not be sent",
    detailTh: "ไม่พบรหัสไปรษณีย์ในที่อยู่จัดส่ง", detailEn: "Shipping address is missing a postal code." },
];

function Panel({ children, sx }) {
  return (
    <Card elevation={0} sx={{
      p: { xs: 2, md: 2.75 }, borderRadius: "18px", height: "100%",
      border: "1px solid", borderColor: "divider", minWidth: 0, ...sx,
    }}>
      {children}
    </Card>
  );
}

export default function Dashboard({ lang = "th" }) {
  const theme = useTheme();
  const p = theme.palette;
  const th = lang === "th";
  const copy = (thai, english) => th ? thai : english;
  const [selected, setSelected] = useState("all");
  const channels = CHANNELS.filter((c) => selected === "all" || selected === c.id);
  const total = channels.reduce((sum, c) => ({
    orders: sum.orders + c.orders, sent: sum.sent + c.sent,
    pending: sum.pending + c.pending, errors: sum.errors + c.errors,
  }), { orders: 0, sent: 0, pending: 0, errors: 0 });
  const rate = (total.sent / total.orders * 100).toFixed(1);
  const number = (value) => value.toLocaleString(th ? "th-TH" : "en-US");
  const statuses = [
    { label: copy("ส่งเข้า WM3 แล้ว", "Delivered to WM3"), value: total.sent, color: p.success.main },
    { label: copy("รอดำเนินการ", "Pending"), value: total.pending, color: p.warning.main },
    { label: copy("ต้องแก้ไข", "Needs attention"), value: total.errors, color: p.error.main },
  ];
  const stats = [
    { label: copy("ออเดอร์ทั้งหมด", "Total orders"), value: total.orders, icon: Inventory2Outlined,
      color: p.primary.main, note: copy("ออเดอร์ที่รับเข้าวันนี้", "Orders received today") },
    { label: copy("ส่งเข้า WM3 สำเร็จ", "Delivered to WM3"), value: total.sent, icon: CheckCircleOutlineRounded,
      color: p.success.main, note: `${rate}% ${copy("ของออเดอร์ทั้งหมด", "of all orders")}` },
    { label: copy("รอดำเนินการ", "In the queue"), value: total.pending, icon: ScheduleRounded,
      color: p.warning.main, note: copy("รอ Mapping / ส่งรอบถัดไป", "Awaiting mapping / next sync") },
    { label: copy("Error ต้องแก้ไข", "Sync errors"), value: total.errors, icon: ErrorOutlineRounded,
      color: p.error.main, note: copy("ต้องตรวจสอบก่อนส่งอีกครั้ง", "Review before retrying") },
  ];
  const chartData = {
    labels: ["00–02", "02–04", "04–06", "06–08", "08–10", "10–12", "12–14", "14–16"],
    datasets: channels.map((c) => ({
      label: c.name, data: c.series, borderColor: c.color, backgroundColor: alpha(c.color, 0.06),
      fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5,
    })),
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { padding: 12 } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: p.text.secondary, maxTicksLimit: 8 } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: p.divider },
        ticks: { color: p.text.secondary, maxTicksLimit: 5, precision: 0 } },
    },
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1680, mx: "auto", color: "text.primary" }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <HubOutlined sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>ORDER INTEGRATION</Typography>
              <Chip size="small" label={copy("ข้อมูลตัวอย่าง", "Demo data")} variant="outlined" />
            </Stack>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.7px" }}>
              {copy("ทุกออเดอร์ ในมุมมองเดียว", "Every order. One clear view.")}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              {copy("ติดตามการเชื่อมต่อจาก Marketplace สู่ WM3", "Your marketplace-to-WM3 operations at a glance.")}
            </Typography>
          </Box>
          <Box sx={{ borderLeft: "2px solid", borderColor: "divider", pl: 2 }}>
            <Typography variant="caption" color="text.secondary">{copy("ภาพรวมประจำวัน • ข้อมูลจำลอง", "DAILY SNAPSHOT • DEMO")}</Typography>
            <Typography variant="body2" fontWeight={600}>17 Jul 2026 · 14:34</Typography>
          </Box>
        </Stack>

        <Box sx={{ overflowX: "auto", pb: 0.5 }}>
          <ToggleButtonGroup exclusive value={selected} onChange={(_, value) => value && setSelected(value)}
            size="small" aria-label={copy("กรองแพลตฟอร์ม", "Filter platform")}
            sx={{ bgcolor: "background.paper", borderRadius: "10px", "& .MuiToggleButton-root": { px: 2, whiteSpace: "nowrap", textTransform: "none" } }}>
            <ToggleButton value="all">{copy("ทุกแพลตฟอร์ม", "All platforms")}</ToggleButton>
            {CHANNELS.map((c) => <ToggleButton key={c.id} value={c.id}>{c.name}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          {stats.map(({ label, value, icon: Icon, color, note }, index) => (
            <Panel key={label} sx={{ position: "relative", overflow: "hidden", bgcolor: index === 0 ? alpha(p.primary.main, 0.06) : "background.paper" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Box sx={{ p: 1, borderRadius: "12px", bgcolor: alpha(color, 0.1), color, display: "flex" }}><Icon fontSize="small" /></Box>
              </Stack>
              <Typography sx={{ fontSize: { xs: 32, md: 38 }, fontWeight: 700, letterSpacing: "-1px", my: 1 }}>{number(value)}</Typography>
              <Stack direction="row" spacing={0.65} alignItems="center">
                {index === 1 && <TrendingUpRounded sx={{ color, fontSize: 16 }} />}
                <Typography variant="caption" color="text.secondary">{note}</Typography>
              </Stack>
              <Box sx={{ position: "absolute", bottom: 0, left: 24, right: 24, height: 3, bgcolor: alpha(color, 0.65), borderRadius: "3px 3px 0 0" }} />
            </Panel>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.8fr) minmax(0, 1fr)" }, gap: 2.5 }}>
          <Panel>
            <Typography component="h2" variant="subtitle1" fontWeight={700}>{copy("แนวโน้มออเดอร์", "Order volume")}</Typography>
            <Typography variant="caption" color="text.secondary">{copy("ออเดอร์ที่รับเข้า แบ่งช่วงละ 2 ชั่วโมง", "Received orders in 2-hour intervals")}</Typography>
            <Stack direction="row" gap={2} flexWrap="wrap" mt={2}>
              {channels.map((c) => <Stack key={c.id} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c.color }} />
                <Typography variant="caption" color="text.secondary">{c.name}</Typography>
              </Stack>)}
            </Stack>
            <Box sx={{ height: 250, mt: 2 }}>
              <Line data={chartData} options={chartOptions} role="img"
                aria-label={copy("กราฟออเดอร์ตามแพลตฟอร์มราย 2 ชั่วโมง", "Orders per platform in 2-hour intervals")} />
            </Box>
          </Panel>
          <Panel>
            <Typography component="h2" variant="subtitle1" fontWeight={700}>{copy("ประสิทธิภาพการส่งข้อมูล", "Delivery performance")}</Typography>
            <Typography variant="caption" color="text.secondary">{copy("สัดส่วนออเดอร์ที่ส่งเข้า WM3", "Orders successfully delivered to WM3")}</Typography>
            <Box role="img" aria-label={`${rate}% delivered`} sx={{
              width: 172, height: 172, mx: "auto", my: 2.5, p: "13px", borderRadius: "50%",
              background: `conic-gradient(${p.success.main} 0 ${rate}%, ${p.warning.main} ${rate}% ${(total.sent + total.pending) / total.orders * 100}%, ${p.error.main} 0)`,
            }}>
              <Stack alignItems="center" justifyContent="center" sx={{ width: "100%", height: "100%", bgcolor: "background.paper", borderRadius: "50%" }}>
                <Typography sx={{ fontSize: 31, fontWeight: 700 }}>{rate}%</Typography>
                <Typography variant="caption" color="text.secondary">{copy("ส่งสำเร็จ", "Success rate")}</Typography>
              </Stack>
            </Box>
            <Stack spacing={1.25}>
              {statuses.map((s) => <Stack direction="row" key={s.label} spacing={1} alignItems="center">
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: s.color }} />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{s.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{number(s.value)}</Typography>
              </Stack>)}
            </Stack>
          </Panel>
        </Box>

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography component="h2" variant="subtitle1" fontWeight={700}>{copy("การเชื่อมต่อแพลตฟอร์ม", "Platform connections")}</Typography>
            <Typography variant="caption" color="text.secondary">{channels.filter((c) => c.token > 0).length}/{channels.length} {copy("เชื่อมต่อแล้ว", "connected")}</Typography>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${channels.length}, minmax(0, 1fr))` }, gap: 2 }}>
            {channels.map((c) => <Panel key={c.id}>
              <Stack direction="row" spacing={1.25} alignItems="center" mb={2}>
                <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: alpha(c.color, 0.12), color: c.color, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22 }}>{c.mark}</Box>
                <Box sx={{ flex: 1 }}><Typography fontWeight={600}>{c.name}</Typography><Typography variant="caption" color="text.secondary">Marketplace</Typography></Box>
                <Chip size="small" color={c.token ? "success" : "error"} variant="outlined" label={c.token ? "Connected" : "Auth error"} />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                <Typography sx={{ fontSize: 28, fontWeight: 700 }}>{number(c.orders)} <Box component="span" sx={{ fontSize: 12, color: "text.secondary", fontWeight: 400 }}>orders</Box></Typography>
                <Typography variant="caption" color="text.secondary">{(c.sent / c.orders * 100).toFixed(1)}% {copy("สำเร็จ", "delivered")}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={c.sent / c.orders * 100} sx={{ height: 5, borderRadius: 5, bgcolor: alpha(c.color, 0.1), "& .MuiLinearProgress-bar": { bgcolor: c.color } }} />
              <Stack direction="row" justifyContent="space-between" mt={1.5} mb={2}>
                <Typography variant="caption" color="text.secondary">Sync {c.sync}</Typography>
                <Typography variant="caption" color="error.main">{c.errors} errors</Typography>
              </Stack>
              <Divider />
              <Typography variant="caption" component="p" sx={{ mt: 1.5, color: c.token === 0 ? "error.main" : c.token < 10 ? "warning.main" : "text.secondary" }}>
                {c.token ? copy(`Token ใช้งานได้อีก ${c.token} วัน`, `Token expires in ${c.token} days`) : copy("Token หมดอายุ • ต้องเชื่อมต่อใหม่", "Token expired • Reconnect required")}
              </Typography>
            </Panel>)}
          </Box>
        </Box>

        <Panel>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography component="h2" variant="subtitle1" fontWeight={700}>{copy("กิจกรรมล่าสุด", "Recent integration activity")}</Typography>
            <Chip size="small" label={copy("17 ก.ค. 2026", "17 Jul 2026")} variant="outlined" />
          </Stack>
          {EVENTS.filter((e) => selected === "all" || e.channel === selected).map((e, index) => {
            const c = CHANNELS.find((channel) => channel.id === e.channel);
            const Icon = e.error ? ErrorOutlineRounded : CheckCircleOutlineRounded;
            const color = e.error ? p.error.main : p.success.main;
            return <Stack key={e.time + e.channel} direction="row" spacing={1.5} sx={{ py: 1.75, borderTop: index ? "1px solid" : "none", borderColor: "divider" }}>
              <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", color, bgcolor: alpha(color, 0.08) }}><Icon sx={{ fontSize: 19 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>{copy(e.th, e.en)}</Typography>
                <Typography variant="caption" color="text.secondary">{c.name} · {copy(e.detailTh, e.detailEn)}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">{e.time}</Typography>
            </Stack>;
          })}
        </Panel>
      </Stack>
    </Box>
  );
}
