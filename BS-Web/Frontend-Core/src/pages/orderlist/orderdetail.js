import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AxiosMaster from "../../utils/AxiosMaster";
import BSDataGrid from "../../components/BSDataGrid";
import {
  formatAmount,
  formatDate,
  getPlatformBadgeSx,
  getSyncStatusPalette,
  getWm3StatusPalette,
} from "./orderlistUtils";

const ITEM_COLUMNS = [
  "order_item_record_id",
  "order_record_id",
  "platform_item_id",
  "model_id",
  "platform_order_item_id",
  "promotion_group_id",
  "sku",
  "item_name",
  "quantity",
  "unit_price",
  "total_price",
  "discount",
  "image_url",
  "variation",
  "weight",
  "create_date",
  "update_date",
  "rowversion",
];

const HIDDEN_ITEM_COLUMNS = ITEM_COLUMNS.filter((field) =>
  !["sku", "item_name", "quantity", "unit_price"].includes(field),
);

const DetailField = ({ label, children, span = 1 }) => (
  <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / -1", md: `span ${span}` } }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        minHeight: 38,
        px: 1.25,
        py: 0.9,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "action.hover",
        color: "text.primary",
        fontSize: 13,
        overflowWrap: "anywhere",
      }}
    >
      {children || "—"}
    </Box>
  </Box>
);

