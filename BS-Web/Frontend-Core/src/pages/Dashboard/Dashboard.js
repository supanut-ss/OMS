import { useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Box, Card, Chip, Divider, LinearProgress, Stack, ToggleButton,
  ToggleButtonGroup, Typography,
} from "@mui/material";
import {
  CheckCircleOutlineRounded, ErrorOutlineRounded, HubOutlined,
  Inventory2Outlined, ScheduleRounded, TrendingUpRounded, ArrowForwardRounded,
  AutoGraphRounded, StorefrontRounded, ArrowOutwardRounded,
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
      p: { xs: 2, md: 2.75 }, borderRadius: "22px", height: "100%",
      border: "1px solid", borderColor: "divider", minWidth: 0, ...sx,
    }}>
      {children}
    </Card>
  );
}

function SectionTitle({ eyebrow, title, accessory }) {
  return <Stack direction="row" gap={1.5} alignItems="center" justifyContent="space-between" mb={2.5}>
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, color: "text.secondary", mb: 0.5 }}>{eyebrow}</Typography>
      <Typography component="h2" sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700 }}>{title}</Typography>
    </Box>
    {accessory}
  </Stack>;
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
  const rate = (total.orders ? total.sent / total.orders * 100 : 0).toFixed(1);
  const number = (value) => value.toLocaleString(th ? "th-TH" : "en-US");
  const activities = EVENTS.filter((event) => selected === "all" || event.channel === selected);
  const statuses = [
    { label: copy("ส่งเข้า WM3 แล้ว", "Delivered to WM3"), value: total.sent, color: p.success.main },
    { label: copy("รอดำเนินการ", "Pending"), value: total.pending, color: p.warning.main },
    { label: copy("ต้องแก้ไข", "Needs attention"), value: total.errors, color: p.error.main },
  ];
  const stats = [
    { label: copy("ออเดอร์ทั้งหมด", "Total orders"), value: total.orders, icon: Inventory2Outlined,
      color: p.primary.main, note: copy("ออเดอร์ที่รับเข้าวันนี้", "Orders received today"), tag: "ORDERS" },
    { label: copy("ส่งเข้า WM3 สำเร็จ", "Delivered to WM3"), value: total.sent, icon: CheckCircleOutlineRounded,
      color: p.success.main, note: rate + "% " + copy("ของออเดอร์ทั้งหมด", "of all orders"), tag: "DELIVERED" },
    { label: copy("รอดำเนินการ", "In the queue"), value: total.pending, icon: ScheduleRounded,
      color: p.warning.main, note: copy("รอประมวลผล / ส่งรอบถัดไป", "Awaiting processing / next sync"), tag: "PENDING" },
    { label: copy("รายการที่ต้องตรวจสอบ", "Needs attention"), value: total.errors, icon: ErrorOutlineRounded,
      color: p.error.main, note: copy("ตรวจสอบก่อนส่งอีกครั้ง", "Review before retrying"), tag: "ATTENTION" },
  ];
  const chartData = {
    labels: ["00–02", "02–04", "04–06", "06–08", "08–10", "10–12", "12–14", "14–16"],
    datasets: channels.map((c) => ({
      label: c.name, data: c.series, borderColor: c.color,
      backgroundColor: (context) => {
        const area = context.chart.chartArea;
        if (!area) return alpha(c.color, 0.07);
        const gradient = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        gradient.addColorStop(0, alpha(c.color, 0.2));
        gradient.addColorStop(1, alpha(c.color, 0.005));
        return gradient;
      },
      fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 6,
      pointBackgroundColor: c.color, pointHoverBorderColor: p.background.paper, pointHoverBorderWidth: 3,
    })),
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { padding: 13, cornerRadius: 10 } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: {
        color: p.text.secondary, maxTicksLimit: 8, font: { family: theme.typography.fontFamily, size: 11 },
      } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: alpha(p.text.secondary, 0.09) },
        ticks: { color: p.text.secondary, maxTicksLimit: 5, precision: 0, padding: 10 } },
    },
  };
  const chartSummary = channels.map((c) => c.name + ": " + c.series.join(", ")).join("; ");
  const waitingPercent = total.orders ? (total.sent + total.pending) / total.orders * 100 : 0;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1760, mx: "auto", color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: "13px", bgcolor: alpha(p.primary.main, 0.09), color: "primary.main" }}><HubOutlined sx={{ fontSize: 21 }} /></Box>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "primary.main" }}>OMS / OVERVIEW</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Order Integration</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={copy("ข้อมูลจำลอง", "Mock data")} variant="outlined" sx={{ fontSize: 11, borderRadius: "7px" }} />
            <Typography variant="caption" color="text.secondary">17 Jul 2026 · 14:34</Typography>
          </Stack>
        </Stack>

        <Box sx={{
          position: "relative", overflow: "hidden", p: { xs: 3, md: 4, xl: 4.5 }, borderRadius: "26px", color: "#fff",
          background: "radial-gradient(ellipse at 90% 0%, " + alpha(p.primary.light, 0.3) + ", transparent 55%), linear-gradient(115deg, #0B1026, #151F46 65%, " + alpha(p.primary.dark, 0.3) + "), #0B1026",
          boxShadow: "0 16px 40px " + alpha(p.primary.dark, 0.16),
          "&::before": { content: '""', position: "absolute", width: 460, height: 460, border: "1px solid rgba(255,255,255,.075)", borderRadius: "50%", right: -80, top: -290, pointerEvents: "none" },
          "&::after": { content: '""', position: "absolute", width: 600, height: 600, border: "1px solid rgba(255,255,255,.055)", borderRadius: "50%", right: -150, top: -360, pointerEvents: "none" },
        }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr" }, gap: { xs: 3, lg: 6 }, alignItems: "center", position: "relative", zIndex: 1 }}>
            <Box>
              <Stack direction="row" gap={1} alignItems="center" mb={2.25}>
                <Box sx={{ width: 22, height: 2, bgcolor: "#A9BEFF" }} />
                <Typography sx={{ color: "#B8C9FF", fontSize: 10, fontWeight: 700, letterSpacing: 2.7 }}>COMMERCE COMMAND CENTER</Typography>
              </Stack>
              <Typography component="h1" sx={{ fontSize: { xs: 29, sm: 38, xl: 44 }, fontWeight: 700, lineHeight: 1.35, letterSpacing: th ? -0.8 : -1.5 }}>
                {copy("ทุกออเดอร์", "Every order.")}<br />
                <Box component="span" sx={{ color: "#B6C9FF" }}>{copy("เชื่อมต่อเป็นภาพเดียว", "One connected view.")}</Box>
              </Typography>
              <Typography sx={{ color: "#B8C4DF", fontSize: 13, lineHeight: 1.8, mt: 1.75, maxWidth: 410 }}>
                {copy("ติดตาม Marketplace สู่ WM3 พร้อมเห็นสิ่งที่สำเร็จ สิ่งที่รอ และสิ่งที่ต้องดูแล ในมุมมองเดียว", "From your marketplaces to WM3. See what is delivered, what is waiting, and what needs your attention.")}
              </Typography>
              <Stack direction="row" gap={1} alignItems="center" mt={3} flexWrap="wrap">
                {channels.map((c) => <Box key={c.id} sx={{ px: 1.2, py: 0.65, borderRadius: "8px", display: "flex", gap: 0.8, alignItems: "center", bgcolor: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: c.color }} />
                  <Typography sx={{ fontSize: 11, color: "#E2E8F8" }}>{c.name}</Typography>
                </Box>)}
                <ArrowForwardRounded sx={{ color: "#94A9D7", fontSize: 16 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#D7E3FF" }}>WM3</Typography>
              </Stack>
            </Box>
            <Box sx={{ borderRadius: "20px", p: { xs: 2.5, md: 3 }, border: "1px solid rgba(255,255,255,.14)", background: "linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025))" }}>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#C6D3ED" }}>TODAY'S SNAPSHOT</Typography>
                <Inventory2Outlined sx={{ fontSize: 21, color: "#A9BEFF" }} />
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="baseline" mt={1.5}>
                <Typography sx={{ fontSize: { xs: 48, sm: 62 }, fontWeight: 750, letterSpacing: -2, lineHeight: 1.2 }}>{number(total.orders)}</Typography>
                <Typography sx={{ fontSize: 12, color: "#B8C4DF" }}>orders</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#B8C4DF", mt: 0.5 }}>{copy("ออเดอร์จากแพลตฟอร์มที่เลือก", "Orders from the selected marketplaces")}</Typography>
              <Box sx={{ display: "flex", height: 6, gap: "3px", mt: 2.5, mb: 2, borderRadius: 5, overflow: "hidden" }}>
                {channels.map((c) => <Box key={c.id} sx={{ width: (total.orders ? c.orders / total.orders * 100 : 0) + "%", bgcolor: c.color }} />)}
              </Box>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                <Stack direction="row" spacing={0.8} alignItems="center"><CheckCircleOutlineRounded sx={{ color: "#9AE6CB", fontSize: 17 }} /><Typography sx={{ fontSize: 12, color: "#DBE8E6" }}>{rate}% {copy("ส่งสำเร็จ", "delivered")}</Typography></Stack>
                <Typography sx={{ fontSize: 11, color: "#B8C4DF" }}>{channels.length} {copy("แพลตฟอร์ม", "platforms")}</Typography>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{copy("ภาพรวมการดำเนินงาน", "Operational overview")}</Typography>
            <Typography variant="caption" color="text.secondary">{copy("เลือกแพลตฟอร์มเพื่อดูข้อมูลในแต่ละช่องทาง", "Explore performance across your channels")}</Typography>
          </Box>
          <Box sx={{ maxWidth: "100%", overflowX: "auto", p: 0.5 }}>
            <ToggleButtonGroup exclusive value={selected} onChange={(_, value) => value && setSelected(value)}
              size="small" aria-label={copy("กรองแพลตฟอร์ม", "Filter platform")}
              sx={{ bgcolor: "action.hover", borderRadius: "12px", p: 0.5, gap: 0.4,
                "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: "9px !important", m: "0 !important" },
                "& .MuiToggleButton-root": { px: 1.6, py: 0.7, fontSize: 12, whiteSpace: "nowrap", textTransform: "none", color: "text.secondary",
                  "&.Mui-selected": { bgcolor: "background.paper", color: "primary.main", boxShadow: "0 2px 7px " + alpha(p.common.black, 0.07), fontWeight: 700 },
                  "&.Mui-selected:hover": { bgcolor: "background.paper" },
                  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                },
              }}>
              <ToggleButton value="all">{copy("ทั้งหมด", "All platforms")}</ToggleButton>
              {CHANNELS.map((c) => <ToggleButton key={c.id} value={c.id}>{c.name}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          {stats.map(({ label, value, icon: Icon, color, note, tag }) => <Panel key={tag} sx={{ position: "relative", overflow: "hidden" }}>
            <Box aria-hidden="true" sx={{ position: "absolute", right: -15, bottom: -25, color: alpha(color, 0.045), pointerEvents: "none" }}><Icon sx={{ fontSize: 125 }} /></Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box sx={{ width: 38, height: 38, borderRadius: "12px", bgcolor: alpha(color, 0.1), color, display: "grid", placeItems: "center" }}><Icon sx={{ fontSize: 21 }} /></Box>
              <Typography sx={{ fontSize: 9, letterSpacing: 1.4, color: "text.secondary", fontWeight: 700 }}>{tag}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 750, letterSpacing: -1, lineHeight: 1.3, mt: 0.4 }}>{number(value)}</Typography>
            <Stack direction="row" spacing={0.7} alignItems="center" mt={1.25}>
              <Box sx={{ width: 5, height: 5, flexShrink: 0, borderRadius: "50%", bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">{note}</Typography>
            </Stack>
          </Panel>)}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.85fr) minmax(0, 1fr)" }, gap: 2.5 }}>
          <Panel>
            <SectionTitle eyebrow="ORDER MOMENTUM" title={copy("แนวโน้มออเดอร์ระหว่างวัน", "Order volume throughout the day")} accessory={<AutoGraphRounded sx={{ color: "primary.main" }} />} />
            <Stack direction="row" gap={2.5} flexWrap="wrap" mb={2}>
              {channels.map((c) => <Stack key={c.id} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c.color }} />
                <Typography variant="caption" color="text.secondary">{c.name}</Typography>
                <Typography variant="caption" fontWeight={700}>{number(c.orders)}</Typography>
              </Stack>)}
            </Stack>
            <Box sx={{ height: { xs: 250, md: 275 }, minWidth: 0 }}>
              <Line data={chartData} options={chartOptions} role="img" aria-label={copy("จำนวนออเดอร์ราย 2 ชั่วโมง: ", "Orders in 2-hour intervals: ") + chartSummary} />
            </Box>
            <Stack direction="row" justifyContent="space-between" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">{copy("ออเดอร์ที่รับเข้า แบ่งช่วงละ 2 ชั่วโมง", "Received orders in 2-hour intervals")}</Typography>
              <Typography variant="caption" color="text.secondary">00:00–16:00</Typography>
            </Stack>
          </Panel>
          <Panel>
            <SectionTitle eyebrow="DELIVERY PERFORMANCE" title={copy("ประสิทธิภาพการส่งข้อมูล", "Delivery performance")} />
            <Box sx={{ position: "relative", width: 186, height: 186, mx: "auto", mt: 1, mb: 3 }}>
              <Box role="img" aria-label={rate + "% " + copy("ส่งสำเร็จ", "delivered")} sx={{
                width: "100%", height: "100%", p: "13px", borderRadius: "50%",
                background: "conic-gradient(" + p.success.main + " 0 " + rate + "%, " + p.warning.main + " " + rate + "% " + waitingPercent + "%, " + p.error.main + " 0)",
              }}>
                <Stack alignItems="center" justifyContent="center" sx={{ width: "100%", height: "100%", bgcolor: "background.paper", borderRadius: "50%", border: "6px solid", borderColor: "background.paper", boxShadow: "inset 0 0 0 1px " + p.divider }}>
                  <TrendingUpRounded sx={{ fontSize: 21, color: "success.main", mb: 0.5 }} />
                  <Typography sx={{ fontSize: 33, fontWeight: 750, letterSpacing: -1 }}>{rate}%</Typography>
                  <Typography variant="caption" color="text.secondary">{copy("ส่งเข้า WM3 สำเร็จ", "Delivered to WM3")}</Typography>
                </Stack>
              </Box>
            </Box>
            <Stack spacing={1.15}>
              {statuses.map((s) => <Stack direction="row" key={s.label} spacing={1} alignItems="center">
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: s.color }} />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{s.label}</Typography>
                <Typography variant="body2" fontWeight={700}>{number(s.value)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42, textAlign: "right" }}>{(total.orders ? s.value / total.orders * 100 : 0).toFixed(1)}%</Typography>
              </Stack>)}
            </Stack>
          </Panel>
        </Box>

        <Box>
          <SectionTitle eyebrow="CHANNEL PERFORMANCE" title={copy("ทุก Marketplace ในมุมมองเดียว", "Your marketplace ecosystem")}
            accessory={<Chip size="small" icon={<StorefrontRounded />} label={channels.filter((c) => c.token > 0).length + "/" + channels.length + " " + copy("เชื่อมต่อแล้ว", "connected")} variant="outlined" sx={{ fontSize: 11 }} />} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(" + channels.length + ", minmax(0, 1fr))" }, gap: 2 }}>
            {channels.map((c) => <Panel key={c.id} sx={{ position: "relative", overflow: "hidden", backgroundImage: "linear-gradient(135deg, " + alpha(c.color, 0.055) + ", transparent 65%)" }}>
              <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: c.color }} />
              <Stack direction="row" spacing={1.2} alignItems="center" mb={2.5} flexWrap="wrap" useFlexGap>
                <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: "14px", bgcolor: alpha(c.color, 0.13), color: c.color, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 }}>{c.mark}</Box>
                <Box sx={{ flex: 1, minWidth: 100 }}><Typography fontWeight={700}>{c.name}</Typography><Typography sx={{ fontSize: 10, letterSpacing: 0.7, color: "text.secondary" }}>MARKETPLACE</Typography></Box>
                <Chip size="small" color={c.token ? "success" : "error"} variant="outlined" label={c.token ? "Connected" : "Auth error"} sx={{ height: 22, fontSize: 10, borderRadius: "6px" }} />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} mb={1.5}>
                <Typography sx={{ fontSize: 32, fontWeight: 750, letterSpacing: -0.6 }}>{number(c.orders)} <Box component="span" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 400, letterSpacing: 0 }}>orders</Box></Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">{(c.sent / c.orders * 100).toFixed(1)}% {copy("ส่งสำเร็จ", "delivered")}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={c.sent / c.orders * 100} sx={{ height: 5, borderRadius: 5, bgcolor: alpha(c.color, 0.12), "& .MuiLinearProgress-bar": { bgcolor: c.color } }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, my: 2.25 }}>
                {[{ label: copy("สำเร็จ", "Delivered"), value: c.sent }, { label: copy("รอส่ง", "Pending"), value: c.pending }, { label: "Errors", value: c.errors }].map((s, index) => <Box key={s.label} sx={{ borderLeft: index ? "1px solid" : "none", borderColor: "divider", pl: index ? 1.5 : 0 }}>
                  <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{s.label}</Typography><Typography sx={{ fontSize: 18, fontWeight: 700, color: index === 2 ? "error.main" : "text.primary" }}>{s.value}</Typography>
                </Box>)}
              </Box>
              <Divider />
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center" mt={1.75}>
                <Typography sx={{ fontSize: 10, color: c.token === 0 ? "error.main" : "text.secondary" }}>
                  {c.token ? copy("Token เหลือ " + c.token + " วัน", "Token expires in " + c.token + " days") : copy("Token หมดอายุ • ต้องเชื่อมต่อใหม่", "Token expired • Reconnect required")}
                </Typography>
                <Typography sx={{ fontSize: 10, color: "text.secondary", whiteSpace: "nowrap" }}>Sync {c.sync}</Typography>
              </Stack>
            </Panel>)}
          </Box>
        </Box>

        <Panel>
          <SectionTitle eyebrow="INTEGRATION TIMELINE" title={copy("กิจกรรมล่าสุด", "Recent integration activity")}
            accessory={<Chip size="small" variant="outlined" label={copy("ข้อมูลจำลอง", "Mock activity")} sx={{ fontSize: 10 }} />} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 260px" }, gap: { xs: 3, lg: 5 } }}>
            <Box>
              {activities.map((e, index) => {
                const c = CHANNELS.find((channel) => channel.id === e.channel);
                const Icon = e.error ? ErrorOutlineRounded : CheckCircleOutlineRounded;
                const color = e.error ? p.error.main : p.success.main;
                return <Stack key={e.time + e.channel} direction="row" spacing={1.5} sx={{ position: "relative", pb: index < activities.length - 1 ? 2.5 : 0 }}>
                  {index < activities.length - 1 && <Box aria-hidden="true" sx={{ position: "absolute", left: 17, top: 37, bottom: 0, width: 1, borderLeft: "1px solid", borderColor: "divider" }} />}
                  <Box sx={{ width: 35, height: 35, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "12px", color, bgcolor: alpha(color, 0.09) }}><Icon sx={{ fontSize: 18 }} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>{copy(e.th, e.en)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}><Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{c.name}</Box> · {copy(e.detailTh, e.detailEn)}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", pt: 0.2 }}>{e.time}</Typography>
                </Stack>;
              })}
            </Box>
            <Box sx={{ borderRadius: "17px", p: 2.5, bgcolor: alpha(p.primary.main, 0.04), border: "1px solid", borderColor: alpha(p.primary.main, 0.1), alignSelf: "start" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "primary.main" }}>AT A GLANCE</Typography><ArrowOutwardRounded sx={{ color: "primary.main", fontSize: 18 }} /></Stack>
              <Typography sx={{ fontSize: 30, fontWeight: 750 }}>{number(total.pending + total.errors)}</Typography>
              <Typography variant="body2" fontWeight={600}>{copy("ออเดอร์ที่ยังส่งไม่สำเร็จ", "Orders still to deliver")}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.8 }}>{copy("รอดำเนินการ " + total.pending + " รายการ และต้องตรวจสอบ " + total.errors + " รายการ", total.pending + " pending orders and " + total.errors + " orders requiring review.")}</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={0.8} alignItems="center"><ScheduleRounded sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">17 Jul 2026 · 14:34</Typography></Stack>
            </Box>
          </Box>
        </Panel>
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ pb: 1 }}>
          {copy("OMS Dashboard • ข้อมูลทั้งหมดเป็น mock สำหรับตัวอย่างหน้าจอ", "OMS Dashboard • All values are mock data for this UI preview")}
        </Typography>
      </Stack>
    </Box>
  );
}
