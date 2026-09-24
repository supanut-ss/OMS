import { useCallback, useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  ButtonBase,
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSDataGrid from "../../components/BSDataGrid";
import {
  formatAmount,
  formatDate,
  getPlatformBadgeSx,
  getSyncStatusPalette,
  getWm3StatusPalette,
} from "./orderlistUtils";

const ORDER_COLUMNS = [
  "order_record_id",
  "platform",
  "shop_id",
  "platform_order_id",
  "shop_name",
  "status",
  "original_status",
  "buyer_name",
  "buyer_remarks",
  "tax_invoice_requested",
  "tax_invoice_tax_id",
  "tax_invoice_company_name",
  "tax_invoice_address",
  "tax_invoice_branch_code",
  "cancellation_deadline",
  "order_created_date",
  "order_updated_date",
  "total_amount",
  "currency",
  "shipping_carrier",
  "tracking_number",
  "package_number",
  "shipping_method",
  "shipping_fee",
  "estimated_delivery_date",
  "recipient_name",
  "recipient_phone",
  "recipient_address_line1",
  "recipient_address_line2",
  "recipient_sub_district",
  "recipient_district",
  "recipient_province",
  "recipient_postal_code",
  "recipient_country",
  "recipient_full_address",
  "sync_status",
  "last_sync_date",
  "create_by",
  "create_date",
  "update_by",
  "update_date",
  "rowversion",
];

const HIDDEN_ORDER_COLUMNS = ORDER_COLUMNS.filter(
  (field) =>
    ![
      "platform",
      "platform_order_id",
      "status",
      "sync_status",
      "buyer_name",
      "shop_name",
      "total_amount",
      "order_created_date",
    ].includes(field),
);

const EMPTY_FILTERS = {
  platform: "",
  status: "",
  syncStatus: "",
  orderNumber: "",
};

const COMBOBOX_COLUMNS = [
  { field: "value_member", display: false, key: true },
  { field: "display_member", display: true, key: false },
];

const normalizeComboboxFilterValue = (option) => {
  const candidates =
    option && typeof option === "object"
      ? [
          option.code,
          option.value_member,
          option.value,
          option.display_member,
        ]
      : [option];

  if (
    candidates.some(
      (value) => String(value ?? "").trim().toUpperCase() === "ALL",
    )
  ) {
    return "";
  }

  const selectedValue = candidates.find(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
  return selectedValue === undefined ? "" : String(selectedValue).trim();
};

const OrderList = ({ lang = "th" }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isThai = lang === "th";
  const locale = isThai ? "th-TH" : "en-US";
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const labels = useMemo(
    () => ({
      filterTitle: isThai ? "ตัวกรองคำสั่งซื้อ" : "Order filters",
      filterDescription: isThai
        ? "เลือกเงื่อนไขที่ต้องการ แล้วกดค้นหา"
        : "Choose the criteria you want, then search.",
      platform: "Platform",
      orderStatus: isThai ? "สถานะออเดอร์ (WM3)" : "Order Status (WM3)",
      syncStatus: "Sync Status",
      orderNumber: isThai ? "เลข Order" : "Order Number",
      all: isThai ? "ทั้งหมด" : "All",
      search: isThai ? "ค้นหา" : "Search",
      clear: isThai ? "ล้างตัวกรอง" : "Clear filters",
      orderNumberPlaceholder: isThai ? "ค้นหาเลข Order" : "Search order number",
      platformOrder: isThai ? "เลขที่คำสั่งซื้อ" : "Order Number",
      wm3Status: "WM3 Status",
      customer: isThai ? "ลูกค้า" : "Customer",
      shop: isThai ? "ร้านค้า" : "Shop",
      total: isThai ? "ยอดรวม" : "Total",
      orderDate: "Order Date",
    }),
    [isThai],
  );

  const openOrderDetail = useCallback(
    (order) => {
      const orderRecordId = Number(order?.order_record_id);
      if (!Number.isSafeInteger(orderRecordId) || orderRecordId <= 0) return;

      navigate(`/orderlist/orderlist/${orderRecordId}`, {
        state: { order },
      });
    },
    [navigate],
  );

  const handleOrderRowClick = useCallback(
    (params, event) => {
      if (event.target?.closest?.("button, a, input, [role='checkbox']")) return;
      openOrderDetail(params.row);
    },
    [openOrderDetail],
  );

  const gridFilters = useMemo(() => {
    const filters = [];
    if (appliedFilters.platform) {
      filters.push({
        field: "platform",
        operator: "equals",
        value: appliedFilters.platform,
      });
    }
    if (appliedFilters.status) {
      filters.push({
        field: "status",
        operator: "equals",
        value: appliedFilters.status,
      });
    }
    if (appliedFilters.syncStatus) {
      filters.push({
        field: "sync_status",
        operator: "equals",
        value: appliedFilters.syncStatus,
      });
    }
    if (appliedFilters.orderNumber.trim()) {
      filters.push({
        field: "platform_order_id",
        operator: "contains",
        value: appliedFilters.orderNumber.trim(),
      });
    }
    return filters;
  }, [appliedFilters]);

  const columns = useMemo(
    () => [
      {
        field: "platform",
        headerName: labels.platform,
        minWidth: 125,
        flex: 0.8,
        renderCell: (params) => (
          <Box component="span" sx={getPlatformBadgeSx(params.value)}>
            {params.value || "—"}
          </Box>
        ),
      },
      {
        field: "platform_order_id",
        headerName: labels.platformOrder,
        minWidth: 185,
        flex: 1.2,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <ButtonBase
              onClick={(event) => {
                event.stopPropagation();
                openOrderDetail(params.row);
              }}
              sx={{
                color: "primary.main",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 0.5,
                textAlign: "left",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {params.value || "—"}
            </ButtonBase>
          </Box>
        ),
      },
      {
        field: "status",
        headerName: labels.wm3Status,
        minWidth: 135,
        flex: 0.8,
        renderCell: (params) => {
          return (
            <Box
              component="span"
              sx={{
                ...getWm3StatusPalette(params.value),
                px: 1.1,
                py: 0.45,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {params.value || "—"}
            </Box>
          );
        },
      },
      {
        field: "sync_status",
        headerName: labels.syncStatus,
        minWidth: 140,
        flex: 0.9,
        renderCell: (params) => {
          return (
            <Box
              component="span"
              sx={{
                ...getSyncStatusPalette(params.value),
                px: 1.1,
                py: 0.45,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {params.value || "—"}
            </Box>
          );
        },
      },
      {
        field: "buyer_name",
        headerName: labels.customer,
        minWidth: 180,
        flex: 1,
      },
      {
        field: "shop_name",
        headerName: labels.shop,
        minWidth: 160,
        flex: 0.9,
      },
      {
        field: "total_amount",
        headerName: labels.total,
        minWidth: 145,
        flex: 0.8,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              width: "100%",
              height: "100%",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatAmount(params.value, params.row?.currency, locale)}
            </Typography>
          </Box>
        ),
      },
      {
        field: "order_created_date",
        headerName: labels.orderDate,
        minWidth: 185,
        flex: 1,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {formatDate(params.value, locale)}
            </Typography>
          </Box>
        ),
      },
    ],
    [labels, locale, openOrderDetail, theme],
  );

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
  };

  const handleClearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleFilterChange = (field) => (event) => {
    setDraftFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleComboboxChange = (field) => (option) => {
    setDraftFilters((current) => ({
      ...current,
      [field]: normalizeComboboxFilterValue(option),
    }));
  };

  const cardSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 2.5,
    bgcolor: "background.paper",
    boxShadow: theme.palette.custom?.glass?.shadow || theme.shadows[1],
  };

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
      }}
    >
      <Stack spacing={1.75} sx={{ height: "100%", minHeight: 0 }}>
        <Card
          sx={{
            ...cardSx,
            flexShrink: 0,
            overflow: "hidden",
            background: `linear-gradient(115deg, ${alpha(theme.palette.primary.main, 0.045)}, ${theme.palette.background.paper} 48%)`,
          }}
        >
          <CardContent
            sx={{
              p: { xs: 1.75, md: 2.25 },
              "&:last-child": { pb: { xs: 1.75, md: 2.25 } },
            }}
          >
            <Box component="form" onSubmit={handleApplyFilters}>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ mb: 1.75 }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                  }}
                >
                  <FilterAltOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {labels.filterTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {labels.filterDescription}
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                <BSAutoComplete
                  bsMode="single"
                  bsPreObj="sec"
                  bsTitle={labels.platform}
                  bsObj="t_com_combobox_item"
                  bsColumes={COMBOBOX_COLUMNS}
                  bsObjWh="group_name = 'platform_shop' AND is_active = 1"
                  bsObjBy="display_sequence asc"
                  bsValue={draftFilters.platform}
                  bsOnChange={handleComboboxChange("platform")}
                  placeholder={labels.all}
                />

                <BSAutoComplete
                  bsMode="single"
                  bsPreObj="sec"
                  bsTitle={labels.orderStatus}
                  bsObj="t_com_combobox_item"
                  bsColumes={COMBOBOX_COLUMNS}
                  bsObjWh="group_name = 'order_status' AND is_active = 1"
                  bsObjBy="display_sequence asc"
                  bsValue={draftFilters.status}
                  bsOnChange={handleComboboxChange("status")}
                  placeholder={labels.all}
                />

                <BSAutoComplete
                  bsMode="single"
                  bsPreObj="sec"
                  bsTitle={labels.syncStatus}
                  bsObj="t_com_combobox_item"
                  bsColumes={COMBOBOX_COLUMNS}
                  bsObjWh="group_name = 'sync_status' AND is_active = 1"
                  bsObjBy="display_sequence asc"
                  bsValue={draftFilters.syncStatus}
                  bsOnChange={handleComboboxChange("syncStatus")}
                  placeholder={labels.all}
                />

                <TextField
                  size="small"
                  fullWidth
                  label={labels.orderNumber}
                  placeholder={labels.orderNumberPlaceholder}
                  value={draftFilters.orderNumber}
                  onChange={handleFilterChange("orderNumber")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{ mt: 1.75 }}
              >
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestartAltRoundedIcon />}
                  onClick={handleClearFilters}
                >
                  {labels.clear}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                >
                  {labels.search}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            ...cardSx,
            flex: 1,
            minHeight: 300,
            overflow: "hidden",
            "& .MuiDataGrid-row": { cursor: "pointer" },
          }}
        >
          <BSDataGrid
            key={JSON.stringify(appliedFilters)}
            bsLocale={lang}
            bsPreObj="oms"
            bsObj="t_oms_order"
            bsObjBy="order_created_date desc"
            bsCols={ORDER_COLUMNS.join(",")}
            bsKeyId="order_record_id"
            bsHiddenColumns={HIDDEN_ORDER_COLUMNS}
            bsColumnDefs={columns}
            bsColumnWidth={160}
            bsCustomFilters={gridFilters}
            bsFilterMode="server"
            bsShowRowNumber
            bsRowPerPage={20}
            bsPageSizeOptions={[20, 50, 100, 200, 500, 1000]}
            onRowClick={handleOrderRowClick}
            showAdd={false}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            bsVisibleView={false}
            bsAllowDelete={false}
            bsAutoPermission={false}
          />
        </Card>
      </Stack>
    </Box>
  );
};

export default OrderList;