const OrderDetail = ({ lang = "th" }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { orderRecordId } = useParams();
  const numericOrderRecordId = Number(orderRecordId);
  const hasValidOrderRecordId =
    Number.isSafeInteger(numericOrderRecordId) && numericOrderRecordId > 0;
  const routeOrder = location.state?.order;
  const orderFromRoute =
    Number(routeOrder?.order_record_id) === numericOrderRecordId
      ? routeOrder
      : null;
  const isThai = lang === "th";
  const locale = isThai ? "th-TH" : "en-US";
  const [order, setOrder] = useState(orderFromRoute);
  const [loading, setLoading] = useState(!orderFromRoute);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("raw");

  const labels = useMemo(
    () => ({
      back: isThai ? "กลับไปหน้า Order List" : "Back to Order List",
      rawPayload: "Raw Payload (Platform)",
      orderItems: isThai ? "รายการสินค้า" : "Order Items",
      syncHistory: isThai ? "ประวัติการ Sync" : "Sync History",
      platformOrder: isThai ? "เลขที่คำสั่งซื้อ (Platform)" : "Order Number (Platform)",
      rawStatus: isThai ? "สถานะจาก Platform" : "Order Status (Raw)",
      createdAt: isThai ? "วันที่สร้าง Order" : "Order Create Date",
      recipient: isThai ? "ชื่อผู้รับ" : "Ship To Name",
      address: isThai ? "ที่อยู่จัดส่ง" : "Ship To Address",
      postalCode: isThai ? "รหัสไปรษณีย์" : "Ship To Postal Code",
      carrier: isThai ? "บริษัทขนส่ง" : "Carrier",
      tracking: isThai ? "เลข Tracking" : "Tracking Number",
      syncStatus: "Sync Status",
      total: isThai ? "ยอดรวม Order" : "Order Total",
      sku: "SKU",
      product: isThai ? "ชื่อสินค้า" : "Product Name",
      quantity: isThai ? "จำนวน" : "Quantity",
      unitPrice: isThai ? "ราคา / หน่วย" : "Unit Price",
      rawMockNotice: isThai
        ? "ข้อมูลตัวอย่างสำหรับแสดงหน้าจอเท่านั้น — ไม่มี Raw Payload ต้นฉบับในตาราง OMS"
        : "Illustrative mock only — the OMS tables do not store the original raw payload.",
      historyMockNotice: isThai
        ? "ประวัติด้านล่างเป็น mock สำหรับหน้าจอ เพราะยังไม่มีตารางประวัติการ Sync"
        : "The timeline below is mock data because no Sync history table is available yet.",
      loading: isThai ? "กำลังโหลดข้อมูล Order..." : "Loading order...",
      notFound: isThai ? "ไม่พบข้อมูล Order นี้" : "Order was not found.",
      loadFailed: isThai ? "โหลดข้อมูล Order ไม่สำเร็จ" : "Could not load the order.",
      receiveEvent: (platform) =>
        isThai
          ? `รับข้อมูล Order จาก ${platform || "Platform"} (ตัวอย่าง)`
          : `Order received from ${platform || "platform"} (sample)`,
      saveEvent: isThai
        ? "บันทึก Order และรายการสินค้าใน OMS (ตัวอย่าง)"
        : "Order and item details saved in OMS (sample)",
    }),
    [isThai],
  );

  useEffect(() => {
    if (!hasValidOrderRecordId) {
      setOrder(null);
      setLoading(false);
      setError(labels.notFound);
      return undefined;
    }

    if (orderFromRoute) {
      setOrder(orderFromRoute);
      setLoading(false);
      setError("");
      return undefined;
    }

    let isActive = true;
    setOrder(null);
    setLoading(true);
    setError("");

    AxiosMaster.post(
      "/dynamic/record/t_oms_order?schemaName=oms",
      { order_record_id: numericOrderRecordId },
    )
      .then((response) => {
        if (!isActive) return;
        const record = response.data?.data || response.data?.Data;
        if (!record) {
          setError(labels.notFound);
          return;
        }
        setOrder(record);
      })
      .catch((requestError) => {
        if (!isActive) return;
        setError(
          requestError.response?.data?.message || labels.loadFailed,
        );
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasValidOrderRecordId, labels.loadFailed, labels.notFound, numericOrderRecordId, orderFromRoute]);

  const itemColumns = useMemo(
    () => [
      {
        field: "sku",
        headerName: labels.sku,
        minWidth: 150,
        flex: 0.9,
      },
      {
        field: "item_name",
        headerName: labels.product,
        minWidth: 220,
        flex: 1.5,
      },
      {
        field: "quantity",
        headerName: labels.quantity,
        minWidth: 100,
        flex: 0.55,
        align: "right",
        headerAlign: "right",
      },
      {
        field: "unit_price",
        headerName: labels.unitPrice,
        minWidth: 150,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          formatAmount(params.value, order?.currency, locale),
      },
    ],
    [labels.product, labels.quantity, labels.sku, labels.unitPrice, locale, order?.currency],
  );

  const cardSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 2.5,
    bgcolor: "background.paper",
    boxShadow: theme.palette.custom?.glass?.shadow || theme.shadows[1],
  };

  const fullAddress = order
    ? order.recipient_full_address ||
      [
        order.recipient_address_line1,
        order.recipient_address_line2,
        order.recipient_sub_district,
        order.recipient_district,
        order.recipient_province,
        order.recipient_postal_code,
        order.recipient_country,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const rawPayload = order
    ? {
        id: order.platform_order_id,
        status: order.original_status || order.status,
        order_created_date: order.order_created_date,
        buyer_name: order.buyer_name,
        recipient: {
          name: order.recipient_name || order.buyer_name,
          phone: order.recipient_phone,
          address: fullAddress,
          postal_code: order.recipient_postal_code,
        },
        shipping_provider: order.shipping_carrier,
        tracking_number: order.tracking_number,
        total_amount: order.total_amount,
        currency: order.currency,
        line_items: "Mock payload preview — see Order Items for stored rows",
      }
    : null;

  const syncEvents = order
    ? [
        {
          time: order.order_created_date,
          text: labels.receiveEvent(order.platform),
        },
        {
          time: new Date(
            new Date(order.order_created_date).getTime() + 60_000,
          ),
          text: labels.saveEvent,
        },
        {
          time: order.last_sync_date || order.order_created_date,
          text: (() => {
            const status = String(order.sync_status || "").toLowerCase();
            if (status.includes("error") || status.includes("fail")) {
              return isThai
                ? "ตัวอย่าง: ส่งข้อมูลเข้า WM3 ไม่สำเร็จ"
                : "Sample: sending the order to WM3 failed";
            }
            if (status.includes("pending") || status.includes("queue")) {
              return isThai
                ? "ตัวอย่าง: รอส่งเข้า WM3 ในรอบถัดไป"
                : "Sample: waiting for the next WM3 sync batch";
            }
            return isThai
              ? "ตัวอย่าง: ส่งข้อมูลเข้า WM3 สำเร็จ"
              : "Sample: order sent to WM3 successfully";
          })(),
          error: /error|fail/i.test(String(order.sync_status || "")),
        },
      ]
    : [];

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        px: { xs: 1.5, md: 2.5 },
        py: { xs: 1.5, md: 2 },
        bgcolor: "background.default",
        overflowY: "auto",
      }}
    >
      <Stack spacing={1.75}>
        <Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/orderlist/orderlist")}
          >
            {labels.back}
          </Button>
        </Box>

        {loading && (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 5 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">{labels.loading}</Typography>
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && order && (
          <>
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 1.75, md: 2.5 } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                      Order #{order.platform_order_id || order.order_record_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.platform || "—"}
                      {order.shop_name ? ` · ${order.shop_name}` : ""}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Box component="span" sx={getPlatformBadgeSx(order.platform)}>
                      {order.platform || "—"}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        ...getWm3StatusPalette(order.status),
                        px: 1.2,
                        py: 0.55,
                        borderRadius: 1.5,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {order.status || "—"}
                    </Box>
                  </Stack>
                </Stack>

                <Divider sx={{ mb: 2 }} />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <DetailField label={labels.platformOrder}>
                    {order.platform_order_id}
                  </DetailField>
                  <DetailField label={labels.rawStatus}>
                    {order.original_status || order.status}
                  </DetailField>
                  <DetailField label={labels.createdAt}>
                    {formatDate(order.order_created_date, locale)}
                  </DetailField>
                  <DetailField label={labels.recipient}>
                    {order.recipient_name || order.buyer_name}
                  </DetailField>
                  <DetailField label={labels.address} span={2}>
                    {fullAddress}
                  </DetailField>
                  <DetailField label={labels.postalCode}>
                    {order.recipient_postal_code}
                  </DetailField>
                  <DetailField label={labels.carrier}>
                    {order.shipping_carrier}
                  </DetailField>
                  <DetailField label={labels.tracking}>
                    {order.tracking_number}
                  </DetailField>
                  <DetailField label={labels.syncStatus}>
                    <Box
                      component="span"
                      sx={{
                        ...getSyncStatusPalette(order.sync_status),
                        px: 1.1,
                        py: 0.45,
                        borderRadius: 1.5,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {order.sync_status || "—"}
                    </Box>
                  </DetailField>
                  <DetailField label={labels.total}>
                    <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                      {formatAmount(order.total_amount, order.currency, locale)}
                    </Typography>
                  </DetailField>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ ...cardSx, overflow: "hidden" }}>
              <Tabs
                value={activeTab}
                onChange={(event, value) => setActiveTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "& .MuiTab-root": { minHeight: 54, textTransform: "none", fontWeight: 600 },
                  "& .MuiTabs-indicator": { height: 3 },
                  "& .Mui-selected": { color: "primary.main" },
                }}
              >
                <Tab
                  value="raw"
                  icon={<DataObjectOutlinedIcon fontSize="small" />}
                  iconPosition="start"
                  label={labels.rawPayload}
                />
                <Tab
                  value="items"
                  icon={<Inventory2OutlinedIcon fontSize="small" />}
                  iconPosition="start"
                  label={labels.orderItems}
                />
                <Tab
                  value="history"
                  icon={<HistoryRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label={labels.syncHistory}
                />
              </Tabs>

              {activeTab === "raw" && (
                <CardContent>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    {labels.rawMockNotice}
                  </Alert>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      maxHeight: 440,
                      overflow: "auto",
                      borderRadius: 1.5,
                      bgcolor: "#1e1e2e",
                      color: "#c9d6e3",
                      fontFamily: "Consolas, 'Courier New', monospace",
                      fontSize: 12,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      "& .json-key": { color: "#7ec9f0" },
                    }}
                  >
                    {JSON.stringify(rawPayload, null, 2)}
                  </Box>
                </CardContent>
              )}

              {activeTab === "items" && (
                <Box sx={{ height: 420, minHeight: 320, p: 1.5 }}>
                  <BSDataGrid
                    key={numericOrderRecordId}
                    bsLocale={lang}
                    bsPreObj="oms"
                    bsObj="t_oms_order_item"
                    bsObjWh={`order_record_id = ${numericOrderRecordId}`}
                    bsObjBy="order_item_record_id asc"
                    bsCols={ITEM_COLUMNS.join(",")}
                    bsKeyId="order_item_record_id"
                    bsHiddenColumns={HIDDEN_ITEM_COLUMNS}
                    bsColumnDefs={itemColumns}
                    bsColumnWidth={160}
                    bsShowRowNumber
                    bsFilterMode="server"
                    bsRowPerPage={20}
                    bsPageSizeOptions={[10, 20, 50]}
                    showAdd={false}
                    bsVisibleEdit={false}
                    bsVisibleDelete={false}
                    bsVisibleView={false}
                    bsAllowDelete={false}
                    bsAutoPermission={false}
                  />
                </Box>
              )}

              {activeTab === "history" && (
                <CardContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {labels.historyMockNotice}
                  </Alert>
                  <Box
                    sx={{
                      ml: 1,
                      pl: 2.25,
                      borderLeft: "2px solid",
                      borderColor: "divider",
                    }}
                  >
                    {syncEvents.map((event, index) => (
                      <Box
                        key={`${index}-${event.text}`}
                        sx={{
                          position: "relative",
                          pb: index === syncEvents.length - 1 ? 0 : 2.25,
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            left: -2.625,
                            top: 3,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: event.error ? "error.main" : "primary.main",
                            boxShadow: `0 0 0 3px ${alpha(theme.palette.background.paper, 0.95)}`,
                          },
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.time, locale)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          {event.text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              )}
            </Card>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default OrderDetail;
