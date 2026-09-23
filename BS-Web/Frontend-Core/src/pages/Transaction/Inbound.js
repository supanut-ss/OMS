import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Paper,
  Chip,
  Collapse,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
  useTheme,
} from "@mui/material";
import BSTextField from "../../components/BSTextField";
import CloseIcon from "@mui/icons-material/Close";
import { Delete } from "@mui/icons-material";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SubjectOutlinedIcon from "@mui/icons-material/SubjectOutlined";
import AddIcon from "@mui/icons-material/Add";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BSDataGridClient, BSDataGrid } from "../../components/BSDataGrid";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSDatepicker from "../../components/BSDatepicker";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../config/dateConfig";
import SecureStorage from "../../utils/SecureStorage";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import ReportPreviewDialog from "../../components/ReportViewer/ReportPreviewDialog";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import TransactionTotalSummary from "./components/TransactionTotalSummary";
import { ButtonConfigs } from "../../utils/ButtonConfigs";
dayjs.extend(customParseFormat);

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const getEnvDecimalPlaces = () => {
  const envVal = process.env.REACT_APP_DECIMAL_PLACES;
  if (envVal !== undefined && envVal !== null && envVal !== "") {
    const parsed = parseInt(envVal, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 2;
};

const DECIMAL_PLACES = getEnvDecimalPlaces();

const formatDecimalValue = (value, decimalPlaces = DECIMAL_PLACES) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }
  return numericValue.toFixed(decimalPlaces);
};

const getStatusPalette = (status) => {
  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus === "OPEN") {
    return { text: "#2f6fed", border: "#b8cdfd", bg: "#eaf1ff" };
  }
  if (normalizedStatus === "RECEIVING") {
    return { text: "#f59e0b", border: "#f6d39c", bg: "#fff6e8" };
  }
  return { text: "#64748b", border: "#d1d5db", bg: "#f1f3f5" };
};

const INBOUND_REPORTS = [
  {
    code: "InboundReceipt",
    label: "Inbound Receipt",
    path: "/reports/inbound-receipt",
  },
  {
    code: "InboundOrderReceiveSummary",
    label: "Inbound Order Receive Summary",
    path: "/reports/inbound-order-receive-summary",
  },
];

const INBOUND_STICKER_REPORT = {
  code: "StickerInboundItem",
  label: "Print Sticker",
};

const bsAutoCompleteDisabledSx = {
  "& .MuiInputBase-input.Mui-disabled": {
    color: "#9ca3af",
    WebkitTextFillColor: "#9ca3af",
  },
  "& .MuiSvgIcon-root.Mui-disabled": {
    color: "#c4c4c4",
  },
};

const getStatusStepIndex = (status) => {
  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus === "RECEIVING") return 1;
  if (normalizedStatus === "CLOSED") return 2;
  return 0;
};

const isFullControlEnabled = (value) =>
  String(value || "")
    .trim()
    .toUpperCase() === "FULL";

const hasSerialValue = (value) => String(value ?? "").trim() !== "";

const isQtyLockedBySnControl = (line) =>
  isFullControlEnabled(line?.sn_control) && hasSerialValue(line?.serial_number);

const isNewDetailLine = (line) => !line?.inbound_detail_id;

const getStoredUserInfo = () => {
  const raw = SecureStorage.get("userInfo");
  let userInfo = raw;

  if (typeof raw === "string") {
    try {
      userInfo = JSON.parse(raw);
    } catch {
      userInfo = {};
    }
  }

  const firstName = userInfo?.FirstName || userInfo?.firstName || "";
  const lastName = userInfo?.LastName || userInfo?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    raw: userInfo || {},
    userId:
      userInfo?.UserId ||
      userInfo?.userId ||
      userInfo?.user_id ||
      userInfo?.username ||
      "system",
    userName:
      fullName ||
      userInfo?.UserName ||
      userInfo?.username ||
      userInfo?.user_name ||
      userInfo?.Name ||
      "Current User",
    device: userInfo?.device || null,
  };
};

const initialForm = {
  inbound_master_id: "",
  inbound_no: "",
  order_type: "",
  order_status: "Open",
  order_date: null,
  expected_delivery: null,
  supplier: "",
  supplier_id: "",
  customer: "",
  customer_id: "",
  description: "",
  remark: "",
  create_by: "",
  create_date: "",
  progress: 0,
  user_def_1: "",
  user_def_2: "",
  user_def_3: "",
  user_def_4: "",
  user_def_5: "",
  user_def_6: "",
  user_def_7: "",
  user_def_8: "",
  user_def_9: "",
  user_def_10: "",
};

const createDetailLine = (lineNo, overrides = {}) => {
  const base = {
    id: `${Date.now()}-${lineNo}-${Math.random().toString(36).slice(2, 7)}`,
    line: lineNo,
    inbound_detail_id: null,
    item_number: "",
    item_description: "",
    item_master_id: "",
    uom: "EA",
    item_uom_id: "",
    qty_order: 0,
    qty_receive: 0,
    inv_status: "Available",
    lot_number: "",
    lot_control: "",
    expiry_date: null,
    expiry_date_control: "",
    serial_number: "",
    sn_control: "",
    selected: false,
    _snapshot_key: null,
  };
  return {
    ...base,
    ...overrides,
    inv_status: overrides.inv_status ?? "Available",
  };
};

const formatDetailLineNo = (lineNo) =>
  String(Number(lineNo || 0)).padStart(5, "0");

const getNextDetailLineNo = (lines = []) =>
  lines.reduce((maxLine, line) => {
    const currentLine = Number(
      line?.line ?? line?.line_number ?? line?.lineNumber ?? 0,
    );
    return Number.isFinite(currentLine) && currentLine > maxLine
      ? currentLine
      : maxLine;
  }, 0) + 1;

const createInitialDetailLines = () => [
  createDetailLine(1, { item_number: "" }),
];

const buildDetailSnapshotKey = (line) =>
  [
    normalizeDuplicateValue(line.item_master_id),
    normalizeDuplicateValue(line.item_number),
    normalizeDuplicateValue(line.item_description),
    normalizeDuplicateValue(line.item_uom_id),
    normalizeDuplicateValue(line.uom),
    Number(line.qty_order || 0),
    Number(line.qty_receive || 0),
    normalizeDuplicateValue(line.inv_status),
    normalizeDuplicateValue(line.lot_number),
    normalizeDuplicateDate(line.expiry_date),
    normalizeDuplicateValue(line.serial_number),
  ].join("|");

const getDetailLineSelectionKey = (line) =>
  String(
    line?.inbound_detail_id ||
      line?.inboundDetailId ||
      line?.id ||
      line?._snapshot_key ||
      buildDetailSnapshotKey(line || {}),
  );

const mapInboundDetailToLine = (line, index) => {
  const mapped = createDetailLine(index + 1, {
    id:
      line.inbound_detail_id ||
      line.inboundDetailId ||
      line.id ||
      `${Date.now()}-${index + 1}`,
    line: Number(line.line || line.line_number || line.lineNumber || index + 1),
    inbound_detail_id:
      line.inbound_detail_id || line.inboundDetailId || line.detail_id || null,
    item_number: line.item_number || line.itemNumber || "",
    item_description: line.item_description || line.itemDescription || "",
    item_master_id: line.item_master_id || line.itemMasterId || "",
    uom: line.uom || "EA",
    item_uom_id: line.item_uom_id || line.itemUomId || "",
    qty_order: Number(
      line.qty_order || line.quantity_order || line.quantityOrder || 0,
    ),
    qty_receive: Number(
      line.qty_receive || line.quantity_received || line.quantityReceived || 0,
    ),
    inv_status: line.inv_status || "Avaliable",
    lot_number: line.lot_number || line.lotNumber || "",
    lot_control: line.lot_control || line.LotControl || line.lotControl || "",
    expiry_date: line.expiry_date
      ? dayjs(line.expiry_date)
      : line.expiryDate
        ? dayjs(line.expiryDate)
        : null,
    expiry_date_control:
      line.expiry_date_control ||
      line.ExpiryDateControl ||
      line.expiryDateControl ||
      "",
    serial_number: line.serial_number || line.serialNumber || "",
    sn_control: line.sn_control || line.SnControl || line.snControl || "",
    selected: Boolean(line.selected),
  });
  const normalizedMapped = {
    ...mapped,
    qty_order: isQtyLockedBySnControl(mapped)
      ? 1
      : Number(mapped.qty_order || 0),
  };

  return {
    ...normalizedMapped,
    _snapshot_key: buildDetailSnapshotKey(normalizedMapped),
  };
};

const mapGridRowToForm = (row) => ({
  ...initialForm,
  inbound_master_id: row.inbound_master_id || row.id || row.inbound_id || "",
  inbound_no: row.inbound_no || row.inbound_order_number || "",
  order_type: row.order_type || "",
  order_status: row.order_status || row.status || "Open",
  order_date: row.order_date
    ? dayjs(row.order_date).isValid()
      ? dayjs(row.order_date)
      : dayjs(row.order_date, DATE_FORMAT, true)
    : null,
  expected_delivery: row.expected_delivery_date
    ? dayjs(row.expected_delivery_date).isValid()
      ? dayjs(row.expected_delivery_date)
      : dayjs(row.expected_delivery_date, DATE_FORMAT, true)
    : row.expected_delivery
      ? dayjs(row.expected_delivery).isValid()
        ? dayjs(row.expected_delivery)
        : dayjs(row.expected_delivery, DATE_FORMAT, true)
      : null,
  description: row.description || "",
  remark: row.remark || "",
  create_by: row.create_by || "",
  create_date: row.create_date || "",
  progress: row.progress ?? 0,
  supplier: row.supplier || row.supplier_name || "",
  supplier_id: row.supplier_id || row.vendor_id || "",
  customer: row.customer || row.customer_name || row.customer_code || "None",
  customer_id: row.customer_id || row.cust_id || "",
  user_def_1: row.user_def1 ?? "",
  user_def_2: row.user_def2 ?? "",
  user_def_3: row.user_def3 ?? "",
  user_def_4: row.user_def4 ?? "",
  user_def_5: row.user_def5 ?? "",
  user_def_6: row.user_def6 ?? "",
  user_def_7: row.user_def7 ?? "",
  user_def_8: row.user_def8 ?? "",
  user_def_9: row.user_def9 ?? "",
  user_def_10: row.user_def10 ?? "",
  update_by: row.update_by || "",
  update_date: row.update_date || "",
});

const normalizeRowsWithSeq = (rowList) =>
  rowList.map((row, index) => ({ ...row, seq: index + 1 }));

const formatInboundDateForApi = (value) =>
  value ? dayjs(value).format("YYYY-MM-DDTHH:mm:ss") : null;

const normalizeDuplicateValue = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const normalizeDuplicateDate = (value) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const escapeSqlValue = (value) => String(value ?? "").replace(/'/g, "''");

const DETAIL_ITEM_NUMBER_COLUMNS = [
  {
    field: "item_master_id",
    display: false,
    filter: false,
    key: true,
  },
  {
    field: "item_number",
    display: true,
    filter: true,
    key: false,
  },
  {
    field: "description",
    display: true,
    filter: true,
    key: false,
  },
  {
    field: "lot_control",
    display: false,
    filter: false,
    key: false,
  },
  {
    field: "expiry_date_control",
    display: false,
    filter: false,
    key: false,
  },
  {
    field: "sn_control",
    display: false,
    filter: false,
    key: false,
  },
];

const DETAIL_ITEM_UOM_COLUMNS = [
  {
    field: "item_uom_id",
    display: false,
    filter: false,
    key: true,
  },
  {
    field: "uom",
    display: true,
    filter: true,
    key: false,
  },
  {
    field: "primary_uom",
    display: false,
    filter: false,
    key: false,
  },
];

const ITEM_STATUS_COLUMNS = [
  {
    field: "value_member",
    display: false,
    filter: false,
    key: true,
  },
  {
    field: "display_member",
    display: true,
    filter: true,
    key: false,
  },
];

const DETAIL_ROW_HEIGHT = 47;
const DETAIL_CONTROL_SX = {
  width: "100%",
  "& .MuiFormControl-root": {
    width: "100%",
    m: 0,
  },
  "& .MuiInputBase-root": {
    minHeight: 30,
    boxSizing: "border-box",
    alignItems: "center",
  },
  "& .MuiInputBase-input": {
    boxSizing: "border-box",
    fontSize: 13,
    lineHeight: 1.2,
    py: 0.5,
  },
};
const DETAIL_DATEPICKER_TEXTFIELD_SX = {
  width: "100%",
  "& .MuiFormControl-root": {
    width: "100%",
    m: 0,
  },
  "& .MuiInputBase-root": {
    minHeight: 30,
    boxSizing: "border-box",
    alignItems: "center",
  },
  "& .MuiInputBase-input": {
    boxSizing: "border-box",
    fontSize: 13,
    lineHeight: 1.2,
    py: 0.5,
  },
};
const DETAIL_AUTOCOMPLETE_SX = {
  ...DETAIL_CONTROL_SX,
  "& .MuiAutocomplete-inputRoot": {
    minHeight: 30,
    py: "0 !important",
    alignItems: "center",
  },
  "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
    py: "0 !important",
    fontSize: 13,
    lineHeight: "18px",
  },
};
const DETAIL_CELL_WRAPPER_SX = {
  // display: "flex",
  // alignItems: "center",
  width: "100%",
  // height: "100%",
};

