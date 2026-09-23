import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Paper,
  Chip,
  Dialog,
  DialogContent,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Checkbox,
  Collapse,
  Grid,
  DialogActions,
  DialogTitle,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  SaveOutlined as SaveOutlinedIcon,
  Add as AddIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Print as PrintIcon,
  LocalShipping as LocalShippingIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  RefreshOutlined as RefreshOutlinedIcon,
} from "@mui/icons-material";
import { BSDataGrid, BSDataGridClient } from "../../components/BSDataGrid";
import BSTextField from "../../components/BSTextField";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSDatepicker from "../../components/BSDatepicker";
import dayjs from "dayjs";
import useForm from "../../hooks/useForm";
import { useResource } from "../../hooks/useResource";
import OutboundContext from "../../contexts/OutboundContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import TransactionTotalSummary from "./components/TransactionTotalSummary";
import ReportPreviewDialog from "../../components/ReportViewer/ReportPreviewDialog";
import { renderInput } from "../../components/FormRenderer";
import { refreshOutboundGridRef } from "./outboundGridRefresh";
import { ConfigsFormatter } from "../../utils/ConfigsFormatter";
import Config from "../../utils/Config";
import { ButtonConfigs } from "../../utils/ButtonConfigs";

const DETAIL_ROW_HEIGHT = 47;
const EMPTY_UOM_OPTIONS = [];
const ITEM_UOM_COLUMNS = [
  { field: "item_uom_id", key: true, display: false, filter: false },
  { field: "uom", key: false, display: true, filter: true },
  { field: "primary_uom", key: false, display: false, filter: false },
  { field: "conversion_factor", key: false, display: false, filter: false },
  { field: "sequence", key: false, display: false, filter: false },
];
const OUTBOUND_REPORTS = [
  {
    code: "OutboundDeliveryNote",
    label: "Delivery Note",
  },
  {
    code: "OutboundPickingSlip",
    label: "Picking Slip",
  },
];

