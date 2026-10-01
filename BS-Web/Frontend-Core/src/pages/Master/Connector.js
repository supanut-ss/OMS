import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AddRounded,
  CheckCircleRounded,
  EditOutlined,
  HubRounded,
  PauseCircleOutlineRounded,
  RefreshRounded,
  SyncRounded,
  OpenInNewRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import BSTextField from "../../components/BSTextField";
import BSDatepicker from "../../components/BSDatepicker";
import { IOSSwitch } from "../../components/BSSwitch";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import BSDialog from "../../components/BSDialog";
import AxiosMaster from "../../utils/AxiosMaster";
import Config from "../../utils/Config";

const platforms = {
  shopee: {
    name: "Shopee",
    subtitle: "Shopee Open Platform",
    color: "#EE4D2D",
    logo: "shopee.svg",
  },
  lazada: {
    name: "Lazada",
    subtitle: "Lazada Open Platform",
    color: "#201078",
    logo: "lazada.svg",
  },
  tiktok: {
    name: "TikTok Shop",
    subtitle: "TikTok Shop Partner Center",
    color: "#101114",
    logo: "tiktok.svg",
  },
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

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" },
};

const emptyDraft = {
  platform: "shopee",
  displayName: "",
  account: "",
  accessToken: "",
  refreshToken: "",
  accessTokenExpiresDate: "",
  refreshTokenExpiresDate: "",
};

const mapConnector = (item) => {
  const platform = String(item?.platform || "shopee")
    .toLowerCase()
    .replace(" shop", "");
  return {
    ...item,
    id: item.platformCredentialId,
    platform,
    displayName:
      item.shopName || platforms[platform]?.subtitle || item.platform,
    account: item.shopId,
    enabled: item.isActive,
    status: item.requiresReauthorization ? "error" : "connected",
  };
};

const toUtcIsoString = (value) =>
  value ? new Date(value).toISOString() : null;