const DetailItemNumberCell = memo(function DetailItemNumberCell({
  lineId,
  itemMasterId,
  itemNumber,
  itemDescription,
  lotNumber,
  expiryDate,
  serialNumber,
  isReadOnly,
  readOnlySx,
  lineError,
  onSelectItem,
}) {
  const bsData = useMemo(
    () =>
      itemMasterId
        ? [
            {
              code: itemMasterId,
              item_number: itemNumber || "",
              description: itemDescription || "",
              value:
                itemNumber && itemDescription
                  ? `${itemNumber} ${itemDescription}`
                  : itemNumber || "",
            },
          ]
        : [],
    [itemMasterId, itemNumber, itemDescription],
  );

  const handleChange = useCallback(
    (val) => {
      if (isReadOnly) return;
      const nextLotControl =
        val?.LotControl || val?.lotControl || val?.lot_control || "";
      const nextExpiryDateControl =
        val?.ExpiryDateControl ||
        val?.expiryDateControl ||
        val?.expiry_date_control ||
        "";
      const nextSnControl =
        val?.SnControl || val?.snControl || val?.sn_control || "";

      onSelectItem(
        lineId,
        {
          item_master_id: val?.code || "",
          item_number: val?.item_number || val?.value || "",
          item_description: val?.description || "",
          item_uom_id: "",
          uom: "",
          lot_control: nextLotControl,
          expiry_date_control: nextExpiryDateControl,
          sn_control: nextSnControl,
          lot_number: isFullControlEnabled(nextLotControl) ? lotNumber : "",
          expiry_date: isFullControlEnabled(nextExpiryDateControl)
            ? expiryDate
            : null,
          serial_number: isFullControlEnabled(nextSnControl)
            ? serialNumber
            : "",
        },
        val?.code || "",
      );
    },
    [expiryDate, isReadOnly, lineId, lotNumber, onSelectItem, serialNumber],
  );

  return (
    <Box sx={DETAIL_CELL_WRAPPER_SX}>
      <BSAutoComplete
        size="small"
        fullWidth
        sx={{
          ...DETAIL_AUTOCOMPLETE_SX,
          ...bsAutoCompleteDisabledSx,
          ...(isReadOnly ? readOnlySx : {}),
        }}
        bsMode="single"
        bsPreObj="inv"
        bsObj="t_inv_item"
        bsColumes={DETAIL_ITEM_NUMBER_COLUMNS}
        bsObjBy="item_number asc"
        bsObjWh="is_active=1"
        bsCacheKey="item_number"
        bsLoadOnOpen={true}
        bsData={bsData}
        bsValue={itemMasterId}
        readOnly={isReadOnly}
        error={Boolean(lineError?.item_number)}
        bsOnChange={handleChange}
      />
    </Box>
  );
});

const DetailUomCell = memo(function DetailUomCell({
  lineId,
  itemMasterId,
  itemUomId,
  uom,
  isReadOnly,
  readOnlySx,
  lineError,
  onSelectUom,
}) {
  const bsObjWh = useMemo(
    () =>
      itemMasterId
        ? `is_active=1 AND item_master_id='${escapeSqlValue(itemMasterId)}'`
        : "1=0",
    [itemMasterId],
  );

  const bsData = useMemo(() => [], []);

  const handleChange = useCallback(
    (val) => {
      if (isReadOnly || !itemMasterId) return;
      onSelectUom(lineId, {
        item_uom_id: val?.code || "",
        uom: val?.value || "",
      });
    },
    [isReadOnly, itemMasterId, lineId, onSelectUom],
  );

  return (
    <Box sx={DETAIL_CELL_WRAPPER_SX}>
      <BSAutoComplete
        size="small"
        fullWidth
        sx={{
          ...DETAIL_AUTOCOMPLETE_SX,
          ...bsAutoCompleteDisabledSx,
          ...(isReadOnly ? readOnlySx : {}),
        }}
        bsMode="select"
        disableClearable
        bsPreObj="inv"
        bsObj="t_inv_item_uom"
        bsColumes={DETAIL_ITEM_UOM_COLUMNS}
        bsObjBy=""
        bsObjWh={bsObjWh}
        bsCacheKey={`item_uom_${itemMasterId || "default"}`}
        bsLoadOnOpen={true}
        bsData={bsData}
        bsValue={
          itemUomId
            ? {
                code: itemUomId,
                value: uom || "",
              }
            : null
        }
        readOnly={isReadOnly || !itemMasterId}
        error={Boolean(lineError?.uom)}
        //helperText={lineError?.uom || ""}
        bsOnChange={handleChange}
      />
    </Box>
  );
});

const DetailStatusCell = memo(function DetailStatusCell({
  lineId,
  value,
  isReadOnly,
  readOnlySx,
  lineError,
  onSelectStatus,
}) {
  const bsData = useMemo(
    () =>
      value
        ? [
            {
              code: value,
              value,
            },
          ]
        : [],
    [value],
  );

  const handleChange = useCallback(
    (val) => {
      if (isReadOnly) return;
      onSelectStatus(lineId, {
        inv_status: val?.code || "",
      });
    },
    [isReadOnly, lineId, onSelectStatus],
  );

  return (
    <Box sx={DETAIL_CELL_WRAPPER_SX}>
      <BSAutoComplete
        size="small"
        fullWidth
        sx={{
          ...DETAIL_AUTOCOMPLETE_SX,
          ...bsAutoCompleteDisabledSx,
          ...(isReadOnly ? readOnlySx : {}),
        }}
        bsMode="select"
        bsPreObj="sec"
        bsObj="t_com_combobox_item"
        bsColumes={ITEM_STATUS_COLUMNS}
        bsObjBy="display_sequence asc"
        bsObjWh="is_active=1 AND group_name='inventory_status'"
        bsCacheKey="inv_status"
        bsLoadOnOpen={true}
        bsData={bsData}
        bsValue={value}
        readOnly={isReadOnly}
        error={Boolean(lineError?.inv_status)}
        //helperText={lineError?.inv_status || ""}
        bsOnChange={handleChange}
      />
    </Box>
  );
});

const buildDetailDuplicateKey = (line) =>
  [
    normalizeDuplicateValue(line.item_master_id),
    normalizeDuplicateValue(line.inv_status),
    normalizeDuplicateValue(line.lot_number),
    normalizeDuplicateDate(line.expiry_date),
    normalizeDuplicateValue(line.serial_number),
  ].join("|");

const INBOUND_RESOURCE_GROUP = "v_inv_inbound_master";

const INBOUND_LABEL_DEFS = {
  pageTitleAdd: ["AddInboundOrder", "Add Inbound Order"],
  pageTitleEdit: ["EditInboundOrder", "Edit Inbound Order"],
  createDocument: [
    "CreateInboundDocument",
    "Create a new inbound order document",
  ],
  inboundOrderNo: ["inbound_order_number", "Inbound Order No"],
  autoGeneratedOnSave: ["AutoGeneratedOnSave", "Auto-generated on save"],
  orderType: ["order_type", "Order Type"],
  orderTypeRequired: ["OrderTypeRequired", "Order Type is required"],
  orderStatus: ["order_status", "Order Status"],
  orderDate: ["order_date", "Order Date"],
  expectedDeliveryDate: ["expected_delivery_date", "Expected Delivery Date"],
  supplier: ["Supplier", "Supplier"],
  customer: ["Customer", "Customer"],
  description: ["Description", "Description"],
  remark: ["Remark", "Remark"],
  orderInformation: ["OrderInformation", "Order Information"],
  inboundDetail: ["InboundDetail", "Inbound Detail"],
  inboundDetailLines: ["InboundDetailLines", "Inbound Detail (Line Items)"],
  printBarcodes: ["PrintBarcodes", "Print Barcodes"],
  addLine: ["AddLine", "Add Line"],
  totalSummary: ["TotalSummary", "Total Summary"],
  totalLines: ["TotalLines", "Total Lines"],
  planQuantity: ["PlanQuantity", "Plan Quantity"],
  receiveQuantity: ["ReceiveQuantity", "Receive Quantity"],
  outstanding: ["Outstanding", "Outstanding"],
  overallProgress: ["OverallProgress", "Overall Progress"],
  collapseSummary: ["CollapseSummary", "Collapse summary"],
  expandSummary: ["ExpandSummary", "Expand summary"],
  collapseOrderInformation: [
    "CollapseOrderInformation",
    "Collapse order information",
  ],
  expandOrderInformation: [
    "ExpandOrderInformation",
    "Expand order information",
  ],
  statusOpen: ["Open", "Open"],
  statusReceiving: ["Receiving", "Receiving"],
  statusClosed: ["Closed", "Closed"],
  delete: ["Delete", "Delete"],
  cancel: ["Cancel", "Cancel"],
  save: ["Save", "Save"],
  close: ["Close", "Close"],
  back: ["Back", "Back"],
  printDocument: ["PrintDocument", "Print Document"],
  receiptNumber: ["ReceiptNumber", "Receipt Number"],
  receiptStatus: ["ReceiptStatus", "Receipt Status"],
  createBy: ["CreateBy", "Create By"],
  createDate: ["CreateDate", "Create Date"],
  closeBy: ["CloseBy", "Close By"],
  closeDate: ["CloseDate", "Close Date"],
  receiveNumber: ["ReceiveNumber", "Receive Number"],
  receiveDetail: ["ReceiveDetail", "Receive Detail"],
  userDefine: ["UserDefine", "User Define"],
  selectReceiptPrompt: [
    "SelectReceiptPrompt",
    "Select a Receipt Number above to view receive details",
  ],
  noReceiptSelected: ["NoReceiptSelected", "No receipt selected"],
  open: ["Open", "Open"],
  addInboundOrder: ["AddInboundOrder", "Add Inbound Order"],
  editInboundOrder: ["EditInboundOrder", "Edit Inbound Order"],
  orderInfo: ["OrderInfo", "Order Info"],
  loadReceiptFailed: ["LoadReceiptFailed", "Load receipt failed."],
  loadInboundDetailFailed: [
    "LoadInboundDetailFailed",
    "Load inbound detail failed.",
  ],
  loadInboundDetailShowingExisting: [
    "LoadInboundDetailShowingExisting",
    "Load inbound detail failed. Showing existing data.",
  ],
  loadFailed: ["LoadFailed", "Load Failed"],
  validationError: ["ValidationError", "Validation Error"],
  duplicateDetail: ["DuplicateDetail", "Duplicate Detail"],
  saveFailed: ["SaveFailed", "Save failed"],
  saveInboundFailed: ["SaveInboundFailed", "Save inbound failed."],
  saveInboundRetry: [
    "SaveInboundRetry",
    "Save inbound failed. Please try again.",
  ],
  inboundOrderDeleted: [
    "InboundOrderDeleted",
    "Inbound order deleted successfully.",
  ],
  createNewInbound: ["CreateNewInbound", "Create a new inbound order document"],
  partialReceive: ["PartialReceive", "Partial Receive"],
  userDefined: ["UserDefined", "User Defined"],
  lineNumber: ["Line", "Line"],
  itemNumber: ["ItemNumber", "Item Number"],
  uom: ["UOM", "UOM"],
  qtyOrder: ["QtyOrder", "Qty Order"],
  qtyReceived: ["QtyReceived", "Qty Received"],
  itemStatus: ["ItemStatus", "Item Status"],
  lotNumber: ["LotNumber", "Lot Number"],
  expiryDate: ["ExpiryDate", "Expiry Date"],
  serialNumber: ["SerialNumber", "Serial Number"],
  progress: ["Progress", "Progress"],
  updateBy: ["UpdateBy", "Update By"],
  closeOrder: ["CloseOrder", "Close Order"],
  printSticker: ["PrintSticker", "Print Sticker"],
  statusProgress: ["StatusProgress", "Inbound Status Progress"],
  closeReceipt: ["CloseReceipt", "Close Receipt"],
  saveReceipt: ["SaveReceipt", "Save Receipt"],
  inboundAutoGen: ["inbound_order_number_placeholder", "Inbound Auto Generate"],
  warningCheckUomHeader: [
    "please_check_primary_uom",
    "Please check primary UOM",
  ],
  warningCheckUomDetail: [
    "please_check_primary_uom_detail",
    "Please check primary UOM",
  ],
};