const OrderHeaderSection = React.memo(
  ({
    currentScreen,
    values,
    errors,
    updateField,
    lang,
    isEdit,
    variantValue,
    expanded,
    onToggleExpand,
    getResourceByGroupAndName,
    getText,
  }) => {
    const statusValue = values.order_status ?? "Open";
    const IsNotOpenStatus = isEdit;
    const orderHeaderTooltip = expanded
      ? "Collapse order header"
      : "Expand order header";
    const formItems = [
      {
        field: "outbound_order_number",
        headerName: values.outbound_order_number
          ? "Outbound Order Number"
          : "Outbound Order Number",
        component: "BSTextField",
        value: isEdit ? (values.outbound_order_number ?? "") : "",
        placeholder: isEdit
          ? getText(
              "outbound_order_number_placeholder",
              "กรอกเลขที่เอกสาร หรือเว้นว่างไว้เพื่อให้ระบบรันอัตโนมัติ",
              "v_inv_viewer_outbound_master",
            )
          : getText(
              "outbound_order_number_placeholder",
              "กรอกเลขที่เอกสาร หรือเว้นว่างไว้เพื่อให้ระบบรันอัตโนมัติ",
              "v_inv_viewer_outbound_master",
            ),
        readOnly: isEdit,
        variant: variantValue,
      },
      {
        field: "order_type",
        headerName: getText(
          "order_type",
          "Order Type",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSAutoComplete",
        bsMode: "single",
        bsTitle: "order_type",
        bsPreObj: "sec",
        bsObj: "t_com_combobox_item",
        bsColumes: [
          { field: "value_member", key: true, display: false },
          { field: "display_member", display: true, filter: true },
        ],
        bsObjWh: "group_name = 'outbound_order_type' AND is_active = 1",
        bsObjBy: "display_sequence asc",
        bsLoadOnOpen: true,
        bsRefreshOnRequestChange: false,
        variant: variantValue,
        required: true,
        disabled: currentScreen === "edit",
      },
      {
        field: "order_status",
        headerName: getText(
          "order_status",
          "Order Status",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        value: statusValue,
        readOnly: true,
        variant: variantValue,
      },
      {
        field: "pick_type",
        headerName: getText(
          "pick_type",
          "Pick Type",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSAutoComplete",
        bsMode: "single",
        bsTitle: "pick_type",
        bsPreObj: "sec",
        bsObj: "t_com_combobox_item",
        bsColumes: [
          { field: "value_member", key: true, display: false },
          { field: "display_member", display: true, filter: true },
        ],
        bsObjWh: "group_name = 'picking_class' AND is_active = 1",
        bsObjBy: "display_sequence asc",
        bsLoadOnOpen: true,
        bsRefreshOnRequestChange: false,
        variant: variantValue,
        required: false,
        disabled: isEdit,
        sx: { display: "none" },
      },
      {
        field: "warehouse",
        headerName: getText(
          "warehouse",
          "Warehouse",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSAutoComplete",
        bsMode: "single",
        bsTitle: "warehouse",
        bsPreObj: "inv",
        bsObj: "t_inv_warehouse",
        bsColumes: [
          { field: "warehouse_id", key: true, display: false },
          { field: "warehouse", display: true, filter: true },
          { field: "warehouse_name", display: true, filter: true },
        ],
        bsObjWh: "is_active = 1",
        bsObjBy: "warehouse asc",
        bsLoadOnOpen: true,
        bsRefreshOnRequestChange: false,
        variant: variantValue,
        required: false,
        disabled: isEdit,
        sx: { display: "none" },
      },
      {
        field: "owner_id",
        headerName: getText("owner", "Owner", "v_inv_viewer_outbound_master"),
        component: "BSAutoComplete",
        bsMode: "single",
        bsTitle: "owner",
        bsPreObj: "inv",
        bsObj: "t_inv_owner",
        bsColumes: [
          { field: "owner_id", key: true, display: false },
          { field: "owner_code", display: true, filter: true },
          { field: "owner_name", display: true, filter: true },
        ],
        bsObjWh: "is_active = 1",
        bsObjBy: "owner_id asc",
        bsLoadOnOpen: true,
        bsRefreshOnRequestChange: false,
        variant: variantValue,
        required: false,
        disabled: isEdit,
        sx: { display: "none" },
      },
      {
        field: "order_date",
        headerName: getText(
          "order_date",
          "Order Date",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        required: true,
        disabled: IsNotOpenStatus,
      },
      {
        field: "customer_order_no",
        headerName: getText(
          "customer_order_no",
          "Customer Order No",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        readOnly: IsNotOpenStatus,
        variant: variantValue,
      },
      {
        field: "delivery_date_plan",
        headerName: getText(
          "delivery_date_plan",
          "Delivery Date Plan",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: IsNotOpenStatus,
      },
      {
        field: "ship_date_plan",
        headerName: getText(
          "ship_date_plan",
          "Ship Date Plan",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: IsNotOpenStatus,
      },
      {
        field: "customer_purchase_order",
        headerName: getText(
          "customer_purchase_order",
          "Customer Purchase Order",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        readOnly: IsNotOpenStatus,
      },
      {
        field: "description",
        headerName: getText(
          "description",
          "Description",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        multiline: true,
        minRows: 2,
        sx: { gridColumn: { xs: "1 / -1", md: "span 2" } },
        readOnly: IsNotOpenStatus,
      },
      {
        field: "remark",
        headerName: getText("remark", "Remark", "v_inv_viewer_outbound_master"),
        component: "BSTextField",
        multiline: true,
        minRows: 2,
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1", md: "span 2" } },
        readOnly: IsNotOpenStatus,
      },
    ];

    return (
      <Card
        sx={{
          borderRadius: 2,
          mb: 1.5,
          p: expanded ? 2.5 : 1.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: expanded ? 1.25 : 0,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DescriptionIcon sx={{ color: "#3b56c5" }} />
            <Typography
              variant="h5"
              sx={{
                color: "#3b56c5",
                fontWeight: 700,
                fontSize: expanded ? 18 : 16,
                lineHeight: 1.2,
              }}
            >
              {getText(
                "order_header",
                "Order Header",
                "v_inv_viewer_outbound_master",
              )}
            </Typography>
          </Box>
          <Tooltip title={orderHeaderTooltip} placement="bottom">
            <IconButton
              size="small"
              disabled={false}
              onClick={onToggleExpand}
              aria-label={
                expanded ? "Collapse order header" : "Expand order header"
              }
              aria-expanded={expanded}
              sx={{
                color: "#3b56c5",
                borderRadius: 1,
                boxShadow: expanded
                  ? "0 1px 6px rgba(59,86,197,0.12)"
                  : undefined,
                border: "1px solid",
                borderColor: expanded ? "rgba(59,86,197,0.12)" : "transparent",
              }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Divider sx={{ mb: 2.25 }} />
          <CardContent sx={{ pt: 0, px: 0, pb: 0 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {formItems.map((item) => (
                <Box key={item.field} sx={item.sx}>
                  {renderInput({
                    item,
                    formData: values,
                    errors,
                    updateField,
                    locale: lang,
                  })}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Collapse>
      </Card>
    );
  },
);

const CustomerShipToSection = React.memo(
  ({
    values,
    errors,
    updateField,
    lang,
    isEdit,
    variantValue,
    sameAsCustomer,
    onSameAsCustomerChange,
    selectedOwnerId,
    orderHeader,
    getResourceByGroupAndName,
    getText,
  }) => {
    const IsNotOpenStatus = isEdit;
    const customerItems = [
      {
        field: "customer_code",
        headerName: getText(
          "customer_code",
          "Customer Code",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSAutoComplete",
        bsMode: "single",
        bsTitle: "customer",
        bsPreObj: "inv",
        bsObj: "t_inv_business_partner",
        bsColumes: [
          { field: "business_partner_id", key: true, display: false },
          { field: "business_code", display: false, filter: true },
          { field: "business_name", display: true, filter: true },
          { field: "address_line1", display: false },
          { field: "address_line2", display: false },
          { field: "address_line3", display: false },
        ],
        bsObjWh: selectedOwnerId
          ? `is_active = 1 and owner_id = ${selectedOwnerId} and business_type = 'Customer'`
          : "is_active = 1 and business_type = 'Customer'",
        bsObjBy: "business_partner_id asc",
        bsLoadOnOpen: true,
        bsRefreshOnRequestChange: false,
        bsRefreshKey: selectedOwnerId || "no-owner",
        variant: variantValue,
        required: true,
        readOnly: IsNotOpenStatus,
      },
      {
        field: "customer_name",
        headerName: getText(
          "customer_name",
          "Customer Name",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        readOnly: IsNotOpenStatus,
      },
      {
        field: "customer_address_line1",
        headerName: getText(
          "customer_address_line1",
          "Customer Address Line 1",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
      {
        field: "customer_address_line2",
        headerName: getText(
          "customer_address_line2",
          "Customer Address Line 2",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
      {
        field: "customer_address_line3",
        headerName: getText(
          "customer_address_line3",
          "Customer Address Line 3",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
    ];

    const shipToItems = [
      {
        field: "ship_to_code",
        headerName: getText(
          "ship_to_code",
          "Ship To",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        readOnly: IsNotOpenStatus || sameAsCustomer,
      },
      {
        field: "ship_to_name",
        headerName: getText(
          "ship_to_name",
          "Ship To Name",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        readOnly: IsNotOpenStatus,
      },
      {
        field: "ship_to_address_line1",
        headerName: getText(
          "ship_to_address_line1",
          "Ship To Address Line 1",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
      {
        field: "ship_to_address_line2",
        headerName: getText(
          "ship_to_address_line2",
          "Ship To Address Line 2",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
      {
        field: "ship_to_address_line3",
        headerName: getText(
          "ship_to_address_line3",
          "Ship To Address Line 3",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        sx: { gridColumn: { xs: "1 / -1" } },
        readOnly: IsNotOpenStatus,
      },
    ];

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
            {getText(
              "customer_information",
              "Customer Information",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {customerItems.map((item) => (
              <Box key={item.field} sx={item.sx}>
                {renderInput({
                  item,
                  formData: values,
                  errors,
                  updateField,
                  locale: lang,
                })}
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            pt: 1.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "primary.main" }}>
              {getText(
                "ship_to_information",
                "Ship To Information",
                "v_inv_viewer_outbound_master",
              )}
            </Typography>
            {!isEdit && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  size="small"
                  sx={{ ml: 1 }}
                  checked={sameAsCustomer}
                  onChange={(event) =>
                    onSameAsCustomerChange(event.target.checked)
                  }
                />
                <Typography variant="body2">
                  {getText(
                    "same_as_customer",
                    "Same as Customer",
                    "v_inv_viewer_outbound_master",
                  )}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {shipToItems.map((item) => (
              <Box key={item.field} sx={item.sx}>
                {renderInput({
                  item,
                  formData: values,
                  errors,
                  updateField,
                  locale: lang,
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  },
);

const OrderDetailSection = React.memo(
  ({
    values,
    errors,
    updateField,
    lang,
    isEdit,
    variantValue,
    isEditStatusLocked,
    currentStatus,
    isStatusIn,
    getText,
  }) => {
    const additionalDateItems = [
      {
        field: "delivery_date_actual",
        headerName: getText(
          "delivery_date_actual",
          "Delivery Date Actual",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: isEdit,
      },
      {
        field: "ship_date_actual",
        headerName: getText(
          "ship_date_actual",
          "Ship Date Actual",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: true,
      },
    ];
    const cancelItems = [
      {
        field: "cancel_date",
        headerName: getText(
          "cancel_date",
          "Cancel Date",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: true,
      },
      {
        field: "cancel_by",
        headerName: getText(
          "cancel_by",
          "Cancel By",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        disabled: true,
      },
      {
        field: "cancel_remark",
        headerName: getText(
          "cancel_remark",
          "Cancel Remark",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        placeholder: getText(
          "cancel_remark_placeholder",
          "Reason for cancellation...",
          "v_inv_viewer_outbound_master",
        ),
        variant: variantValue,
        disabled: isEdit && !isStatusIn(currentStatus, ["open"]),
      },
    ];
    const closeItems = [
      {
        field: "close_date",
        headerName: getText(
          "close_date",
          "Close Date",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSDatePicker",
        isRange: false,
        format: "DD/MM/YYYY",
        disabled: true,
      },
      {
        field: "close_by",
        headerName: getText(
          "close_by",
          "Close By",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        variant: variantValue,
        disabled: true,
      },
      {
        field: "close_remark",
        headerName: getText(
          "close_remark",
          "Close Remark",
          "v_inv_viewer_outbound_master",
        ),
        component: "BSTextField",
        placeholder: getText(
          "close_remark_placeholder",
          "Reason for closing...",
          "v_inv_viewer_outbound_master",
        ),
        variant: variantValue,
        disabled: isEdit,
      },
    ];

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
            {getText(
              "additional_date_information",
              "Additional Date Information",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {additionalDateItems.map((item) => (
              <Box key={item.field}>
                {renderInput({
                  item,
                  formData: values,
                  errors,
                  updateField,
                  updateDelayMs: 0,
                  locale: lang,
                })}
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            pt: 1.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
            {getText(
              "cancel_information",
              "Cancel Information",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {cancelItems.map((item) => (
              <Box key={item.field}>
                {renderInput({
                  item,
                  formData: values,
                  errors,
                  updateField,
                  locale: lang,
                })}
              </Box>
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            pt: 1.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
            {getText(
              "close_information",
              "Close Information",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {closeItems.map((item) => (
              <Box key={item.field}>
                {renderInput({
                  item,
                  formData: values,
                  errors,
                  updateField,
                  locale: lang,
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  },
);

const UserDefinedSection = React.memo(
  ({
    values,
    errors,
    updateField,
    lang,
    isEdit,
    variantValue,
    orderHeader,
    getText,
  }) => {
    const IsNotOpenStatus = isEdit;
    const userDefinedItems = Array.from({ length: 10 }, (_, index) => {
      const fieldIndex = index + 1;
      return {
        field: `user_def${fieldIndex}`,
        headerName: getText(
          `user_def_${fieldIndex}`,
          `User Def ${fieldIndex}`,
          "v_inv_viewer_outbound_master",
        ),
        component:
          fieldIndex === 9 || fieldIndex === 10
            ? "BSDatePicker"
            : "BSTextField",
        type: fieldIndex === 7 || fieldIndex === 8 ? "decimal" : "string",
        isRange: fieldIndex === 9 || fieldIndex === 10 ? false : undefined,
        format:
          fieldIndex === 9 || fieldIndex === 10 ? "DD/MM/YYYY" : undefined,
        variant: variantValue,
        disabled: IsNotOpenStatus,
      };
    });

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.25,
        }}
      >
        {userDefinedItems.map((item) => (
          <Box key={item.field}>
            {renderInput({
              item,
              formData: values,
              errors,
              updateField,
              locale: lang,
            })}
          </Box>
        ))}
      </Box>
    );
  },
);
const OutboundDetailSection = React.memo(
  ({
    details,
    lang,
    isEdit,
    variantValue,
    outboundHeader,
    getText,
    canEditDetailLines,
    setOutboundDetails,
    createEmptyOutboundDetail,
    handleOutboundDetailChange,
    handleDeleteOutboundDetail,
    startDetailTransition,
    normalizeUomOptions,
    onRefreshData,
    isRefreshingData,
  }) => {
    const normalizeControlMode = useCallback((value) => {
      if (value === true || value === 1) return "Full";
      if (value === false || value === 0 || value == null) return "None";

      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["full", "1", "true", "y", "yes", "t"].includes(normalized))
          return "Full";
        if (["none", "0", "false", "n", "no", "f", ""].includes(normalized))
          return "None";
      }

      return "None";
    }, []);
    const deferredOutboundDetails = useMemo(() => details, [details]);
    const handleAddOutboundDetail = useCallback(() => {
      if (canEditDetailLines) return;
      setOutboundDetails((prev) => [
        ...prev,
        createEmptyOutboundDetail(prev.length + 1),
      ]);
    }, [canEditDetailLines, createEmptyOutboundDetail]);
    const isControlModeFull = useCallback(
      (value) => normalizeControlMode(value) === "Full",
      [normalizeControlMode],
    );
    const formatDetailLineNo = useCallback(
      (lineNo) => String(Number(lineNo || 0)).padStart(5, "0"),
      [],
    );

    const normalizeDateField = useCallback((value) => {
      if (!value) return "";
      if (typeof value === "string") {
        return value.length >= 10 ? value.slice(0, 10) : value;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "";

      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }, []);
    const handleOutboundDetailPatch = useCallback(
      (rowId, patch) => {
        if (canEditDetailLines) return;
        startDetailTransition(() => {
          setOutboundDetails((prev) =>
            prev.map((row) => {
              if (row.id !== rowId) {
                return row;
              }

              return {
                ...row,
                ...patch,
              };
            }),
          );
        });
      },
      [canEditDetailLines, startDetailTransition],
    );
    return (
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle2">
            {getText(
              "line_items",
              "Line Items",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddOutboundDetail}
              disabled={!isEdit}
            >
              {getText("add_line", "Add Line", "v_inv_viewer_outbound_master")}
            </Button>
          </Box>
        </Box>
        <Paper
          variant="outlined"
          sx={{ borderRadius: 1.5, overflow: "hidden" }}
        >
          <BSDataGridClient
            data={deferredOutboundDetails}
            columns={[
              {
                field: "delete",
                headerName: " ",
                width: 56,
                sortable: false,
                filterable: false,
                renderCell: (params) =>
                  !canEditDetailLines && (
                    <IconButton
                      size="small"
                      disabled={canEditDetailLines}
                      onClick={() => handleDeleteOutboundDetail(params.row.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ),
              },
              {
                field: "line",
                headerName: getText(
                  "line_number",
                  "Line Number",
                  "v_inv_viewer_outbound_master",
                ),
                width: 72,
                sortable: false,
                filterable: false,
                renderCell: (params) =>
                  formatDetailLineNo(params.row?.line ?? params.value),
              },
              {
                field: "item_number",
                headerName:
                  getText(
                    "item_number",
                    "Item Number",
                    "v_inv_viewer_outbound_master",
                  ) + "*",
                width: 240,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                  <Box sx={{ width: "100%" }}>
                    <BSAutoComplete
                      error={Boolean(params.row.item_lookup_code_error)}
                      bsMode="single"
                      bsPreObj="inv"
                      bsObj="v_inv_item_lookup_outbound"
                      bsColumes={[
                        { field: "lookup_code", key: true, display: false },
                        {
                          field: "item_master_id",
                          display: false,
                          filter: false,
                        },
                        {
                          field: "default_item_uom_id",
                          display: false,
                          filter: false,
                        },
                        { field: "default_uom", display: false, filter: false },
                        { field: "lot_control", display: false, filter: false },
                        {
                          field: "expiry_date_control",
                          display: false,
                          filter: false,
                        },
                        { field: "sn_control", display: false, filter: false },
                        {
                          field: "item_uom_options_json",
                          display: false,
                          filter: false,
                        },
                        {
                          field: "lookup_item_number",
                          display: true,
                          filter: true,
                        },
                        { field: "item_number", display: false, filter: true },
                        {
                          field: "alternate_item_number",
                          display: false,
                          filter: true,
                        },
                        { field: "description", display: true, filter: true },
                      ]}
                      bsObjWh="is_active = 1"
                      bsObjBy="lookup_item_number asc"
                      bsLoadOnOpen={true}
                      bsRefreshOnRequestChange={false}
                      fullWidth
                      size="small"
                      readOnly={canEditDetailLines}
                      required
                      bsValue={
                        params.row.item_lookup_code ||
                        params.row.item_number ||
                        params.row.lookup_code ||
                        ""
                      }
                      bsOnChange={(val) => {
                        const isSelectionCleared =
                          val == null ||
                          val === "" ||
                          (typeof val === "object" &&
                            !Array.isArray(val) &&
                            Object.keys(val).length === 0);

                        if (isSelectionCleared) {
                          handleOutboundDetailPatch(params.row.id, {
                            item_lookup_code: "",
                            item_master_id: "",
                            item_number: "",
                            description: "",
                            item_uom_id: "",
                            uom: "",
                            lot_control: "None",
                            expiry_date_control: "None",
                            sn_control: "None",
                            uom_options: [],
                          });
                          return;
                        }

                        const parseUomOptions = (source) => {
                          if (Array.isArray(source)) return source;

                          if (typeof source === "string") {
                            try {
                              const parsed = JSON.parse(source);
                              return Array.isArray(parsed) ? parsed : [];
                            } catch {
                              return [];
                            }
                          }

                          return [];
                        };

                        const parsedJsonUomOptions = parseUomOptions(
                          val?.item_uom_options_json,
                        );
                        const rawUomOptions =
                          parsedJsonUomOptions.length > 0
                            ? parsedJsonUomOptions
                            : parseUomOptions(val?.item_uom_options);
                        const primaryUomOption = rawUomOptions.find((uom) => {
                          const primaryValue =
                            uom?.primary_uom ??
                            uom?.is_primary ??
                            uom?.isPrimary;
                          if (primaryValue === true || primaryValue === 1)
                            return true;

                          if (typeof primaryValue === "string") {
                            const normalized = primaryValue
                              .trim()
                              .toLowerCase();
                            return ["1", "true", "y", "yes", "t"].includes(
                              normalized,
                            );
                          }

                          return false;
                        });

                        if (!primaryUomOption) {
                          BSAlertSwal2.fire({
                            icon: "warning",
                            title: getText(
                              "Please check primary UOM",
                              "Please check primary UOM",
                              "v_inv_viewer_outbound_master",
                            ),
                            text: getText(
                              "The selected item does not have a primary UOM. Please check the item UOM options.",
                              "The selected item does not have a primary UOM. Please check the item UOM options.",
                              "v_inv_viewer_outbound_master",
                            ),
                            confirmButtonText: getText(
                              "OK",
                              "OK",
                              "v_inv_viewer_outbound_master",
                            ),
                          });
                          // return;
                        }

                        handleOutboundDetailPatch(params.row.id, {
                          item_lookup_code: val?.lookup_code ?? val?.code ?? "",
                          item_master_id: val?.item_master_id ?? "",
                          item_number:
                            val?.item_number ??
                            val?.lookup_item_number ??
                            val?.value ??
                            "",
                          description: val?.description ?? "",
                          item_uom_id:
                            primaryUomOption?.item_uom_id ??
                            primaryUomOption?.code ??
                            "",
                          uom:
                            primaryUomOption?.uom ??
                            primaryUomOption?.value ??
                            "",
                          lot_control: normalizeControlMode(
                            val?.lot_control ?? val?.LotControl,
                          ),
                          expiry_date_control: normalizeControlMode(
                            val?.expiry_date_control ?? val?.ExpiryDateControl,
                          ),
                          sn_control: normalizeControlMode(
                            val?.sn_control ?? val?.SnControl,
                          ),
                          uom_options: normalizeUomOptions(
                            val?.item_uom_options_json ?? val?.item_uom_options,
                          ),
                        });
                      }}
                    />
                  </Box>
                ),
              },
              {
                field: "uom",
                headerName:
                  getText("uom", "UOM", "v_inv_viewer_outbound_master") + "*",
                width: 170,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  const itemMasterId = params.row?.item_master_id;
                  const uomOptions = Array.isArray(params.row?.uom_options)
                    ? params.row.uom_options
                    : EMPTY_UOM_OPTIONS;
                  const normalizedItemMasterId = Number(itemMasterId);
                  const hasValidItemMasterId =
                    Number.isFinite(normalizedItemMasterId) &&
                    normalizedItemMasterId > 0;
                  const hasUomOptionsFromLookup =
                    uomOptions.length > 0 && !hasValidItemMasterId;
                  const bsObjWh = hasValidItemMasterId
                    ? `is_active = 1 AND item_master_id = ${normalizedItemMasterId}`
                    : "1 = 0";
                  const bsData = hasUomOptionsFromLookup
                    ? uomOptions
                    : EMPTY_UOM_OPTIONS;
                  const itemUomRefreshKey =
                    hasValidItemMasterId || hasUomOptionsFromLookup
                      ? `item_uom_refresh_${params.row.id}_${hasValidItemMasterId ? normalizedItemMasterId : "lookup"}`
                      : `item_uom_refresh_${params.row.id}_empty`;
                  return (
                    <Box sx={{ width: "100%" }}>
                      <BSAutoComplete
                        required
                        error={Boolean(params.row.item_uom_id_error)}
                        bsMode="single"
                        bsPreObj="inv"
                        bsObj="t_inv_item_uom"
                        bsColumes={ITEM_UOM_COLUMNS}
                        bsObjWh={bsObjWh}
                        bsObjBy="uom asc"
                        bsLoadOnOpen={true}
                        bsRefreshOnRequestChange={false}
                        bsRefreshKey={itemUomRefreshKey}
                        bsCacheKey={`item_uom_${hasValidItemMasterId ? normalizedItemMasterId : "default"}`}
                        bsData={bsData}
                        bsValue={params.row.item_uom_id || ""}
                        readOnly={
                          canEditDetailLines ||
                          (!hasValidItemMasterId && !hasUomOptionsFromLookup)
                        }
                        fullWidth
                        size="small"
                        bsOnChange={(val) =>
                          handleOutboundDetailPatch(params.row.id, {
                            item_uom_id: val?.code ?? "",
                            uom: val?.value ?? "",
                          })
                        }
                      />
                    </Box>
                  );
                },
              },
              {
                field: "quantity_order",
                headerName: getText(
                  "quantity_order",
                  "Qty",
                  "v_inv_viewer_outbound_master",
                ),
                width: 140,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  const isFullControl = isControlModeFull(
                    params.row?.sn_control,
                  );
                  const hasSerialNumber = !!params.row?.serial_number?.trim();
                  return (
                    <Box sx={{ width: "100%" }}>
                      <BSTextField
                        fullWidth
                        size="small"
                        updateDelayMs={0}
                        type="decimal"
                        value={
                          isFullControl && hasSerialNumber
                            ? 1
                            : (params.value ?? 1)
                        }
                        readOnly={
                          canEditDetailLines ||
                          (isFullControl && hasSerialNumber)
                        }
                        onChange={(value) => {
                          let qty = Number(value) || 0;

                          if (isFullControl) {
                            // มี Serial Number => บังคับ 1
                            if (hasSerialNumber) {
                              qty = 1;
                            }
                            // ไม่มี Serial Number => ต้อง >= 1
                            else if (qty < 1) {
                              qty = 1;
                            }
                          }

                          handleOutboundDetailChange(
                            params.row.id,
                            "quantity_order",
                            qty === 0 ? 1 : qty,
                          );
                        }}
                      />
                    </Box>
                  );
                },
              },
              {
                field: "default_status",
                headerName: getText(
                  "default_status",
                  "Item Status",
                  "v_inv_viewer_outbound_master",
                ),
                width: 170,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                  <Box sx={{ width: "100%" }}>
                    <BSTextField
                      select
                      fullWidth
                      size="small"
                      value={params.value || "Available"}
                      disabled={canEditDetailLines}
                      onChange={(value) =>
                        handleOutboundDetailChange(
                          params.row.id,
                          "default_status",
                          value,
                        )
                      }
                    >
                      <MenuItem value="Available">Available</MenuItem>
                    </BSTextField>
                  </Box>
                ),
              },
              {
                field: "lot_number",
                headerName: getText(
                  "lot_number",
                  "Lot Number",
                  "v_inv_viewer_outbound_master",
                ),
                width: 170,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  if (!isControlModeFull(params.row?.lot_control)) {
                    return null;
                  }

                  return (
                    <Box sx={{ width: "100%" }}>
                      <BSTextField
                        fullWidth
                        size="small"
                        updateDelayMs={0}
                        value={params.value || ""}
                        readOnly={canEditDetailLines}
                        onChange={(value) =>
                          handleOutboundDetailChange(
                            params.row.id,
                            "lot_number",
                            value,
                          )
                        }
                      />
                    </Box>
                  );
                },
              },
              {
                field: "expiry_date",
                headerName: getText(
                  "expiry_date",
                  "Expire Date",
                  "v_inv_viewer_outbound_master",
                ),
                width: 170,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  if (!isControlModeFull(params.row?.expiry_date_control)) {
                    return null;
                  }
                  return (
                    <Box sx={{ width: "100%" }}>
                      <BSDatepicker
                        value={
                          params.value
                            ? dayjs(params.value)
                            : params.row?.expiry_date
                              ? dayjs(params.row.expiry_date, "DD/MM/YYYY")
                              : null
                        }
                        format="DD/MM/YYYY"
                        disabled={canEditDetailLines}
                        isDateOnly
                        onChange={(value) =>
                          handleOutboundDetailChange(
                            params.row.id,
                            "expiry_date",
                            value?.format("DD/MM/YYYY") ?? "",
                          )
                        }
                      />
                    </Box>
                  );
                },
              },
              {
                field: "serial_number",
                headerName: getText(
                  "serial_number",
                  "Serial Number",
                  "v_inv_viewer_outbound_master",
                ),
                width: 170,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  if (!isControlModeFull(params.row?.sn_control)) {
                    return null;
                  }

                  return (
                    <Box sx={{ width: "100%" }}>
                      <BSTextField
                        fullWidth
                        size="small"
                        updateDelayMs={0}
                        value={params.value || ""}
                        readOnly={canEditDetailLines}
                        onChange={(value) => {
                          if (value !== null && value !== "") {
                            handleOutboundDetailChange(
                              params.row.id,
                              "quantity_order",
                              1,
                            );
                          }
                          handleOutboundDetailChange(
                            params.row.id,
                            "serial_number",
                            value,
                          );
                        }}
                      />
                    </Box>
                  );
                },
              },
              {
                field: "price",
                headerName: getText(
                  "price",
                  "Price",
                  "v_inv_viewer_outbound_master",
                ),
                width: 130,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                  <Box sx={{ width: "100%" }}>
                    <BSTextField
                      fullWidth
                      size="small"
                      updateDelayMs={0}
                      type="decimal"
                      maxIntegerDigits={13}
                      maxDecimalDigits={3}
                      maxNumericLength={17}
                      value={params.value ?? 0}
                      readOnly={canEditDetailLines}
                      onChange={(value) =>
                        handleOutboundDetailChange(
                          params.row.id,
                          "price",
                          value,
                        )
                      }
                    />
                  </Box>
                ),
              },
            ]}
            bsLocale={lang}
            rowHeight={DETAIL_ROW_HEIGHT}
            bsShowRowNumber={false}
            bsRowPerPage={100}
            showToolbar={!isEdit}
            showQuickFilter={false}
            showExport={false}
            height="600px"
            loading={Boolean(isRefreshingData)}
            pagination={false}
            hideFooter
            disableColumnMenu
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            onRefresh={() => {
              if (typeof onRefreshData === "function") {
                onRefreshData();
              }
            }}
          />
        </Paper>
      </Box>
    );
  },
);
const PickDetailSection = React.memo(
  ({
    header,
    details,
    lang,
    isEdit,
    variantValue,
    outboundHeader,
    getText,
    getLocalizedOrderStatus,
    getStatusChipStyle,
    onRefreshData,
    isRefreshingData,
  }) => {
    const { ACTION_BUTTON_THEMES } = ButtonConfigs();

    const [activePickTab, setActivePickTab] = useState(0);
    const handleTabPickChange = (value) => {
      setActivePickTab(value);
    };

    return (
      <Box>
        <Grid
          container
          spacing={2}
          sx={{ mb: 2, justifyContent: "space-between", alignItems: "center" }}
        >
          <Grid>
            <Typography
              variant="subtitle2"
              sx={{ color: "primary.main", mb: 1 }}
            >
              {getText(
                "pick_list_information",
                "Pick List Information",
                "v_inv_viewer_outbound_master",
              )}
            </Typography>
          </Grid>
          <Grid>
            <Button
              variant="outlined"
              startIcon={
                isRefreshingData ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RefreshIcon />
                )
              }
              sx={{ ACTION_BUTTON_THEMES }}
              onClick={onRefreshData}
              disabled={isRefreshingData}
            >
              {isRefreshingData
                ? getText(
                    "refreshing",
                    "Refreshing...",
                    "v_inv_viewer_outbound_master",
                  )
                : getText("refresh", "Refresh", "v_inv_viewer_outbound_master")}
            </Button>
          </Grid>
        </Grid>
        {header?.pick_list_number ? (
          <Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
              }}
            >
              <Grid container spacing={2}>
                <Grid item size={{ xs: 12, md: 3 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "primary.main" }}
                    >
                      {getText(
                        "pick_list_no",
                        "Pick List No",
                        "v_inv_viewer_outbound_master",
                      )}
                    </Typography>
                    <Typography variant="body1">
                      {header?.pick_list_number ?? "(Auto-generated)"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "primary.main" }}
                    >
                      {getText(
                        "pick_list_status",
                        "Pick List Status",
                        "v_inv_viewer_outbound_master",
                      )}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        ...getStatusChipStyle(header?.pick_list_status ?? ""),
                        fontWeight: 700,
                        backgroundColor: "transparent",
                      }}
                    >
                      {header?.pick_list_status ?? ""}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "primary.main" }}
                    >
                      {getText(
                        "create_date",
                        "Create Date",
                        "v_inv_viewer_outbound_master",
                      )}
                    </Typography>
                    <Typography variant="body1">
                      {header?.create_date
                        ? dayjs(header.create_date).format("DD/MM/YYYY HH:mm")
                        : ""}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item size={{ xs: 12, md: 3 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "primary.main" }}
                    >
                      {getText(
                        "create_by",
                        "Create By",
                        "v_inv_viewer_outbound_master",
                      )}
                    </Typography>
                    <Typography variant="body1">
                      {header?.create_by ?? ""}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item size={{ xs: 12 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "primary.main" }}
                    >
                      {getText(
                        "description",
                        "Description",
                        "v_inv_viewer_outbound_master",
                      )}
                    </Typography>
                    <Typography variant="body1">
                      {header?.description ?? ""}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Card sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    shadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Tabs
                    value={activePickTab}
                    onChange={(e, value) => handleTabPickChange(value)}
                  >
                    <Tab
                      label={getText(
                        "pick_detail",
                        "Pick Detail",
                        "v_inv_viewer_outbound_master",
                      )}
                    />
                    <Tab
                      label={getText(
                        "pick_serial_detail",
                        "Pick Serial Detail",
                        "v_inv_viewer_outbound_master",
                      )}
                    />
                  </Tabs>
                  {activePickTab === 0 && (
                    <Box sx={{ p: 2 }}>
                      <BSDataGrid
                        bsLocale={lang}
                        bsPreObj="inv"
                        bsObj="v_inv_outbound_pick_detail"
                        bsCols="
                   location
                   ,item_number
                   ,item_description
                   ,quantity_plan
                   ,quantity_pick
                   ,quantity_ship
                   ,uom
                   ,lot_number
                   ,expiry_date
                   ,pick_inv_status
                   ,receive_date"
                        bsObjWh={`pick_list_number = '${header?.pick_list_number}'`}
                        bsShowDescColumn={false}
                        showAdd={false}
                        bsVisibleEdit={false}
                        bsVisibleDelete={false}
                        bsColumnDefs={[
                          {
                            field: "pick_inv_status",
                            width: 140,
                            renderCell: (params) => (
                              <Chip
                                size="small"
                                label={getLocalizedOrderStatus(params.value)}
                                sx={{
                                  ...getStatusChipStyle(params.value),
                                  backgroundColor: "transparent",
                                  border: "none",
                                  minWidth: 96,
                                  "& .MuiChip-label": { fontWeight: 700 },
                                }}
                              />
                            ),
                          },
                          { field: "item_description", width: 280 },
                          {
                            field: "receive_date",
                            type: "date",
                            width: 140,
                            dateFormat: "dd/MM/yyyy",
                          },
                        ]}
                      />
                    </Box>
                  )}
                  {activePickTab === 1 && (
                    <Box sx={{ p: 2 }}>
                      <BSDataGrid
                        bsLocale={lang}
                        bsPreObj="inv"
                        bsObj="v_inv_outbound_pick_detail"
                        bsCols="
                   location
                   ,item_number
                   ,item_description
                   ,lot_number
                   ,expiry_date
                   ,serial_number
                   ,quantity_pick
                   ,quantity_stage
                   ,quantity_ship
                   "
                        bsObjWh={`pick_list_number = '${header?.pick_list_number}'`}
                        bsShowDescColumn={false}
                        showAdd={false}
                        bsVisibleEdit={false}
                        bsVisibleDelete={false}
                        bsColumnDefs={[
                          { field: "item_description", width: 280 },
                        ]}
                      />
                    </Box>
                  )}
                </Box>
              </Card>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography
              variant="body1"
              sx={{ color: "text.secondary", textAlign: "center", py: 4 }}
            >
              {getText(
                "no_data_available",
                "No data available",
                "v_inv_viewer_outbound_master",
              )}
            </Typography>
          </Box>
        )}
      </Box>
    );
  },
);
const getStatusChipStyle = (statusValue) => {
  const v = String(statusValue || "").toLowerCase();
  if (v.includes("available"))
    return {
      color: "#059669",
      backgroundColor: "rgba(16,185,129,0.12)",
      borderColor: "rgba(16,185,129,0.28)",
    };
  if (v.includes("hold"))
    return {
      color: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.14)",
      borderColor: "rgba(245,158,11,0.32)",
    };
  if (v.includes("damaged"))
    return {
      color: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.28)",
    };
  if (v.includes("quarantine"))
    return {
      color: "#7c3aed",
      backgroundColor: "rgba(124,58,237,0.12)",
      borderColor: "rgba(124,58,237,0.28)",
    };
  return {
    color: "#64748b",
    backgroundColor: "rgba(100,116,139,0.12)",
    borderColor: "rgba(100,116,139,0.28)",
  };
};
const { formatDecimalValue } = ConfigsFormatter();
const PickListConfirmDialog = React.memo(
  ({
    open,
    Close,
    pickList = {},
    ReleaseOutbound,
    buildActionRequest,
    getActionResultMessage,
    isActionErrorResult,
    showActionSuccess,
    getText,
  }) => {
    const { ACTION_BUTTON_THEMES } = ButtonConfigs();
    const rows = pickList?.items?.map((item, index) => ({
      id: index + 1,
      confirm: 1,
      ...item,
    }));

    const handleConfirmRelease = useCallback(
      async (row) => {
        const outboundMasterId = pickList?.outbound_master_id ?? "";
        if (!(outboundMasterId > 0)) {
          BSAlertSwal2.fire({
            icon: "warning",
            title: getText(
              "release",
              "Release",
              "v_inv_viewer_outbound_master",
            ),
            text: getText(
              "outbound_required",
              "Outbound is required.",
              "v_inv_viewer_outbound_master",
            ),
            confirmButtonText: getText(
              "ok",
              "OK",
              "v_inv_viewer_outbound_master",
            ),
          });
          return;
        }
        const isConfirmed = await BSAlertSwal2.confirm(
          getText(
            "confirm_release_action",
            "Confirm Release action for outbound ?",
            "v_inv_viewer_outbound_master",
          ),
          {
            title: getText(
              "confirm_release",
              "Confirm Release",
              "v_inv_viewer_outbound_master",
            ),
            confirmButtonText: getText(
              "yes_proceed",
              "Yes, proceed",
              "v_inv_viewer_outbound_master",
            ),
            cancelButtonText: getText(
              "cancel",
              "Cancel",
              "v_inv_viewer_outbound_master",
            ),
          },
        );
        if (!isConfirmed) {
          return;
        }
        const result = await ReleaseOutbound({
          ...buildActionRequest(outboundMasterId, row),
          is_check_pick_list: true,
        });
        const message = getActionResultMessage(
          result,
          getText(
            "processed_confirm_release",
            "Processed Confirm Release",
            "v_inv_viewer_outbound_master",
          ),
        );
        if (isActionErrorResult(result)) {
          BSAlertSwal2.fire({
            icon: "error",
            title: getText(
              "confirm_release_failed",
              "Confirm Release Failed",
              "v_inv_viewer_outbound_master",
            ),
            text: message,
            confirmButtonText: getText(
              "ok",
              "OK",
              "v_inv_viewer_outbound_master",
            ),
          });
          return;
        }

        showActionSuccess(message);
        BSAlertSwal2.fire({
          icon: "success",
          title: getText(
            "confirm_release_success",
            "Confirm Release Success",
            "v_inv_viewer_outbound_master",
          ),
          text: message,
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
      },
      [
        pickList,
        ReleaseOutbound,
        buildActionRequest,
        getActionResultMessage,
        isActionErrorResult,
        showActionSuccess,
      ],
    );

    const columns = [
      {
        field: "item_number",
        headerName: getText(
          "item_number",
          "Item Number",
          "v_inv_viewer_outbound_master",
        ),
        flex: 1,
      },
      {
        field: "item_description",
        headerName: getText(
          "item_description",
          "Description",
          "v_inv_viewer_outbound_master",
        ),
        flex: 2,
        width: 280,
      },
      {
        field: "lot_number",
        headerName: getText(
          "lot_number",
          "Lot",
          "v_inv_viewer_outbound_master",
        ),
        width: 120,
      },
      {
        field: "expiry_date",
        headerName: getText(
          "expiry_date",
          "Expiry Date",
          "v_inv_viewer_outbound_master",
        ),
        width: 120,
        valueFormatter: (value) =>
          value ? dayjs(value).format("DD/MM/YYYY") : "-",
      },
      {
        field: "inv_status",
        headerName: getText(
          "inv_status",
          "Status",
          "v_inv_viewer_outbound_master",
        ),
        width: 120,
      },
      {
        field: "inv_balance_qty",
        headerName: getText(
          "inv_balance_qty",
          "inventory balnace Qty",
          "v_inv_viewer_outbound_master",
        ),
        width: 120,
        type: "number",
      },
      {
        field: "balance_qty",
        headerName: getText(
          "balance_qty",
          "Balance Qty",
          "v_inv_viewer_outbound_master",
        ),
        width: 120,
        type: "number",
      },
    ];

    return (
      <Dialog open={open} onClose={Close} maxWidth="lg" fullWidth>
        <DialogTitle>
          {getText(
            "Confirm_Pick_List",
            "Confirm Pick List",
            "v_inv_viewer_outbound_master",
          )}
        </DialogTitle>

        <DialogContent>
          <BSDataGridClient
            data={rows}
            columns={columns}
            bsShowRowNumber
            showToolbar={false}
            pagination={false}
            hideFooter
            autoHeight
          />
        </DialogContent>

        <DialogActions>
          <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
            <Button
              variant="contained"
              onClick={Close}
              sx={ACTION_BUTTON_THEMES.close}
            >
              {getText("Close", "Close", "v_inv_viewer_outbound_master")}
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={handleConfirmRelease}
              sx={ACTION_BUTTON_THEMES.success}
            >
              {getText(
                "Confirm_Release",
                "Confirm Release",
                "v_inv_viewer_outbound_master",
              )}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    );
  },
);
const Outbound = (props) => {
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();
  const { lang } = props;
  const [currentScreen, setCurrentScreen] = useState("list");
  const [IsConfirmPickList, setIsConfirmPickList] = useState(false);
  const [pickList, setPickList] = useState([]);
  const { getResourceByGroupAndName } = useResource();
  const {
    GetOutbound,
    InsertOutbound,
    UpdateOutbound,
    DeleteOutbound,
    ReleaseUserOutbound,
    ReleaseOutbound,
    UnreleaseUserOutbound,
    UnreleaseOutbound,
    CancelOrderOutbound,
    ConfirmShipOutbound,
  } = OutboundContext();

  const normalizeStatus = useCallback(
    (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    [],
  );
  const toStatusKey = useCallback(
    (value) => normalizeStatus(value).replace(/[\s_-]/g, ""),
    [normalizeStatus],
  );
  const isStatusIn = useCallback(
    (value, statusKeys) => statusKeys.includes(toStatusKey(value)),
    [toStatusKey],
  );
  const getText = useCallback(
    (resourceName, fallbackValue, resourceGroup = "Outbound") =>
      getResourceByGroupAndName(resourceGroup, resourceName, lang)
        ?.resource_value || fallbackValue,
    [getResourceByGroupAndName, lang],
  );
  const getLocalizedOrderStatus = useCallback(
    (statusValue) => {
      const normalizedValue = String(statusValue ?? "").trim();
      if (!normalizedValue) return "";

      return (
        getResourceByGroupAndName(
          "outbound_order_status",
          normalizedValue,
          lang,
        )?.resource_value || normalizedValue
      );
    },
    [getResourceByGroupAndName, lang],
  );
  const isBlindPickOrderType = useCallback(
    (value) => toStatusKey(value) === "blindpick",
    [toStatusKey],
  );
  const normalizeUomOptions = useCallback((rawValue) => {
    if (!rawValue) return [];

    let parsed = rawValue;
    if (typeof rawValue === "string") {
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        ...item,
        code: item?.code ?? item?.item_uom_id ?? item?.itemUomId ?? "",
        value: item?.value ?? item?.uom ?? "",
      }))
      .filter(
        (item) =>
          String(item.code).trim() !== "" && String(item.value).trim() !== "",
      );
  }, []);
  const normalizeControlMode = useCallback((value) => {
    if (value === true || value === 1) return "Full";
    if (value === false || value === 0 || value == null) return "None";

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["full", "1", "true", "y", "yes", "t"].includes(normalized))
        return "Full";
      if (["none", "0", "false", "n", "no", "f", ""].includes(normalized))
        return "None";
    }

    return "None";
  }, []);
  const normalizeOutboundDetails = useCallback(
    (details = []) =>
      Array.isArray(details)
        ? details.map((detail, index) => ({
            id: detail?.id || detail?.line_id || `line-${Date.now()}-${index}`,
            outbound_detail_id:
              detail?.outbound_detail_id ?? detail?.line_id ?? null,
            is_existing: true,
            line: Number(
              detail?.line ??
                detail?.line_no ??
                detail?.line_number ??
                index + 1,
            ),
            item_lookup_code:
              detail?.item_lookup_code ??
              (detail?.item_master_id ? `ITEM:${detail.item_master_id}` : ""),
            item_master_id: detail?.item_master_id ?? "",
            item_number: detail?.item_number ?? detail?.itemNumber ?? "",
            description: detail?.description ?? detail?.item_description ?? "",
            item_uom_id: detail?.item_uom_id ?? detail?.currency_code ?? "",
            uom: detail?.uom ?? "EA",
            qty_order: Number(detail?.qty_order ?? detail?.qtyOrder ?? 0),
            quantity_order: Number(
              detail?.quantity_order ??
                detail?.qty_order ??
                detail?.qtyOrder ??
                0,
            ),
            quantity_pick: Number(
              detail?.quantity_pick ?? detail?.qty_pick ?? detail?.qtyPick ?? 0,
            ),
            quantity_stage: Number(
              detail?.quantity_stage ??
                detail?.qty_stage ??
                detail?.qtyStage ??
                0,
            ),
            quantity_ship: Number(
              detail?.quantity_ship ?? detail?.qty_ship ?? detail?.qtyShip ?? 0,
            ),
            default_status:
              detail?.default_status ?? detail?.defaultStatus ?? "Available",
            lot_number: detail?.lot_number ?? detail?.lot ?? "",
            expiry_date: detail?.expiry_date ?? detail?.expiryDate ?? "",
            serial_number: detail?.serial_number ?? detail?.serialNumber ?? "",
            lot_control: normalizeControlMode(
              detail?.lot_control ?? detail?.lotControl,
            ),
            expiry_date_control: normalizeControlMode(
              detail?.expiry_date_control ?? detail?.expiryDateControl,
            ),
            sn_control: normalizeControlMode(
              detail?.sn_control ?? detail?.snControl,
            ),
            uom_options: normalizeUomOptions(
              detail?.item_uom_options_json ?? detail?.item_uom_options,
            ),
            price: Number(detail?.price ?? 0),
          }))
        : [],
    [normalizeControlMode, normalizeUomOptions],
  );

  const createEmptyOutboundDetail = useCallback(
    (lineNumber) => ({
      id: `line-${Date.now()}-${lineNumber}`,
      outbound_detail_id: null,
      is_existing: false,
      line: lineNumber,
      item_lookup_code: "",
      item_master_id: "",
      item_number: "",
      description: "",
      item_uom_id: "",
      uom: "EA",
      qty_order: 1,
      quantity_order: 1,
      quantity_pick: 0,
      quantity_stage: 0,
      quantity_ship: 0,
      default_status: "Available",
      lot_number: "",
      expiry_date: "",
      serial_number: "",
      lot_control: "None",
      expiry_date_control: "None",
      sn_control: "None",
      uom_options: [],
      price: 0,
    }),
    [],
  );
  const [outboundDetails, setOutboundDetails] = useState(() => [
    createEmptyOutboundDetail(1),
  ]);
  const [pickHeader, setPickHeader] = useState(null);
  const [pickDetails, setPickDetails] = useState([]);
  const [, startDetailTransition] = useTransition();
  const gridRef = useRef(null);
  const pendingGridRefreshRef = useRef(false);
  const defultFormData = {
    outbound_order_number: "",
    order_type: "SO",
    order_status: "Open",
    pick_type: null,
    warehouse: "",
    owner: "",
    owner_id: "",
    owner_code: "",
    customer_code: "",
    business_partner_id: "",
    business_name: "",
    customer_name: "",
    order_date: new Date(),
    customer_order_number: "",
    delivery_date_plan: "",
    ship_date_plan: "",
    delivery_date_actual: "",
    ship_date_actual: "",
    customer_po: "",
    description: "",
    remark: "",
    cancel_date: "",
    cancel_by: "",
    cancel_remark: "",
    close_date: "",
    close_by: "",
    close_remark: "",
    user_def1: "",
    user_def2: "",
    user_def3: "",
    user_def4: "",
    user_def5: "",
    user_def6: "",
    user_def7: "",
    user_def8: "",
    user_def9: "",
    user_def10: "",
    customer: "",
    customer_address_line1: "",
    customer_address_line2: "",
    customer_address_line3: "",
    ship_to_code: "",
    ship_to_name: "",
    ship_to_address_line1: "",
    ship_to_address_line2: "",
    ship_to_address_line3: "",
  };

  const requiredFields = ["order_type", "order_date", "customer_code"];

  const requiredFieldLabels = {
    order_type: "Order Type",
    order_date: "Order Date",
    customer_code: "Customer Code",
    ship_to_code: "Ship To",
  };

  const isRequiredValueMissing = (value) => {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === "string") {
      return value.trim() === "";
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === "object") {
      const identityKeys = [
        "value_member",
        "business_partner_id",
        "owner_id",
        "warehouse",
        "code",
        "id",
        "value",
      ];
      return !identityKeys.some((key) => {
        const keyValue = value?.[key];
        return (
          keyValue !== null &&
          keyValue !== undefined &&
          String(keyValue).trim() !== ""
        );
      });
    }

    return false;
  };

  const getMissingRequiredFieldLabels = (data) => {
    const fieldValueByKey = {
      ...(data || {}),
    };

    return requiredFields
      .filter((field) => isRequiredValueMissing(fieldValueByKey[field]))
      .map((field) => requiredFieldLabels[field] || field);
  };

  const { formData, errors, updateField, validate, setFormData } = useForm(
    { ...defultFormData },
    requiredFields,
  );

  const density = "standard";

  const [activeTab, setActiveTab] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [releaseSuccess, setReleaseSuccess] = useState(null);
  const [autoMasterDefaults, setAutoMasterDefaults] = useState({
    owner: null,
    warehouse: null,
  });
  const [sameAsCustomer, setSameAsCustomer] = useState(false);
  const [userFullNameMap, setUserFullNameMap] = useState({});
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [orderHeaderExpanded, setOrderHeaderExpanded] = useState(true);
  const [reportMenuAnchor, setReportMenuAnchor] = useState(null);
  const [reportPreview, setReportPreview] = useState({
    open: false,
    title: "",
    reportCode: "",
    parameters: {},
  });
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const previousOwnerIdRef = useRef("");
  const [defualtOutboundDetailsCount, setDefualtOutboundDetailsCount] =
    useState(0);

  const currentStatus = useMemo(
    () => normalizeStatus(formData?.order_status ?? formData?.status ?? ""),
    [formData?.order_status, formData?.status, normalizeStatus],
  );

  const formatDateTimeDisplay = useCallback((rawValue) => {
    if (!rawValue) return "-";

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return String(rawValue);

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    const hour = String(parsed.getHours()).padStart(2, "0");
    const minute = String(parsed.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hour}:${minute}`;
  }, []);

  const formatDateDisplay = useCallback((rawValue) => {
    if (!rawValue) return "-";

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return String(rawValue);

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();

    return `${day}/${month}/${year}`;
  }, []);

  const formattedCreateDate = useMemo(() => {
    const rawValue =
      formData?.update_date ??
      formData?.updateDate ??
      formData?.create_date ??
      formData?.createDate;
    return formatDateTimeDisplay(rawValue);
  }, [
    formData?.create_date,
    formData?.createDate,
    formData?.update_date,
    formData?.updateDate,
    formatDateTimeDisplay,
  ]);

  const outboundProgressSteps = useMemo(
    () => ["Open", "Release", "Picking", "Picked", "Shipped"],
    [],
  );

  const getOutboundStatusStepIndex = useCallback(
    (statusValue) => {
      const statusKey = toStatusKey(statusValue);
      if (statusKey === "release" || statusKey === "released") return 1;
      if (statusKey === "pick" || statusKey === "picking") return 2;
      if (statusKey === "picked") return 3;
      if (statusKey === "ship" || statusKey === "shipped") return 4;
      if (statusKey === "closed") return 5;
      return 0;
    },
    [toStatusKey],
  );

  const outboundSummary = useMemo(() => {
    const totalLines = outboundDetails.length;
    const planQty = outboundDetails.reduce(
      (sum, row) => sum + Number(row?.quantity_order ?? row?.qty_order ?? 0),
      0,
    );
    const pickQty = outboundDetails.reduce(
      (sum, row) =>
        sum +
        Number(
          row?.quantity_pick ??
            row?.qty_pick ??
            row?.quantity_ship ??
            row?.qty_ship ??
            0,
        ),
      0,
    );
    const stagedQty = outboundDetails.reduce(
      (sum, row) =>
        sum +
        Number(
          row?.quantity_staged ??
            row?.qty_staged ??
            row?.quantity_stage ??
            row?.qty_stage ??
            0,
        ),
      0,
    );

    const rawProgress = (pickQty * 100) / planQty;
    const progressPct = Number.isFinite(rawProgress)
      ? Number(rawProgress.toFixed(2))
      : 0;

    return {
      totalLines,
      planQty,
      receiveQty: pickQty,
      outstanding: Math.max(planQty - stagedQty, 0),
      progressPct: Math.max(0, Math.min(100, progressPct)),
    };
  }, [outboundDetails]);

  const canReleaseOrderAction = useMemo(
    () => isStatusIn(currentStatus, ["open", "release", "pick", "picking"]),
    [currentStatus, isStatusIn],
  );

  const currentOrderType = useMemo(
    () =>
      formData?.order_type?.value_member ??
      formData?.order_type?.code ??
      formData?.order_type ??
      "",
    [formData?.order_type],
  );

  const isBlindPick = ["blind pick", "blind_pick", "Blind Pick"].includes(
    String(currentOrderType ?? "")
      .trim()
      .toLowerCase(),
  );
  const canEditHeader = useMemo(() => {
    return true;
  }, [currentScreen, currentStatus, isStatusIn]);

  const canEditDetailLines = useMemo(() => {
    if (currentScreen === "add") {
      return false;
    }

    if (isBlindPick) {
      return true;
    }

    if (currentScreen === "edit") {
      if (isStatusIn(currentStatus, ["open"])) {
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  }, [currentScreen, currentStatus, isBlindPick, isStatusIn]);

  const canShowConfirmShipAction = useMemo(
    () => isStatusIn(currentStatus, ["picked", "picking"]),
    [currentStatus, isStatusIn],
  );

  const selectedOwnerId = useMemo(() => {
    const selectedOwner = formData?.owner_id ?? formData?.owner;
    return (
      selectedOwner?.owner_id ?? selectedOwner?.code ?? selectedOwner ?? ""
    );
  }, [formData?.owner_id, formData?.owner]);

  const orderHeaderValues = useMemo(
    () => ({
      outbound_order_number: formData?.outbound_order_number ?? "",
      order_type: formData?.order_type,
      order_status: formData?.order_status ?? formData?.status ?? "Open",
      pick_type: formData?.pick_type,
      warehouse: formData?.warehouse,
      owner: formData?.owner,
      order_date: formData?.order_date,
      customer_order_number: formData?.customer_order_number,
      delivery_date_plan: formData?.delivery_date_plan,
      ship_date_plan: formData?.ship_date_plan,
      customer_purchase_order: formData?.customer_purchase_order,
      description: formData?.description,
      remark: formData?.remark,
      variant: formData?.variant,
    }),
    [
      formData?.outbound_order_number,
      formData?.order_type,
      formData?.order_status,
      formData?.status,
      formData?.pick_type,
      formData?.warehouse,
      formData?.owner,
      formData?.order_date,
      formData?.customer_order_number,
      formData?.delivery_date_plan,
      formData?.ship_date_plan,
      formData?.customer_purchase_order,
      formData?.description,
      formData?.remark,
      formData?.variant,
    ],
  );

  const orderHeaderErrors = useMemo(
    () => ({
      order_type: errors?.order_type,
      order_date: errors?.order_date,
    }),
    [errors?.order_type, errors?.order_date],
  );

  const customerShipToValues = useMemo(
    () => ({
      customer_code: formData?.customer_code,
      customer_name: formData?.customer_name,
      customer_address_line1: formData?.customer_address_line1,
      customer_address_line2: formData?.customer_address_line2,
      customer_address_line3: formData?.customer_address_line3,
      ship_to_code: formData?.ship_to_code,
      ship_to_name: formData?.ship_to_name,
      ship_to_address_line1: formData?.ship_to_address_line1,
      ship_to_address_line2: formData?.ship_to_address_line2,
      ship_to_address_line3: formData?.ship_to_address_line3,
      variant: formData?.variant,
    }),
    [
      formData?.customer_code,
      formData?.customer_name,
      formData?.customer_address_line1,
      formData?.customer_address_line2,
      formData?.customer_address_line3,
      formData?.ship_to_code,
      formData?.ship_to_name,
      formData?.ship_to_address_line1,
      formData?.ship_to_address_line2,
      formData?.ship_to_address_line3,
      formData?.variant,
    ],
  );

  const customerShipToErrors = useMemo(
    () => ({
      customer_code: errors?.customer_code,
      ship_to_code: errors?.ship_to_code,
    }),
    [errors?.customer_code, errors?.ship_to_code],
  );

  const orderDetailValues = useMemo(
    () => ({
      delivery_date_actual: formData?.delivery_date_actual,
      ship_date_actual: formData?.ship_date_actual,
      cancel_date: formData?.cancel_date,
      cancel_by: formData?.cancel_by,
      cancel_remark: formData?.cancel_remark,
      close_date: formData?.close_date,
      close_by: formData?.close_by,
      close_remark: formData?.close_remark,
      variant: formData?.variant,
    }),
    [
      formData?.delivery_date_actual,
      formData?.ship_date_actual,
      formData?.cancel_date,
      formData?.cancel_by,
      formData?.cancel_remark,
      formData?.close_date,
      formData?.close_by,
      formData?.close_remark,
      formData?.variant,
    ],
  );

  const orderDetailErrors = useMemo(
    () => ({
      cancel_remark: errors?.cancel_remark,
      close_remark: errors?.close_remark,
    }),
    [errors?.cancel_remark, errors?.close_remark],
  );

  const userDefinedValues = useMemo(
    () => ({
      user_def1: formData?.user_def1,
      user_def2: formData?.user_def2,
      user_def3: formData?.user_def3,
      user_def4: formData?.user_def4,
      user_def5: formData?.user_def5,
      user_def6: formData?.user_def6,
      user_def7: formData?.user_def7,
      user_def8: formData?.user_def8,
      user_def9: formData?.user_def9,
      user_def10: formData?.user_def10,
      variant: formData?.variant,
    }),
    [
      formData?.user_def1,
      formData?.user_def2,
      formData?.user_def3,
      formData?.user_def4,
      formData?.user_def5,
      formData?.user_def6,
      formData?.user_def7,
      formData?.user_def8,
      formData?.user_def9,
      formData?.user_def10,
      formData?.variant,
    ],
  );

  const userDefinedErrors = useMemo(
    () => ({
      user_def7: errors?.user_def7,
      user_def8: errors?.user_def8,
      user_def9: errors?.user_def9,
      user_def10: errors?.user_def10,
    }),
    [
      errors?.user_def7,
      errors?.user_def8,
      errors?.user_def9,
      errors?.user_def10,
    ],
  );

  const handleOpenOutboundReport = useCallback(
    async (report) => {
      const outboundOrderNumber = String(
        formData?.outbound_order_number ?? "",
      ).trim();
      if (!outboundOrderNumber) {
        await BSAlertSwal2.show(
          "warning",
          getText(
            "outbound_order_number_required",
            "Outbound order number is required.",
            "v_inv_viewer_outbound_master",
          ),
        );
        return;
      }

      setReportPreview({
        open: true,
        title: `${report.label} - ${outboundOrderNumber}`,
        reportCode: report.code,
        parameters: {
          order_number: outboundOrderNumber,
        },
      });
    },
    [formData?.outbound_order_number],
  );

  const handleReportPreviewClose = useCallback(() => {
    setReportPreview((prev) => ({ ...prev, open: false }));
  }, []);

  const handleReportMenuClose = useCallback(() => {
    setReportMenuAnchor(null);
  }, []);

  const handleReportClick = useCallback(
    async (report) => {
      handleReportMenuClose();
      await handleOpenOutboundReport(report);
    },
    [handleOpenOutboundReport, handleReportMenuClose],
  );

  useEffect(() => {
    const selectedPartner = formData?.customer_code;

    setFormData((prev) => {
      if (!selectedPartner || typeof selectedPartner !== "object") {
        if (
          !prev.business_partner_id &&
          !prev.business_name &&
          !prev.customer_name &&
          !prev.customer
        ) {
          return prev;
        }

        return {
          ...prev,
          business_partner_id: "",
          business_name: "",
          customer_name: "",
          customer: "",
        };
      }

      const partnerId =
        selectedPartner.business_partner_id ?? selectedPartner.code ?? "";
      const partnerName =
        selectedPartner.business_name ?? selectedPartner.value ?? "";
      const partnerAddress1 = selectedPartner.address_line1 ?? "";
      const partnerAddress2 = selectedPartner.address_line2 ?? "";
      const partnerAddress3 = selectedPartner.address_line3 ?? "";

      if (
        (prev.business_partner_id ?? "") === partnerId &&
        (prev.business_name ?? "") === partnerName &&
        (prev.customer_name ?? "") === partnerName &&
        (prev.customer ?? "") === partnerName
      ) {
        return prev;
      }

      return {
        ...prev,
        business_partner_id: partnerId,
        business_name: partnerName,
        customer_name: partnerName,
        customer: partnerName,
        customer_address_line1: partnerAddress1,
        customer_address_line2: partnerAddress2,
        customer_address_line3: partnerAddress3,
      };
    });
  }, [formData?.customer_code, setFormData]);

  useEffect(() => {
    const selectedOwner = formData?.owner_id;
    const ownerId =
      selectedOwner?.owner_id ?? selectedOwner?.code ?? selectedOwner ?? "";
    const ownerChanged = previousOwnerIdRef.current !== ownerId;

    if (!ownerChanged) return;
    previousOwnerIdRef.current = ownerId;
    setSameAsCustomer(false);

    setFormData((prev) => {
      if (
        !prev.customer_code &&
        !prev.business_partner_id &&
        !prev.business_name &&
        !prev.ship_to_code
      ) {
        return prev;
      }

      return {
        ...prev,
        customer_code: "",
        business_partner_id: "",
        business_name: "",
        customer_name: "",
        customer: "",
        customer_address_line1: "",
        customer_address_line2: "",
        customer_address_line3: "",
        ship_to_code: "",
        ship_to_address_line1: "",
        ship_to_address_line2: "",
        ship_to_address_line3: "",
      };
    });
  }, [formData?.owner_id, setFormData]);

  useEffect(() => {
    if (!sameAsCustomer) return;

    const selectedCustomer = formData?.customer_code;

    setFormData((prev) => {
      const customerObj =
        selectedCustomer && typeof selectedCustomer === "object"
          ? selectedCustomer
          : "";
      const nextShipToName =
        formData?.customer_name ??
        customerObj?.business_name ??
        customerObj?.value ??
        "";
      const nextShipToAddress1 =
        formData?.customer_address_line1 ?? customerObj?.address_line1 ?? "";
      const nextShipToAddress2 =
        formData?.customer_address_line2 ?? customerObj?.address_line2 ?? "";
      const nextShipToAddress3 =
        formData?.customer_address_line3 ?? customerObj?.address_line3 ?? "";

      if (
        (prev.ship_to_code ?? "") === nextShipToName &&
        (prev.ship_to_name ?? "") === nextShipToName &&
        (prev.ship_to_address_line1 ?? "") === nextShipToAddress1 &&
        (prev.ship_to_address_line2 ?? "") === nextShipToAddress2 &&
        (prev.ship_to_address_line3 ?? "") === nextShipToAddress3
      ) {
        return prev;
      }

      return {
        ...prev,
        ship_to_code: nextShipToName,
        ship_to_name: nextShipToName,
        ship_to_address_line1: nextShipToAddress1,
        ship_to_address_line2: nextShipToAddress2,
        ship_to_address_line3: nextShipToAddress3,
      };
    });
  }, [
    sameAsCustomer,
    formData?.customer_code,
    formData?.customer_name,
    formData?.customer_address_line1,
    formData?.customer_address_line2,
    formData?.customer_address_line3,
    setFormData,
  ]);

  useEffect(() => {
    if (sameAsCustomer) return;

    const selectedShipTo = formData?.ship_to_code;

    setFormData((prev) => {
      if (!selectedShipTo || typeof selectedShipTo !== "object") return prev;

      const shipToName =
        selectedShipTo.business_name ?? selectedShipTo.value ?? "";
      const shipToAddress1 = selectedShipTo.address_line1 ?? "";
      const shipToAddress2 = selectedShipTo.address_line2 ?? "";
      const shipToAddress3 = selectedShipTo.address_line3 ?? "";

      if (
        (prev.ship_to_name ?? "") === shipToName &&
        (prev.ship_to_address_line1 ?? "") === shipToAddress1 &&
        (prev.ship_to_address_line2 ?? "") === shipToAddress2 &&
        (prev.ship_to_address_line3 ?? "") === shipToAddress3
      ) {
        return prev;
      }

      return {
        ...prev,
        ship_to_name: shipToName,
        ship_to_code: selectedShipTo,
        ship_to_address_line1: shipToAddress1,
        ship_to_address_line2: shipToAddress2,
        ship_to_address_line3: shipToAddress3,
      };
    });
  }, [formData?.ship_to_code, sameAsCustomer, setFormData]);

  const extractGridRows = useCallback((responseData) => {
    const payload = responseData?.data ?? responseData;
    const rows = payload?.rows ?? payload?.Rows ?? [];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => row?.data ?? row?.Data ?? row).filter(Boolean);
  }, []);
  // const resolveUserFullName = useCallback(
  //   async (userId) => {
  //     const userIdKey = String(userId ?? "").trim();
  //     if (!userIdKey) return "";

  //     try {
  //       const response = await AxiosMaster.post("/dynamic/datagrid", {
  //         tableName: "v_com_user",
  //         schemaName: "sec",
  //         start: 0,
  //         end: 1,
  //         sortModel: [{ field: "user_id", sort: "asc" }],
  //         filterModel: {
  //           items: [{ field: "user_id", operator: "equals", value: userIdKey }],
  //           logicOperator: "and",
  //         },
  //       });

  //       const matchedUser = extractGridRows(response?.data)?.[0];
  //       if (!matchedUser) return userIdKey;

  //       const firstName = String(matchedUser?.first_name ?? "").trim();
  //       const lastName = String(matchedUser?.last_name ?? "").trim();
  //       const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  //       return (
  //         fullName ||
  //         String(matchedUser?.user_id ?? userIdKey).trim() ||
  //         userIdKey
  //       );
  //     } catch {
  //       return userIdKey;
  //     }
  //   },
  //   [extractGridRows],
  // );
  const preloadOutboundMasterMetadata = useCallback(async () => {
    try {
      const [, , ownerDataResponse, warehouseDataResponse] = await Promise.all([
        AxiosMaster.get("/dynamic/metadata/v_inv_warehouse", {
          params: { schemaName: "inv" },
        }),
        AxiosMaster.get("/dynamic/metadata/v_inv_owner", {
          params: { schemaName: "inv" },
        }),
        AxiosMaster.post("/dynamic/datagrid", {
          tableName: "v_inv_owner",
          schemaName: "inv",
          start: 0,
          end: 1,
          sortModel: [{ field: "owner_id", sort: "asc" }],
          filterModel: {
            items: [{ field: "is_active", operator: "equals", value: 1 }],
            logicOperator: "and",
          },
        }),
        AxiosMaster.post("/dynamic/datagrid", {
          tableName: "v_inv_warehouse",
          schemaName: "inv",
          start: 0,
          end: 1,
          sortModel: [{ field: "warehouse_id", sort: "asc" }],
          filterModel: {
            items: [{ field: "is_active", operator: "equals", value: 1 }],
            logicOperator: "and",
          },
        }),
      ]);

      setAutoMasterDefaults({
        owner: extractGridRows(ownerDataResponse?.data)?.[0] ?? null,
        warehouse: extractGridRows(warehouseDataResponse?.data)?.[0] ?? null,
      });
    } catch (error) {
      console.error("Failed to preload outbound master metadata:", error);
    }
  }, [extractGridRows]);

  const resolveAutoWarehouseAndOwner = useCallback(
    async (masterData) => {
      const nextMasterData = { ...(masterData || {}) };

      const ownerIdRaw =
        nextMasterData?.owner_id?.owner_id ??
        nextMasterData?.owner?.owner_id ??
        nextMasterData?.owner_id?.code ??
        nextMasterData?.owner?.code ??
        nextMasterData?.owner_id ??
        nextMasterData?.owner;
      const warehouseIdRaw =
        nextMasterData?.warehouse?.warehouse_id ??
        nextMasterData?.warehouse?.code ??
        nextMasterData?.warehouse_id;

      const shouldResolveOwner = !(Number(ownerIdRaw) > 0);
      const shouldResolveWarehouse = !(Number(warehouseIdRaw) > 0);

      if (!shouldResolveOwner && !shouldResolveWarehouse) {
        return nextMasterData;
      }

      const ownerRow = autoMasterDefaults?.owner ?? null;
      const warehouseRow = autoMasterDefaults?.warehouse ?? null;

      if (shouldResolveOwner) {
        if (ownerRow?.owner_id) {
          nextMasterData.owner_id = {
            code: ownerRow.owner_id,
            owner_id: ownerRow.owner_id,
            owner_code: ownerRow.owner_code ?? "",
            owner_name: ownerRow.owner_name ?? "",
            value: ownerRow.owner_code ?? ownerRow.owner_name ?? "",
          };
          nextMasterData.owner =
            ownerRow.owner_name ?? ownerRow.owner_code ?? "";
          nextMasterData.owner_code = ownerRow.owner_code ?? "";
        }
      }

      if (shouldResolveWarehouse) {
        if (warehouseRow?.warehouse_id) {
          nextMasterData.warehouse = {
            code: warehouseRow.warehouse_id,
            warehouse_id: warehouseRow.warehouse_id,
            warehouse: warehouseRow.warehouse ?? "",
            warehouse_name: warehouseRow.warehouse_name ?? "",
            value: warehouseRow.warehouse ?? warehouseRow.warehouse_name ?? "",
          };
          nextMasterData.warehouse_id = warehouseRow.warehouse_id;
        }
      }

      return nextMasterData;
    },
    [autoMasterDefaults],
  );

  useEffect(() => {
    if (currentScreen !== "list") return;
    preloadOutboundMasterMetadata();
  }, [currentScreen, preloadOutboundMasterMetadata]);

  useEffect(() => {
    if (currentScreen !== "edit") return;

    const createByKey = String(
      formData?.create_by ?? formData?.createBy ?? "",
    ).trim();
    const updateByKey = String(
      formData?.update_by ?? formData?.updateBy ?? "",
    ).trim();
    const unresolvedUserIds = [...new Set([createByKey, updateByKey])]
      .filter(Boolean)
      .filter((userId) => !userFullNameMap[userId]);

    if (unresolvedUserIds.length === 0) return;

    let isDisposed = false;
    // (async () => {
    //   const resolvedEntries = await Promise.all(
    //     unresolvedUserIds.map(async (userId) => [
    //       userId,
    //       await resolveUserFullName(userId),
    //     ]),
    //   );

    //   if (isDisposed) return;

    //   setUserFullNameMap((prev) => {
    //     const next = { ...prev };
    //     resolvedEntries.forEach(([userId, fullName]) => {
    //       next[userId] = fullName || userId;
    //     });
    //     return next;
    //   });
    // })();

    return () => {
      isDisposed = true;
    };
  }, [
    currentScreen,
    formData?.create_by,
    formData?.createBy,
    formData?.update_by,
    formData?.updateBy,
    //resolveUserFullName,
    userFullNameMap,
  ]);

  const addScreenOwnerId = useMemo(() => {
    const ownerRaw =
      formData?.owner_id?.owner_id ??
      formData?.owner?.owner_id ??
      formData?.owner_id?.code ??
      formData?.owner?.code ??
      formData?.owner_id ??
      formData?.owner;
    const ownerId = Number(ownerRaw);
    return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
  }, [formData?.owner_id, formData?.owner]);

  const addScreenWarehouseId = useMemo(() => {
    const warehouseRaw =
      formData?.warehouse?.warehouse_id ??
      formData?.warehouse?.code ??
      formData?.warehouse_id;
    const warehouseId = Number(warehouseRaw);
    return Number.isFinite(warehouseId) && warehouseId > 0 ? warehouseId : null;
  }, [formData?.warehouse, formData?.warehouse_id]);

  useEffect(() => {
    if (currentScreen !== "add") return;
    if (addScreenOwnerId && addScreenWarehouseId) return;

    let isMounted = true;
    (async () => {
      try {
        const resolved = await resolveAutoWarehouseAndOwner({
          owner_id: formData?.owner_id,
          owner: formData?.owner,
          owner_code: formData?.owner_code,
          warehouse: formData?.warehouse,
          warehouse_id: formData?.warehouse_id,
        });
        if (!isMounted) return;
        setFormData((prev) => ({ ...prev, ...resolved }));
      } catch (error) {
        console.error("Failed to preload warehouse/owner defaults:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    currentScreen,
    addScreenOwnerId,
    addScreenWarehouseId,
    formData?.owner_id,
    formData?.owner,
    formData?.owner_code,
    formData?.warehouse,
    formData?.warehouse_id,
    resolveAutoWarehouseAndOwner,
    setFormData,
  ]);
  const getStatusChipStyles = useCallback(
    (status) => {
      const statusStyles = {
        open: {
          //  backgroundColor: "rgba(176, 190, 197, 0.2)",
          color: "#455A64",
          //   border: "1px solid rgba(176, 190, 197, 0.7)",
        },
        release: {
          backgroundColor: "rgba(66, 165, 245, 0.2)",
          color: "#1E88E5",
          border: "1px solid rgba(66, 165, 245, 0.75)",
        },
        released: {
          backgroundColor: "rgba(66, 165, 245, 0.2)",
          color: "#1E88E5",
          border: "1px solid rgba(66, 165, 245, 0.75)",
        },
        pick: {
          // backgroundColor: "rgba(255, 167, 38, 0.2)",
          color: "#EF6C00",
          //  border: "1px solid rgba(255, 167, 38, 0.75)",
        },
        picking: {
          // backgroundColor: "rgba(255, 167, 38, 0.2)",
          color: "#EF6C00",
          // border: "1px solid rgba(255, 167, 38, 0.75)",
        },
        picked: {
          //    backgroundColor: "rgba(126, 87, 194, 0.2)",
          color: "#5E35B1",
          //   border: "1px solid rgba(126, 87, 194, 0.75)",
        },
        ship: {
          //   backgroundColor: "rgba(102, 187, 106, 0.2)",
          color: "#2E7D32",
          //    border: "1px solid rgba(102, 187, 106, 0.75)",
        },
        shipped: {
          //  backgroundColor: "rgba(102, 187, 106, 0.2)",
          color: "#2E7D32",
          //   border: "1px solid rgba(102, 187, 106, 0.75)",
        },
        closed: {
          //   backgroundColor: "rgba(120, 144, 156, 0.2)",
          color: "#546E7A",
          //   border: "1px solid rgba(120, 144, 156, 0.75)",
        },
        cancelled: {
          //   backgroundColor: "rgba(239, 83, 80, 0.2)",
          color: "#C62828",
          //    border: "1px solid rgba(239, 83, 80, 0.75)",
        },
      };
      return statusStyles[toStatusKey(status)] || statusStyles.open;
    },
    [toStatusKey],
  );

  const getOutboundMasterId = useCallback(
    (row) =>
      Number(
        row?.outbound_master_id ?? row?.id ?? formData?.outbound_master_id ?? 0,
      ),
    [formData?.outbound_master_id],
  );

  const getActionErrorMessage = useCallback(
    (err, fallbackMessage) =>
      err?.response?.data?.message_text ||
      err?.response?.data?.message ||
      err?.response?.data?.title ||
      err?.message ||
      fallbackMessage,
    [],
  );

  const getActionResultPayload = useCallback((result) => {
    if (result && typeof result === "object" && result.data) {
      return result.data;
    }

    return result;
  }, []);

  const getActionResultMessage = useCallback(
    (result, fallbackMessage) => {
      const payload = getActionResultPayload(result);

      return (
        payload?.error_message ||
        payload?.message_text ||
        payload?.message ||
        result?.error_message ||
        result?.message_text ||
        result?.message ||
        fallbackMessage
      );
    },
    [getActionResultPayload],
  );

  const isActionErrorResult = useCallback(
    (result) => {
      const payload = getActionResultPayload(result);
      const status = String(
        payload?.message_status ?? result?.message_status ?? "",
      ).toLowerCase();
      const successFlag = payload?.success ?? result?.success;

      return (
        status === "error" ||
        status === "failed" ||
        successFlag === false ||
        String(successFlag || "").toLowerCase() === "false"
      );
    },
    [getActionResultPayload],
  );

  const resolveWarehouseId = useCallback((source) => {
    const warehouseRaw =
      source?.warehouse_id ??
      source?.warehouse?.warehouse_id ??
      source?.warehouse?.code ??
      source?.warehouse;
    const warehouseId = Number(warehouseRaw);
    return Number.isFinite(warehouseId) && warehouseId > 0 ? warehouseId : null;
  }, []);

  const resolveOwnerId = useCallback((source) => {
    const ownerRaw =
      source?.owner_id ??
      source?.owner?.owner_id ??
      source?.owner?.code ??
      source?.owner;
    const ownerId = Number(ownerRaw);
    return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
  }, []);

  const buildActionRequest = useCallback(
    (outboundMasterId, source) => {
      const payload = {
        outbound_master_id: Number(outboundMasterId),
        device: "WEB",
        lang: lang || "en-US",
        is_check_pick_list: false,
      };

      const warehouseId = resolveWarehouseId(source);
      if (warehouseId) {
        payload.warehouse_id = warehouseId;
      }

      const ownerId = resolveOwnerId(source);
      if (ownerId) {
        payload.owner_id = ownerId;
      }

      return payload;
    },
    [lang, resolveWarehouseId, resolveOwnerId],
  );

  const showActionSuccess = useCallback((message) => {
    setReleaseSuccess(message);
    setTimeout(() => setReleaseSuccess(null), 4000);
  }, []);

  const refreshOutboundGrid = useCallback(async () => {
    await refreshOutboundGridRef(gridRef, pendingGridRefreshRef);
  }, []);

  useEffect(() => {
    if (currentScreen !== "list" || !pendingGridRefreshRef.current) return;

    refreshOutboundGrid();
  }, [currentScreen, refreshOutboundGrid]);

  const handleBackToList = useCallback(() => {
    setCurrentScreen("list");
    setActiveTab("");
  }, []);

  const handleRelease = useCallback(
    async (row, isOpen) => {
      const outboundMasterId = getOutboundMasterId(row);
      const outboundOrderNumber =
        row?.outbound_order_number || formData?.outbound_order_number || "-";

      const actionLabel = isOpen ? "Release" : "Unrelease";
      if (!(outboundMasterId > 0)) {
        BSAlertSwal2.fire({
          icon: "warning",
          title: getText("release", "Release", "v_inv_viewer_outbound_master"),
          text: getText(
            "outbound_required",
            "Outbound is required.",
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }

      const isConfirmed = await BSAlertSwal2.confirm(
        `Confirm ${actionLabel.toLowerCase()} action for outbound ${outboundOrderNumber}?`,
        {
          title: getText(
            "confirm_release",
            `Confirm ${actionLabel}`,
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: getText(
            "yes_proceed",
            "Yes, proceed",
            "v_inv_viewer_outbound_master",
          ),
          cancelButtonText: getText(
            "cancel",
            "Cancel",
            "v_inv_viewer_outbound_master",
          ),
        },
      );
      if (!isConfirmed) {
        return;
      }

      try {
        const actionRequest = buildActionRequest(outboundMasterId, row);
        const result = isOpen
          ? await ReleaseOutbound(actionRequest)
          : await UnreleaseOutbound(actionRequest);
        const message = getActionResultMessage(
          result,
          `Processed ${actionLabel.toLowerCase()} action for ${outboundOrderNumber}`,
        );
        if (isActionErrorResult(result)) {
          if (result?.data?.items?.length > 0) {
            await setPickList(result?.data ?? {});
            setIsConfirmPickList(true);
          } else {
            BSAlertSwal2.fire({
              icon: "error",
              title: `${actionLabel} Failed`,
              text: message,
              confirmButtonText: "OK",
            });
          }
          return;
        }

        await refreshOutboundGrid();
        showActionSuccess(message);
        BSAlertSwal2.fire({
          icon: "success",
          title: `${actionLabel} Success`,
          text: message,
          confirmButtonText: "OK",
        });
      } catch (err) {
        BSAlertSwal2.fire({
          icon: "error",
          title: `${actionLabel} Failed`,
          text: getActionErrorMessage(
            err,
            `Failed to ${actionLabel.toLowerCase()} outbound.`,
          ),
          confirmButtonText: "OK",
        });
      }
    },
    [
      formData,
      currentStatus,
      ReleaseOutbound,
      UnreleaseOutbound,
      getOutboundMasterId,
      isStatusIn,
      buildActionRequest,
      showActionSuccess,
      getActionErrorMessage,
      getActionResultMessage,
      isActionErrorResult,
      refreshOutboundGrid,
    ],
  );

  const handleReleaseUser = useCallback(
    async (row, isOpen) => {
      const outboundMasterId = getOutboundMasterId(row);
      const outboundOrderNumber =
        row?.outbound_order_number || formData?.outbound_order_number || "-";
      const actionLabel = isOpen ? "Release User" : "Unrelease User";
      if (!(outboundMasterId > 0)) {
        BSAlertSwal2.fire({
          icon: "warning",
          title: actionLabel,
          text: getText(
            "outbound_required",
            "Outbound is required.",
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }

      const isConfirmed = await BSAlertSwal2.confirm(
        `Confirm ${actionLabel.toLowerCase()} action for outbound ${outboundOrderNumber}?`,
        {
          title: getText(
            "confirm_release",
            `Confirm ${actionLabel}`,
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: getText(
            "yes_proceed",
            "Yes, proceed",
            "v_inv_viewer_outbound_master",
          ),
          cancelButtonText: getText(
            "cancel",
            "Cancel",
            "v_inv_viewer_outbound_master",
          ),
        },
      );
      if (!isConfirmed) {
        return;
      }

      try {
        const actionRequest = buildActionRequest(outboundMasterId, row);
        const result = isOpen
          ? await ReleaseUserOutbound(actionRequest)
          : await UnreleaseUserOutbound(actionRequest);
        const message = getActionResultMessage(
          result,
          `Processed ${actionLabel.toLowerCase()} action for ${outboundOrderNumber}`,
        );

        if (isActionErrorResult(result)) {
          BSAlertSwal2.fire({
            icon: "error",
            title: `${actionLabel} Failed`,
            text: message,
            confirmButtonText: "OK",
          });
          return;
        }

        await refreshOutboundGrid();
        showActionSuccess(message);
        BSAlertSwal2.fire({
          icon: "success",
          title: `${actionLabel} Success`,
          text: message,
          confirmButtonText: "OK",
        });
      } catch (err) {
        BSAlertSwal2.fire({
          icon: "error",
          title: `${actionLabel} Failed`,
          text: getActionErrorMessage(
            err,
            `Failed to ${actionLabel.toLowerCase()} outbound.`,
          ),
          confirmButtonText: "OK",
        });
      }
    },
    [
      formData,
      currentStatus,
      ReleaseUserOutbound,
      UnreleaseUserOutbound,
      getOutboundMasterId,
      isStatusIn,
      buildActionRequest,
      showActionSuccess,
      getActionErrorMessage,
      getActionResultMessage,
      isActionErrorResult,
      refreshOutboundGrid,
    ],
  );

  const handleConfirmShip = async () => {
    const outboundMasterId = getOutboundMasterId(formData);
    const outboundOrderNumber = formData?.outbound_order_number || "-";
    if (!(outboundMasterId > 0)) {
      BSAlertSwal2.fire({
        icon: "warning",
        title: getText(
          "confirm_ship",
          "Confirm Ship",
          "v_inv_viewer_outbound_master",
        ),
        text: getText(
          "outbound_required",
          "Outbound is required.",
          "v_inv_viewer_outbound_master",
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
      return;
    }

    const isConfirmed = await BSAlertSwal2.confirm(
      `Confirm ship for outbound ${outboundOrderNumber}?`,
      {
        title: getText(
          "confirm_ship",
          "Confirm Ship",
          "v_inv_viewer_outbound_master",
        ),
        confirmButtonText: getText(
          "yes_confirm_ship",
          "Yes, confirm ship",
          "v_inv_viewer_outbound_master",
        ),
        cancelButtonText: getText(
          "cancel",
          "Cancel",
          "v_inv_viewer_outbound_master",
        ),
      },
    );
    if (!isConfirmed) {
      return;
    }

    try {
      const result = await ConfirmShipOutbound(outboundMasterId);
      const message = getActionResultMessage(
        result,
        getText(
          "confirm_ship_success",
          "Confirm ship success.",
          "v_inv_viewer_outbound_master",
        ),
      );

      if (isActionErrorResult(result)) {
        BSAlertSwal2.fire({
          icon: "error",
          title: getText(
            "confirm_ship_failed",
            "Confirm Ship Failed",
            "v_inv_viewer_outbound_master",
          ),
          text: message,
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }

      await refreshOutboundGrid();
      showActionSuccess(message);
      BSAlertSwal2.fire({
        icon: "success",
        title: getText(
          "confirm_ship_success",
          "Confirm Ship Success",
          "v_inv_viewer_outbound_master",
        ),
        text: message,
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
      await handleEditOutbound(outboundMasterId);
    } catch (err) {
      BSAlertSwal2.fire({
        icon: "error",
        title: getText(
          "confirm_ship_failed",
          "Confirm Ship Failed",
          "v_inv_viewer_outbound_master",
        ),
        text: getActionErrorMessage(
          err,
          getText(
            "confirm_ship_failed",
            "Failed to confirm ship outbound.",
            "v_inv_viewer_outbound_master",
          ),
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
    }
  };

  const handleCancelOrder = async () => {
    const outboundMasterId = getOutboundMasterId(formData);
    const outboundOrderNumber = formData?.outbound_order_number || "-";
    if (!(outboundMasterId > 0)) {
      BSAlertSwal2.fire({
        icon: "warning",
        title: getText(
          "cancel_order",
          "Cancel Order",
          "v_inv_viewer_outbound_master",
        ),
        text: getText(
          "outbound_required",
          "Outbound is required.",
          "v_inv_viewer_outbound_master",
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
      return;
    }

    const isConfirmed = await BSAlertSwal2.confirm(
      getText(
        "confirm_cancel_outbound",
        `Confirm cancel outbound`,
        "v_inv_viewer_outbound_master",
      ) +
        " " +
        outboundOrderNumber +
        "?",
      {
        title: getText(
          "confirm_cancel_order",
          "Confirm Cancel Order",
          "v_inv_viewer_outbound_master",
        ),
        confirmButtonText: getText(
          "yes_cancel_order",
          "Yes, cancel order",
          "v_inv_viewer_outbound_master",
        ),
        cancelButtonText: getText("no", "No", "v_inv_viewer_outbound_master"),
      },
    );
    if (!isConfirmed) return;

    try {
      const result = await CancelOrderOutbound({
        ...buildActionRequest(outboundMasterId),
        cancel_remark: formData?.cancel_remark || "",
      });
      const message = getActionResultMessage(
        result,
        `Cancelled ${outboundOrderNumber}`,
      );

      if (isActionErrorResult(result)) {
        BSAlertSwal2.fire({
          icon: "error",
          title: getText(
            "cancel_failed",
            "Cancel Failed",
            "v_inv_viewer_outbound_master",
          ),
          text: message,
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }

      await refreshOutboundGrid();
      showActionSuccess(message);
      BSAlertSwal2.fire({
        icon: "success",
        title: getText(
          "cancel_success",
          "Cancel Success",
          "v_inv_viewer_outbound_master",
        ),
        text: message,
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
      handleBackToList();
    } catch (err) {
      BSAlertSwal2.fire({
        icon: "error",
        title: getText(
          "cancel_failed",
          "Cancel Failed",
          "v_inv_viewer_outbound_master",
        ),
        text: getActionErrorMessage(
          err,
          getText(
            "cancel_failed",
            "Failed to cancel outbound.",
            "v_inv_viewer_outbound_master",
          ),
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
    }
  };

  const handleAddOutbound = () => {
    setSameAsCustomer(false);
    setSummaryExpanded(true);
    setOrderHeaderExpanded(true);
    previousOwnerIdRef.current = "";
    setFormData({ ...defultFormData });
    setOutboundDetails([createEmptyOutboundDetail(1)]);
    setCurrentScreen("add");
  };

  const mapMasterToEditForm = useCallback((master = {}) => {
    const customerId = master?.customer_id ?? "";
    const shipToCodeRaw = master?.ship_to_code ?? "";
    const shipToCodeNumber = Number(shipToCodeRaw);
    const shipToCodeValue = Number.isNaN(shipToCodeNumber)
      ? shipToCodeRaw
      : shipToCodeNumber;
    const shipToNameRaw = String(master?.ship_to_name ?? "").trim();

    return {
      ...master,
      warehouse: master?.warehouse_id
        ? {
            code: master.warehouse_id,
            warehouse_id: master.warehouse_id,
            warehouse: master?.warehouse ?? "",
            value: master?.warehouse ?? "",
          }
        : (master?.warehouse ?? ""),
      owner_id: master?.owner_id
        ? {
            code: master.owner_id,
            owner_id: master.owner_id,
            owner_code: master?.owner_code ?? "",
            value: master?.owner_code ?? "",
          }
        : (master?.owner_id ?? ""),
      order_type: master?.order_type
        ? {
            code: master.order_type,
            value_member: master.order_type,
            display_member: master.order_type,
            value: master.order_type,
          }
        : "",
      pick_type: master?.pick_type
        ? {
            code: master.pick_type,
            value_member: master.pick_type,
            display_member: master.pick_type,
            value: master.pick_type,
          }
        : "",
      customer_code: customerId
        ? {
            business_partner_id: customerId,
            code: customerId,
            business_code: master?.customer_code ?? "",
            business_name: master?.customer_name ?? "",
            value: master?.customer_name ?? "",
            address_line1: master?.customer_address_line1 ?? "",
            address_line2: master?.customer_address_line2 ?? "",
            address_line3: master?.customer_address_line3 ?? "",
          }
        : "",
      ship_to_code: shipToCodeRaw
        ? shipToNameRaw || String(shipToCodeValue)
        : "",
    };
  }, []);

  const handleEditOutbound = useCallback(
    async (rowOrId) => {
      setSameAsCustomer(false);

      const data = await GetOutbound(rowOrId?.outbound_master_id || rowOrId);
      if (!data) {
        BSAlertSwal2({
          severity: "error",
          message: getText(
            "failed_fetch_outbound_data",
            "Failed to fetch outbound data",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }

      if (
        data.message_code === "000" ||
        data.message_code === "0" ||
        data.message_code === 0 ||
        data.message_code === "success"
      ) {
        const loadedMaster = data.data?.outbound_master ?? {};
        const loadedDetails =
          data.data?.outbound_details ??
          loadedMaster?.outbound_details ??
          loadedMaster?.lines ??
          [];
        const mappedMaster = mapMasterToEditForm(loadedMaster);

        // Prevent owner-change effect from clearing customer/ship-to during initial edit preload.
        const preloadOwnerId =
          mappedMaster?.owner_id?.owner_id ??
          mappedMaster?.owner_id?.code ??
          mappedMaster?.owner_id ??
          "";
        previousOwnerIdRef.current = preloadOwnerId;

        setFormData((prev) => ({
          ...prev,
          ...mappedMaster,
        }));
        const outboundDetails = normalizeOutboundDetails(loadedDetails);
        setDefualtOutboundDetailsCount(outboundDetails.length);
        setOutboundDetails(outboundDetails);
        setPickHeader(data.data?.pick_header ?? null);
        setPickDetails(data.data?.pick_details ?? []);
        setSummaryExpanded(true);
        setCurrentScreen("edit");
        if (
          currentScreen !== "edit" &&
          (activeTab === "" || activeTab === null)
        ) {
          setActiveTab("outbound");
        }
      } else {
        BSAlertSwal2({
          severity: "error",
          message:
            data.message ||
            getText(
              "failed_fetch_outbound_data",
              "Failed to fetch outbound data",
              "v_inv_viewer_outbound_master",
            ),
        });
      }
    },
    [
      GetOutbound,
      activeTab,
      currentScreen,
      getText,
      mapMasterToEditForm,
      normalizeOutboundDetails,
      setFormData,
    ],
  );

  const handleRefreshOutboundData = useCallback(async () => {
    if (isRefreshingData) {
      return;
    }

    setIsRefreshingData(true);
    setPickHeader(null);
    setPickDetails([]);
    setOutboundDetails((prev) =>
      prev.map((row) => ({
        ...row,
        item_lookup_code_error: false,
        item_uom_id_error: false,
      })),
    );

    const outboundMasterId = getOutboundMasterId(formData);
    if (!(outboundMasterId > 0)) {
      setOutboundDetails([createEmptyOutboundDetail(1)]);
      setIsRefreshingData(false);
      return;
    }

    try {
      await handleEditOutbound(outboundMasterId);
    } finally {
      setIsRefreshingData(false);
    }
  }, [
    isRefreshingData,
    formData,
    getOutboundMasterId,
    createEmptyOutboundDetail,
    handleEditOutbound,
  ]);

  const buildOutboundPayload = useCallback((masterData, details) => {
    const normalizeDateValue = (value) => {
      if (value === undefined || value === null || value === "") return null;

      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        const hour = String(value.getHours()).padStart(2, "0");
        const minute = String(value.getMinutes()).padStart(2, "0");
        const second = String(value.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      }

      if (typeof value !== "string") return value;

      const trimmed = value.trim();
      if (!trimmed) return null;

      // Supports DD/MM/YYYY and MM/DD/YYYY with optional time (HH:mm[:ss]).
      const slashDateMatch = trimmed.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
      );
      if (slashDateMatch) {
        const first = Number(slashDateMatch[1]);
        const second = Number(slashDateMatch[2]);
        const year = Number(slashDateMatch[3]);
        const hour = String(Number(slashDateMatch[4] ?? 0)).padStart(2, "0");
        const minute = String(Number(slashDateMatch[5] ?? 0)).padStart(2, "0");
        const secondPart = String(Number(slashDateMatch[6] ?? 0)).padStart(
          2,
          "0",
        );

        let day;
        let month;

        if (first > 12) {
          day = first;
          month = second;
        } else if (second > 12) {
          month = first;
          day = second;
        } else {
          // Ambiguous case: prefer DD/MM/YYYY because this form displays DD/MM/YYYY.
          day = first;
          month = second;
        }

        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hour}:${minute}:${secondPart}`;
      }

      const isoDateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateOnlyMatch) {
        return `${trimmed}T00:00:00`;
      }

      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        return trimmed;
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        const hour = String(parsed.getHours()).padStart(2, "0");
        const minute = String(parsed.getMinutes()).padStart(2, "0");
        const second = String(parsed.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      }

      return trimmed;
    };

    const normalizeDecimalValue = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const normalizeStringValue = (value) => {
      if (value === undefined || value === null || value === "") return null;
      return String(value);
    };

    const normalizeIntValue = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return null;
      return Math.trunc(parsed);
    };

    const normalizePriceValue = (value) => {
      if (value === undefined || value === null || value === "") return "0";

      const rawValue = String(value).trim().replace(/,/g, "");
      if (!rawValue) return "0";

      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) return null;

      if (/^[+-]?\d+$/.test(rawValue)) {
        const sign = rawValue.startsWith("-") ? "-" : "";
        const unsignedValue = rawValue.replace(/^[-+]/, "");
        const integerOnly = unsignedValue.replace(/^0+(?=\d)/, "") || "0";
        return `${sign}${integerOnly}`;
      }

      const sign = rawValue.startsWith("-") ? "-" : "";
      const unsignedValue = rawValue.replace(/^[-+]/, "");
      const [integerPartRaw = "0", fractionPartRaw = ""] =
        unsignedValue.split(".");
      const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";

      if (!fractionPartRaw) {
        return `${sign}${integerPart}`;
      }

      const fractionPart = fractionPartRaw.replace(/0+$/, "");
      return fractionPart
        ? `${sign}${integerPart}.${fractionPart}`
        : `${sign}${integerPart}`;
    };

    const dateFields = [
      "order_date",
      "delivery_date_plan",
      "ship_date_plan",
      "delivery_date_actual",
      "ship_date_actual",
      "release_date",
      "close_date",
      "cancel_date",
      "user_def9",
      "user_def10",
    ];

    const decimalFields = ["user_def7", "user_def8"];

    const {
      outbound_detail,
      outbound_master,
      outbound_details,
      lines,
      ...outboundMaster
    } = masterData || {};

    const normalizedMaster = { ...outboundMaster };
    dateFields.forEach((field) => {
      normalizedMaster[field] = normalizeDateValue(normalizedMaster[field]);
    });
    decimalFields.forEach((field) => {
      normalizedMaster[field] = normalizeDecimalValue(normalizedMaster[field]);
    });

    const shipToCodeRaw =
      masterData?.ship_to_code?.business_partner_id ??
      masterData?.ship_to_code?.business_code ??
      masterData?.ship_to_code?.code ??
      masterData?.ship_to_code;

    const ownerIdRaw =
      masterData?.owner_id?.owner_id ??
      masterData?.owner?.owner_id ??
      masterData?.owner_id?.code ??
      masterData?.owner?.code ??
      masterData?.owner_id ??
      masterData?.owner;

    const ownerCodeRaw =
      masterData?.owner_id?.owner_code ??
      masterData?.owner?.owner_code ??
      masterData?.owner_id?.code ??
      masterData?.owner?.code ??
      masterData?.owner_code;

    const warehouseIdRaw =
      masterData?.warehouse?.warehouse_id ??
      masterData?.warehouse?.code ??
      masterData?.warehouse_id;

    const warehouseRaw =
      masterData?.warehouse?.warehouse ??
      masterData?.warehouse?.value ??
      masterData?.warehouse;

    const customerIdRaw =
      masterData?.customer_code?.business_partner_id ?? masterData?.customer_id;

    const customerCodeRaw =
      masterData?.customer_code?.business_code ??
      masterData?.customer_code?.code ??
      masterData?.customer_code;

    const orderTypeRaw =
      masterData?.order_type?.value_member ||
      masterData?.order_type?.code ||
      masterData?.order_type;

    const orderStatusRaw =
      masterData?.order_status || masterData?.status || "OPEN";

    const parseItemMasterId = (detail) => {
      const direct = normalizeIntValue(
        detail?.item_master_id ?? detail?.item?.item_master_id,
      );
      if (direct && direct > 0) return direct;

      const fromItemNumber = normalizeIntValue(detail?.item_number);
      return fromItemNumber && fromItemNumber > 0 ? fromItemNumber : null;
    };

    const parseItemUomId = (detail) => {
      const direct = normalizeIntValue(detail?.item_uom_id ?? detail?.uom_id);
      if (direct && direct > 0) return direct;

      const fromUom = normalizeIntValue(detail?.uom);
      return fromUom && fromUom > 0 ? fromUom : null;
    };

    // Serial-controlled lines must use EA and quantity 1.
    if (details && details.some((detail) => detail?.serial_number)) {
      const resolveDetailUom = (detail) => {
        const directUom = String(detail?.uom ?? "").trim();
        if (directUom) return directUom;

        const matchedUomOption = Array.isArray(detail?.uom_options)
          ? detail.uom_options.find(
              (option) =>
                String(option?.code ?? "") ===
                  String(detail?.item_uom_id ?? "") ||
                String(option?.item_uom_id ?? "") ===
                  String(detail?.item_uom_id ?? ""),
            )
          : null;

        return String(
          matchedUomOption?.value ?? matchedUomOption?.uom ?? "",
        ).trim();
      };

      const invalidSerialDetails = details.filter((detail) => {
        const serialNumber = String(detail?.serial_number ?? "").trim();
        if (!serialNumber) return false;

        const uomValue = resolveDetailUom(detail).toUpperCase();
        const quantityOrder = Number(
          detail?.quantity_order ?? detail?.qty_order ?? 0,
        );

        return uomValue !== "EA" || quantityOrder !== 1;
      });

      if (invalidSerialDetails.length > 0) {
        const invalidLines = invalidSerialDetails
          .map((detail) => {
            const lineNo =
              detail?.line_number ||
              detail?.line ||
              details.indexOf(detail) + 1;
            const displayUom = resolveDetailUom(detail) || "(empty)";
            const displayQty = Number(
              detail?.quantity_order ?? detail?.qty_order ?? 0,
            );

            return `Row ${lineNo}: UOM=${displayUom}, Qty=${displayQty}`;
          })
          .join("<br/>");

        const titleText = getText(
          "invalid_serial_number_details",
          "Invalid Serial Number Details",
          "v_inv_viewer_outbound_master",
        );
        const detailText = getText(
          "invalid_serial_number_details_message",
          "Serial number lines must use UOM = EA and Quantity = 1.",
          "v_inv_viewer_outbound_master",
        );

        const resolvedTitle =
          titleText === "invalid_serial_number_details"
            ? "Invalid Serial Number Details"
            : titleText;
        const resolvedDetailText =
          detailText === "invalid_serial_number_details_message"
            ? "Serial number lines must use UOM = EA and Quantity = 1."
            : detailText;

        BSAlertSwal2.fire({
          icon: "warning",
          title: resolvedTitle,
          html: `${resolvedDetailText}<br/><br/>${invalidLines}`,
          confirmButtonText: "OK",
        });
        return;
      }
    }
    //เงื่อนไข quantity field ที่จะส่งไปหลังบ้านต้อง เป็นตัวเลขเท่านั้น และไม่สามารถเป็น 0 หรือติดลบได้ ถ้าไม่เป็นไปตามนี้แจ้งเตือนให้ผู้ใช้ทราบ และ นำไปคูณ conversion factor ก่อนส่งไปหลังบ้าน

    if (
      details &&
      details.some((detail) => detail?.quantity_order !== undefined)
    ) {
      const invalidQuantityDetails = details.filter((detail) => {
        const quantity = Number(detail?.quantity_order);
        return Number.isNaN(quantity) || quantity <= 0;
      });
      if (invalidQuantityDetails.length > 0) {
        const invalidLines = invalidQuantityDetails
          .map(
            (detail) =>
              detail?.line_number ||
              detail?.line ||
              details.indexOf(detail) + 1,
          )
          .join(", ");
        BSAlertSwal2.fire({
          icon: "warning",
          title: getText(
            "invalid_quantity_order_details",
            "Invalid Quantity Order Details",
            "v_inv_viewer_outbound_master",
          ),
          html: getText(
            "invalid_quantity_order_details_message",
            `Details with line numbers ${invalidLines} have invalid quantity order values. Quantity order must be a number greater than 0. Please correct these before saving.`,
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: "OK",
        });
        return;
      }
    }

    if (details && details.some((detail) => detail?.price !== undefined)) {
      const invalidPriceDetails = details.filter((detail) => {
        const normalizedPrice = normalizePriceValue(detail?.price);
        if (normalizedPrice === null) return true;

        const unsignedPrice = normalizedPrice.startsWith("-")
          ? normalizedPrice.slice(1)
          : normalizedPrice;

        const [integerPart = "", fractionPart = ""] = unsignedPrice.split(".");
        const integerDigits = integerPart.replace(/\D/g, "").length;
        const decimalDigits = fractionPart.replace(/\D/g, "").length;

        return integerDigits > 13 || decimalDigits > 3;
      });

      if (invalidPriceDetails.length > 0) {
        const invalidLines = invalidPriceDetails
          .map(
            (detail) =>
              detail?.line_number ||
              detail?.line ||
              details.indexOf(detail) + 1,
          )
          .join(", ");

        BSAlertSwal2.fire({
          icon: "warning",
          title: getText(
            "invalid_price_details",
            "Invalid Price Details",
            "v_inv_viewer_outbound_master",
          ),
          html: getText(
            "invalid_price_details_message",
            `Details with line numbers ${invalidLines} have invalid price values. Price must be numeric with up to 13 integer digits and up to 3 decimal digits. Please correct these before saving.`,
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: "OK",
        });
        return;
      }
    }

    return {
      outbound_master: {
        ...normalizedMaster,
        ship_to_code: normalizeStringValue(shipToCodeRaw),
        pick_type: null,
        owner_id: normalizeIntValue(ownerIdRaw),
        owner_code: normalizeStringValue(ownerCodeRaw),
        owner_name:
          masterData?.owner?.owner_name ??
          masterData?.owner_id?.owner_name ??
          masterData?.owner?.value ??
          "",
        order_type: normalizeStringValue(orderTypeRaw),
        order_status: normalizeStringValue(orderStatusRaw),
        warehouse_id: normalizeIntValue(warehouseIdRaw),
        warehouse: normalizeStringValue(warehouseRaw),
        customer_id: normalizeIntValue(customerIdRaw),
        customer_code: normalizeStringValue(customerCodeRaw),
        customer_name:
          masterData?.customer_code?.business_name ??
          masterData?.customer_code?.value ??
          masterData?.customer_name,
      },
      outbound_details: (details || []).map((detail, index) => ({
        outbound_detail_id: detail?.outbound_detail_id ?? null,
        line_number: normalizeStringValue(
          detail?.line_number ?? detail?.line ?? index + 1,
        ),
        item_master_id: parseItemMasterId(detail),
        item_number: normalizeStringValue(detail?.item_number) ?? "",
        item_description: normalizeStringValue(
          detail?.item_description ?? detail?.description,
        ),
        price: normalizePriceValue(detail?.price) ?? "0",
        item_uom_id: parseItemUomId(detail),
        uom: normalizeStringValue(detail?.uom) ?? "EA",
        quantity_order: formatDecimalValue(
          Number(detail?.quantity_order ?? detail?.qty_order ?? 0),
        ),
        quantity_pick: Number(detail?.quantity_pick ?? detail?.qty_pick ?? 0),
        quantity_stage: Number(
          detail?.quantity_stage ?? detail?.qty_stage ?? 0,
        ),
        quantity_ship: Number(detail?.quantity_ship ?? detail?.qty_ship ?? 0),
        inv_status:
          normalizeStringValue(detail?.inv_status ?? detail?.default_status) ??
          "Available",
        lot_number: normalizeStringValue(detail?.lot_number) ?? "",
        expiry_date: normalizeDateValue(detail?.expiry_date),
        serial_number: normalizeStringValue(detail?.serial_number) ?? "",
      })),
    };
  }, []);

  const handleDeleteOutboundDetail = useCallback(
    (rowId) => {
      if (canEditDetailLines) return;
      setOutboundDetails((prev) => {
        const remainingRows = prev.filter((row) => row.id !== rowId);

        if (remainingRows.length === 0) {
          return [createEmptyOutboundDetail(1)];
        }

        return remainingRows.map((row, index) => ({
          ...row,
          line: index + 1,
        }));
      });
    },
    [canEditDetailLines, createEmptyOutboundDetail],
  );

  const handleOutboundDetailChange = useCallback(
    (rowId, field, value) => {
      if (canEditDetailLines) return;
      startDetailTransition(() => {
        setOutboundDetails((prev) =>
          prev.map((row) => {
            if (row.id !== rowId) {
              return row;
            }

            if (field === "quantity_order") {
              const numericValue = Number(value || 1);

              return {
                ...row,
                qty_order: numericValue,
                quantity_order: numericValue,
              };
            }

            if (field === "price") {
              return {
                ...row,
                price:
                  value === undefined || value === null || value === ""
                    ? ""
                    : String(value).trim(),
              };
            }

            return {
              ...row,
              [field]: value,
            };
          }),
        );
      });
    },
    [canEditDetailLines, startDetailTransition],
  );
  const handleSave = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // if (currentScreen === "edit" && isEditStatusLocked) {
    //   BSAlertSwal2.fire({
    //     icon: "warning",
    //     title: "Edit is locked",
    //     text: "Outbound status is not Open. Editing is disabled.",
    //     confirmButtonText: "OK",
    //   });
    //   return;
    // }

    setOutboundDetails((prev) =>
      prev.map((row) => ({
        ...row,
        item_lookup_code_error: !(Number(row?.item_master_id) > 0),
        item_uom_id_error: !(Number(row?.item_uom_id) > 0),
      })),
    );
    const requiredMasterMessage =
      "Outbound master requires warehouse_id, warehouse, owner_id, owner_code, order_type, and order_status.";

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const getApiErrorPayload = (err, fallbackMessage) => {
      const validationErrors = err?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const sections = Object.entries(validationErrors)
          .map(([key, messages], index) => {
            const list = (messages || [])
              .map(
                (msg) =>
                  `<li style="margin:6px 0;line-height:1.45;text-align:left;">${escapeHtml(msg)}</li>`,
              )
              .join("");

            if (!list) return "";

            return `
                            <div style="margin:10px 0;padding:12px 14px;background:#fceaea;border-left:3px solid #ef4444;border-radius:8px;">
                                <div style="font-weight:700;color:#b91c1c;margin-bottom:6px;">📋 ${index + 1}. ${escapeHtml(key)}</div>
                                <ul style="margin:0 0 0 18px;padding:0;color:#2f2f2f;">${list}</ul>
                            </div>
                        `;
          })
          .filter(Boolean)
          .join("");

        if (sections) {
          return {
            title: "Please complete required fields",
            html: `<div style="text-align:left;margin-top:8px;">${sections}</div>`,
            confirmButtonText: "OK",
            confirmButtonColor: "#6b5ce7",
            width: 560,
          };
        }
      }

      return {
        title: "Save Failed",
        text:
          err?.response?.data?.message_text ||
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          fallbackMessage,
      };
    };

    const getApiErrorTitle = (err, fallbackTitle) => {
      const messageStatus = err?.response?.data?.message_status;
      if (
        typeof messageStatus === "string" &&
        messageStatus.toLowerCase() === "error"
      ) {
        return "Save Failed";
      }

      return fallbackTitle;
    };

    if (!validate()) {
      const missingFields = getMissingRequiredFieldLabels(formData);
      BSAlertSwal2.fire({
        icon: "warning",
        title: "Required fields are missing",
        html: `Please fill in: <b>${missingFields.join(", ") || "required fields"}</b>`,
        confirmButtonText: "OK",
      });
      return;
    }
    let effectiveMasterData = formData;
    try {
      effectiveMasterData = await resolveAutoWarehouseAndOwner(formData);
    } catch (error) {
      BSAlertSwal2.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.message ||
          "Failed to resolve default warehouse/owner before save.",
        confirmButtonText: "OK",
      });
      return;
    }

    const outboundPayload = buildOutboundPayload(
      effectiveMasterData,
      outboundDetails,
    );
    if (!outboundPayload) {
      return;
    }

    const outboundMaster = outboundPayload?.outbound_master ?? {};
    const hasRequiredMaster =
      Number(outboundMaster?.warehouse_id) > 0 &&
      String(outboundMaster?.warehouse ?? "").trim() !== "" &&
      Number(outboundMaster?.owner_id) > 0 &&
      String(outboundMaster?.owner_code ?? "").trim() !== "" &&
      String(outboundMaster?.order_type ?? "").trim() !== "" &&
      String(outboundMaster?.order_status ?? "").trim() !== "";

    const invalidItemRows = (outboundPayload?.outbound_details || [])
      .map((line, index) => ({ index, line }))
      .filter(({ line }) => !(Number(line?.item_master_id) > 0));

    const invalidUomRows = (outboundPayload?.outbound_details || [])
      .map((line, index) => ({ index, line }))
      .filter(({ line }) => !(Number(line?.item_uom_id) > 0));

    const droppedExistingIdRows =
      currentScreen === "edit"
        ? (outboundDetails || [])
            .map((line, index) => ({ index, line }))
            .filter(
              ({ line }) =>
                line?.is_existing && !(Number(line?.outbound_detail_id) > 0),
            )
        : [];

    if (!hasRequiredMaster) {
      BSAlertSwal2.fire({
        icon: "error",
        title: "Please complete required fields",
        html: `<div style="text-align:left;margin-top:8px;"><div style="margin:10px 0;padding:12px 14px;background:#fceaea;border-left:3px solid #ef4444;border-radius:8px;"><div style="font-weight:700;color:#b91c1c;margin-bottom:6px;">📋 request</div><ul style="margin:0 0 0 18px;padding:0;color:#2f2f2f;"><li style="margin:6px 0;line-height:1.45;text-align:left;">${requiredMasterMessage}</li></ul></div></div>`,
        confirmButtonText: "OK",
        confirmButtonColor: "#6b5ce7",
        width: 560,
      });
      return;
    }

    if (invalidItemRows.length > 0) {
      const rowsHtml = invalidItemRows
        .map(
          ({ index, line }) =>
            `<li style="margin:6px 0;line-height:1.45;text-align:left;">Row ${escapeHtml(line?.line_number ?? index + 1)}: item_number is missing/invalid</li>`,
        )
        .join("");

      BSAlertSwal2.fire({
        icon: "error",
        title: "Please complete required fields",
        html: `<div style="text-align:left;margin-top:8px;"><div style="margin:10px 0;padding:12px 14px;background:#fceaea;border-left:3px solid #ef4444;border-radius:8px;"><div style="font-weight:700;color:#b91c1c;margin-bottom:6px;">📋Outbound Detail Item Number </div><ul style="margin:0 0 0 18px;padding:0;color:#2f2f2f;">${rowsHtml}</ul></div></div>`,
        confirmButtonText: "OK",
        confirmButtonColor: "#6b5ce7",
        width: 560,
      });
      return;
    }

    if (invalidUomRows.length > 0) {
      const rowsHtml = invalidUomRows
        .map(
          ({ index, line }) =>
            `<li style="margin:6px 0;line-height:1.45;text-align:left;">Row ${escapeHtml(line?.line_number ?? index + 1)}: item_uom_id is missing/invalid</li>`,
        )
        .join("");

      BSAlertSwal2.fire({
        icon: "error",
        title: "Please complete required fields",
        html: `<div style="text-align:left;margin-top:8px;"><div style="margin:10px 0;padding:12px 14px;background:#fceaea;border-left:3px solid #ef4444;border-radius:8px;"><div style="font-weight:700;color:#b91c1c;margin-bottom:6px;">📋 Outbound Detail Item UOM</div><ul style="margin:0 0 0 18px;padding:0;color:#2f2f2f;">${rowsHtml}</ul></div></div>`,
        confirmButtonText: "OK",
        confirmButtonColor: "#6b5ce7",
        width: 560,
      });
      return;
    }

    if (droppedExistingIdRows.length > 0) {
      const rowsHtml = droppedExistingIdRows
        .map(
          ({ index, line }) =>
            `<li style="margin:6px 0;line-height:1.45;text-align:left;">Row ${escapeHtml(line?.line ?? index + 1)}: outbound detail is missing (existing line)</li>`,
        )
        .join("");

      BSAlertSwal2.fire({
        icon: "error",
        title: "Edit data mismatch",
        html: `<div style="text-align:left;margin-top:8px;"><div style="margin:10px 0;padding:12px 14px;background:#fceaea;border-left:3px solid #ef4444;border-radius:8px;"><div style="font-weight:700;color:#b91c1c;margin-bottom:6px;">📋 Outbound Detail Item Number</div><ul style="margin:0 0 0 18px;padding:0;color:#2f2f2f;">${rowsHtml}</ul></div></div>`,
        confirmButtonText: "OK",
        confirmButtonColor: "#6b5ce7",
        width: 560,
      });
      return;
    }

    if (currentScreen === "add") {
      try {
        const newOutbound = await InsertOutbound(outboundPayload);
        if (!newOutbound) {
          BSAlertSwal2.fire({
            icon: "error",
            title: getText(
              "creation_failed",
              "Creation Failed",
              "v_inv_viewer_outbound_master",
            ),
            text: getText(
              "failed_create_outbound_order",
              "Failed to create outbound order.",
              "v_inv_viewer_outbound_master",
            ),
            confirmButtonText: getText(
              "ok",
              "OK",
              "v_inv_viewer_outbound_master",
            ),
          });
          return;
        }

        const responsePayload = newOutbound?.data ?? newOutbound;
        const createdOutboundMasterId = Number(
          responsePayload?.outbound_master?.outbound_master_id ??
            responsePayload?.outbound_master_id ??
            responsePayload?.id ??
            responsePayload?.data?.outbound_master?.outbound_master_id ??
            responsePayload?.data?.outbound_master_id ??
            outboundPayload?.outbound_master?.outbound_master_id ??
            0,
        );

        let loadedMaster =
          responsePayload?.outbound_master ??
          responsePayload?.data?.outbound_master ??
          null;
        let loadedDetails =
          responsePayload?.outbound_details ??
          responsePayload?.data?.outbound_details ??
          [];

        if (createdOutboundMasterId > 0) {
          try {
            const reloadResponse = await GetOutbound(createdOutboundMasterId);
            const isReloadSuccess =
              reloadResponse?.message_code === "000" ||
              reloadResponse?.message_code === "0" ||
              reloadResponse?.message_code === 0 ||
              reloadResponse?.message_code === "success";

            if (isReloadSuccess) {
              loadedMaster =
                reloadResponse?.data?.outbound_master ?? loadedMaster;
              loadedDetails =
                reloadResponse?.data?.outbound_details ??
                loadedMaster?.outbound_details ??
                loadedMaster?.lines ??
                loadedDetails;
            }
          } catch {
            // Keep using insert response payload when reload fails.
          }
        }

        if (loadedMaster) {
          const mappedMaster = mapMasterToEditForm(loadedMaster);
          const preloadOwnerId =
            mappedMaster?.owner_id?.owner_id ??
            mappedMaster?.owner_id?.code ??
            mappedMaster?.owner_id ??
            "";
          previousOwnerIdRef.current = preloadOwnerId;

          setFormData((prev) => ({
            ...prev,
            ...mappedMaster,
          }));
          setOutboundDetails(normalizeOutboundDetails(loadedDetails));
        } else {
          // Fallback: keep current values, but pin the created id and continue in edit mode.
          if (createdOutboundMasterId > 0) {
            setFormData((prev) => ({
              ...prev,
              outbound_master_id: createdOutboundMasterId,
            }));
          }
        }

        setSameAsCustomer(false);
        setSummaryExpanded(true);
        setOrderHeaderExpanded(true);
        // setActiveTab("outbound");
        setCurrentScreen("edit");

        BSAlertSwal2.fire({
          icon: "success",
          title: getText(
            "outbound_created",
            "Outbound Created",
            "v_inv_viewer_outbound_master",
          ),
          text: getText(
            "outbound_created_success",
            "The outbound order has been created successfully.",
            "v_inv_viewer_outbound_master",
          ),
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      } catch (err) {
        const errorContent = getApiErrorPayload(
          err,
          getText(
            "failed_create_outbound_order",
            "Failed to create outbound order.",
            "v_inv_viewer_outbound_master",
          ),
        );
        BSAlertSwal2.fire({
          icon: "error",
          title: getApiErrorTitle(
            err,
            getText(
              "creation_failed",
              "Creation Failed",
              "v_inv_viewer_outbound_master",
            ),
          ),
          ...errorContent,
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }
    } else if (currentScreen === "edit") {
      try {
        let countDefaultOutboundDetails = 0;
        const outboundMasterId =
          formData?.outbound_master_id ??
          outboundPayload?.outbound_master?.outbound_master_id;
        const updatedOutbound = await UpdateOutbound(
          outboundMasterId,
          outboundPayload,
        );
        if (!updatedOutbound) {
          BSAlertSwal2.fire({
            icon: "error",
            title: getText(
              "update_failed",
              "Update Failed",
              "v_inv_viewer_outbound_master",
            ),
            text: getText(
              "failed_update_outbound_order",
              "Failed to update outbound order.",
              "v_inv_viewer_outbound_master",
            ),
            confirmButtonText: getText(
              "ok",
              "OK",
              "v_inv_viewer_outbound_master",
            ),
          });
          return;
        }

        const responsePayload = updatedOutbound?.data ?? updatedOutbound;
        let loadedMaster =
          responsePayload?.outbound_master ??
          responsePayload?.data?.outbound_master ??
          null;
        let loadedDetails =
          responsePayload?.outbound_details ??
          responsePayload?.data?.outbound_details ??
          [];

        if (Number(outboundMasterId) > 0) {
          try {
            const reloadResponse = await GetOutbound(outboundMasterId);
            const isReloadSuccess =
              reloadResponse?.message_code === "000" ||
              reloadResponse?.message_code === "0" ||
              reloadResponse?.message_code === 0 ||
              reloadResponse?.message_code === "success";

            if (isReloadSuccess) {
              loadedMaster =
                reloadResponse?.data?.outbound_master ?? loadedMaster;
              loadedDetails =
                reloadResponse?.data?.outbound_details ??
                loadedMaster?.outbound_details ??
                loadedMaster?.lines ??
                loadedDetails;
              countDefaultOutboundDetails =
                reloadResponse?.data?.outbound_details?.length ?? 0;
            }
          } catch {
            // Keep using the update response payload when reload fails.
          }
        }

        if (loadedMaster) {
          const mappedMaster = mapMasterToEditForm(loadedMaster);
          const preloadOwnerId =
            mappedMaster?.owner_id?.owner_id ??
            mappedMaster?.owner_id?.code ??
            mappedMaster?.owner_id ??
            "";
          previousOwnerIdRef.current = preloadOwnerId;

          setFormData((prev) => ({
            ...prev,
            ...mappedMaster,
          }));
          setOutboundDetails(normalizeOutboundDetails(loadedDetails));
        } else if (Number(outboundMasterId) > 0) {
          setFormData((prev) => ({
            ...prev,
            outbound_master_id: Number(outboundMasterId),
          }));
        }

        setSameAsCustomer(false);
        setSummaryExpanded(true);
        setOrderHeaderExpanded(true);
        // setActiveTab("outbound");

        BSAlertSwal2.fire({
          icon: "success",
          title: getText(
            "outbound_updated",
            "Outbound Updated",
            "v_inv_viewer_outbound_master",
          ),
          text:
            getText(
              "outbound_updated_success",
              "The outbound order has been updated successfully.",
              "v_inv_viewer_outbound_master",
            ) +
            " " +
            (countDefaultOutboundDetails > 0
              ? `[${countDefaultOutboundDetails - defualtOutboundDetailsCount}]`
              : "[0]"),
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      } catch (err) {
        const errorContent = getApiErrorPayload(
          err,
          getText(
            "failed_update_outbound_order",
            "Failed to update outbound order.",
            "v_inv_viewer_outbound_master",
          ),
        );
        BSAlertSwal2.fire({
          icon: "error",
          title: getApiErrorTitle(
            err,
            getText(
              "update_failed",
              "Update Failed",
              "v_inv_viewer_outbound_master",
            ),
          ),
          ...errorContent,
          confirmButtonText: getText(
            "ok",
            "OK",
            "v_inv_viewer_outbound_master",
          ),
        });
        return;
      }
    } else {
      BSAlertSwal2.fire({
        icon: "error",
        title: getText(
          "invalid_operation",
          "Invalid Operation",
          "v_inv_viewer_outbound_master",
        ),
        text: getText(
          "save_operation_not_valid",
          "Save operation is not valid in the current screen.",
          "v_inv_viewer_outbound_master",
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
      return;
    }
  };

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleOpenDeleteDialog = (row) => {
    setDeleteTarget(row || null);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    const targetId = deleteTarget?.id ?? deleteTarget?.outbound_master_id;
    if (!targetId) {
      handleCancelDelete();
      return;
    }

    handleCancelDelete();

    try {
      const result = await DeleteOutbound(targetId);
      const message =
        result.data.message_code === "000" ||
        result.data.message_code === "0" ||
        result.data.message_code === 0 ||
        result.data.message_code === "success"
          ? getText(
              "outbound_deleted_success",
              "Outbound deleted successfully.",
              "v_inv_viewer_outbound_master",
            )
          : "Outbound deletion completed with issues.";
      await refreshOutboundGrid();
      showActionSuccess(message);
      BSAlertSwal2.fire({
        icon: "success",
        title: getText(
          "delete_success",
          "Delete Success",
          "v_inv_viewer_outbound_master",
        ),
        text: message,
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
    } catch (err) {
      BSAlertSwal2.fire({
        icon: "error",
        title: getText(
          "delete_failed",
          "Delete Failed",
          "v_inv_viewer_outbound_master",
        ),
        text: getActionErrorMessage(
          err,
          getText(
            "failed_delete_outbound",
            "Failed to delete outbound.",
            "v_inv_viewer_outbound_master",
          ),
        ),
        confirmButtonText: getText("ok", "OK", "v_inv_viewer_outbound_master"),
      });
    }
  };

  const outboundColumnDefs = useMemo(
    () => [
      { field: "outbound_master_id", hide: true },
      { field: "unrelease", hide: true },
      { field: "unrelease_user", hide: true },
      {
        field: "process",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const raw = Number(params.value || 0);
          const value = raw <= 1 ? raw * 100 : raw;
          const progressValue = Math.max(0, Math.min(100, value));
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
                height: "100%",
              }}
            >
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  width: 80,
                  height: 6,
                  borderRadius: 5,
                  backgroundColor: "#e0e0e0",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 5,
                    backgroundColor:
                      progressValue >= 0 && progressValue <= 49
                        ? "#e20015"
                        : progressValue < 100
                          ? "#ffcd00"
                          : "#619c18",
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {Math.round(progressValue)}%
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "order_status",
        width: 140,
        renderCell: (params) => {
          return (
            <Chip
              size="small"
              label={getLocalizedOrderStatus(params.value)}
              sx={{
                ...getStatusChipStyles(params.value),
                backgroundColor: "transparent",
                border: "none",
                minWidth: 96,
                "& .MuiChip-label": { fontWeight: 700 },
              }}
            />
          );
        },
      },
      {
        field: "outbound_order_number",
        width: 200,
        renderCell: (params) => (
          <Typography
            component="span"
            sx={{ color: "#3b56c5", fontWeight: 700 }}
          >
            {params.value}
          </Typography>
        ),
      },
      { field: "order_type", width: 130 },
      {
        field: "order_date",
        width: 130,
        renderCell: (params) => formatDateDisplay(params.value),
      },
      { field: "customer_name", width: 200 },
      {
        field: "customer_purchase_order",
        width: 220,
      },
      {
        field: "delivery_date_plan",
        width: 150,
        renderCell: (params) => formatDateDisplay(params.value),
      },
      {
        field: "ship_date_plan",
        width: 150,
        renderCell: (params) => formatDateDisplay(params.value),
      },
      { field: "pick_type", width: 130 },
      { field: "create_by", width: 150 },
      {
        field: "create_date",
        width: 170,
        renderCell: (params) => formatDateTimeDisplay(params.value),
      },
      { field: "update_by", width: 150 },
      {
        field: "update_date",
        width: 170,
        renderCell: (params) => formatDateTimeDisplay(params.value),
      },
      {
        field: "release",
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (params.row?.release === 1) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleRelease(params.row, true)}
                  sx={{ py: 0.25, lineHeight: 1 }}
                >
                  {getText("Release")}
                </Button>
              </Box>
            );
          } else if (params.row?.unrelease === 1) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleRelease(params.row, false)}
                  sx={{ py: 0.25, lineHeight: 1 }}
                >
                  {getText("Unrelease")}
                </Button>
              </Box>
            );
          }
        },
      },
      {
        field: "release_user",
        hide: false,
        sortable: false,
        filterable: false,
        width: 150,
        renderCell: (params) => {
          if (params.row?.release_user === 1) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleReleaseUser(params.row, true)}
                  sx={{ py: 0.25, lineHeight: 1 }}
                >
                  {getText("Release User")}
                </Button>
              </Box>
            );
          } else if (params.row?.unrelease_user === 1) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleReleaseUser(params.row, false)}
                  sx={{ py: 0.25, lineHeight: 1 }}
                >
                  {getText("Unrelease User")}
                </Button>
              </Box>
            );
          }
        },
      },
      {
        field: "warehouse_id",
        hide: true,
      },
      { field: "customer_id", hide: true },
      { field: "warehouse", hide: true },
      { field: "customer_order_number", hide: true },
      { field: "owner_id", hide: true },
    ],
    [
      getLocalizedOrderStatus,
      getStatusChipStyles,
      formatDateDisplay,
      formatDateTimeDisplay,
      isBlindPickOrderType,
      isStatusIn,
      getText,
      handleRelease,
      handleReleaseUser,
    ],
  );

  // LIST VIEW
  const renderListView = () => (
    <Box
      sx={{
        p: 2.5,
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {releaseSuccess && (
          <Box
            sx={{
              position: "fixed",
              top: "5rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
          >
            <Chip
              icon={<CheckCircleIcon sx={{ color: "white !important" }} />}
              label={`✓ ${releaseSuccess}`}
              sx={{
                backgroundColor: "#16a34a",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                height: 36,
                px: 1,
                boxShadow: 3,
              }}
            />
          </Box>
        )}
      </Box> */}

      <Paper
        sx={{
          //   p: 2,
          // mb: 3,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          ref={gridRef}
          bsLocale={lang}
          bsPreObj="inv"
          bsObj="v_inv_viewer_outbound_master"
          bsCols="
                    outbound_master_id
                    ,process
                    ,detail_lines
                    ,release
                    ,release_user
                    ,unrelease
                    ,unrelease_user
                    ,order_status
                    ,outbound_order_number
                    ,order_type
                    ,order_date
                    ,customer_name
                    ,customer_purchase_order
                    ,delivery_date_plan
                    ,ship_date_plan
                    ,pick_type
                    ,create_by
                    ,create_date
                    ,update_by
                    ,update_date
                    ,warehouse_id
                    ,warehouse
                    ,customer_id
                    ,customer_order_number
                    ,owner_id"
          bsObjBy="create_date desc"
          bsShowDescColumn={false}
          showAdd={true}
          density={density}
          onAdd={handleAddOutbound}
          onEdit={handleEditOutbound}
          onDelete={(id) => handleOpenDeleteDialog({ outbound_master_id: id })}
          bsKeyId="outbound_master_id"
          bsColumnDefs={outboundColumnDefs}
          bsComboBox={[
            {
              Column: "order_status",
              Display: "display_member",
              Value: "value_member",
              Default: "--- Select Order Status ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name= 'outbound_order_status' AND is_active=1",
              ObjBy: "display_sequence asc",
            },
          ]}
          bsRowConfig={(row) => ({
            showDelete: isStatusIn(row?.order_status, ["open", "Open"]),
            showEdit: true,
          })}
        />
      </Paper>
    </Box>
  );

  // ADD OUTBOUND VIEW
  const renderAddView = () => (
    <Box sx={{ p: 2.5, width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            size="small"
            onClick={handleBackToList}
            title="Back to list"
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Typography variant="h4" fontWeight={700}>
                {getText("Add_Outbound_Order", "Add Outbound Order")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
                fontSize="0.95rem"
              >
                {getText(
                  "Add_Outbound_Order_Description",
                  "Create a new outbound order document",
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <OrderHeaderSection
        currentScreen={currentScreen}
        values={orderHeaderValues}
        errors={orderHeaderErrors}
        updateField={updateField}
        lang={lang}
        isEdit={false}
        variantValue={orderHeaderValues.variant || "outlined"}
        expanded={orderHeaderExpanded}
        onToggleExpand={() => setOrderHeaderExpanded((prev) => !prev)}
        getResourceByGroupAndName={getResourceByGroupAndName}
        getText={getText}
      />

      {/* Tabs */}
      <Card sx={{ mb: 2.5, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={(e, value) => handleTabChange(value)}
          >
            <Tab
              label={getText("Tab_Customer_ShipTo", "Customer / Ship To")}
              value="customer"
            />
            <Tab
              label={getText("Tab_Order_Detail", "Order Detail")}
              value="order"
            />
            <Tab
              label={getText("Tab_Outbound_Detail", "Outbound Detail")}
              value="outbound"
            />
            <Tab
              label={getText("Tab_User_Defined", "User Defined")}
              value="userdef"
            />
          </Tabs>
        </Box>

        <CardContent sx={{ pt: 2 }}>
          {activeTab === "customer" && (
            <CustomerShipToSection
              values={customerShipToValues}
              errors={customerShipToErrors}
              updateField={updateField}
              lang={lang}
              isEdit={false}
              variantValue={customerShipToValues.variant || "outlined"}
              sameAsCustomer={sameAsCustomer}
              onSameAsCustomerChange={setSameAsCustomer}
              selectedOwnerId={selectedOwnerId}
              orderHeader={orderHeaderValues}
              getResourceByGroupAndName={getResourceByGroupAndName}
              getText={getText}
            />
          )}

          {activeTab === "order" && (
            <OrderDetailSection
              values={orderDetailValues}
              errors={orderDetailErrors}
              updateField={updateField}
              lang={lang}
              isEdit={false}
              variantValue={orderDetailValues.variant || "outlined"}
              isEditStatusLocked={false}
              currentStatus={currentStatus}
              isStatusIn={isStatusIn}
              getResourceByGroupAndName={getResourceByGroupAndName}
              getText={getText}
            />
          )}

          {activeTab === "outbound" && (
            <OutboundDetailSection
              details={outboundDetails}
              updateField={updateField}
              lang={lang}
              isEdit={!canEditDetailLines}
              variantValue={"outlined"}
              getText={getText}
              canEditDetailLines={canEditDetailLines}
              setOutboundDetails={setOutboundDetails}
              createEmptyOutboundDetail={createEmptyOutboundDetail}
              handleOutboundDetailChange={handleOutboundDetailChange}
              handleDeleteOutboundDetail={handleDeleteOutboundDetail}
              normalizeUomOptions={normalizeUomOptions}
              startDetailTransition={startDetailTransition}
              onRefreshData={handleRefreshOutboundData}
              isRefreshingData={isRefreshingData}
            />
          )}
          {activeTab === "userdef" && (
            <UserDefinedSection
              values={userDefinedValues}
              errors={userDefinedErrors}
              updateField={updateField}
              lang={lang}
              isEdit={false}
              variantValue={userDefinedValues.variant || "outlined"}
              orderHeader={orderHeaderValues}
              getText={getText}
            />
          )}
        </CardContent>
      </Card>

      {/* Sticky Action Bar */}
      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 100,
          borderTop: "1px solid",
          borderColor: "divider",
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "background.paper",
          borderRadius: 2,
        }}
      >
        {/* <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InfoIcon sx={{ color: "text.secondary" }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {getText("required_fields", "Required fields are marked with", "v_inv_viewer_outbound_master")}{" "}
            <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
        </Box> */}
        <Box sx={{ display: "flex", gap: 1.5, ml: "auto" }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={ACTION_BUTTON_THEMES.close}
            onClick={handleBackToList}
          >
            {getText("back", "Back")}
          </Button>
          <Button
            variant="contained"
            sx={ACTION_BUTTON_THEMES.success}
            onClick={handleSave}
            startIcon={<SaveOutlinedIcon />}
          >
            {getText("Save", "Save")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  // EDIT OUTBOUND VIEW
  const renderEditView = () => {
    const createByKey = String(
      formData?.create_by ?? formData?.createBy ?? "",
    ).trim();
    const updateByKey = String(
      formData?.update_by ?? formData?.updateBy ?? "",
    ).trim();
    const createByDisplay = createByKey
      ? userFullNameMap[createByKey] || createByKey
      : "-";
    const updateByDisplay = updateByKey
      ? userFullNameMap[updateByKey] || updateByKey
      : "-";
    const createDateDisplay = formatDateTimeDisplay(
      formData?.create_date ?? formData?.createDate,
    );
    const updateDateDisplay = formatDateTimeDisplay(
      formData?.update_date ?? formData?.updateDate,
    );

    return (
      <Box sx={{ p: 2.5, width: "100%", maxWidth: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2.25,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <IconButton
              size="small"
              onClick={handleBackToList}
              title="Back to list"
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Typography variant="h4" fontWeight={700}>
                  {getText("Edit_Outbound_Order", "Edit Outbound Order")}{" "}
                  {formData?.outbound_order_number || "-"}
                </Typography>
              </Box>
              <Typography color="text.secondary" fontSize="0.95rem">
                ·{" "}
                {getText(
                  "create_by",
                  "Create by",
                  "v_inv_viewer_outbound_master",
                )}{" "}
                {createByDisplay} {createDateDisplay}{" "}
                {updateByDisplay !== "-" &&
                  `· ${getText("update_by", "Update by", "v_inv_viewer_outbound_master")} ${updateByDisplay} ${updateDateDisplay}`}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <ButtonGroup variant="outlined">
              <Button
                startIcon={<PrintIcon />}
                onClick={() => handleReportClick(OUTBOUND_REPORTS[0])}
              >
                {getText("Print", "Print")}
              </Button>
              <Button
                size="small"
                aria-label="select report"
                aria-controls={
                  reportMenuAnchor ? "outbound-report-menu" : undefined
                }
                aria-expanded={reportMenuAnchor ? "true" : undefined}
                aria-haspopup="menu"
                onClick={(event) => setReportMenuAnchor(event.currentTarget)}
              >
                <ArrowDropDownIcon />
              </Button>
            </ButtonGroup>
            {/* <Button variant="outlined" onClick={handleRefreshOutboundData}>
              <RefreshIcon />
            </Button> */}
            <Menu
              id="outbound-report-menu"
              anchorEl={reportMenuAnchor}
              open={Boolean(reportMenuAnchor)}
              onClose={handleReportMenuClose}
            >
              {OUTBOUND_REPORTS.map((report) => (
                <MenuItem
                  key={report.code}
                  onClick={() => handleReportClick(report)}
                >
                  {getText(report.label, report.label)}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
        {/* Info Banner */}

        <TransactionTotalSummary
          summaryExpanded={summaryExpanded}
          onToggleExpand={() => setSummaryExpanded((prev) => !prev)}
          lang={lang}
          formattedDate={formattedCreateDate}
          statusProgressLabel={getText("Status_Progress", "Outbound Progress")}
          shipQuantityLabel="Ship Quantity"
          activeStep={
            currentStatus === "closed"
              ? outboundProgressSteps.length
              : getOutboundStatusStepIndex(currentStatus)
          }
          steps={outboundProgressSteps}
          summary={outboundSummary}
          receiveQuantityLabel="Ship Quantity"
          decimalPlaces={Config.SCALE ?? 0}
        />

        <OrderHeaderSection
          currentScreen={currentScreen}
          values={orderHeaderValues}
          errors={orderHeaderErrors}
          updateField={updateField}
          lang={lang}
          isEdit={!canEditHeader}
          variantValue={orderHeaderValues.variant || "outlined"}
          expanded={orderHeaderExpanded}
          onToggleExpand={() => setOrderHeaderExpanded((prev) => !prev)}
          getResourceByGroupAndName={getResourceByGroupAndName}
          getText={getText}
        />

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(e, value) => handleTabChange(value)}
            >
              <Tab
                label={getText("Tab_Customer_ShipTo", "Customer / Ship To")}
                value="customer"
              />
              <Tab
                label={getText("Tab_Order_Detail", "Order Detail")}
                value="order"
              />
              <Tab
                label={getText("Tab_Outbound_Detail", "Outbound Detail")}
                value="outbound"
              />
              <Tab
                label={getText("Tab_Pick_Detail", "Pick Detail")}
                value="pick"
              />
              <Tab
                label={getText("Tab_User_Defined", "User Defined")}
                value="userdef"
              />
            </Tabs>
          </Box>

          <CardContent>
            {activeTab === "customer" && (
              <CustomerShipToSection
                values={customerShipToValues}
                errors={customerShipToErrors}
                updateField={updateField}
                lang={lang}
                isEdit={!canEditHeader}
                variantValue={customerShipToValues.variant || "outlined"}
                sameAsCustomer={sameAsCustomer}
                onSameAsCustomerChange={setSameAsCustomer}
                selectedOwnerId={selectedOwnerId}
                orderHeader={orderHeaderValues}
                getResourceByGroupAndName={getResourceByGroupAndName}
                getText={getText}
              />
            )}

            {activeTab === "order" && (
              <OrderDetailSection
                values={orderDetailValues}
                errors={orderDetailErrors}
                updateField={updateField}
                lang={lang}
                isEdit={!canEditHeader}
                variantValue={orderDetailValues.variant || "outlined"}
                isEditStatusLocked={false}
                currentStatus={currentStatus}
                isStatusIn={isStatusIn}
                getResourceByGroupAndName={getResourceByGroupAndName}
                getText={getText}
              />
            )}

            {activeTab === "outbound" && (
              <OutboundDetailSection
                details={outboundDetails}
                updateField={updateField}
                lang={lang}
                isEdit={!canEditDetailLines}
                variantValue={"outlined"}
                getText={getText}
                canEditDetailLines={canEditDetailLines}
                setOutboundDetails={setOutboundDetails}
                createEmptyOutboundDetail={createEmptyOutboundDetail}
                handleOutboundDetailChange={handleOutboundDetailChange}
                handleDeleteOutboundDetail={handleDeleteOutboundDetail}
                normalizeUomOptions={normalizeUomOptions}
                startDetailTransition={startDetailTransition}
                onRefreshData={handleRefreshOutboundData}
                isRefreshingData={isRefreshingData}
              />
            )}
            {activeTab === "pick" && (
              <PickDetailSection
                header={pickHeader}
                details={pickDetails}
                updateField={updateField}
                lang={lang}
                isEdit={canEditHeader}
                variantValue={"outlined"}
                getText={getText}
                getStatusChipStyle={getStatusChipStyle}
                getLocalizedOrderStatus={getLocalizedOrderStatus}
                onRefreshData={handleRefreshOutboundData}
                isRefreshingData={isRefreshingData}
              />
            )}
            {activeTab === "userdef" && (
              <UserDefinedSection
                values={userDefinedValues}
                errors={userDefinedErrors}
                updateField={updateField}
                lang={lang}
                isEdit={!canEditHeader}
                variantValue={userDefinedValues.variant || "outlined"}
                orderHeader={orderHeaderValues}
                getText={getText}
              />
            )}
          </CardContent>
        </Card>

        <Paper
          elevation={3}
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 100,
            borderTop: "1px solid",
            borderColor: "divider",
            px: 2.5,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "background.paper",
            borderRadius: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            {canShowConfirmShipAction && (
              <Button
                variant="contained"
                sx={ACTION_BUTTON_THEMES.info}
                startIcon={<LocalShippingIcon />}
                onClick={handleConfirmShip}
              >
                {getText("Confirm_Ship", "Confirm Ship")}
              </Button>
            )}
            {currentStatus === "open" && (
              <Button
                variant="contained"
                sx={ACTION_BUTTON_THEMES.warning}
                startIcon={<CancelIcon />}
                onClick={handleCancelOrder}
              >
                {getText("Cancel_Order", "Cancel Order")}
              </Button>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshOutlinedIcon />}
              onClick={handleRefreshOutboundData}
              sx={ACTION_BUTTON_THEMES.clear}
            >
              {getText("Refresh", "Refresh")}
            </Button>
            <Button
              onClick={handleBackToList}
              variant="contained"
              startIcon={<ArrowBackIcon />}
              sx={ACTION_BUTTON_THEMES.close}
            >
              {getText("Back", "Back")}
            </Button>
            <Button
              type="button"
              variant="contained"
              sx={ACTION_BUTTON_THEMES.success}
              onClick={handleSave}
              startIcon={<SaveOutlinedIcon />}
              disabled={!canEditHeader}
            >
              {getText("Save", "Save")}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };
  return (
    <Paper
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor:
          currentScreen !== "list" ? "transparent" : "background.paper",
        boxShadow: currentScreen !== "list" ? "none" : "default",
      }}
    >
      {isRefreshingData && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.24)",
            backdropFilter: "blur(2px)",
          }}
        >
          <Box
            elevation={8}
            sx={{
              minWidth: { xs: 260, sm: 320 },
              px: 3,
              py: 2.5,
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            <CircularProgress size={34} thickness={4.5} sx={{ mb: 1.5 }} />
          </Box>
        </Box>
      )}
      {currentScreen === "list" && renderListView()}
      {currentScreen === "add" && renderAddView()}
      {currentScreen === "edit" && renderEditView()}

      <ReportPreviewDialog
        open={reportPreview.open}
        onClose={handleReportPreviewClose}
        title={reportPreview.title}
        reportCode={reportPreview.reportCode}
        parameters={reportPreview.parameters}
        lang={lang}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 1,
          },
        }}
      >
        <DialogContent sx={{ pt: 3, pb: 2.5, textAlign: "center" }}>
          <Box
            sx={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: "3px solid #f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "#f59e0b",
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              !
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
            {getText(
              "delete_confirmation",
              "Delete Confirmation",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            {getText(
              "delete_confirmation_message",
              "Are you sure you want to delete this record?",
              "v_inv_viewer_outbound_master",
            )}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCancelDelete}
              sx={{
                ...ACTION_BUTTON_THEMES.close,
                minWidth: 150,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {getText("cancel", "Cancel", "v_inv_viewer_outbound_master")}
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmDelete}
              sx={{
                ...ACTION_BUTTON_THEMES.error,
                minWidth: 150,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {getText(
                "yes_delete_it",
                "Yes, delete it!",
                "v_inv_viewer_outbound_master",
              )}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <PickListConfirmDialog
        open={IsConfirmPickList}
        Close={() => setIsConfirmPickList(false)}
        pickList={pickList}
        ReleaseOutbound={ReleaseOutbound}
        buildActionRequest={buildActionRequest}
        getActionResultMessage={getActionResultMessage}
        isActionErrorResult={isActionErrorResult}
        showActionSuccess={showActionSuccess}
        getText={getText}
      />
    </Paper>
  );
};

export default Outbound;