const toApiUtcIsoString = (value) => {
  if (!value) return "";
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export default function Connector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [connectors, setConnectors] = useState([]);
  const [oauthRedirecting, setOauthRedirecting] = useState("");
  const handledOAuthResult = React.useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  const editingConnector = useMemo(
    () => connectors.find((item) => item.id === editingId),
    [connectors, editingId],
  );
  const updateDraft = (key) => (value) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const loadConnectors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AxiosMaster.get("/Connector");
      const rows = response?.data?.data;
      if (!Array.isArray(rows))
        throw new Error("รูปแบบข้อมูล Connector จาก API ไม่ถูกต้อง");
      setConnectors(rows.map(mapConnector));
      return true;
    } catch (error) {
      setNotice({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.message_text ||
          error?.message ||
          "โหลดข้อมูล Connector ไม่สำเร็จ",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  useEffect(() => {
    const result = searchParams.get("oauth");
    const platform = searchParams.get("platform");
    if (!result || handledOAuthResult.current) return;
    handledOAuthResult.current = true;
    if (result === "success") {
      setNotice({ open: true, severity: "success", message: `เชื่อมต่อ ${platforms[platform]?.name || "ร้านค้า"} สำเร็จ` });
      loadConnectors();
    } else {
      setNotice({ open: true, severity: "error", message: `เชื่อมต่อ ${platforms[platform]?.name || "ร้านค้า"} ไม่สำเร็จ กรุณาลองใหม่` });
    }
    navigate("/connector", { replace: true });
  }, [loadConnectors, navigate, searchParams]);

  const connectOAuth = async (platform) => {
    setOauthRedirecting(platform);
    try {
      const { data } = await axios.get(
        `${Config.OMS_API_URL.replace(/\/$/, "")}/auth/${platform}/auth-url`,
        { timeout: 15000 },
      );
      const authUrl = data?.data?.url || data?.url;
      if (!authUrl || !/^https:\/\//i.test(authUrl)) throw new Error("API ไม่ได้ส่ง OAuth URL ที่ถูกต้อง");
      window.location.assign(authUrl);
    } catch (error) {
      setOauthRedirecting("");
      setNotice({ open: true, severity: "error", message: error?.response?.data?.message_text || error?.message || "เริ่ม OAuth ไม่สำเร็จ" });
    }
  };

  const openAdd = (platform = "shopee") => {
    setEditingId(null);
    setDraft({ ...emptyDraft, platform });
    setDialogOpen(true);
  };
  const openEdit = (connector) => {
    setEditingId(connector.id);
    setDraft({
      ...emptyDraft,
      platform: connector.platform,
      displayName: connector.shopName || connector.displayName,
      account: connector.shopId || connector.account,
      accessTokenExpiresDate: toApiUtcIsoString(
        connector.accessTokenExpiresDate,
      ),
      refreshTokenExpiresDate: toApiUtcIsoString(
        connector.refreshTokenExpiresDate,
      ),
    });
    setDialogOpen(true);
  };
  const saveConnector = async () => {
    if (!draft.account.trim()) {
      setNotice({
        open: true,
        severity: "warning",
        message: "กรุณาระบุ Shop ID",
      });
      return;
    }
    if (
      !editingId &&
      (!draft.accessToken.trim() || !draft.accessTokenExpiresDate)
    ) {
      setNotice({
        open: true,
        severity: "warning",
        message: "การเพิ่ม Connector ต้องระบุ Access Token และวันหมดอายุ",
      });
      return;
    }
    if (draft.accessToken.trim() && !draft.accessTokenExpiresDate) {
      setNotice({
        open: true,
        severity: "warning",
        message: "กรุณาระบุวันหมดอายุของ Access Token",
      });
      return;
    }
    if (draft.refreshToken.trim() && !draft.refreshTokenExpiresDate) {
      setNotice({
        open: true,
        severity: "warning",
        message: "กรุณาระบุวันหมดอายุของ Refresh Token",
      });
      return;
    }

    const payload = {
      platform: draft.platform,
      shopId: draft.account.trim(),
      shopName: draft.displayName.trim() || null,
      accessToken: draft.accessToken.trim() || null,
      refreshToken: draft.refreshToken.trim() || null,
      accessTokenExpiresDate: toUtcIsoString(draft.accessTokenExpiresDate),
      refreshTokenExpiresDate: toUtcIsoString(draft.refreshTokenExpiresDate),
      isActive: editingConnector?.isActive ?? true,
    };
    if (editingId) payload.platformCredentialId = editingId;

    setSaving(true);
    try {
      await AxiosMaster.post("/Connector/save", payload);
      const refreshed = await loadConnectors();
      setDialogOpen(false);
      setNotice({
        open: true,
        severity: refreshed ? "success" : "warning",
        message: refreshed
          ? "บันทึก Connector สำเร็จ"
          : "บันทึกสำเร็จ แต่โหลดรายการใหม่ไม่สำเร็จ",
      });
    } catch (error) {
      setNotice({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.message_text ||
          error?.message ||
          "บันทึก Connector ไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };
  const toggleConnector = async (connector) => {
    const nextIsActive = !connector.isActive;
    try {
      await AxiosMaster.post("/Connector/set-active", {
        platformCredentialId: connector.id,
        isActive: nextIsActive,
      });
      const refreshed = await loadConnectors();
      setNotice({
        open: true,
        severity: refreshed ? "success" : "warning",
        message: refreshed
          ? nextIsActive
            ? "เปิดใช้งาน Connector แล้ว"
            : "ปิดใช้งาน Connector แล้ว"
          : "เปลี่ยนสถานะสำเร็จ แต่โหลดรายการใหม่ไม่สำเร็จ",
      });
    } catch (error) {
      setNotice({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.message_text ||
          error?.message ||
          "เปลี่ยนสถานะ Connector ไม่สำเร็จ",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "100%", p: { xs: 2, md: 3 }, bgcolor: "#f5f7fb" }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1440, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#e8f4fa",
                  color: "#168dae",
                  width: 42,
                  height: 42,
                }}
              >
                <HubRounded />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={750} color="#172b4d">
                  จัดการ Connectors
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  เชื่อมต่อช่องทางขายและจัดการการซิงก์ข้อมูล
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Button
            onClick={() => openAdd()}
            variant="contained"
            startIcon={<AddRounded />}
            sx={{
              borderRadius: 2,
              px: 2.25,
              py: 1.1,
              textTransform: "none",
              boxShadow: "none",
              bgcolor: "#168dae",
              "&:hover": { bgcolor: "#107b98", boxShadow: "none" },
            }}
          >
            เพิ่ม Connector
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: "#e3e9f1" }}>
          <Typography variant="subtitle1" fontWeight={700} color="#172b4d" sx={{ mb: 1.5 }}>
            เชื่อมต่อผ่าน OAuth
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            {Object.entries(platforms).map(([key, platform]) => {
              const needsReauthorization = connectors.some(
                (item) => item.platform === key && item.requiresReauthorization,
              );
              return (
                <Button
                  key={key}
                  variant="outlined"
                  disabled={Boolean(oauthRedirecting)}
                  onClick={() => connectOAuth(key)}
                  startIcon={oauthRedirecting === key ? <CircularProgress size={16} /> : <OpenInNewRounded />}
                  sx={{ borderRadius: 2, textTransform: "none", borderColor: `${platform.color}66`, color: platform.color }}
                >
                  {oauthRedirecting === key ? "กำลังเปลี่ยนเส้นทาง…" : needsReauthorization ? `ยืนยัน ${platform.name} ใหม่` : `เชื่อมต่อ ${platform.name}`}
                </Button>
              );
            })}
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="h6" fontWeight={750} color="#172b4d">
              ช่องทางที่เชื่อมต่อ
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการบัญชีและสถานะการเชื่อมต่อของแต่ละแพลตฟอร์ม
            </Typography>
          </Box>
          <Chip
            icon={<SyncRounded />}
            label={`${connectors.filter((item) => item.isActive && !item.requiresReauthorization).length} จาก ${connectors.length} เชื่อมต่อแล้ว`}
            sx={{
              bgcolor: "#eaf7f0",
              color: "#218653",
              fontWeight: 650,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {loading && (
            <Paper
              variant="outlined"
              sx={{
                gridColumn: "1 / -1",
                p: 4,
                display: "flex",
                justifyContent: "center",
                borderRadius: 3,
              }}
            >
              <CircularProgress size={28} />
            </Paper>
          )}
          {!loading && connectors.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                gridColumn: "1 / -1",
                p: 4,
                textAlign: "center",
                borderRadius: 3,
                color: "text.secondary",
              }}
            >
              ยังไม่มี Connector ในระบบ
            </Paper>
          )}
          {connectors.map((connector) => {
            const platform = platforms[connector.platform] || platforms.shopee;
            const connected = !connector.requiresReauthorization;
            return (
              <Paper
                key={connector.id}
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 3,
                  borderColor: "#e3e9f1",
                  boxShadow: "0 3px 14px rgba(29,52,84,.035)",
                  transition: "transform .18s, box-shadow .18s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(29,52,84,.08)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.75}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 2.5,
                      bgcolor: "white",
                      border: `1px solid ${platform.color}22`,
                      boxShadow: `0 5px 12px ${platform.color}25`,
                    }}
                  >
                    <PlatformLogo platform={connector.platform} size={38} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} color="#172b4d" noWrap>
                      {connector.displayName || platform.subtitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {platform.name} · {connector.account}
                    </Typography>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.65}
                      sx={{ mt: 0.8 }}
                    >
                      {connected ? (
                        <CheckCircleRounded
                          sx={{ fontSize: 16, color: "#26a269" }}
                        />
                      ) : (
                        <PauseCircleOutlineRounded
                          sx={{ fontSize: 16, color: "#d9364f" }}
                        />
                      )}
                      <Typography
                        variant="caption"
                        fontWeight={650}
                        color={connected ? "success.main" : "error.main"}
                      >
                        {connected ? "เชื่อมต่อแล้ว" : "ต้องยืนยันตัวตนใหม่"}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        ·
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Token หมดอายุ{" "}
                        {connector.accessTokenExpiresDate
                          ? new Date(
                              connector.accessTokenExpiresDate,
                            ).toLocaleDateString()
                          : "—"}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <IOSSwitch
                      checked={connector.isActive}
                      onChange={() => toggleConnector(connector)}
                      inputProps={{
                        "aria-label": `เปิดใช้งาน ${platform.name}`,
                      }}
                    />
                    <IconButton
                      aria-label={`แก้ไข ${platform.name}`}
                      onClick={() => openEdit(connector)}
                      size="small"
                      sx={{ border: "1px solid #e3e9f1", borderRadius: 2 }}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                {!connector.isActive && (
                  <Chip
                    size="small"
                    label="ปิดใช้งานชั่วคราว"
                    sx={{
                      mt: 1.5,
                      bgcolor: "#f1f3f6",
                      color: "text.secondary",
                    }}
                  />
                )}
              </Paper>
            );
          })}
          <Paper
            onClick={() => openAdd()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === "Enter" && openAdd()}
            variant="outlined"
            sx={{
              minHeight: 112,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.25,
              borderRadius: 3,
              borderStyle: "dashed",
              borderColor: "#b9c8d8",
              color: "#168dae",
              cursor: "pointer",
              bgcolor: "rgba(255,255,255,.55)",
              "&:hover": { bgcolor: "#eef8fb", borderColor: "#168dae" },
            }}
          >
            <AddRounded />{" "}
            <Typography fontWeight={650}>เพิ่มช่องทางขาย</Typography>
          </Paper>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1.3,
            borderRadius: 2.5,
            borderColor: "#e3e9f1",
            bgcolor: "#fbfcfe",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <RefreshRounded sx={{ color: "#718096", fontSize: 19 }} />
            <Typography variant="caption" color="text.secondary">
              ระบบจะดึงคำสั่งซื้อและอัปเดตสถานะอัตโนมัติตามช่วงเวลาที่ตั้งไว้
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <BSDialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        title={
          editingConnector
            ? `Edit Connector — ${platforms[draft.platform]?.name}`
            : "Add sales channel"
        }
        contentDividers
        titleSx={{ bgcolor: "#168dae", color: "white" }}
        contentSx={{ p: { xs: 2, sm: 2.5 } }}
        actions={
          <>
            <BSCloseOutlinedButton
              disabled={saving}
              onClick={() => setDialogOpen(false)}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Cancel
            </BSCloseOutlinedButton>
            <BSSaveOutlinedButton
              disabled={saving}
              onClick={saveConnector}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {saving ? "Saving…" : "Save"}
            </BSSaveOutlinedButton>
          </>
        }
      >
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="body2"
              fontWeight={650}
              color="#46566b"
              sx={{ mb: 1 }}
            >
              Select platform
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 1,
              }}
            >
              {Object.entries(platforms).map(([key, platform]) => (
                <Paper
                  key={key}
                  variant="outlined"
                  onClick={() => !editingId && updateDraft("platform")(key)}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: editingId ? "default" : "pointer",
                    opacity: editingId && draft.platform !== key ? 0.45 : 1,
                    borderColor:
                      draft.platform === key ? platform.color : "#e3e9f1",
                    bgcolor:
                      draft.platform === key ? `${platform.color}0c` : "white",
                    boxShadow:
                      draft.platform === key
                        ? `0 0 0 1px ${platform.color}`
                        : "none",
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 42,
                      height: 42,
                      mx: "auto",
                      mb: 0.7,
                      bgcolor: "white",
                    }}
                  >
                    <PlatformLogo platform={key} size={34} />
                  </Avatar>
                  <Typography variant="caption" fontWeight={650}>
                    {platform.name}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
          <Divider />
          <BSTextField
            label="Shop name (optional)"
            value={draft.displayName}
            onChange={updateDraft("displayName")}
            labelAbove
            sx={fieldSx}
          />
          <BSTextField
            label="Shop ID / Seller ID"
            value={draft.account}
            onChange={updateDraft("account")}
            labelAbove
            sx={fieldSx}
          />
          {editingId && (
            <Alert severity="info">
              Access Token: {editingConnector?.hasAccessToken ? "มีข้อมูลบันทึกแล้ว" : "ไม่มีข้อมูล"}
              {" · "}
              Refresh Token: {editingConnector?.hasRefreshToken ? "มีข้อมูลบันทึกแล้ว" : "ไม่มีข้อมูล"}
              <br />
              Token เดิมถูกเข้ารหัสและจะไม่แสดงในช่องนี้ หากเว้นช่อง Token ว่าง ระบบจะเก็บค่าเดิมไว้
            </Alert>
          )}
          <BSTextField
            label={`Access Token${editingId ? " (leave blank to keep current)" : ""}`}
            type="password"
            value={draft.accessToken}
            onChange={updateDraft("accessToken")}
            labelAbove
            sx={fieldSx}
          />
          <BSDatepicker
            label="Access Token expires (date and time)"
            value={draft.accessTokenExpiresDate ? dayjs(draft.accessTokenExpiresDate) : null}
            onChange={(value) => updateDraft("accessTokenExpiresDate")(value?.isValid() ? value.toISOString() : "")}
            isDateOnly={false}
            format="DD/MM/YYYY HH:mm"
            required={!editingId}
            sx={fieldSx}
          />
          <BSTextField
            label="Refresh Token (optional)"
            type="password"
            value={draft.refreshToken}
            onChange={updateDraft("refreshToken")}
            labelAbove
            sx={fieldSx}
          />
          <BSDatepicker
            label="Refresh Token expires (date and time, optional)"
            value={draft.refreshTokenExpiresDate ? dayjs(draft.refreshTokenExpiresDate) : null}
            onChange={(value) => updateDraft("refreshTokenExpiresDate")(value?.isValid() ? value.toISOString() : "")}
            isDateOnly={false}
            format="DD/MM/YYYY HH:mm"
            sx={fieldSx}
          />
          <Alert severity="info">
            Tokens are encrypted by the API. App keys, app secrets, regions, and
            general polling settings are not stored by the current Connector
            API.
          </Alert>
        </Stack>
      </BSDialog>
      <Snackbar
        open={notice.open}
        autoHideDuration={6000}
        onClose={() => setNotice((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotice((current) => ({ ...current, open: false }))}
          severity={notice.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