const Inbound = (props) => {
  //const theme = useTheme();
  const { permission } = useOutletContext();
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();
  const { getResourceByGroupAndName } = useResource();
  const [viewMode, setViewMode] = useState("list");
  const [isEdit, setIsEdit] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [formTab, setFormTab] = useState("inbound");
  const [form, setForm] = useState(initialForm);
  const [tableRows, setTableRows] = useState([]);
  const [detailLines, setDetailLines] = useState([createDetailLine(1)]);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [orderInfoExpanded, setOrderInfoExpanded] = useState(true);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [selectedReceipt, setSelectedReceipt] = useState("");
  const [receiptHeader, setReceiptHeader] = useState(null);
  const [receiptDetailTab, setReceiptDetailTab] = useState("receive-detail");
  const [receiptUserDef, setReceiptUserDef] = useState({});
  const [deletedLines, setDeletedLines] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportMenuAnchor, setReportMenuAnchor] = useState(null);
  const [reportPreview, setReportPreview] = useState({
    open: false,
    title: "",
    reportCode: "",
    parameters: {},
  });
  const inboundOrderNumberRef = useRef("");
  const [actionLoading, setActionLoading] = useState({
    save: false,
    delete: false,
    closeOrder: false,
    saveReceipt: false,
    closeReceipt: false,
    refresh: false,
  });

  useEffect(() => {
    setLocale_id(props.lang || "en");
  }, [props.lang]);

  const openInboundReportPreview = useCallback(
    async (report, inboundOrderNumber) => {
      if (!inboundOrderNumber) {
        await BSAlertSwal2.show("warning", "Inbound order number is required.");
        return;
      }

      setReportPreview({
        open: true,
        title: `${report.label} - ${inboundOrderNumber}`,
        reportCode: report.code,
        parameters: { inbound_order_number: inboundOrderNumber },
      });
    },
    [],
  );

  const openInboundReport = useCallback(
    async (report) => {
      await openInboundReportPreview(report, form.inbound_no);
    },
    [form.inbound_no, openInboundReportPreview],
  );

  const handlePrintSelectedInboundStickers = useCallback(async () => {
    const selectedLines = detailLines.filter((line) => line.selected);
    if (selectedLines.length === 0) {
      await BSAlertSwal2.show(
        "warning",
        "Please select inbound detail lines to print.",
      );
      return;
    }

    if (!form.inbound_no) {
      await BSAlertSwal2.show("warning", "Inbound order number is required.");
      return;
    }

    const unsavedLines = selectedLines.filter(
      (line) => !line.inbound_detail_id,
    );
    if (unsavedLines.length > 0) {
      await BSAlertSwal2.show(
        "warning",
        "Please save inbound detail lines before printing stickers.",
      );
      return;
    }

    if (selectedLines.length > 500) {
      const result = await BSAlertSwal2.fire({
        icon: "warning",
        title: "Print many stickers?",
        html: `You selected <b>${selectedLines.length}</b> lines. Large PDF generation may take time.`,
        showCancelButton: true,
        confirmButtonText: "Print",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
    }

    const uniqueJoined = (values) =>
      [
        ...new Set(
          values
            .map((value) =>
              value === null || value === undefined ? "" : String(value),
            )
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ].join(",");

    const inboundDetailIds = uniqueJoined(
      selectedLines.map((line) => line.inbound_detail_id),
    );

    setReportPreview({
      open: true,
      title: `${INBOUND_STICKER_REPORT.label} - ${form.inbound_no}`,
      reportCode: INBOUND_STICKER_REPORT.code,
      parameters: {
        inbound_order_number: form.inbound_no,
        inbound_detail_ids: inboundDetailIds,
      },
    });
  }, [detailLines, form.inbound_no]);

  const handleReportPreviewClose = useCallback(() => {
    setReportPreview((prev) => ({ ...prev, open: false }));
  }, []);

  const handleReportMenuClose = useCallback(() => {
    setReportMenuAnchor(null);
  }, []);

  const handleReportClick = useCallback(
    (report) => {
      handleReportMenuClose();
      openInboundReport(report);
    },
    [handleReportMenuClose, openInboundReport],
  );

  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(INBOUND_LABEL_DEFS).map(
          ([labelKey, [resourceName, fallback]]) => [
            labelKey,
            getResourceByGroupAndName(
              INBOUND_RESOURCE_GROUP,
              resourceName,
              locale_id,
            )?.resource_value || fallback,
          ],
        ),
      ),
    [getResourceByGroupAndName, locale_id],
  );

  const progressSteps = useMemo(() => ["Open", "Receiving", "Closed"], []);

  const currentUserInfo = useMemo(() => getStoredUserInfo(), []);
  const loginUserName = currentUserInfo.userName;
  const currentUserId = currentUserInfo.userId;

  const showMessage = useCallback(
    (type, message, title = "Notification") =>
      BSAlertSwal2.show(type, message, {
        title,
        confirmButtonText: "OK",
      }),
    [],
  );

  const escapeHtml = useCallback(
    (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"),
    [],
  );

  const showRowValidationPopup = useCallback(
    async (rows, title) => {
      const textSecondary = "#64748b";
      const errorBg = "#fee2e2";
      const errorBorder = "#ef4444";
      const errorText = "#b91c1c";

      const errorHtml = rows
        .map((item) => {
          const errorItems = (item.errors || [])
            .map(
              (err) =>
                `<li style="margin: 2px 0; color: ${textSecondary};">${escapeHtml(err)}</li>`,
            )
            .join("");

          return `
            <div style="text-align: left; margin-bottom: 12px; padding: 10px; background: ${errorBg}; border-radius: 6px; border-left: 3px solid ${errorBorder};">
              <strong style="color: ${errorText};">Row ${escapeHtml(item.rowNumber)}</strong>
              <ul style="margin: 5px 0 0 15px; padding: 0; list-style: disc;">${errorItems}</ul>
            </div>`;
        })
        .join("");

      await BSAlertSwal2.show("error", "", {
        title: title || labels.validationError,
        html: `<div style="max-height: 300px; overflow-y: auto;">${errorHtml}</div>`,
        width: 450,
        confirmButtonText: "OK",
      });
    },
    [escapeHtml, labels.validationError],
  );

  const resolveApiMessage = useCallback((payload, fallbackMessage) => {
    const source =
      payload && typeof payload === "object" && payload.data
        ? payload.data
        : payload;
    const message = String(source?.message || "").trim();
    const messageText = String(
      source?.message_text || source?.messageText || "",
    ).trim();

    if (message && messageText && message !== messageText) {
      return `${message}\n${messageText}`;
    }
    return messageText || message || fallbackMessage;
  }, []);

  const isApiFailure = useCallback((payload) => {
    const source =
      payload && typeof payload === "object" && payload.data
        ? payload.data
        : payload;

    if (source?.success === false) return true;
    if (String(source?.success || "").toLowerCase() === "false") return true;

    return (
      payload?.message_status &&
      String(payload.message_status).toLowerCase() !== "success"
    );
  }, []);

  const isApiSuccess = useCallback((payload) => {
    const source =
      payload && typeof payload === "object" && payload.data
        ? payload.data
        : payload;
    const messageStatus = String(
      payload?.message_status || source?.message_status || "",
    ).toLowerCase();

    if (source?.success === true) return true;
    if (String(source?.success || "").toLowerCase() === "true") return true;

    return messageStatus === "success";
  }, []);

  const hasSelectedReceipt = Boolean(selectedReceipt);
  const currentReceipt = receiptHeader;
  const isReceiptClosed = ["CLOSE", "CLOSED"].includes(
    normalizeStatus(currentReceipt?.status),
  );
  const receiptDetailWhere = useMemo(
    () =>
      selectedReceipt
        ? `receipt_header_id='${String(selectedReceipt).replace(/'/g, "''")}'`
        : "1=0",
    [selectedReceipt],
  );

  const getReceiptStatusPalette = (status) => {
    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus === "OPEN")
      return { text: "#2f6fed", border: "#b8cdfd", bg: "#eaf1ff" };
    if (normalizedStatus === "CLOSED")
      return { text: "#64748b", border: "#d1d5db", bg: "#f1f3f5" };
    return { text: "#64748b", border: "#d1d5db", bg: "#f1f3f5" };
  };

  const normalizedFormStatus = normalizeStatus(form.order_status);
  const isReadOnly = normalizedFormStatus !== "OPEN";
  const canEditQtyOnly = normalizedFormStatus === "RECEIVING";
  const canAddDetailLine = normalizedFormStatus !== "CLOSED";
  const lockWarehouseOwner = isEdit && normalizedFormStatus === "OPEN";
  const disableWarehouseOwnerControl = isReadOnly || lockWarehouseOwner;
  const warehouseOwnerReadOnlySx = useMemo(
    () =>
      disableWarehouseOwnerControl
        ? {
            pointerEvents: "none",
            "& .MuiInputBase-input": {
              cursor: "not-allowed",
              color: "#9ca3af",
              WebkitTextFillColor: "#9ca3af",
            },
            "& .MuiSvgIcon-root": {
              color: "#c4c4c4",
            },
          }
        : undefined,
    [disableWarehouseOwnerControl],
  );
  const formattedCreateDate = useMemo(() => {
    if (!form.create_date) return "-";
    if (dayjs.isDayjs(form.create_date)) {
      return form.create_date.format(DATETIME_FORMAT);
    }
    const parsed = dayjs(form.create_date);
    return parsed.isValid() ? parsed.format(DATETIME_FORMAT) : form.create_date;
  }, [form.create_date]);

  const formattedUpdateDate = useMemo(() => {
    if (!form.update_date) return "-";
    if (dayjs.isDayjs(form.update_date)) {
      return form.update_date.format(DATETIME_FORMAT);
    }
    const parsed = dayjs(form.update_date);
    return parsed.isValid() ? parsed.format(DATETIME_FORMAT) : form.update_date;
  }, [form.update_date]);

  const formatDateTimeValue = useCallback((value) => {
    if (!value) return "-";
    if (dayjs.isDayjs(value)) return value.format(DATETIME_FORMAT);
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(DATETIME_FORMAT) : value;
  }, []);

  const summary = useMemo(() => {
    const totalLines = detailLines.length;
    const planQty = detailLines.reduce(
      (s, l) => s + Number(l.qty_order || 0),
      0,
    );
    const receiveQty = detailLines.reduce(
      (s, l) => s + Number(l.qty_receive || 0),
      0,
    );
    const outstanding = planQty - receiveQty;
    const progressPct = form.progress;
    return { totalLines, planQty, receiveQty, outstanding, progressPct };
  }, [detailLines, form.progress]);

  const openCreateForm = useCallback(() => {
    inboundOrderNumberRef.current = "";
    setForm({
      ...initialForm,
      create_by: loginUserName,
      create_date: dayjs().format(DATETIME_FORMAT),
      order_date: dayjs(),
    });
    setDetailLines(createInitialDetailLines());
    setDeletedLines([]);
    setSelectedReceipt("");
    setReceiptHeader(null);
    setReceiptUserDef({});
    setFormTab("inbound");
    setSummaryExpanded(true);
    setErrors({});
    setLineErrors({});
    setEditingRowId(null);
    setIsEdit(false);
    setViewMode("form");
  }, [loginUserName]);

  const loadReceiptHeader = useCallback(
    async (receiptHeaderId) => {
      if (!receiptHeaderId) {
        setReceiptHeader(null);
        setReceiptUserDef({});
        return;
      }

      try {
        const response = await AxiosMaster.get(
          `/inbound/receipt/${receiptHeaderId}`,
        );
        const resData = response?.data;

        if (
          resData?.message_status &&
          String(resData.message_status).toLowerCase() !== "success"
        ) {
          await showMessage(
            "error",
            resolveApiMessage(resData, "Load receipt failed."),
            "Load Failed",
          );
          return;
        }

        const data = resData?.data || {};
        setReceiptHeader({
          receipt_no: data.receipt_number || "",
          status: data.receipt_status || "Open",
          create_date: data.create_date || "",
          create_by: data.create_by || "",
          close_date: data.close_date || "",
          close_by: data.close_by || "",
        });

        setReceiptUserDef({
          user_def_1: data.user_def1 ?? "",
          user_def_2: data.user_def2 ?? "",
          user_def_3: data.user_def3 ?? "",
          user_def_4: data.user_def4 ?? "",
          user_def_5: data.user_def5 ?? "",
          user_def_6: data.user_def6 ?? "",
          user_def_7: data.user_def7 ?? "",
          user_def_8: data.user_def8 ?? "",
          user_def_9: data.user_def9 ?? "",
          user_def_10: data.user_def10 ?? "",
        });
      } catch (error) {
        await showMessage(
          "error",
          resolveApiMessage(
            error?.response?.data,
            error?.message || "Load receipt failed.",
          ),
          "Load Failed",
        );
      }
    },
    [resolveApiMessage, showMessage],
  );

  const openEditForm = useCallback(
    async (row) => {
      const inboundMasterId =
        row.inbound_master_id ||
        row.inboundMasterId ||
        row.id ||
        row.inbound_id;
      inboundOrderNumberRef.current =
        row.inbound_no || row.inbound_order_number || "";

      setForm({
        ...mapGridRowToForm(row),
        inbound_master_id: inboundMasterId || "",
        update_date: row.update_date || "",
      });

      const localDetailLines =
        Array.isArray(row.detail_lines) && row.detail_lines.length > 0
          ? row.detail_lines.map((line, index) =>
              mapInboundDetailToLine(line, index),
            )
          : [createDetailLine(1)];
      const selectedDetailKeys = new Set(
        localDetailLines
          .filter((line) => line.selected)
          .map((line) => getDetailLineSelectionKey(line)),
      );

      setDetailLines(localDetailLines);
      setDeletedLines([]);
      setSelectedReceipt("");
      setReceiptHeader(null);
      setReceiptUserDef({});
      setFormTab("inbound");
      setSummaryExpanded(true);
      setErrors({});
      setLineErrors({});
      setEditingRowId(
        inboundMasterId || row.inbound_no || row.inbound_order_number,
      );
      setIsEdit(true);
      setViewMode("form");

      if (!inboundMasterId) return;

      try {
        setDetailLoading(true);
        const response = await AxiosMaster.get(
          `/inbound/details/${inboundMasterId}`,
        );
        const resData = response?.data;
        if (resData?.success === false) {
          await showMessage(
            "error",
            resolveApiMessage(resData, "Load inbound detail failed."),
            "Load Failed",
          );
          setDetailLoading(false);
          return;
        }

        const apiLines = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (apiLines.length > 0) {
          setDetailLines(
            apiLines.map((line, index) => {
              const mappedLine = mapInboundDetailToLine(line, index);
              return {
                ...mappedLine,
                selected:
                  mappedLine.selected ||
                  selectedDetailKeys.has(getDetailLineSelectionKey(mappedLine)),
              };
            }),
          );
        }
        setDetailLoading(false);
      } catch (error) {
        setDetailLoading(false);
        await showMessage(
          "warning",
          resolveApiMessage(
            error?.response?.data,
            error?.message ||
              "Load inbound detail failed. Showing existing data.",
          ),
          "Load Warning",
        );
      }
    },
    [resolveApiMessage, showMessage],
  );

  const fetchData = useCallback(async () => {
    const inboundMasterId = form.inbound_master_id || editingRowId;
    if (!inboundMasterId) {
      setDetailLines(createInitialDetailLines());
      setDeletedLines([]);
      setLineErrors({});
      return;
    }

    try {
      setDetailLoading(true);
      const response = await AxiosMaster.get(
        `/inbound/details/${inboundMasterId}`,
      );
      const resData = response?.data;
      if (resData?.success === false) {
        await showMessage(
          "error",
          resolveApiMessage(resData, "Load inbound detail failed."),
          "Load Failed",
        );
        return;
      }

      const apiLines = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
          ? response.data
          : [];

      const nextDetailLines =
        apiLines.length > 0
          ? apiLines.map((line, index) => mapInboundDetailToLine(line, index))
          : createInitialDetailLines();

      setDetailLines(nextDetailLines);
      setDeletedLines([]);
      setLineErrors({});
    } catch (error) {
      await showMessage(
        "warning",
        resolveApiMessage(
          error?.response?.data,
          error?.message || "Load inbound detail failed.",
        ),
        "Load Warning",
      );
    } finally {
      setDetailLoading(false);
    }
  }, [editingRowId, form.inbound_master_id, resolveApiMessage, showMessage]);

  const handleSave = useCallback(async () => {
    if (isReadOnly && !canEditQtyOnly) return;

    const nextErrors = {};
    if (!form.order_type) nextErrors.order_type = labels.orderTypeRequired;
    // if (!form.expected_delivery)
    //   nextErrors.expected_delivery = "Expected Delivery Date is required";
    // Warehouse and Owner removed from form
    //if (!form.supplier) nextErrors.supplier = "Supplier is required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nextLineErrors = {};
    const invalidLineDetails = [];

    detailLines.forEach((line, index) => {
      const lineError = {};

      if (!String(line.item_master_id || "").trim()) {
        lineError.item_number = "Item Number is required";
      }
      if (!String(line.item_uom_id || "").trim()) {
        lineError.uom = "UOM is required";
      }
      if (!String(line.inv_status || "").trim()) {
        lineError.inv_status = "Item Status is required";
      }

      if (Number(line.qty_order || 0) <= 0) {
        lineError.qty_order = "Qty Order must be greater than 0";
      }

      if (
        normalizedFormStatus === "RECEIVING" &&
        Number(line.qty_order || 0) < Number(line.qty_receive || 0)
      ) {
        lineError.qty_order = "Qty Order must be greater than Qty Receive ";
      }

      // if (isFullControlEnabled(line.lot_control)) {
      //   if (!String(line.lot_number || "").trim()) {
      //     lineError.lot_number = "Lot Number is required";
      //     missingFields.push("Lot Number");
      //   }
      // }

      // if (isFullControlEnabled(line.expiry_date_control)) {
      //   const expiryDateValue = line.expiry_date;
      //   const parsedExpiryDate = expiryDateValue
      //     ? dayjs(expiryDateValue)
      //     : null;
      //   if (!parsedExpiryDate || !parsedExpiryDate.isValid()) {
      //     lineError.expiry_date = "Expiry Date is required";
      //     missingFields.push("Expiry Date");
      //   }
      // }

      // if (isFullControlEnabled(line.sn_control)) {
      //   if (!String(line.serial_number || "").trim()) {
      //     lineError.serial_number = "Serial Number is required";
      //     missingFields.push("Serial Number");
      //   }
      // }

      if (Object.keys(lineError).length > 0) {
        nextLineErrors[line.id] = lineError;
        invalidLineDetails.push({
          rowNumber: line.line || index + 1,
          errors: Object.values(lineError),
        });
      }
    });

    setLineErrors(nextLineErrors);

    if (invalidLineDetails.length > 0) {
      setFormTab("inbound");
      await showRowValidationPopup(invalidLineDetails, labels.validationError);
      return;
    }

    const duplicateTracker = new Map();
    const duplicatePairs = [];

    detailLines.forEach((line, index) => {
      const lineNumber = line.line || index + 1;
      const duplicateKey = buildDetailDuplicateKey(line);

      if (duplicateTracker.has(duplicateKey)) {
        duplicatePairs.push([duplicateTracker.get(duplicateKey), lineNumber]);
      } else {
        duplicateTracker.set(duplicateKey, lineNumber);
      }
    });

    if (duplicatePairs.length > 0) {
      const duplicateDetails = duplicatePairs.map(
        ([firstLine, duplicateLine]) => ({
          rowNumber: duplicateLine,
          errors: [`Duplicate with Line ${firstLine}`],
        }),
      );

      setFormTab("inbound");
      await showRowValidationPopup(duplicateDetails, labels.duplicateDetail);
      return;
    }

    const changedDetailPayload = detailLines
      .filter((line) => {
        if (!isEdit) return true;
        if (!line.inbound_detail_id) return true;
        return (
          buildDetailSnapshotKey(line) !== String(line._snapshot_key || "")
        );
      })
      .map((line) => ({
        action: isEdit && line.inbound_detail_id ? "update" : "add",
        line_number: line.line,
        item_master_id: Number(line.item_master_id) || 0,
        item_number: line.item_number || "",
        item_description: line.item_description || "",
        item_uom_id: Number(line.item_uom_id) || 0,
        uom: line.uom || "",
        quantity_order: Number(line.qty_order || 0),
        quantity_received: Number(line.qty_receive || 0),
        inv_status: line.inv_status || null,
        lot_number: line.lot_number || null,
        expiry_date: line.expiry_date
          ? dayjs(line.expiry_date).format("YYYY-MM-DD")
          : null,
        serial_number: line.serial_number || null,
        user_def1: null,
        user_def2: null,
        user_def3: null,
        user_def4: null,
        user_def5: null,
        user_def6: null,
        user_def7: null,
        user_def8: null,
        user_def9: null,
        user_def10: null,
      }));

    const deletedDetailPayload = deletedLines
      .filter((line) => isEdit && line.inbound_detail_id)
      .map((line) => ({
        action: "delete",
        line_number: line.line,
        item_master_id: Number(line.item_master_id) || 0,
        item_number: line.item_number || "",
        item_description: line.item_description || "",
        item_uom_id: Number(line.item_uom_id) || 0,
        uom: line.uom || "",
        quantity_order: Number(line.qty_order || 0),
        quantity_received: Number(line.qty_receive || 0),
        inv_status: line.inv_status || null,
        lot_number: line.lot_number || null,
        expiry_date: null,
        serial_number: line.serial_number || null,
        user_def1: null,
        user_def2: null,
        user_def3: null,
        user_def4: null,
        user_def5: null,
        user_def6: null,
        user_def7: null,
        user_def8: null,
        user_def9: null,
        user_def10: null,
      }));

    const apiPayload = {
      inbound_master_id: form.inbound_master_id
        ? Number(form.inbound_master_id)
        : null,
      inbound_order_number:
        String(inboundOrderNumberRef.current || form.inbound_no || "").trim() ||
        null,
      order_type: form.order_type || null,
      order_status: form.order_status || "OPEN",
      order_date:
        formatInboundDateForApi(form.order_date) ||
        dayjs().format("YYYY-MM-DDTHH:mm:ss"),
      expected_delivery: formatInboundDateForApi(form.expected_delivery),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      description: form.description || null,
      expected_delivery_date: formatInboundDateForApi(form.expected_delivery),
      remark: form.remark || null,
      user_def1: form.user_def_1 || null,
      user_def2: form.user_def_2 || null,
      user_def3: form.user_def_3 || null,
      user_def4: form.user_def_4 || null,
      user_def5: form.user_def_5 || null,
      user_def6: form.user_def_6 || null,
      user_def7: form.user_def_7 ? Number(form.user_def_7) : null,
      user_def8: form.user_def_8 ? Number(form.user_def_8) : null,
      user_def9: form.user_def_9
        ? dayjs(form.user_def_9).format("YYYY-MM-DDTHH:mm:ss")
        : null,
      user_def10: form.user_def_10
        ? dayjs(form.user_def_10).format("YYYY-MM-DDTHH:mm:ss")
        : null,
      user_id: currentUserId,
      device: null,
      language: locale_id,
      details: [...changedDetailPayload, ...deletedDetailPayload],
    };

    setActionLoading((prev) => ({ ...prev, save: true }));

    try {
      const response = await AxiosMaster.post(`/inbound/save`, apiPayload);

      const resData = response?.data;
      if (resData?.success === false) {
        await showMessage(
          "error",
          resolveApiMessage(resData, "Save inbound failed."),
          "Save Failed",
        );
        return;
      }

      const saveResponsePayload =
        resData?.data && typeof resData.data === "object"
          ? resData.data
          : resData;

      const returnedInboundMasterId =
        saveResponsePayload?.inbound_master_id ??
        saveResponsePayload?.inboundMasterId ??
        saveResponsePayload?.InboundMasterId ??
        null;

      const returnedInboundOrderNumber =
        saveResponsePayload?.inbound_order_number ??
        saveResponsePayload?.inboundOrderNumber ??
        saveResponsePayload?.InboundOrderNumber ??
        null;

      const savedId =
        returnedInboundMasterId || form.inbound_master_id || editingRowId;
      const savedNo = returnedInboundOrderNumber || form.inbound_no;

      setForm((prev) => ({
        ...prev,
        inbound_master_id: savedId || prev.inbound_master_id,
        inbound_no: savedNo || prev.inbound_no,
      }));

      const nowText = dayjs().format(DATETIME_FORMAT);
      const totalPlan = detailLines.reduce(
        (sum, line) => sum + Number(line.qty_order || 0),
        0,
      );
      const totalReceive = detailLines.reduce(
        (sum, line) => sum + Number(line.qty_receive || 0),
        0,
      );
      const progressPct =
        totalPlan > 0
          ? Math.min(100, Math.round((totalReceive / totalPlan) * 100))
          : 0;

      const nextRow = {
        id: savedId || editingRowId || Date.now(),
        inbound_master_id: savedId || null,
        inbound_no: savedNo,
        order_type: form.order_type,
        supplier: form.supplier,
        supplier_id: form.supplier_id,
        order_date: formatInboundDateForApi(form.order_date) || "",
        expected_delivery:
          formatInboundDateForApi(form.expected_delivery) || "",
        status: form.order_status,
        description: form.description || "-",
        create_by: form.create_by || loginUserName,
        create_date: form.create_date || nowText,
        progress: progressPct,
        customer: form.customer,
        customer_id: form.customer_id,
        remark: form.remark,
        user_def1: form.user_def_1 ?? "",
        user_def2: form.user_def_2 ?? "",
        user_def3: form.user_def_3 ?? "",
        user_def4: form.user_def_4 ?? "",
        user_def5: form.user_def_5 ?? "",
        user_def6: form.user_def_6 ?? "",
        user_def7: form.user_def_7 ?? "",
        user_def8: form.user_def_8 ?? "",
        user_def9: form.user_def_9 ?? "",
        user_def10: form.user_def_10 ?? "",
        detail_lines: detailLines,
      };

      setTableRows((prev) => {
        const merged = editingRowId
          ? prev.map((row) =>
              row.id === editingRowId ? { ...row, ...nextRow } : row,
            )
          : [nextRow, ...prev];
        return normalizeRowsWithSeq(merged);
      });

      await openEditForm({
        ...nextRow,
        inbound_master_id: savedId || nextRow.inbound_master_id,
        inbound_no: savedNo || nextRow.inbound_no,
        order_status: form.order_status,
        update_date: nowText,
      });

      setDeletedLines([]);
      setErrors({});
      setLineErrors({});
      const actionLabel = editingRowId ? "Updated" : "Created";
      const defaultMsg = `Inbound order ${actionLabel.toLowerCase()} successfully.`;
      const serverMsg = resolveApiMessage(resData, defaultMsg);
      const orderNo = savedNo ? ` [${savedNo}]` : "";
      await showMessage("success", `${serverMsg}${orderNo}`, "Saved");
    } catch (error) {
      await showMessage(
        "error",
        resolveApiMessage(
          error?.response?.data,
          error?.message || "Save inbound failed. Please try again.",
        ),
        "Save Failed",
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, save: false }));
    }
  }, [
    canEditQtyOnly,
    deletedLines,
    detailLines,
    editingRowId,
    form,
    isEdit,
    isReadOnly,
    loginUserName,
    labels.duplicateDetail,
    labels.orderTypeRequired,
    labels.validationError,
    normalizedFormStatus,
    openEditForm,
    resolveApiMessage,
    showRowValidationPopup,
    showMessage,
    currentUserId,
  ]);

  const handleAddLine = () => {
    if (!canAddDetailLine) return;
    //if (isReadOnly) return;
    setDetailLines((prev) => [
      ...prev,
      createDetailLine(getNextDetailLineNo(prev)),
    ]);
  };

  const handleDeleteInbound = useCallback(
    async (payload) => {
      setActionLoading((prev) => ({ ...prev, delete: true }));
      const isPrimitivePayload =
        typeof payload === "string" || typeof payload === "number";
      const inboundMasterIdFromPayload =
        (isPrimitivePayload ? payload : null) ||
        payload?.inbound_master_id ||
        payload?.inboundMasterId ||
        payload?.id ||
        payload?.row?.inbound_master_id ||
        payload?.row?.id;
      const inboundMasterId =
        inboundMasterIdFromPayload || form.inbound_master_id || editingRowId;

      const canDeleteFromForm = isEdit && !isReadOnly;
      const canDeleteFromGrid =
        inboundMasterIdFromPayload !== undefined &&
        inboundMasterIdFromPayload !== null &&
        String(inboundMasterIdFromPayload) !== "";
      if (!canDeleteFromForm && !canDeleteFromGrid) {
        setActionLoading((prev) => ({ ...prev, delete: false }));
        return;
      }

      const matchedRow = tableRows.find(
        (row) =>
          String(row.inbound_master_id || row.id) ===
          String(inboundMasterIdFromPayload),
      );
      const inboundNoFromPayload =
        (isPrimitivePayload ? "" : payload?.inbound_order_number) ||
        (isPrimitivePayload ? "" : payload?.inbound_no) ||
        matchedRow?.inbound_no ||
        matchedRow?.inbound_order_number ||
        "";
      const inboundNo = inboundNoFromPayload || form.inbound_no || "this order";
      const confirmed = await BSAlertSwal2.confirm(
        `Confirm delete inbound order ${inboundNo}?`,
        {
          title: "Delete Confirmation",
          confirmButtonText: "Delete",
          cancelButtonText: "Cancel",
        },
      );
      if (!confirmed) {
        setActionLoading((prev) => ({ ...prev, delete: false }));
        return;
      }

      if (!inboundMasterId) {
        await showMessage(
          "error",
          "Cannot delete: inbound_master_id is missing.",
          "Delete Failed",
        );
        setActionLoading((prev) => ({ ...prev, delete: false }));
        return;
      }

      try {
        const response = await AxiosMaster.post("/inbound/delete-order", {
          inbound_master_id: inboundMasterId,
          language: locale_id || "en",
        });
        const resData = response?.data;
        if (resData?.success === false) {
          await showMessage(
            "error",
            resolveApiMessage(resData, "Delete inbound failed."),
            "Delete Failed",
          );
          return;
        }

        setTableRows((prev) =>
          normalizeRowsWithSeq(
            prev.filter(
              (row) =>
                String(row.inbound_master_id || row.id) !==
                String(inboundMasterId),
            ),
          ),
        );
        setViewMode("list");
        setIsEdit(false);
        setEditingRowId(null);
        setErrors({});
        setLineErrors({});
        await showMessage(
          "success",
          resolveApiMessage(resData, "Inbound order deleted successfully."),
          "Deleted",
        );
      } catch (error) {
        await showMessage(
          "error",
          resolveApiMessage(
            error?.response?.data,
            error?.message || "Delete inbound failed.",
          ),
          "Delete Failed",
        );
      } finally {
        setActionLoading((prev) => ({ ...prev, delete: false }));
      }
    },
    [
      editingRowId,
      form.inbound_master_id,
      form.inbound_no,
      isEdit,
      isReadOnly,
      resolveApiMessage,
      showMessage,
      tableRows,
    ],
  );

  const handleRefresh = useCallback(async () => {
    setActionLoading((prev) => ({ ...prev, refresh: true }));
    try {
      const inboundMasterId = form.inbound_master_id || editingRowId;
      if (inboundMasterId) {
        await fetchData();
      }
      if (selectedReceipt) {
        await loadReceiptHeader(selectedReceipt);
      }
    } catch (error) {
      await showMessage(
        "error",
        resolveApiMessage(
          error?.response?.data,
          error?.message || "Refresh failed.",
        ),
        "Refresh Failed",
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, refresh: false }));
    }
  }, [
    editingRowId,
    fetchData,
    form.inbound_master_id,
    loadReceiptHeader,
    resolveApiMessage,
    selectedReceipt,
    showMessage,
  ]);

  const handleCloseOrder = useCallback(async () => {
    if (!isEdit || normalizedFormStatus === "CLOSED") return;

    const inboundMasterId = form.inbound_master_id || editingRowId;
    if (!inboundMasterId) {
      await showMessage(
        "error",
        "Cannot close order: inbound_master_id is missing.",
        "Close Failed",
      );
      return;
    }

    const remarkResult = await BSAlertSwal2.fire({
      title: "Close Order",
      input: "textarea",
      inputLabel: "Remark (optional)",
      inputPlaceholder: "Enter remark",
      inputAttributes: { maxlength: "250" },
      showCancelButton: true,
      confirmButtonText: "Close Order",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!remarkResult?.isConfirmed) return;

    setActionLoading((prev) => ({ ...prev, closeOrder: true }));
    try {
      const response = await AxiosMaster.post("/inbound/close-order", {
        inbound_master_id: Number(inboundMasterId),
        remark: String(remarkResult?.value || "").trim() || null,
        user_id: String(currentUserId),
        device: currentUserInfo.device,
        language: locale_id || "en",
      });

      const resData = response?.data;
      const isFailure =
        resData?.success === false ||
        String(resData?.success || "").toLowerCase() === "false" ||
        (resData?.message_status &&
          String(resData.message_status).toLowerCase() !== "success");

      if (isFailure) {
        await showMessage(
          "error",
          resolveApiMessage(resData, "Close order failed."),
          "Close Failed",
        );
        return;
      }

      setForm((prev) => ({ ...prev, order_status: "Closed" }));
      setTableRows((prev) =>
        normalizeRowsWithSeq(
          prev.map((row) => {
            const rowId = row.inbound_master_id || row.id;
            return String(rowId) === String(inboundMasterId)
              ? { ...row, order_status: "Closed", status: "Closed" }
              : row;
          }),
        ),
      );

      await showMessage(
        "success",
        resolveApiMessage(resData, "Inbound order closed successfully."),
        "Closed",
      );
    } catch (error) {
      await showMessage(
        "error",
        resolveApiMessage(
          error?.response?.data,
          error?.message || "Close order failed.",
        ),
        "Close Failed",
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, closeOrder: false }));
    }
  }, [
    editingRowId,
    form.inbound_master_id,
    isEdit,
    isReadOnly,
    locale_id,
    resolveApiMessage,
    showMessage,
    currentUserId,
    currentUserInfo.device,
  ]);

  const handleCloseReceipt = useCallback(async () => {
    if (!selectedReceipt || isReceiptClosed) return;

    // Clear any stale loading state before opening confirm dialog.
    setActionLoading((prev) => ({ ...prev, closeReceipt: false }));

    const receiptNo =
      currentReceipt?.receipt_no || currentReceipt?.receipt_number || "";
    const confirmed = await BSAlertSwal2.confirm(
      `Confirm close receipt${receiptNo ? ` ${receiptNo}` : ""}?`,
      {
        title: "Close Receipt",
        confirmButtonText: "Close",
        cancelButtonText: "Cancel",
      },
    );
    if (!confirmed) {
      setActionLoading((prev) => ({ ...prev, closeReceipt: false }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, closeReceipt: true }));

    try {
      const response = await AxiosMaster.post("/inbound/close-receipt", {
        inbound_master_id: form.inbound_master_id,
        receipt_header_id: selectedReceipt,
        user_id: currentUserId,
        device: currentUserInfo.device,
        language: locale_id || "en",
      });
      const resData = response?.data;

      if (isApiFailure(resData)) {
        await showMessage(
          "error",
          resolveApiMessage(resData, "Close receipt failed."),
          "Close Failed",
        );
        return;
      }

      setReceiptHeader((prev) => ({
        ...(prev || {}),
        status: "Closed",
        close_date: prev?.close_date || dayjs().format(DATETIME_FORMAT),
        close_by: prev?.close_by || loginUserName,
      }));
      await loadReceiptHeader(selectedReceipt);
      await showMessage(
        "success",
        resolveApiMessage(resData, "Receipt closed successfully."),
        "Closed",
      );
    } catch (error) {
      const errorPayload = error?.response?.data;

      if (isApiSuccess(errorPayload)) {
        setReceiptHeader((prev) => ({
          ...(prev || {}),
          status: "Closed",
          close_date: prev?.close_date || dayjs().format(DATETIME_FORMAT),
          close_by: prev?.close_by || loginUserName,
        }));
        await loadReceiptHeader(selectedReceipt);
        await showMessage(
          "success",
          resolveApiMessage(errorPayload, "Receipt closed successfully."),
          "Closed",
        );
        return;
      }

      await showMessage(
        "error",
        resolveApiMessage(
          errorPayload,
          error?.message || "Close receipt failed.",
        ),
        "Close Failed",
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, closeReceipt: false }));
    }
  }, [
    currentReceipt,
    form.inbound_master_id,
    isReceiptClosed,
    loadReceiptHeader,
    locale_id,
    loginUserName,
    isApiFailure,
    isApiSuccess,
    resolveApiMessage,
    selectedReceipt,
    showMessage,
    currentUserId,
    currentUserInfo.device,
  ]);

  const handleSaveReceipt = useCallback(async () => {
    if (!selectedReceipt || isReceiptClosed) return;
    setActionLoading((prev) => ({ ...prev, saveReceipt: true }));

    const parseNumberOrNull = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const toIsoDateOrNull = (value) => {
      if (!value) return null;
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.toISOString() : null;
    };

    const payload = {
      receipt_header_id: Number(selectedReceipt),
      inbound_master_id: Number(form.inbound_master_id),
      user_id: String(currentUserId),
      user_def1: receiptUserDef.user_def_1 || null,
      user_def2: receiptUserDef.user_def_2 || null,
      user_def3: receiptUserDef.user_def_3 || null,
      user_def4: receiptUserDef.user_def_4 || null,
      user_def5: receiptUserDef.user_def_5 || null,
      user_def6: receiptUserDef.user_def_6 || null,
      user_def7: parseNumberOrNull(receiptUserDef.user_def_7),
      user_def8: parseNumberOrNull(receiptUserDef.user_def_8),
      user_def9: toIsoDateOrNull(receiptUserDef.user_def_9),
      user_def10: toIsoDateOrNull(receiptUserDef.user_def_10),
      language: locale_id || "en",
    };

    try {
      const response = await AxiosMaster.post("/inbound/save-receipt", payload);
      const resData = response?.data;

      const isFailure =
        resData?.success === false ||
        String(resData?.success || "").toLowerCase() === "false" ||
        (resData?.message_status &&
          String(resData.message_status).toLowerCase() !== "success");

      if (isFailure) {
        await showMessage(
          "error",
          resolveApiMessage(resData, "Save receipt failed."),
          "Save Failed",
        );
        return;
      }

      await loadReceiptHeader(selectedReceipt);
      await showMessage(
        "success",
        resolveApiMessage(resData, "Receipt saved successfully."),
        "Saved",
      );
    } catch (error) {
      await showMessage(
        "error",
        resolveApiMessage(
          error?.response?.data,
          error?.message || "Save receipt failed.",
        ),
        "Save Failed",
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, saveReceipt: false }));
    }
  }, [
    form.inbound_master_id,
    isReceiptClosed,
    loadReceiptHeader,
    receiptUserDef,
    resolveApiMessage,
    selectedReceipt,
    showMessage,
    currentUserId,
  ]);

  const handleDetailLineChange = useCallback(
    (lineId, field, value) => {
      const targetLine = detailLines.find((line) => line.id === lineId);
      const canEditReceivingLine =
        canEditQtyOnly &&
        (field === "qty_order" || isNewDetailLine(targetLine));
      if (isReadOnly && !canEditReceivingLine) return;

      const normalizedValue =
        (field === "lot_number" || field === "serial_number") &&
        typeof value === "string"
          ? value.slice(0, 50)
          : value;

      setLineErrors((prev) => {
        if (!prev[lineId]?.[field]) return prev;
        const next = { ...prev };
        const currentLineErrors = { ...next[lineId] };
        delete currentLineErrors[field];
        if (Object.keys(currentLineErrors).length === 0) {
          delete next[lineId];
        } else {
          next[lineId] = currentLineErrors;
        }
        return next;
      });

      setDetailLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? (() => {
                const nextLine = {
                  ...line,
                  [field]:
                    field === "qty_order"
                      ? isQtyLockedBySnControl(line)
                        ? 1
                        : (normalizedValue ?? "")
                      : normalizedValue,
                };

                if (
                  field === "serial_number" &&
                  isQtyLockedBySnControl(nextLine)
                ) {
                  nextLine.qty_order = "1";
                }

                return nextLine;
              })()
            : line,
        ),
      );
    },
    [canEditQtyOnly, detailLines, isReadOnly],
  );

  const handleDetailLinePatch = useCallback(
    (lineId, patch) => {
      const targetLine = detailLines.find((line) => line.id === lineId);
      if (isReadOnly && !(canEditQtyOnly && isNewDetailLine(targetLine))) {
        return;
      }

      setLineErrors((prev) => {
        const patchFields = Object.keys(patch || {});
        const current = prev[lineId];
        if (!current || patchFields.length === 0) return prev;

        const next = { ...prev };
        const currentLineErrors = { ...current };
        patchFields.forEach((field) => {
          delete currentLineErrors[field];
        });

        if (Object.keys(currentLineErrors).length === 0) {
          delete next[lineId];
        } else {
          next[lineId] = currentLineErrors;
        }
        return next;
      });

      setDetailLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? {
                ...line,
                ...patch,
              }
            : line,
        ),
      );
    },
    [canEditQtyOnly, detailLines, isReadOnly],
  );

  const syncPrimaryUomForItem = useCallback(
    async (lineId, itemMasterId) => {
      const targetLine = detailLines.find((line) => line.id === lineId);
      if (
        !itemMasterId ||
        (isReadOnly && !(canEditQtyOnly && isNewDetailLine(targetLine)))
      ) {
        return;
      }

      try {
        const response = await AxiosMaster.post("/autocomplete", {
          table: "t_inv_item_uom",
          schema: "inv",
          columns: [
            {
              field: "item_uom_id",
              display: false,
              filter: false,
              key: true,
            },
            {
              field: "uom",
              display: true,
              filter: true,
              key: false,
            },
            {
              field: "primary_uom",
              display: false,
              filter: false,
              key: false,
            },
          ],
          where: `is_active=1 AND item_master_id='${escapeSqlValue(itemMasterId)}'`,
          order_by: "sequence asc",
          include_blank: false,
          keyword: "",
          limit: 30,
        });

        const uomList = response?.data?.data || [];

        const primaryCandidate = uomList.find(
          (row) =>
            String(row.primary_uom ?? row.primaryUom ?? "").trim() === "true",
        );

        if (!primaryCandidate) {
          try {
            await BSAlertSwal2.fire({
              icon: "warning",
              title: labels.warningCheckUomHeader || "Please check primary UOM",
              text: labels.warningCheckUomDetail,
              confirmButtonText: "OK",
            });
          } catch (e) {
            // ignore alert errors
          }

          // clear UOM fields for this line when primary UOM not found
          setDetailLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    item_uom_id: "",
                    uom: "",
                  }
                : line,
            ),
          );

          return;
        }

        const primaryUom = primaryCandidate;

        setLineErrors((prev) => {
          if (!prev[lineId]) return prev;
          const next = { ...prev };
          const currentLineErrors = { ...next[lineId] };
          delete currentLineErrors.uom;
          delete currentLineErrors.item_uom_id;
          if (Object.keys(currentLineErrors).length === 0) {
            delete next[lineId];
          } else {
            next[lineId] = currentLineErrors;
          }
          return next;
        });

        setDetailLines((prev) =>
          prev.map((line) =>
            line.id === lineId &&
            String(line.item_master_id || "") === String(itemMasterId)
              ? {
                  ...line,
                  item_uom_id:
                    primaryUom.code ||
                    primaryUom.item_uom_id ||
                    primaryUom.itemUomId ||
                    "",
                  uom:
                    primaryUom.value ||
                    primaryUom.uom ||
                    primaryUom.label ||
                    primaryUom.item_uom_name ||
                    primaryUom.itemUomName ||
                    line.uom ||
                    "",
                }
              : line,
          ),
        );
      } catch (error) {
        console.error("Load primary UOM failed", error);
      }
    },
    [canEditQtyOnly, detailLines, isReadOnly],
  );

  const handleSelectItemForLine = useCallback(
    (lineId, patch, itemMasterId) => {
      const isSerialControlled = isFullControlEnabled(patch?.sn_control);
      const hasSerial = hasSerialValue(patch?.serial_number);
      handleDetailLinePatch(lineId, {
        ...patch,
        ...(isSerialControlled && hasSerial ? { qty_order: 1 } : {}),
      });
      syncPrimaryUomForItem(lineId, itemMasterId);
    },
    [handleDetailLinePatch, syncPrimaryUomForItem],
  );

  const handleDetailGridCheckBoxSelected = useCallback((selectedRows) => {
    const selectedIds = new Set((selectedRows || []).map((r) => r.id));
    setDetailLines((prev) =>
      prev.map((line) => ({ ...line, selected: selectedIds.has(line.id) })),
    );
  }, []);

  const handleDeleteLine = useCallback(
    (lineId) => {
      const targetLine = detailLines.find((line) => line.id === lineId);
      if (Number(targetLine?.qty_receive || 0) > 0) {
        showMessage(
          "warning",
          "Cannot delete line that has received quantity.",
          "Delete Restricted",
        );
        return;
      }

      setLineErrors((prev) => {
        if (!prev[lineId]) return prev;
        const next = { ...prev };
        delete next[lineId];
        return next;
      });

      setDetailLines((prev) => {
        const deleted = prev.find((line) => line.id === lineId);
        if (deleted && isEdit && deleted.inbound_detail_id) {
          setDeletedLines((d) => [...d, deleted]);
        }
        const filtered = prev.filter((line) => line.id !== lineId);
        if (!filtered.length) return [createDetailLine(1)];
        return filtered;
      });
    },
    [detailLines, isEdit, showMessage],
  );

  const renderUserDefControl = (n, value, onChange, disabled) => {
    if (n === 7 || n === 8) {
      return (
        <BSTextField
          key={n}
          type="decimal"
          label={`${labels.userDefine} ${n}`}
          value={formatDecimalValue(value, DECIMAL_PLACES)}
          disabled={disabled}
          onChange={(val) => onChange(val)}
          inputProps={{ step: "0.00001" }}
          //fullWidth
        />
      );
    }

    if (n === 9 || n === 10) {
      return (
        <BSDatepicker
          key={n}
          label={`${labels.userDefine} ${n}`}
          value={value ? dayjs(value) : null}
          format={DATETIME_FORMAT}
          disabled={disabled}
          onChange={(val) => onChange(val || null)}
        />
      );
    }

    return (
      <BSTextField
        key={n}
        label={`${labels.userDefine} ${n}`}
        maxLength={255}
        value={value ?? ""}
        disabled={disabled}
        onChange={(val) => onChange(val)}
        //fullWidth
      />
    );
  };

  const isDetailLineReadOnly = useCallback(
    (line) => isReadOnly && !(canEditQtyOnly && isNewDetailLine(line)),
    [canEditQtyOnly, isReadOnly],
  );

  const detailColumns = useMemo(
    () => [
      {
        field: "delete",
        headerName: " ",
        width: 25,
        sortable: false,
        filterable: false,
        resizable: false,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <motion.div
              whileHover={!isReadOnly ? { scale: 1.1 } : {}}
              whileTap={!isReadOnly ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <IconButton
                size="small"
                disabled={isReadOnly && Number(params.row.qty_receive || 0) > 0}
                onClick={() => handleDeleteLine(params.row.id)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </motion.div>
          </Box>
        ),
      },
      {
        field: "line",
        headerName: "#",
        width: 70,
        sortable: false,
        filterable: false,
        resizable: false,
        renderCell: (params) => formatDetailLineNo(params.row.line),
      },
      {
        field: "item_number",
        headerName: `${labels.itemNumber}*`,
        width: 280,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <DetailItemNumberCell
            lineId={params.row.id}
            itemMasterId={params.row.item_master_id}
            itemNumber={params.row.item_number}
            itemDescription={params.row.item_description}
            lotNumber={params.row.lot_number}
            expiryDate={params.row.expiry_date}
            serialNumber={params.row.serial_number}
            isReadOnly={isDetailLineReadOnly(params.row)}
            readOnlySx={warehouseOwnerReadOnlySx}
            lineError={lineErrors[params.row.id]}
            onSelectItem={handleSelectItemForLine}
          />
        ),
      },
      {
        field: "uom",
        headerName: `${labels.uom}*`,
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <DetailUomCell
            lineId={params.row.id}
            itemMasterId={params.row.item_master_id}
            itemUomId={params.row.item_uom_id}
            uom={params.row.uom}
            isReadOnly={
              isDetailLineReadOnly(params.row) ||
              isFullControlEnabled(params.row.sn_control)
            }
            readOnlySx={warehouseOwnerReadOnlySx}
            lineError={lineErrors[params.row.id]}
            onSelectUom={handleDetailLinePatch}
          />
        ),
      },
      {
        field: "qty_order",
        headerName: `${labels.qtyOrder}*`,
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={DETAIL_CELL_WRAPPER_SX}>
            <BSTextField
              size="small"
              fullWidth
              type="decimal"
              scale={DECIMAL_PLACES}
              sx={DETAIL_CONTROL_SX}
              // onFocus={(event) => event.target.select()}
              value={
                isQtyLockedBySnControl(params.row)
                  ? 1
                  : (params.row.qty_order ?? "")
                // isQtyLockedBySnControl(params.row)
                //   ? formatDecimalValue(1, DECIMAL_PLACES)
                //   : formatDecimalValue(
                //       (params.row.qty_order ?? ""),
                //       DECIMAL_PLACES,
                //     )
              }
              disabled={
                (isReadOnly && !canEditQtyOnly) ||
                form.order_type === "Blind Receipt" ||
                isQtyLockedBySnControl(params.row)
              }
              error={Boolean(lineErrors[params.row.id]?.qty_order)}
              // helperText={lineErrors[params.row.id]?.qty_order || ""}
              onChange={(val) =>
                handleDetailLineChange(params.row.id, "qty_order", val)
              }
            />
          </Box>
        ),
      },
      {
        field: "qty_receive",
        headerName: `${labels.qtyReceived}`,
        width: 130,
        type: "decimal",
        decimals: DECIMAL_PLACES,
        align: "right",
      },
      {
        field: "inv_status",
        headerName: `${labels.itemStatus}*`,
        width: 190,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <DetailStatusCell
            lineId={params.row.id}
            value={params.row.inv_status}
            isReadOnly={isDetailLineReadOnly(params.row)}
            readOnlySx={warehouseOwnerReadOnlySx}
            lineError={lineErrors[params.row.id]}
            onSelectStatus={handleDetailLinePatch}
          />
        ),
      },
      {
        field: "lot_number",
        headerName: `${labels.lotNumber}`,
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={DETAIL_CELL_WRAPPER_SX}>
            <BSTextField
              size="small"
              fullWidth
              sx={{
                ...DETAIL_CONTROL_SX,
                display: isFullControlEnabled(params.row.lot_control)
                  ? "block"
                  : "none",
              }}
              value={params.row.lot_number}
              maxLength={50}
              disabled={
                isDetailLineReadOnly(params.row) ||
                !isFullControlEnabled(params.row.lot_control)
              }
              error={Boolean(lineErrors[params.row.id]?.lot_number)}
              onChange={(val) =>
                handleDetailLineChange(params.row.id, "lot_number", val)
              }
            />
          </Box>
        ),
      },
      {
        field: "expiry_date",
        headerName: `${labels.expiryDate}`,
        width: 190,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={DETAIL_CELL_WRAPPER_SX}>
            <BSDatepicker
              value={params.row.expiry_date}
              isDateOnly
              format={DATE_FORMAT}
              disabled={
                isDetailLineReadOnly(params.row) ||
                !isFullControlEnabled(params.row.expiry_date_control)
              }
              error={Boolean(lineErrors[params.row.id]?.expiry_date)}
              slotProps={{
                textField: {
                  sx: {
                    ...DETAIL_DATEPICKER_TEXTFIELD_SX,
                    display: isFullControlEnabled(
                      params.row.expiry_date_control,
                    )
                      ? "block"
                      : "none",
                  },
                },
              }}
              fullWidth
              size="small"
              onChange={(val) =>
                handleDetailLineChange(
                  params.row.id,
                  "expiry_date",
                  val || null,
                )
              }
            />
          </Box>
        ),
      },
      {
        field: "serial_number",
        headerName: `${labels.serialNumber}`,
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={DETAIL_CELL_WRAPPER_SX}>
            <BSTextField
              size="small"
              fullWidth
              sx={{
                ...DETAIL_CONTROL_SX,
                display: isFullControlEnabled(params.row.sn_control)
                  ? "block"
                  : "none",
              }}
              value={params.row.serial_number}
              maxLength={50}
              disabled={
                isDetailLineReadOnly(params.row) ||
                !isFullControlEnabled(params.row.sn_control)
              }
              error={Boolean(lineErrors[params.row.id]?.serial_number)}
              onChange={(val) =>
                handleDetailLineChange(params.row.id, "serial_number", val)
              }
            />
          </Box>
        ),
      },
    ],
    [
      handleDeleteLine,
      handleDetailLineChange,
      handleDetailLinePatch,
      handleSelectItemForLine,
      isDetailLineReadOnly,
      labels,
      lineErrors,
      canEditQtyOnly,
      isReadOnly,
      warehouseOwnerReadOnlySx,
    ],
  );

  if (viewMode === "form") {
    return (
      <>
        <Box sx={{ p: 2.5 }}>
          {/* Header row */}
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
                onClick={() => setViewMode("list")}
                sx={{ border: "1px solid", borderColor: "divider" }}
                disabled={
                  actionLoading.save ||
                  actionLoading.delete ||
                  actionLoading.closeOrder
                }
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {isEdit
                      ? `${labels.pageTitleEdit} ${form.inbound_no}`
                      : labels.pageTitleAdd}
                  </Typography>
                </Box>
                {isEdit && form.inbound_no ? (
                  <Typography color="text.secondary" fontSize="0.95rem">
                    · {labels.createBy} {form.create_by} {formattedCreateDate}
                    {form.update_by
                      ? ` · ${labels.updateBy} ${form.update_by} ${formattedUpdateDate}`
                      : ""}
                  </Typography>
                ) : (
                  !isEdit && (
                    <Typography color="text.secondary" fontSize="1.03rem">
                      {labels.createDocument}
                    </Typography>
                  )
                )}
              </Box>
            </Box>
            {isEdit && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <ButtonGroup variant="outlined">
                  <Button
                    startIcon={<PrintOutlinedIcon />}
                    onClick={() => handleReportClick(INBOUND_REPORTS[0])}
                  >
                    {labels.printDocument}
                  </Button>
                  <Button
                    size="small"
                    aria-label="select report"
                    aria-controls={
                      reportMenuAnchor ? "inbound-report-menu" : undefined
                    }
                    aria-expanded={reportMenuAnchor ? "true" : undefined}
                    aria-haspopup="menu"
                    onClick={(event) =>
                      setReportMenuAnchor(event.currentTarget)
                    }
                  >
                    <ArrowDropDownIcon />
                  </Button>
                </ButtonGroup>
                <Menu
                  id="inbound-report-menu"
                  anchorEl={reportMenuAnchor}
                  open={Boolean(reportMenuAnchor)}
                  onClose={handleReportMenuClose}
                >
                  {INBOUND_REPORTS.map((report) => (
                    <MenuItem
                      key={report.code}
                      onClick={() => handleReportClick(report)}
                    >
                      {report.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
          </Box>

          {/* Total Summary */}
          {isEdit && (
            <TransactionTotalSummary
              summaryExpanded={summaryExpanded}
              onToggleExpand={() => setSummaryExpanded((prev) => !prev)}
              lang={locale_id}
              receiveQuantityLabel={labels.receiveQuantity}
              statusProgressLabel={
                labels.statusProgress ?? "Inbound Status Progress"
              }
              activeStep={
                normalizeStatus(form.order_status) === "CLOSED"
                  ? progressSteps.length
                  : getStatusStepIndex(form.order_status)
              }
              steps={progressSteps}
              summary={summary}
              decimalPlaces={DECIMAL_PLACES}
            />
          )}

          <Paper
            sx={{
              borderRadius: 2,
              p: orderInfoExpanded ? 2.5 : 1.25,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: orderInfoExpanded ? 1.5 : 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DescriptionOutlinedIcon sx={{ color: "#3b56c5" }} />
                <Typography
                  variant="h5"
                  sx={{
                    color: "#3b56c5",
                    fontWeight: 700,
                    fontSize: orderInfoExpanded ? 18 : 16,
                    lineHeight: 1.2,
                  }}
                >
                  {labels.orderInformation}
                </Typography>
              </Box>

              <Box>
                <Tooltip
                  title={
                    orderInfoExpanded
                      ? labels.collapseOrderInformation
                      : labels.expandOrderInformation
                  }
                  placement="bottom"
                >
                  <IconButton
                    size="small"
                    onClick={() => setOrderInfoExpanded((p) => !p)}
                    aria-label={
                      orderInfoExpanded
                        ? labels.collapseOrderInformation
                        : labels.expandOrderInformation
                    }
                    aria-expanded={orderInfoExpanded}
                    sx={{
                      color: "#3b56c5",
                      borderRadius: 1,
                      boxShadow: orderInfoExpanded
                        ? "0 1px 6px rgba(59,86,197,0.12)"
                        : undefined,
                      border: "1px solid",
                      borderColor: orderInfoExpanded
                        ? "rgba(59,86,197,0.12)"
                        : "transparent",
                    }}
                    disabled={
                      actionLoading.save ||
                      actionLoading.delete ||
                      actionLoading.closeOrder
                    }
                  >
                    {orderInfoExpanded ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Collapse in={orderInfoExpanded} unmountOnExit>
              <Divider sx={{ mb: 2.25 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  "@media (min-width: 1025px)": {
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1.25,
                }}
              >
                <BSTextField
                  label={labels.inboundOrderNo}
                  value={form.inbound_no}
                  disabled={isEdit || isReadOnly}
                  fullWidth
                  onChange={(val) =>
                    setForm((p) => ({ ...p, inbound_no: val }))
                  }
                  // onChange={handleInboundOrderNoChange}
                  // onInput={(event) =>
                  //   handleInboundOrderNoChange(event?.target?.value)
                  // }
                  placeholder={isEdit ? "" : labels.inboundAutoGen}
                />

                <BSAutoComplete
                  bsMode="select"
                  bsTitle={`${labels.orderType} *`}
                  sx={{
                    ...bsAutoCompleteDisabledSx,
                    ...(isReadOnly || isEdit ? warehouseOwnerReadOnlySx : {}),
                  }}
                  bsPreObj="sec"
                  bsObj="t_com_combobox_item"
                  bsColumes={[
                    {
                      field: "value_member",
                      display: false,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "display_member",
                      display: true,
                      filter: true,
                      key: false,
                    },
                  ]}
                  bsObjBy=""
                  bsObjWh={
                    isEdit
                      ? "is_active=1 AND group_name='inbound_order_type'"
                      : "is_active=1 AND group_name='inbound_order_type' AND value_member NOT IN (SELECT value FROM inv.t_inv_rule WHERE rule_code = 'ORDER_TYPE_FOR_BLIND_RECEIPT' ) "
                  }
                  bsCacheKey="order_type"
                  autoSelectSingleOption
                  bsValue={form.order_type}
                  readOnly={isReadOnly || isEdit}
                  bsOnChange={(val) => {
                    if (isReadOnly || isEdit) return;
                    setForm((p) => ({
                      ...p,
                      order_type: val?.value || "",
                    }));
                    if (errors.order_type)
                      setErrors((p) => ({ ...p, order_type: "" }));
                  }}
                  error={Boolean(errors.order_type)}
                  helperText={errors.order_type}
                  fullWidth
                />

                <BSTextField
                  label={labels.orderStatus}
                  value={form.order_status}
                  disabled
                  fullWidth
                />

                <BSDatepicker
                  label={labels.orderDate}
                  value={form.order_date}
                  isDateOnly
                  format={DATE_FORMAT}
                  disabled={isReadOnly}
                  onChange={(val) =>
                    setForm((p) => ({ ...p, order_date: val || null }))
                  }
                  error={Boolean(errors.order_date)}
                  helperText={errors.order_date}
                  fullWidth
                />

                <BSDatepicker
                  label={labels.expectedDeliveryDate}
                  value={form.expected_delivery}
                  isDateOnly
                  format={DATE_FORMAT}
                  disabled={isReadOnly && !canEditQtyOnly}
                  onChange={(val) => {
                    setForm((p) => ({ ...p, expected_delivery: val || null }));
                    if (errors.expected_delivery)
                      setErrors((p) => ({ ...p, expected_delivery: "" }));
                  }}
                  error={Boolean(errors.expected_delivery)}
                  helperText={errors.expected_delivery}
                  fullWidth
                />

                <BSAutoComplete
                  bsMode="single"
                  bsTitle={labels.supplier}
                  sx={{
                    ...bsAutoCompleteDisabledSx,
                    ...(isReadOnly && !canEditQtyOnly
                      ? warehouseOwnerReadOnlySx
                      : {}),
                  }}
                  bsPreObj="inv"
                  bsObj="t_inv_business_partner"
                  bsColumes={[
                    {
                      field: "business_partner_id",
                      display: false,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "business_code",
                      display: true,
                      filter: true,
                      key: false,
                    },
                    {
                      field: "business_name",
                      display: true,
                      filter: true,
                      key: false,
                    },
                  ]}
                  bsObjBy="business_code"
                  bsObjWh={"is_active=1 AND business_type='Supplier'"}
                  bsCacheKey="supplier_id"
                  bsValue={form.supplier_id}
                  readOnly={isReadOnly && !canEditQtyOnly}
                  bsOnChange={(val) => {
                    if (isReadOnly && !canEditQtyOnly) return;
                    setForm((p) => ({
                      ...p,
                      supplier_id: val?.code || "",
                      supplier: val?.value || "",
                    }));
                    if (errors.supplier)
                      setErrors((p) => ({ ...p, supplier: "" }));
                  }}
                  error={Boolean(errors.supplier)}
                  helperText={errors.supplier}
                  fullWidth
                />

                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    "@media (min-width: 1025px)": {
                      gridColumn: "span 2",
                    },
                  }}
                >
                  <BSAutoComplete
                    bsMode="single"
                    bsTitle={labels.customer}
                    sx={{
                      ...bsAutoCompleteDisabledSx,
                      ...(isReadOnly && !canEditQtyOnly
                        ? warehouseOwnerReadOnlySx
                        : {}),
                    }}
                    bsPreObj="inv"
                    bsObj="t_inv_business_partner"
                    bsColumes={[
                      {
                        field: "business_partner_id",
                        display: false,
                        filter: false,
                        key: true,
                      },
                      {
                        field: "business_code",
                        display: true,
                        filter: true,
                        key: false,
                      },
                      {
                        field: "business_name",
                        display: true,
                        filter: true,
                        key: false,
                      },
                    ]}
                    bsObjBy="business_code"
                    bsObjWh={"is_active=1 AND business_type='Customer'"}
                    bsCacheKey="customer_id"
                    bsValue={form.customer_id}
                    readOnly={isReadOnly && !canEditQtyOnly}
                    bsOnChange={(val) => {
                      if (isReadOnly && !canEditQtyOnly) return;
                      setForm((p) => ({
                        ...p,
                        customer_id: val?.code || "",
                        customer: val?.value || "",
                      }));
                    }}
                    fullWidth
                  />
                </Box>
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    "@media (min-width: 1025px)": {
                      gridColumn: "1 / 3",
                    },
                  }}
                >
                  <BSTextField
                    label={labels.description}
                    placeholder={labels.description}
                    value={form.description}
                    maxLength={250}
                    disabled={isReadOnly && !canEditQtyOnly}
                    multiline
                    minRows={2}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, description: val }))
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    "@media (min-width: 1025px)": {
                      gridColumn: "3 / 5",
                    },
                  }}
                >
                  <BSTextField
                    label={labels.remark}
                    placeholder={labels.remark}
                    value={form.remark}
                    maxLength={250}
                    disabled={isReadOnly && !canEditQtyOnly}
                    onChange={(val) => setForm((p) => ({ ...p, remark: val }))}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Box>
              </Box>
            </Collapse>
          </Paper>

          <Paper sx={{ borderRadius: 2, overflow: "hidden", mb: 2.5 }}>
            <Tabs
              value={formTab}
              onChange={(_, value) => setFormTab(value)}
              sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Tab value="inbound" label={labels.inboundDetail} />
              {isEdit && (
                <Tab value="partial-receive" label={labels.partialReceive} />
              )}
              <Tab value="user-defined" label={labels.userDefined} />
            </Tabs>

            {formTab === "inbound" ? (
              <Box sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.75,
                  }}
                >
                  <Typography variant="h5" fontWeight={700}>
                    {labels.inboundDetailLines}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 22,
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<QrCodeScannerOutlinedIcon />}
                        onClick={handlePrintSelectedInboundStickers}
                        sx={{ display: isEdit ? "inline-flex" : "none" }}
                      >
                        {labels.printSticker}
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={canAddDetailLine ? { scale: 1.04 } : {}}
                      whileTap={canAddDetailLine ? { scale: 0.96 } : {}}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 22,
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddLine}
                        disabled={
                          !canAddDetailLine ||
                          form.order_type === "Blind Receipt"
                        }
                      >
                        {labels.addLine}
                      </Button>
                    </motion.div>
                  </Box>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{ borderRadius: 1.5, overflow: "hidden" }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <BSDataGridClient
                      data={detailLines}
                      columns={detailColumns}
                      bsLocale={locale_id}
                      bsShowRowNumber={false}
                      showToolbar={
                        !isEdit
                          ? false
                          : normalizeStatus(form.order_status) === "OPEN"
                            ? false
                            : true
                      }
                      showQuickFilter={false}
                      showExport={false}
                      pagination={false}
                      hideFooter
                      height="600px"
                      rowHeight={DETAIL_ROW_HEIGHT}
                      disableColumnMenu
                      disableColumnFilter
                      disableColumnSelector
                      disableDensitySelector
                      bsShowCheckbox={true}
                      onCheckBoxSelected={handleDetailGridCheckBoxSelected}
                      loading={detailLoading}
                      columnVisibilityModel={
                        normalizeStatus(form.order_status) === "OPEN"
                          ? { qty_receive: false }
                          : {}
                      }
                      onRefresh={() => {
                        fetchData();
                      }}
                    />
                  </motion.div>
                </Paper>
              </Box>
            ) : formTab === "partial-receive" ? (
              <Box sx={{ p: 2.5 }}>
                {/* Receive Header selector row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {/* <Typography fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                      {labels.receiveNumber}
                    </Typography> */}
                    <Box sx={{ minWidth: 240, width: { xs: "100%", sm: 320 } }}>
                      <BSAutoComplete
                        size="small"
                        bsMode="select"
                        bsTitle={labels.receiveNumber}
                        sx={bsAutoCompleteDisabledSx}
                        bsPreObj="inv"
                        bsObj="t_inv_inbound_receipt_header"
                        bsColumes={[
                          {
                            field: "receipt_header_id",
                            display: false,
                            filter: false,
                            key: true,
                          },
                          {
                            field: "receipt_number",
                            display: true,
                            filter: true,
                            key: false,
                          },
                        ]}
                        bsObjBy="receipt_number"
                        bsObjWh={
                          "inbound_master_id='" + form.inbound_master_id + "'"
                        }
                        bsCacheKey="receipt_header_id"
                        bsValue={selectedReceipt}
                        autoSelectSingleOption
                        bsOnChange={async (val) => {
                          const nextReceiptId =
                            typeof val === "string" ? val : val?.code || "";
                          setSelectedReceipt(nextReceiptId);
                          setReceiptDetailTab("receive-detail");
                          await loadReceiptHeader(nextReceiptId);
                        }}
                      />
                    </Box>
                  </Box>
                  {hasSelectedReceipt && (
                    <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
                      <Button
                        variant="outlined"
                        startIcon={
                          actionLoading.saveReceipt ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DescriptionOutlinedIcon />
                          )
                        }
                        size="small"
                        disabled={isReceiptClosed || actionLoading.saveReceipt}
                        onClick={handleSaveReceipt}
                      >
                        {labels.saveReceipt}
                      </Button>
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={
                          actionLoading.closeReceipt ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <LockOutlinedIcon />
                          )
                        }
                        size="small"
                        disabled={isReceiptClosed || actionLoading.closeReceipt}
                        onClick={handleCloseReceipt}
                      >
                        {labels.closeReceipt}
                      </Button>
                    </Box>
                  )}
                </Box>

                {!hasSelectedReceipt ? (
                  /* Empty state */
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      py: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      color: "text.disabled",
                    }}
                  >
                    <SubjectOutlinedIcon sx={{ fontSize: 52, opacity: 0.35 }} />
                    <Typography
                      fontWeight={700}
                      fontSize="1rem"
                      color="text.primary"
                    >
                      {labels.noReceiptSelected}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {labels.selectReceiptPrompt}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Receipt header info card */}
                    <Paper
                      variant="outlined"
                      sx={{ borderRadius: 2, p: 2, mb: 2 }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 1.5,
                        }}
                      >
                        {[
                          [
                            labels.receiptNumber,
                            currentReceipt?.receipt_no ||
                              selectedReceipt ||
                              "—",
                          ],
                          [
                            labels.receiptStatus,
                            currentReceipt?.status || labels.open,
                          ],
                          [
                            labels.createDate,
                            formatDateTimeValue(currentReceipt?.create_date),
                          ],
                          [labels.createBy, currentReceipt?.create_by || "—"],
                          [
                            labels.closeDate,
                            formatDateTimeValue(currentReceipt?.close_date),
                          ],
                          [labels.closeBy, currentReceipt?.close_by || "—"],
                        ].map(([label, value]) => (
                          <Box key={label}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              gutterBottom
                            >
                              {label}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={
                                label === labels.receiptStatus ? 700 : 400
                              }
                              color={
                                label === labels.receiptStatus
                                  ? getReceiptStatusPalette(value).text
                                  : "text.primary"
                              }
                            >
                              {value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    {/* Inner tabs */}
                    <Paper
                      variant="outlined"
                      sx={{ borderRadius: 2, overflow: "hidden" }}
                    >
                      <Tabs
                        value={receiptDetailTab}
                        onChange={(_, v) => setReceiptDetailTab(v)}
                        sx={{
                          px: 2,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Tab
                          value="receive-detail"
                          label={labels.receiveDetail}
                        />
                        <Tab value="user-define" label={labels.userDefine} />
                      </Tabs>

                      {receiptDetailTab === "receive-detail" ? (
                        <Box
                          sx={{
                            p: 0,
                            width: "100%",
                            overflowX: "auto",
                            minWidth: 0,
                          }}
                        >
                          <BSDataGrid
                            bsLocale={locale_id}
                            bsPreObj="inv"
                            bsObj="t_inv_inbound_receipt_detail"
                            bsCols="item_number,item_description,quantity_received,uom,receipt_inv_status,lot_number,expiry_date,serial_number,receive_date,create_by,create_date"
                            // bsObjBy="line asc"
                            bsObjWh={receiptDetailWhere}
                            bsShowDescColumn={false}
                            showAdd={false}
                            bsVisibleEdit={false}
                            bsVisibleDelete={false}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ p: 2.5 }}>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                                xl: "repeat(4, minmax(0, 1fr))",
                              },
                              gap: 1.75,
                            }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
                              renderUserDefControl(
                                n,
                                receiptUserDef[`user_def_${n}`],
                                (nextValue) =>
                                  setReceiptUserDef((p) => ({
                                    ...p,
                                    [`user_def_${n}`]: nextValue,
                                  })),
                                currentReceipt?.status === "Closed",
                              ),
                            )}
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  </>
                )}
              </Box>
            ) : (
              <Box sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.75,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
                    renderUserDefControl(
                      n,
                      form[`user_def_${n}`],
                      (nextValue) =>
                        setForm((p) => ({
                          ...p,
                          [`user_def_${n}`]: nextValue,
                        })),
                      isReadOnly && !canEditQtyOnly,
                    ),
                  )}
                </Box>
              </Box>
            )}
          </Paper>

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
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {isEdit &&
                  (normalizedFormStatus === "OPEN" ||
                    normalizedFormStatus === "RECEIVING") && (
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 22,
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<BlockOutlinedIcon />}
                        onClick={handleCloseOrder}
                        sx={ACTION_BUTTON_THEMES.info}
                        disabled={
                          actionLoading.closeOrder || actionLoading.delete
                        }
                        endIcon={
                          actionLoading.closeOrder ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : null
                        }
                      >
                        {labels.closeOrder}
                      </Button>
                    </motion.div>
                  )}
                {isEdit && !isReadOnly && (
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<Delete />}
                      size="small"
                      onClick={handleDeleteInbound}
                      sx={ACTION_BUTTON_THEMES.error}
                      disabled={
                        actionLoading.delete || actionLoading.closeOrder
                      }
                      endIcon={
                        actionLoading.delete ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : null
                      }
                    >
                      {labels.delete}
                    </Button>
                  </motion.div>
                )}
              </Box>

              {/* Right side: when editing show Cancel/Save on the right */}
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {isEdit && (
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        actionLoading.refresh ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <RefreshOutlinedIcon />
                        )
                      }
                      onClick={handleRefresh}
                      disabled={
                        actionLoading.refresh ||
                        actionLoading.save ||
                        actionLoading.delete ||
                        actionLoading.closeOrder
                      }
                      sx={ACTION_BUTTON_THEMES.clear}
                    >
                      {labels.refresh || "Refresh"}
                    </Button>
                  </motion.div>
                )}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => setViewMode("list")}
                    sx={ACTION_BUTTON_THEMES.close}
                    disabled={
                      actionLoading.save ||
                      actionLoading.delete ||
                      actionLoading.closeOrder
                    }
                  >
                    {labels.back}
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={
                    !isReadOnly || canEditQtyOnly ? { scale: 1.04 } : {}
                  }
                  whileTap={
                    !isReadOnly || canEditQtyOnly ? { scale: 0.96 } : {}
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    sx={ACTION_BUTTON_THEMES.success}
                    disabled={
                      (isReadOnly && !canEditQtyOnly) ||
                      actionLoading.save ||
                      actionLoading.closeOrder
                    }
                    onClick={handleSave}
                    startIcon={
                      actionLoading.save ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SaveOutlinedIcon />
                      )
                    }
                  >
                    {labels.save}
                  </Button>
                </motion.div>
              </Box>
            </Box>
          </Paper>
        </Box>

        <ReportPreviewDialog
          open={reportPreview.open}
          onClose={handleReportPreviewClose}
          title={reportPreview.title}
          reportCode={reportPreview.reportCode}
          parameters={reportPreview.parameters}
          lang={locale_id}
        />
      </>
    );
  }

  return (
    <Paper
      sx={{
        p: 2,
        // mb: 3,
        width: "100%",
        //  maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease-in-out",
      }}
    >
      {/* <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      > */}
      <BSDataGrid
        bsLocale={locale_id}
        bsPreObj="inv"
        bsObj="v_inv_inbound_master"
        bsCols="inbound_master_id,progress,total_detail_lines,order_status,inbound_order_number,order_type,order_date,expected_delivery_date,supplier_id,supplier_name,customer_id,customer_code,customer_name,description,create_by,create_date,update_by,update_date,user_def1,user_def2,user_def3,user_def4,user_def5,user_def6,user_def7,user_def8,user_def9,user_def10,remark"
        bsObjBy="create_date desc"
        bsShowDescColumn={true}
        bsKeyId="inbound_master_id"
        showAdd={true}
        onEdit={openEditForm}
        onAdd={openCreateForm}
        onDelete={handleDeleteInbound}
        bsVisibleEdit={permission.is_edit}
        bsVisibleDelete={permission.is_delete}
        bsAllowDelete={permission.is_delete}
        bsVisibleView={permission.is_view}
        bsRowConfig={(row) => ({
          showDelete: normalizeStatus(row?.order_status) === "OPEN",
        })}
        bsColumnDefs={[
          {
            field: "inbound_order_number",
            renderCell: (params) => (
              <Typography
                component="span"
                sx={{ color: "#3b56c5", fontWeight: 700 }}
              >
                {params.value}
              </Typography>
            ),
          },
          { field: "supplier_id", hide: true },
          { field: "inbound_master_id", hide: true },
          { field: "customer_id", hide: true },
          { field: "customer_code", hide: true },
          { field: "user_def1", hide: true },
          { field: "user_def2", hide: true },
          { field: "user_def3", hide: true },
          { field: "user_def4", hide: true },
          { field: "user_def5", hide: true },
          { field: "user_def6", hide: true },
          { field: "user_def7", hide: true },
          { field: "user_def8", hide: true },
          { field: "user_def9", hide: true },
          { field: "user_def10", hide: true },
          { field: "remark", hide: true },
          { field: "order_date", hide: false, type: "date" },
          {
            field: "total_detail_lines",
            hide: false,
          },
          {
            field: "expected_delivery_date",
            hide: false,
            type: "date",
          },
          {
            field: "order_status",
            renderCell: (params) => {
              const palette = getStatusPalette(params.value);
              return (
                <Chip
                  size="small"
                  label={params.value}
                  sx={{
                    color: palette.text,
                    //borderColor: palette.border,
                    //backgroundColor: palette.bg,
                    // borderWidth: 1,
                    //borderStyle: "solid",
                    backgroundColor: "transparent",
                    border: "none",
                    // p: 0,
                    // height: "auto",
                    minWidth: 96,
                    "& .MuiChip-label": { fontWeight: 700 },
                  }}
                />
              );
            },
          },
          {
            field: "progress",
            width: 130,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
              const raw = Number(params.value || 0);
              const progressValue = Math.max(0, Math.min(100, Math.round(raw)));
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
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    {progressValue}%
                  </Typography>
                </Box>
              );
            },
          },
          { field: "create_date", type: "datetime" },
          { field: "create_by" },
          { field: "update_date", type: "datetime" },
          { field: "update_by" },
          { field: "description", hide: true },
          { field: "supplier_name" },
          { field: "customer_name" },
        ]}
        bsComboBox={[
          {
            Column: "order_status",
            Display: "display_member",
            Value: "value_member",
            Default: "--- Select Order Status ---",
            PreObj: "sec",
            Obj: "t_com_combobox_item",
            ObjWh: "group_name= 'inbound_order_status' AND is_active=1",
            ObjBy: "display_sequence asc",
          },
          {
            Column: "order_type",
            Display: "display_member",
            Value: "value_member",
            Default: "--- Select Order Type ---",
            PreObj: "sec",
            Obj: "t_com_combobox_item",
            ObjWh: "group_name= 'inbound_order_type' AND is_active=1",
            ObjBy: "display_sequence asc",
          },
          // {
          //   Column: "supplier_name",
          //   Display: "business_name",
          //   Value: "business_name",
          //   Default: "--- Select Supplier ---",
          //   PreObj: "inv",
          //   Obj: "t_inv_business_partner",
          //   ObjWh: "business_type ='Supplier' AND is_active=1",
          //   ObjBy: "business_name asc",
          // },
        ]}
      />
      {/* </motion.div> */}
    </Paper>
  );
};

export default Inbound;
