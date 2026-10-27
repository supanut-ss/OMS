import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AddRounded,
  AdminPanelSettingsRounded,
  DeleteOutlineRounded,
  EditRounded,
  KeyRounded,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const platformOptions = [
  { value: "Shopee", label: "Shopee", color: "#EE4D2D", logo: "shopee.svg" },
  { value: "Lazada", label: "Lazada", color: "#201078", logo: "lazada.svg" },
  { value: "TikTok", label: "TikTok Shop", color: "#101114", logo: "tiktok.svg" },
];

const marketOptions = [
  { value: "TH", label: "Thailand (TH)" },
  { value: "MY", label: "Malaysia (MY)" },
  { value: "SG", label: "Singapore (SG)" },
  { value: "ID", label: "Indonesia (ID)" },
  { value: "PH", label: "Philippines (PH)" },
  { value: "VN", label: "Vietnam (VN)" },
];

const createEmptyForm = () => ({
  platformAppId: null,
  platform: "Shopee",
  appName: "",
  appKey: "",
  appSecret: "",
  redirectUrl: "",
  serviceId: "",
  countryCode: process.env.REACT_APP_DEFAULT_MARKET_CODE || "TH",
  environment: "PRODUCTION",
  isDefault: false,
  isActive: true,
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message_text ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export default function PlatformAppAdmin() {
  const { permission = {} } = useOutletContext();
  const canAdd = Boolean(permission.is_add);
  const canEdit = Boolean(permission.is_edit);
  const canDelete = Boolean(permission.is_delete);
  const [apps, setApps] = useState([]);
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AxiosMaster.get("/PlatformApp");
      const rows = response?.data?.data;
      if (!Array.isArray(rows)) throw new Error("รูปแบบข้อมูล App Master ไม่ถูกต้อง");
      setApps(rows);
    } catch (error) {
      setNotice({ open: true, severity: "error", message: getErrorMessage(error, "โหลด App Master ไม่สำเร็จ") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const filteredApps = useMemo(
    () => platformFilter === "ALL" ? apps : apps.filter((app) => app.platform === platformFilter),
    [apps, platformFilter],
  );

  const defaultCount = useMemo(
    () => apps.filter((app) => app.isActive && app.isDefault).length,
    [apps],
  );

  const updateForm = (field) => (event) => {
    const value = event?.target?.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openAdd = () => {
    setForm(createEmptyForm());
    setDialogOpen(true);
  };

  const openEdit = (app) => {
    setForm({
      platformAppId: app.platformAppId,
      platform: app.platform,
      appName: app.appName || "",
      appKey: "",
      appSecret: "",
      redirectUrl: app.redirectUrl || "",
      serviceId: app.serviceId || "",
      countryCode: app.countryCode || "TH",
      environment: app.environment || "PRODUCTION",
      isDefault: Boolean(app.isDefault),
      isActive: Boolean(app.isActive),
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!form.appName.trim()) return "กรุณาระบุชื่อ App";
    if (!form.platformAppId && (!form.appKey.trim() || !form.appSecret.trim()))
      return "การสร้าง App ใหม่ต้องระบุ App Key และ App Secret";
    if (!form.redirectUrl.trim()) return "กรุณาระบุ Redirect URL";
    try {
      const redirect = new URL(form.redirectUrl.trim());
      if (!["http:", "https:"].includes(redirect.protocol)) throw new Error();
    } catch {
      return "Redirect URL ต้องเป็น URL แบบเต็มที่ขึ้นต้นด้วย http:// หรือ https://";
    }
    if (form.isDefault && !form.isActive) return "Default App ต้องเปิดใช้งานอยู่";
    return null;
  };

  const saveApp = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotice({ open: true, severity: "warning", message: validationError });
      return;
    }

    setSaving(true);
    try {
      await AxiosMaster.post("/PlatformApp/save", {
        ...form,
        appName: form.appName.trim(),
        appKey: form.appKey.trim() || null,
        appSecret: form.appSecret.trim() || null,
        redirectUrl: form.redirectUrl.trim(),
        serviceId: form.serviceId.trim() || null,
      });
      await loadApps();
      setDialogOpen(false);
      setNotice({
        open: true,
        severity: "success",
        message: form.platformAppId ? "แก้ไข App Master สำเร็จ" : "สร้าง App Master สำเร็จ",
      });
    } catch (error) {
      setNotice({ open: true, severity: "error", message: getErrorMessage(error, "บันทึก App Master ไม่สำเร็จ") });
    } finally {
      setSaving(false);
    }
  };

  const deleteApp = async (app) => {
    const confirmed = await BSAlertSwal2.confirm(
      `ยืนยันลบ App “${app.appName}” หรือไม่?`,
      {
        title: "ยืนยันการลบ App Master",
        confirmButtonText: "ลบ App",
        cancelButtonText: "ยกเลิก",
      },
    );
    if (!confirmed) return;

    setDeletingId(app.platformAppId);
    try {
      await AxiosMaster.post(`/PlatformApp/${app.platformAppId}/delete`);
      await loadApps();
      setNotice({ open: true, severity: "success", message: "ลบ App Master สำเร็จ" });
    } catch (error) {
      await BSAlertSwal2.show("error", getErrorMessage(error, "ลบ App Master ไม่สำเร็จ"), {
        title: "ลบ App Master ไม่สำเร็จ",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box sx={{ minHeight: "100%", p: { xs: 2, md: 3 }, bgcolor: "#f5f7fb" }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1440, mx: "auto" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ bgcolor: "#ede9fe", color: "#6d4bc3", width: 42, height: 42 }}>
              <AdminPanelSettingsRounded />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={750} color="#172b4d">
                Platform App Admin
              </Typography>
              <Typography variant="body2" color="text.secondary">
                จัดการ App กลางที่ใช้เชื่อมร้านค้าของแต่ละ Marketplace และ Market
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={canAdd ? "" : "ไม่มีสิทธิ์เพิ่มข้อมูล"}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddRounded />}
                  disabled={!canAdd}
                  onClick={openAdd}
                  sx={{ bgcolor: "#6d4bc3", "&:hover": { bgcolor: "#5b3baa" } }}
                >
                  เพิ่ม App
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Alert severity="warning" icon={<KeyRounded />}>
          App Key และ App Secret จะถูกเข้ารหัสก่อนบันทึกและจะไม่ถูกส่งกลับมาแสดงบน Browser หากแก้ไข App เดิมและไม่ต้องการเปลี่ยนค่า ให้เว้นสองช่องนี้ว่าง
        </Alert>

        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#e3e9f1" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[{ value: "ALL", label: "ทั้งหมด" }, ...platformOptions].map((option) => (
                <Chip
                  key={option.value}
                  clickable
                  label={option.label}
                  color={platformFilter === option.value ? "primary" : "default"}
                  variant={platformFilter === option.value ? "filled" : "outlined"}
                  onClick={() => setPlatformFilter(option.value)}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`${defaultCount} Default Apps`} color="success" variant="outlined" />
              <IconButton onClick={loadApps} disabled={loading} aria-label="refresh App Masters">
                {loading ? <CircularProgress size={20} /> : <RefreshRounded />}
              </IconButton>
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
            <CircularProgress size={30} />
          </Paper>
        ) : filteredApps.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: 3, color: "text.secondary" }}>
            ยังไม่มี App Master สำหรับเงื่อนไขนี้
          </Paper>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            {filteredApps.map((app) => {
              const platform = platformOptions.find((option) => option.value === app.platform) || platformOptions[0];
              return (
                <Paper key={app.platformAppId} variant="outlined" sx={{ p: 2.25, borderRadius: 3, borderColor: app.isDefault ? "#9bd3b1" : "#e3e9f1" }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar variant="rounded" sx={{ width: 54, height: 54, bgcolor: "white", border: `1px solid ${platform.color}30` }}>
                      <Box component="img" src={`${process.env.PUBLIC_URL}/platform-logos/${platform.logo}`} alt={platform.label} sx={{ width: 38, height: 38, objectFit: "contain" }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={750} color="#172b4d" noWrap>{app.appName}</Typography>
                        {app.isDefault && <Chip label="DEFAULT" size="small" color="success" />}
                        {!app.isActive && <Chip label="INACTIVE" size="small" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {platform.label} · {app.countryCode} · {app.environment}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }} noWrap>
                        Redirect: {app.redirectUrl}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title={canEdit ? "แก้ไข" : "ไม่มีสิทธิ์แก้ไข"}>
                        <span><IconButton disabled={!canEdit} onClick={() => openEdit(app)}><EditRounded fontSize="small" /></IconButton></span>
                      </Tooltip>
                      <Tooltip title={app.shopCount > 0 ? "App นี้มีร้านเชื่อมอยู่ ให้ปิดใช้งานแทน" : canDelete ? "ลบ" : "ไม่มีสิทธิ์ลบ"}>
                        <span>
                          <IconButton
                            color="error"
                            disabled={!canDelete || app.shopCount > 0 || deletingId !== null}
                            onClick={() => deleteApp(app)}
                          >
                            {deletingId === app.platformAppId ? <CircularProgress size={18} /> : <DeleteOutlineRounded fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    <Chip size="small" variant="outlined" label={`${app.shopCount || 0} ร้าน`} />
                    <Chip size="small" variant="outlined" color={app.hasAppKey ? "success" : "error"} label={app.hasAppKey ? "มี App Key" : "ไม่มี App Key"} />
                    <Chip size="small" variant="outlined" color={app.hasAppSecret ? "success" : "error"} label={app.hasAppSecret ? "มี App Secret" : "ไม่มี App Secret"} />
                    {app.serviceId && <Chip size="small" variant="outlined" label={`Service ID: ${app.serviceId}`} />}
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form.platformAppId ? "แก้ไข App Master" : "เพิ่ม App Master"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ pt: 0.5 }}>
            <Alert severity="info">
              ระบบเลือก Default App จาก Platform + Market + Environment ก่อนส่งลูกค้าไป OAuth
            </Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField select required label="Platform" value={form.platform} onChange={updateForm("platform")} disabled={Boolean(form.platformAppId)}>
                {platformOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>
              <TextField required label="ชื่อ App" value={form.appName} onChange={updateForm("appName")} inputProps={{ maxLength: 128 }} />
              <TextField select required label="ประเทศ / Market" value={form.countryCode} onChange={updateForm("countryCode")}>
                {marketOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>
              <TextField select required label="Environment" value={form.environment} onChange={updateForm("environment")}>
                <MenuItem value="PRODUCTION">PRODUCTION</MenuItem>
                <MenuItem value="SANDBOX">SANDBOX</MenuItem>
              </TextField>
            </Box>
            <TextField required label="Redirect URL" value={form.redirectUrl} onChange={updateForm("redirectUrl")} placeholder="https://api.example.com/api/auth/shopee/callback" inputProps={{ maxLength: 2048 }} />
            <TextField label="Service ID (ใช้เฉพาะ Platform ที่กำหนด)" value={form.serviceId} onChange={updateForm("serviceId")} inputProps={{ maxLength: 255 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                required={!form.platformAppId}
                type="password"
                autoComplete="new-password"
                label={form.platformAppId ? "App Key ใหม่ (เว้นว่างเพื่อใช้ค่าเดิม)" : "App Key"}
                value={form.appKey}
                onChange={updateForm("appKey")}
                inputProps={{ maxLength: 2048 }}
              />
              <TextField
                required={!form.platformAppId}
                type="password"
                autoComplete="new-password"
                label={form.platformAppId ? "App Secret ใหม่ (เว้นว่างเพื่อใช้ค่าเดิม)" : "App Secret"}
                value={form.appSecret}
                onChange={updateForm("appSecret")}
                inputProps={{ maxLength: 4096 }}
              />
            </Box>
            <Alert severity="warning">
              การเปลี่ยน App Key หรือ App Secret จะทำให้ร้านที่ผูกกับ App นี้ต้องเชื่อมต่อ OAuth ใหม่
            </Alert>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked, isDefault: event.target.checked ? current.isDefault : false }))} />}
                label="เปิดใช้งาน App"
              />
              <FormControlLabel
                control={<Switch checked={form.isDefault} disabled={!form.isActive} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />}
                label="ใช้เป็น Default App สำหรับ Market นี้"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveApp} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : null}>
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))}>
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
