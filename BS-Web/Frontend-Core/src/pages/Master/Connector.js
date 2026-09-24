import React, { useMemo, useState } from "react";
import {
  AddRounded,
  CheckCircleRounded,
  EditOutlined,
  HubRounded,
  PauseCircleOutlineRounded,
  RefreshRounded,
  SyncRounded,
  TuneRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import BSTextField from "../../components/BSTextField";
import { IOSSwitch } from "../../components/BSSwitch";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSDialog from "../../components/BSDialog";

const platforms = {
  shopee: { name: "Shopee", subtitle: "Shopee Open Platform", color: "#EE4D2D", logo: "shopee.svg" },
  lazada: { name: "Lazada", subtitle: "Lazada Open Platform", color: "#201078", logo: "lazada.svg" },
  tiktok: { name: "TikTok Shop", subtitle: "TikTok Shop Partner Center", color: "#101114", logo: "tiktok.svg" },
  line: { name: "LINE SHOPPING", subtitle: "LINE SHOPPING Partner", color: "#06C755", logo: "line.svg" },
};

function PlatformLogo({ platform, size = 36 }) {
  const logo = platforms[platform];
  if (!logo) return null;
  return (
    <Box
      component="img"
      src={`${process.env.PUBLIC_URL}/platform-logos/${logo.logo}`}
      alt={`${logo.name} logo`}
      sx={{
        width: platform === "lazada" ? size * 1.25 : size,
        height: platform === "lazada" ? size * 0.8 : size,
        objectFit: "contain",
      }}
    />
  );
}

const initialConnectors = [
  { id: 1, platform: "shopee", displayName: "Shopee Open Platform", account: "219034821", region: "TH", status: "connected", enabled: true },
  { id: 2, platform: "lazada", displayName: "Lazada Open Platform", account: "LZD-TH-40217", region: "TH", status: "connected", enabled: true },
  { id: 3, platform: "tiktok", displayName: "TikTok Shop Partner Center", account: "TS-827-TH", region: "TH", status: "error", enabled: true },
];

const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } };

export default function Connector() {
  const [connectors, setConnectors] = useState(initialConnectors);
  const [settings, setSettings] = useState({ polling: "5", retry: "3", notify: "LINE Notify: BS-Middleware-Alert" });
  const [draftSettings, setDraftSettings] = useState(settings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ platform: "shopee", displayName: "", account: "", appKey: "", secret: "", region: "TH" });

  const editingConnector = useMemo(() => connectors.find((item) => item.id === editingId), [connectors, editingId]);
  const updateDraft = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateSettings = (key) => (value) => setDraftSettings((current) => ({ ...current, [key]: value }));

  const openAdd = (platform = "shopee") => {
    setEditingId(null);
    setDraft({ platform, displayName: "", account: "", appKey: "", secret: "", region: "TH" });
    setDialogOpen(true);
  };
  const openEdit = (connector) => {
    setEditingId(connector.id);
    setDraft({ platform: connector.platform, displayName: connector.displayName, account: connector.account, appKey: connector.appKey || "", secret: connector.secret || "", region: connector.region || "TH" });
    setDialogOpen(true);
  };
  const saveConnector = () => {
    if (!draft.account.trim() || !draft.displayName.trim()) return;
    if (editingId) {
      setConnectors((items) => items.map((item) => item.id === editingId ? { ...item, ...draft } : item));
    } else {
      setConnectors((items) => [...items, { id: Date.now(), ...draft, status: "connected", enabled: true }]);
    }
    setDialogOpen(false);
  };
  const toggleConnector = (id) => setConnectors((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));

  return (
    <Box sx={{ minHeight: "100%", p: { xs: 2, md: 3 }, bgcolor: "#f5f7fb" }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1440, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar sx={{ bgcolor: "#e8f4fa", color: "#168dae", width: 42, height: 42 }}><HubRounded /></Avatar>
              <Box>
                <Typography variant="h5" fontWeight={750} color="#172b4d">จัดการ Connectors</Typography>
                <Typography variant="body2" color="text.secondary">เชื่อมต่อช่องทางขายและจัดการการซิงก์ข้อมูล</Typography>
              </Box>
            </Stack>
          </Box>
          <Button onClick={() => openAdd()} variant="contained" startIcon={<AddRounded />} sx={{ borderRadius: 2, px: 2.25, py: 1.1, textTransform: "none", boxShadow: "none", bgcolor: "#168dae", "&:hover": { bgcolor: "#107b98", boxShadow: "none" } }}>เพิ่ม Connector</Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, borderColor: "#e3e9f1", boxShadow: "0 3px 14px rgba(29,52,84,.035)" }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.2 }}>
            <TuneRounded sx={{ color: "#168dae" }} />
            <Typography fontWeight={700} color="#172b4d">ตั้งค่าทั่วไป</Typography>
            <Chip size="small" label="ใช้กับทุก Connector" sx={{ ml: 0.5, bgcolor: "#eef7fa", color: "#168dae", fontWeight: 600 }} />
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
            <BSTextField label="Polling interval (นาที)" type="int" value={draftSettings.polling} onChange={updateSettings("polling")} labelAbove sx={fieldSx} />
            <BSTextField label="Retry สูงสุดต่อ Order" value={draftSettings.retry} onChange={updateSettings("retry")} select labelAbove sx={fieldSx}>
              {[1, 2, 3, 5, 10].map((count) => <MenuItem key={count} value={String(count)}>{count} ครั้ง · Exponential Backoff</MenuItem>)}
            </BSTextField>
            <BSTextField label="แจ้งเตือน Error ไปที่" value={draftSettings.notify} onChange={updateSettings("notify")} select labelAbove sx={fieldSx}>
              {["LINE Notify: BS-Middleware-Alert", "Email: OMS Admin", "ไม่แจ้งเตือน"].map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </BSTextField>
          </Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <BSSaveOutlinedButton onClick={() => setSettings(draftSettings)} sx={{ borderRadius: 2, textTransform: "none" }}>บันทึกการตั้งค่า</BSSaveOutlinedButton>
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" fontWeight={750} color="#172b4d">ช่องทางที่เชื่อมต่อ</Typography>
            <Typography variant="body2" color="text.secondary">จัดการบัญชีและสถานะการเชื่อมต่อของแต่ละแพลตฟอร์ม</Typography>
          </Box>
          <Chip icon={<SyncRounded />} label={`${connectors.filter((item) => item.status === "connected").length} จาก ${connectors.length} เชื่อมต่อแล้ว`} sx={{ bgcolor: "#eaf7f0", color: "#218653", fontWeight: 650, "& .MuiChip-icon": { color: "inherit" } }} />
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {connectors.map((connector) => {
            const platform = platforms[connector.platform] || platforms.shopee;
            const connected = connector.status === "connected";
            return (
              <Paper key={connector.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, borderColor: "#e3e9f1", boxShadow: "0 3px 14px rgba(29,52,84,.035)", transition: "transform .18s, box-shadow .18s", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(29,52,84,.08)" } }}>
                <Stack direction="row" alignItems="center" spacing={1.75}>
                  <Avatar variant="rounded" sx={{ width: 54, height: 54, borderRadius: 2.5, bgcolor: "white", border: `1px solid ${platform.color}22`, boxShadow: `0 5px 12px ${platform.color}25` }}><PlatformLogo platform={connector.platform} size={38} /></Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} color="#172b4d" noWrap>{connector.displayName || platform.subtitle}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{platform.name} · {connector.account} · Region {connector.region || "TH"}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.65} sx={{ mt: 0.8 }}>
                      {connected ? <CheckCircleRounded sx={{ fontSize: 16, color: "#26a269" }} /> : <PauseCircleOutlineRounded sx={{ fontSize: 16, color: "#d9364f" }} />}
                      <Typography variant="caption" fontWeight={650} color={connected ? "success.main" : "error.main"}>{connected ? "เชื่อมต่อแล้ว" : "ต้องยืนยันตัวตนใหม่"}</Typography>
                      <Typography variant="caption" color="text.disabled">·</Typography>
                      <Typography variant="caption" color="text.secondary">Sync ทุก {settings.polling || "5"} นาที</Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <IOSSwitch checked={connector.enabled} onChange={() => toggleConnector(connector.id)} inputProps={{ "aria-label": `เปิดใช้งาน ${platform.name}` }} />
                    <IconButton aria-label={`แก้ไข ${platform.name}`} onClick={() => openEdit(connector)} size="small" sx={{ border: "1px solid #e3e9f1", borderRadius: 2 }}><EditOutlined fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
                {!connector.enabled && <Chip size="small" label="ปิดใช้งานชั่วคราว" sx={{ mt: 1.5, bgcolor: "#f1f3f6", color: "text.secondary" }} />}
              </Paper>
            );
          })}
          <Paper onClick={() => openAdd()} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && openAdd()} variant="outlined" sx={{ minHeight: 112, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, borderRadius: 3, borderStyle: "dashed", borderColor: "#b9c8d8", color: "#168dae", cursor: "pointer", bgcolor: "rgba(255,255,255,.55)", "&:hover": { bgcolor: "#eef8fb", borderColor: "#168dae" } }}>
            <AddRounded /> <Typography fontWeight={650}>เพิ่มช่องทางขาย</Typography>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ px: 2, py: 1.3, borderRadius: 2.5, borderColor: "#e3e9f1", bgcolor: "#fbfcfe" }}>
          <Stack direction="row" spacing={1} alignItems="center"><RefreshRounded sx={{ color: "#718096", fontSize: 19 }} /><Typography variant="caption" color="text.secondary">ระบบจะดึงคำสั่งซื้อและอัปเดตสถานะอัตโนมัติตามช่วงเวลาที่ตั้งไว้</Typography></Stack>
        </Paper>
      </Stack>

      <BSDialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth title={editingConnector ? `แก้ไข Connector — ${platforms[draft.platform]?.name}` : "เพิ่มช่องทางขาย"} contentDividers titleSx={{ bgcolor: "#168dae", color: "white" }} contentSx={{ p: { xs: 2, sm: 2.5 } }} actions={<><BSCloseOutlinedButton onClick={() => setDialogOpen(false)} sx={{ textTransform: "none", borderRadius: 2 }}>ยกเลิก</BSCloseOutlinedButton><BSSaveOutlinedButton onClick={saveConnector} sx={{ textTransform: "none", borderRadius: 2 }}>บันทึก</BSSaveOutlinedButton></>}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" fontWeight={650} color="#46566b" sx={{ mb: 1 }}>เลือกแพลตฟอร์ม</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1 }}>
              {Object.entries(platforms).map(([key, platform]) => <Paper key={key} variant="outlined" onClick={() => updateDraft("platform")(key)} sx={{ p: 1.2, borderRadius: 2, textAlign: "center", cursor: "pointer", borderColor: draft.platform === key ? platform.color : "#e3e9f1", bgcolor: draft.platform === key ? `${platform.color}0c` : "white", boxShadow: draft.platform === key ? `0 0 0 1px ${platform.color}` : "none" }}><Avatar variant="rounded" sx={{ width: 42, height: 42, mx: "auto", mb: 0.7, bgcolor: "white" }}><PlatformLogo platform={key} size={34} /></Avatar><Typography variant="caption" fontWeight={650}>{platform.name}</Typography></Paper>)}
            </Box>
          </Box>
          <Divider />
          <BSTextField label="ชื่อที่แสดง" value={draft.displayName} onChange={updateDraft("displayName")} labelAbove sx={fieldSx} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <BSTextField label="Shop ID / Seller ID / Cipher" value={draft.account} onChange={updateDraft("account")} labelAbove sx={fieldSx} />
            <BSTextField label="Region" value={draft.region} onChange={updateDraft("region")} select labelAbove sx={fieldSx}><MenuItem value="TH">Thailand (TH)</MenuItem><MenuItem value="SG">Singapore (SG)</MenuItem><MenuItem value="MY">Malaysia (MY)</MenuItem></BSTextField>
          </Box>
          <BSTextField label="App Key" value={draft.appKey} onChange={updateDraft("appKey")} labelAbove sx={fieldSx} />
          <BSTextField label="App Secret" type="password" value={draft.secret} onChange={updateDraft("secret")} labelAbove sx={fieldSx} />
          <Typography variant="caption" color="text.secondary">ข้อมูลบัญชีจะใช้สำหรับเชื่อมต่อและซิงก์ข้อมูลจากแพลตฟอร์ม</Typography>
        </Stack>
      </BSDialog>
    </Box>
  );
}
