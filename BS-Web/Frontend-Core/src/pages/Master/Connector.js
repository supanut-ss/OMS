import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AddRounded,
  CheckCircleRounded,
  DeleteOutlineRounded,
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
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import BSTextField from "../../components/BSTextField";
import { IOSSwitch } from "../../components/BSSwitch";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import BSDialog from "../../components/BSDialog";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
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

const createEmptyDraft = (platform = "shopee") => ({
  platform,
  marketCode: process.env.REACT_APP_DEFAULT_MARKET_CODE || "TH",
});

const markets = [
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "VN", name: "Vietnam" },
];

const mapConnector = (item) => {
  const platform = String(item?.platform || "shopee")
    .toLowerCase()
    .replace(" shop", "");
  return {
    ...item,
    id: item.platformAppShopId,
    platform,
    displayName:
      item.shopName || platforms[platform]?.subtitle || item.platform,
    account: item.shopId,
    enabled: item.isActive,
    status: item.connectionStatus || (item.requiresReauthorization ? "REAUTHORIZATION_REQUIRED" : "CONNECTED"),
  };
};

export default function Connector() {
  const [connectors, setConnectors] = useState([]);
  const [oauthRedirecting, setOauthRedirecting] = useState("");
  const [syncingConnectorId, setSyncingConnectorId] = useState(null);
  const [syncingProgress, setSyncingProgress] = useState("");
  const [deletingConnectorId, setDeletingConnectorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const [draft, setDraft] = useState(() => createEmptyDraft());
  const connectedCount = useMemo(
    () => connectors.filter((item) => item.isActive && item.connectionStatus === "CONNECTED").length,
    [connectors],
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

  const connectOAuth = async ({ platform, id, marketCode }) => {
    const redirectKey = id || `new-${platform}`;
    setOauthRedirecting(redirectKey);
    const oauthTab = window.open("about:blank", "_blank");
    if (!oauthTab) {
      setOauthRedirecting("");
      setNotice({
        open: true,
        severity: "warning",
        message: "Browser บล็อกแท็บใหม่ กรุณาอนุญาต Popup แล้วลองอีกครั้ง",
      });
      return;
    }
    oauthTab.opener = null;
    oauthTab.document.title = "กำลังเชื่อมต่อ Marketplace";
    oauthTab.document.body.textContent = "กำลังเตรียมหน้าเชื่อมต่อ...";

    try {
      const { data } = await axios.get(
        `${Config.OMS_API_URL.replace(/\/$/, "")}/auth/${platform}/auth-url`,
        {
          params: id ? { platformAppShopId: id } : { marketCode },
          timeout: 15000,
        },
      );
      const authUrl = data?.data?.url || data?.url;
      if (!authUrl || !/^https:\/\//i.test(authUrl)) {
        throw new Error("API ไม่ได้ส่ง OAuth URL ที่ถูกต้อง");
      }
      setOauthRedirecting("");
      setDialogOpen(false);
      setDraft(createEmptyDraft());
      setDialogSession((current) => current + 1);
      oauthTab.location.replace(authUrl);
    } catch (error) {
      oauthTab.close();
      setOauthRedirecting("");
      setNotice({ open: true, severity: "error", message: error?.response?.data?.message_text || error?.response?.data?.message || error?.message || "เริ่ม OAuth ไม่สำเร็จ" });
    }
  };

  const openAdd = (platform = "shopee") => {
    setDraft(createEmptyDraft(platform));
    setDialogSession((current) => current + 1);
    setDialogOpen(true);
  };
  const closeAdd = () => {
    if (oauthRedirecting) return;
    setDialogOpen(false);
    setDraft(createEmptyDraft());
    setDialogSession((current) => current + 1);
  };
  const selectPlatform = (platform) => {
    setDraft((current) => ({ ...current, platform }));
  };
  const toggleConnector = async (connector) => {
    const nextIsActive = !connector.isActive;
    try {
      await AxiosMaster.post("/Connector/set-active", {
        platformAppShopId: connector.id,
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

  const syncOrders = async (connector) => {
    const platform = platforms[connector.platform] || platforms.shopee;
    setSyncingConnectorId(connector.id);
    setSyncingProgress("1");
    try {
      const pageSize = 100;
      const maxPages = 1000;
      const syncTo = new Date().toISOString();
      let page = 1;
      let orderCount = 0;
      let previousPageSignature = "";

      while (page <= maxPages) {
        const response = await AxiosMaster.post(
          `/oms-orders/${encodeURIComponent(connector.platform)}/sync`,
          null,
          {
            params: {
              shopId: connector.account,
              lookbackDays: 15,
              page,
              syncTo,
            },
          },
        );
        const payload = response?.data?.data ?? response?.data?.Data;
        const items = payload?.items ?? payload?.Items;
        const pageItems = Array.isArray(items) ? items : [];
        const totalCount = Number(
          payload?.totalCount ?? payload?.TotalCount ?? 0,
        );
        const hasMore = Boolean(payload?.hasMore ?? payload?.HasMore);

        if (pageItems.length > 0) {
          const pageSignature = pageItems
            .map((item) => item?.orderId ?? item?.OrderId ?? "")
            .join("|");
          if (page > 1 && pageSignature === previousPageSignature) {
            throw new Error(
              "Platform ส่ง Order หน้าเดิมซ้ำ ระบบจึงหยุด Sync เพื่อป้องกันการวนไม่จบ",
            );
          }
          previousPageSignature = pageSignature;
        }

        orderCount += pageItems.length;
        const expectedPages =
          totalCount > 0 ? Math.ceil(totalCount / pageSize) : null;
        setSyncingProgress(
          expectedPages ? `${page}/${expectedPages}` : `${page}`,
        );

        // Some platforms do not report a reliable total count. A full page
        // therefore means that the next page must still be checked.
        if (!hasMore && pageItems.length < pageSize) break;
        page += 1;
      }

      if (page > maxPages) {
        throw new Error(
          `Sync เกิน ${maxPages * pageSize} รายการ กรุณาลดช่วงวันที่แล้วลองใหม่`,
        );
      }

      setNotice({
        open: true,
        severity: "success",
        message:
          orderCount > 0
            ? `Sync Order ${platform.name} สำเร็จ ${orderCount} รายการ`
            : `Sync สำเร็จ แต่ไม่พบ Order ของร้านนี้ในช่วง 15 วันล่าสุด`,
      });
    } catch (error) {
      setNotice({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.message_text ||
          error?.response?.data?.message ||
          error?.response?.data?.Message ||
          error?.message ||
          `Sync Order ${platform.name} ไม่สำเร็จ`,
      });
    } finally {
      setSyncingConnectorId(null);
      setSyncingProgress("");
    }
  };

  const deleteConnector = async (connector) => {
    const platform = platforms[connector.platform] || platforms.shopee;
    const confirmed = await BSAlertSwal2.confirm(
      `ยืนยันลบ Connector ${platform.name} (${connector.displayName || connector.account}) หรือไม่?`,
      {
        title: "ยืนยันการลบ Connector",
        confirmButtonText: "ลบ Connector",
        cancelButtonText: "ยกเลิก",
      },
    );
    if (!confirmed) return;

    setDeletingConnectorId(connector.id);
    try {
      await AxiosMaster.post(`/Connector/${connector.id}`);
      setConnectors((current) => current.filter((item) => item.id !== connector.id));
      setNotice({
        open: true,
        severity: "success",
        message: `ลบ Connector ${platform.name} สำเร็จ`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message_text ||
        error?.response?.data?.message ||
        error?.message ||
        "ลบ Connector ไม่สำเร็จ";
      await BSAlertSwal2.show(
        error?.response?.status === 409 ? "warning" : "error",
        message,
        {
          title:
            error?.response?.status === 409
              ? "ไม่สามารถลบ Connector ได้"
              : "ลบ Connector ไม่สำเร็จ",
        },
      );
    } finally {
      setDeletingConnectorId(null);
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

        <Alert severity="info">
          เลือก Marketplace และประเทศ จากนั้นระบบจะเลือก App กลางที่ตั้งค่าไว้และเปิดหน้า OAuth ให้โดยอัตโนมัติ
        </Alert>

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
            label={`${connectedCount} จาก ${connectors.length} เชื่อมต่อแล้ว`}
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
            const connected = connector.connectionStatus === "CONNECTED" && !connector.requiresReauthorization;
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
                <Stack spacing={2} sx={{ height: "100%" }}>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 54,
                        height: 54,
                        flexShrink: 0,
                        borderRadius: 2.5,
                        bgcolor: "white",
                        border: `1px solid ${platform.color}22`,
                        boxShadow: `0 5px 12px ${platform.color}25`,
                      }}
                    >
                      <PlatformLogo platform={connector.platform} size={38} />
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        title={connector.displayName || platform.subtitle}
                        fontWeight={700}
                        color="#172b4d"
                        noWrap
                      >
                        {connector.displayName || platform.subtitle}
                      </Typography>
                      <Typography
                        title={`${platform.name} · ${connector.countryCode || "—"} · ${connector.account || "—"}`}
                        variant="body2"
                        color="text.secondary"
                        noWrap
                      >
                        {platform.name} · {connector.countryCode || "—"} · {connector.account || "—"}
                      </Typography>
                      <Typography
                        title={`App: ${connector.appName || "—"}`}
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        component="div"
                      >
                        App: {connector.appName || "—"}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={`ลบ ${platform.name}`}
                      title={`ลบ ${platform.name}`}
                      size="small"
                      disabled={deletingConnectorId !== null}
                      onClick={() => deleteConnector(connector)}
                      sx={{
                        flexShrink: 0,
                        border: "1px solid #e3e9f1",
                        width: 36,
                        height: 36,
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                          borderColor: "error.light",
                          bgcolor: "rgba(211, 47, 47, 0.06)",
                        },
                      }}
                    >
                      {deletingConnectorId === connector.id ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DeleteOutlineRounded fontSize="small" />
                      )}
                    </IconButton>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                      size="small"
                      icon={
                        connected ? (
                          <CheckCircleRounded />
                        ) : (
                          <PauseCircleOutlineRounded />
                        )
                      }
                      label={connected ? "เชื่อมต่อแล้ว" : "ต้องยืนยันตัวตนใหม่"}
                      sx={{
                        bgcolor: connected ? "#eaf7f0" : "#fff1f2",
                        color: connected ? "#218653" : "#c6283d",
                        fontWeight: 650,
                        "& .MuiChip-icon": { color: "inherit" },
                      }}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Token หมดอายุ ${
                        connector.accessTokenExpiresDate
                          ? new Date(connector.accessTokenExpiresDate).toLocaleDateString()
                          : "—"
                      }`}
                      sx={{ borderColor: "#dce3ec", color: "text.secondary" }}
                    />
                    {!connector.isActive && (
                      <Chip
                        size="small"
                        label="ปิดใช้งานชั่วคราว"
                        sx={{ bgcolor: "#f1f3f6", color: "text.secondary" }}
                      />
                    )}
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 1,
                      pt: 1.75,
                      mt: "auto !important",
                      borderTop: "1px solid #edf1f5",
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      disabled={
                        syncingConnectorId !== null ||
                        !connected ||
                        !connector.isActive ||
                        !connector.hasAccessToken
                      }
                      onClick={() => syncOrders(connector)}
                      startIcon={
                        syncingConnectorId === connector.id ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <SyncRounded />
                        )
                      }
                      sx={{
                        minHeight: 38,
                        textTransform: "none",
                        borderRadius: 2,
                        boxShadow: "none",
                        bgcolor: "#168dae",
                        "&:hover": { bgcolor: "#107b98", boxShadow: "none" },
                      }}
                    >
                      {syncingConnectorId === connector.id
                        ? `กำลัง Sync ${syncingProgress}…`
                        : "Sync Order"}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      disabled={
                        Boolean(oauthRedirecting) ||
                        !connector.hasAppKey ||
                        !connector.hasAppSecret
                      }
                      onClick={() => connectOAuth(connector)}
                      startIcon={
                        oauthRedirecting === connector.id ? (
                          <CircularProgress size={14} />
                        ) : (
                          <OpenInNewRounded />
                        )
                      }
                      sx={{ minHeight: 38, textTransform: "none", borderRadius: 2 }}
                    >
                      {oauthRedirecting === connector.id
                        ? "กำลังเปิด OAuth…"
                        : connected
                          ? "เชื่อมต่อใหม่"
                          : "เชื่อมต่อ OAuth"}
                    </Button>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        gridColumn: { xs: "auto", sm: "1 / -1" },
                        px: 0.5,
                        minHeight: 34,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        เปิดใช้งาน Connector
                      </Typography>
                      <IOSSwitch
                        checked={connector.isActive}
                        onChange={() => toggleConnector(connector)}
                        inputProps={{
                          "aria-label": `เปิดใช้งาน ${platform.name}`,
                        }}
                      />
                    </Stack>
                  </Box>
                </Stack>
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
        key={`connector-form-${dialogSession}`}
        open={dialogOpen}
        onClose={closeAdd}
        maxWidth="sm"
        fullWidth
        title="เชื่อมต่อช่องทางขาย"
        contentDividers
        titleSx={{ bgcolor: "#168dae", color: "white" }}
        contentSx={{ p: { xs: 2, sm: 2.5 } }}
        actions={
          <>
            <BSCloseOutlinedButton
              disabled={Boolean(oauthRedirecting)}
              onClick={closeAdd}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              ยกเลิก
            </BSCloseOutlinedButton>
            <BSSaveOutlinedButton
              disabled={Boolean(oauthRedirecting)}
              onClick={() => connectOAuth(draft)}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {oauthRedirecting ? "กำลังเปิด OAuth…" : "เชื่อมต่อร้าน"}
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
              เลือก Marketplace
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
                  onClick={() => selectPlatform(key)}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
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
          <BSTextField
            select
            label="ประเทศ / Market"
            value={draft.marketCode}
            onChange={updateDraft("marketCode")}
            labelAbove
            sx={fieldSx}
          >
            {markets.map((market) => (
              <MenuItem key={market.code} value={market.code}>
                {market.name} ({market.code})
              </MenuItem>
            ))}
          </BSTextField>
          <Alert severity="info">
            ระบบจะเลือก Default App Master ตาม Marketplace และ Market ที่เลือก จากนั้น Marketplace จะส่ง Shop ID กลับมาให้โดยอัตโนมัติ
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
