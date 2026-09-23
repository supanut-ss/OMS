import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Radio,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AddBox as AddBoxIcon,
  AddCircle as AddCircleIcon,
  Close as CloseIcon,
  RemoveCircle as RemoveCircleIcon,
  SaveOutlined as SaveOutlinedIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import BSDataGrid from "../../components/BSDataGrid";
import { BSDataGridClient } from "../../components/BSDataGrid";
import BSDialog from "../../components/BSDialog";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSTextField from "../../components/BSTextField";
import BSDatepicker from "../../components/BSDatepicker";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";
import { formatDateOnly } from "../../utils/dateUtils";
import { DATE_FORMAT } from "../../config/dateConfig";
import dayjs from "dayjs";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";

const escapeSqlValue = (value) => String(value ?? "").replace(/'/g, "''");

const getStatusChipStyle = (statusValue) => {
  const v = String(statusValue || "").toLowerCase();
  if (v.includes("available"))
    return {
      color: "#059669",
    };
  if (v.includes("hold"))
    return {
      color: "#f59e0b",
    };
  if (v.includes("damaged"))
    return {
      color: "#ef4444",
    };
  if (v.includes("quarantine"))
    return {
      color: "#7c3aed",
    };
  return {
    color: "#64748b",
  };
};

const hasValidSerialNumber = (row) => {
  const serial = String(row?.serial_number ?? "").trim();
  if (!serial || serial === "-" || serial.toLowerCase() === "n/a") return false;
  return true;
};

const isFullControl = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase() === "full";

const normalizeNonNegativeNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (value === "") return "";
  if (!/^\d+$/.test(value)) return null;
  return value;
};

const blockInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", "."].includes(event.key)) {
    event.preventDefault();
  }
};

const blockNonDigitPaste = (event) => {
  const pasted = event.clipboardData?.getData("text") ?? "";
  if (!/^\d+$/.test(String(pasted).trim())) {
    event.preventDefault();
  }
};

const ACTION_BUTTON_BASE_SX = {
  minHeight: 33,
  px: 2,
  py: 0.7,
  fontWeight: 400,
  "&:hover": {
    boxShadow: "0 12px 26px rgba(15, 23, 42, 0.24)",
    filter: "brightness(1.04)",
  },
};

const ACTION_BUTTON_THEMES = {
  save: {
    ...ACTION_BUTTON_BASE_SX,
    background: "linear-gradient(135deg, #10B981 0%, #10B981 100%)",
  },
  close: {
    ...ACTION_BUTTON_BASE_SX,
    background: "linear-gradient(135deg, #64748B 0%, #64748B 100%)",
  },
};

const RESOURCE_GROUP = "v_inv_inventory_for_change";

const LABEL_DEFS = {
  adjustStock: ["adjust_stock", "Adjust Stock"],
  adjustIn: ["adjust_in", "Adjust In"],
  adjustInTitle: ["adjust_in_title", "Adjust In (Add New Stock)"],
  close: ["close", "Close"],
  save: ["save", "Save"],
  remark: ["remark", "Remark"],
  permissionDenied: [
    "permission_denied_edit",
    "You do not have permission to edit.",
  ],
  selectAtLeastOneRow: [
    "select_at_least_one_row",
    "Please select at least one row first.",
  ],
  selectAdjustMode: [
    "select_adjust_mode",
    "Please select Adjust For (Plus or Minus).",
  ],
  plusNotAllowedSnFull: [
    "plus_not_allowed_sn_full",
    "SN Control Full cannot use Plus in Adjust Stock. Please use Adjust In instead.",
  ],
  adjustQtyGreaterThanZero: [
    "adjust_qty_greater_than_zero",
    "Please enter Adjust Qty greater than 0 for all selected rows (SN Control Full must be 1).",
  ],
  adjustOutExceedQty: [
    "adjust_out_exceed_qty",
    "Adjust Out qty must not exceed available quantity.",
  ],
  serialRequiredAdjustIn: [
    "serial_required_adjust_in",
    "Serial Number is required for Adjust In when SN Control is Full.",
  ],
  adjustmentSaved: ["adjustment_saved", "Adjustment saved successfully."],
  adjustmentSaveFailed: [
    "adjustment_save_failed",
    "Failed to save adjustment.",
  ],
  adjustInSaved: ["adjust_in_saved", "Adjust In saved successfully."],
  adjustInSaveFailed: ["adjust_in_save_failed", "Failed to save adjust in."],
  completedWithSomeErrors: [
    "completed_with_some_errors",
    "Completed with some errors",
  ],
  failedLoadItemInfo: [
    "failed_load_item_information",
    "Failed to load item information.",
  ],
  failedValidateItemLocation: [
    "failed_validate_item_location",
    "Failed to validate Item Number/Location.",
  ],
  itemRequired: ["item_required", "Item is required"],
  itemNotFound: ["item_number_not_found", "Item Number not found"],
  uomRequired: ["uom_required", "UOM is required"],
  quantityLabel: ["quantity", "Quantity"],
  row: ["row", "Row"],
  adjustQty: ["adjust_qty", "Adjust Qty*"],
  quantityGreaterThanZero: [
    "quantity_must_greater_than_zero",
    "Quantity must be greater than 0",
  ],
  quantityMustBeOne: [
    "quantity_must_be_one_sn_full",
    "Quantity must be 1 when SN Control is Full",
  ],
  lotRequired: ["lot_number_required", "Lot number is required for this item"],
  expiryRequired: [
    "expiry_date_required",
    "Expiry date is required for this item",
  ],
  serialRequired: [
    "serial_number_required",
    "Serial number is required for this item",
  ],
  locationRequired: ["location_required", "Location is required"],
  locationNotFound: ["location_not_found", "Location not found"],
  statusRequired: ["status_required", "Status is required"],
  receiveDateRequired: ["receive_date_required", "Receive date is required"],
  selectedRecords: ["selected_records", "record(s) selected"],
  selectedItems: ["selected_items", "Selected Items"],
  item: ["item", "item"],
  adjustFor: ["adjust_for", "Adjust For *"],
  plus: ["plus", "Plus (+)"],
  minus: ["minus", "Minus (-)"],
  reasonPlaceholder: ["reason_for_adjustment", "Reason for adjustment..."],
  addNewStockHint: [
    "add_new_inventory_stock_hint",
    "Add new inventory stock to a specific location",
  ],
  itemNumber: ["item_number", "Item Number"],
  description: ["description", "Description"],
  lotNumber: ["lot_number", "Lot Number"],
  expiryDate: ["expiry_date", "Expiry Date"],
  serialNumber: ["serial_number", "Serial Number"],
  uom: ["uom", "UOM"],
  receiveDate: ["receive_date", "Receive Date"],
  location: ["location", "Location"],
  inventoryStatus: ["inventory_status", "Inventory Status"],
};

const initialAdjustInForm = {
  item_master_id: "",
  item_number: "",
  item_description: "",
  lot_control: "",
  expiry_date_control: "",
  sn_control: "",
  item_uom_id: "",
  lot_number: "",
  expiry_date: "",
  serial_number: "",
  quantity: "",
  uom: "",
  location: "",
  inventory_status: "",
  receive_date: "",
  remark: "",
};

const Adjustment = (props) => {
  const theme = useTheme();
  const { permission } = useOutletContext();
  const canEdit = Boolean(permission?.is_edit);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [resourceData, setResourceData] = useState([]);
  const { getResources } = useResource();
  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(LABEL_DEFS).map(([key, [resourceName, fallback]]) => [
          key,
          resourceData?.find((res) => res.resource_name === resourceName)
            ?.resource_value || fallback,
        ]),
      ),
    [resourceData],
  );
  const gridRef = useRef(null);

  const [selectedRows, setSelectedRows] = useState([]);
  const [openAdjustStock, setOpenAdjustStock] = useState(false);
  const [openAdjustIn, setOpenAdjustIn] = useState(false);

  const [adjustMode, setAdjustMode] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");
  const [adjustQtyByRow, setAdjustQtyByRow] = useState({});
  const [adjustSerialByRow, setAdjustSerialByRow] = useState({});

  const [adjustInForm, setAdjustInForm] = useState(initialAdjustInForm);
  const [adjustInErrors, setAdjustInErrors] = useState({});

  const displayLocale = useMemo(() => {
    const lang = (locale_id || props.lang || "en").toString().toLowerCase();
    return lang.startsWith("th") ? "th" : "en";
  }, [locale_id, props.lang]);

  const userInfo = useMemo(() => {
    const raw = SecureStorage.get("userInfo");
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch {
      return {};
    }
  }, []);
  const userId = userInfo?.UserId ?? userInfo?.userId ?? "";

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        const res = await getResources(RESOURCE_GROUP, props.lang || "en");
        setResourceData(res || []);
      } catch (e) {
        console.error("getResources error:", e);
      }
    };
    loadRes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const selectedCount = selectedRows.length;
  const hasSnFullSelection = useMemo(
    () => selectedRows.some((row) => isFullControl(row?.sn_control)),
    [selectedRows],
  );

  const adjustStockRows = useMemo(
    () =>
      selectedRows.map((row, idx) => {
        const rawKey =
          row?.inventory_id_serial ??
          row?.inventory_id ??
          row?.id ??
          row?.serial_number;
        const rowKey = String(rawKey ?? `row-${idx}`);
        return {
          ...row,
          id: `${rowKey}-${idx}`,
          row_number: idx + 1,
          _rowKey: rowKey,
        };
      }),
    [selectedRows],
  );

  const adjustStockColumns = useMemo(
    () => [
      {
        field: "row_number",
        headerName: labels.row,
        width: 90,
      },
      {
        field: "adjust_qty",
        headerName: labels.adjustQty,
        width: 170,
        renderCell: (params) => {
          const row = params.row;
          const rowKey = row._rowKey;
          const isSnFull = isFullControl(row?.sn_control);
          return (
            <TextField
              size="small"
              type="number"
              value={isSnFull ? 1 : adjustQtyByRow[rowKey] || ""}
              onKeyDown={blockInvalidNumberKeys}
              onPaste={blockNonDigitPaste}
              onChange={(e) => {
                if (isSnFull) return;
                const normalized = normalizeNonNegativeNumberInput(
                  e.target.value,
                );
                if (normalized === null) return;
                setAdjustQtyByRow((prev) => ({
                  ...prev,
                  [rowKey]: normalized,
                }));
              }}
              disabled={isSnFull}
              placeholder={isSnFull ? "1" : "0"}
              inputProps={{ min: 1, ...(isSnFull ? { max: 1 } : {}) }}
              sx={{ width: 120 }}
            />
          );
        },
      },
      {
        field: "quantity",
        headerName: labels.quantityLabel,
        width: 130,
      },
      {
        field: "location",
        headerName: labels.location,
        width: 130,
      },
      {
        field: "item_number",
        headerName: labels.itemNumber,
        width: 170,
      },
      {
        field: "item_description",
        headerName: labels.description,
        width: 220,
      },
      {
        field: "lot_number",
        headerName: labels.lotNumber,
        width: 140,
      },
      {
        field: "expiry_date",
        headerName: labels.expiryDate,
        width: 150,
        renderCell: (params) => {
          const formatted = formatDateOnly(
            params.row?.expiry_date,
            displayLocale,
          );
          return formatted || params.row?.expiry_date || "-";
        },
      },
      {
        field: "serial_number",
        headerName: labels.serialNumber,
        width: 220,
        renderCell: (params) => {
          const row = params.row;
          const rowKey = row._rowKey;
          if (adjustMode === "plus" && isFullControl(row?.sn_control)) {
            return (
              <TextField
                size="small"
                value={adjustSerialByRow[rowKey] ?? row.serial_number ?? ""}
                onChange={(e) =>
                  setAdjustSerialByRow((prev) => ({
                    ...prev,
                    [rowKey]: e.target.value,
                  }))
                }
                placeholder={`${labels.serialNumber}*`}
                fullWidth
              />
            );
          }
          return row.serial_number;
        },
      },
      {
        field: "inv_status",
        headerName: labels.inventoryStatus,
        width: 180,
        renderCell: (params) => (
          <Box
            sx={{
              ...getStatusChipStyle(params?.value),
              minWidth: 88,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.8125rem",
              py: 0.5,
            }}
          >
            {params?.value || "-"}
          </Box>
        ),
      },
    ],
    [
      labels,
      adjustQtyByRow,
      adjustSerialByRow,
      adjustMode,
      setAdjustQtyByRow,
      setAdjustSerialByRow,
      displayLocale,
    ],
  );

  const getAdjustRowKey = (row, index) => {
    const rawKey =
      row?.inventory_id_serial ??
      row?.inventory_id ??
      row?.id ??
      row?.serial_number;
    return String(rawKey ?? `row-${index}`);
  };

  const resolveAdjustQtyValue = (row, index) => {
    if (isFullControl(row?.sn_control)) return 1;
    return Number(adjustQtyByRow[getAdjustRowKey(row, index)]);
  };

  const requireSelection = () => {
    if (!selectedCount) {
      BSAlertSwal2.show("warning", labels.selectAtLeastOneRow);
      return false;
    }
    return true;
  };

  const handleOpenAdjustStock = async () => {
    if (!canEdit) {
      await BSAlertSwal2.show("warning", labels.permissionDenied);
      return;
    }
    if (!requireSelection()) return;
    setAdjustMode("");
    setAdjustQtyByRow({});
    setAdjustSerialByRow({});
    setAdjustRemark("");
    setOpenAdjustStock(true);
  };

  const resetAdjustStockDialog = () => {
    setOpenAdjustStock(false);
    setAdjustMode("");
    setAdjustQtyByRow({});
    setAdjustSerialByRow({});
    setAdjustRemark("");
  };

  useEffect(() => {
    if (!openAdjustStock) return;
    if (adjustMode === "plus" && hasSnFullSelection) {
      setAdjustMode("");
    }
  }, [openAdjustStock, adjustMode, hasSnFullSelection]);

  const resetAdjustInDialog = () => {
    setOpenAdjustIn(false);
    setAdjustInForm(initialAdjustInForm);
    setAdjustInErrors({});
  };

  const handleOpenAdjustIn = async () => {
    if (!canEdit) {
      await BSAlertSwal2.show("warning", labels.permissionDenied);
      return;
    }
    setAdjustInForm(initialAdjustInForm);
    setAdjustInErrors({});
    setOpenAdjustIn(true);
  };

  const validateSelectedQty = ({ requireAdjustMode = false }) => {
    if (!selectedCount) {
      BSAlertSwal2.show("warning", labels.selectAtLeastOneRow);
      return false;
    }
    if (requireAdjustMode && !adjustMode) {
      BSAlertSwal2.show("warning", labels.selectAdjustMode);
      return false;
    }
    const invalidQtyRows = selectedRows
      .map((row, index) => ({
        index,
        value: resolveAdjustQtyValue(row, index),
        isSnFull: isFullControl(row?.sn_control),
      }))
      .filter((item) =>
        item.isSnFull
          ? item.value !== 1
          : Number.isNaN(item.value) || item.value <= 0,
      );

    if (invalidQtyRows.length > 0) {
      const preview = invalidQtyRows
        .slice(0, 3)
        .map((item) => `Row ${item.index + 1}`)
        .join(", ");
      const more =
        invalidQtyRows.length > 3 ? ` +${invalidQtyRows.length - 3} more` : "";
      BSAlertSwal2.show(
        "warning",
        `${labels.adjustQtyGreaterThanZero} Missing: ${preview}${more}`,
      );
      return false;
    }

    if (adjustMode === "minus") {
      const exceedQtyRows = selectedRows
        .map((row, index) => ({
          index,
          value: resolveAdjustQtyValue(row, index),
          max: Number(row?.quantity ?? 0),
        }))
        .filter(
          (item) =>
            !Number.isNaN(item.max) &&
            !Number.isNaN(item.value) &&
            item.value > item.max,
        );

      if (exceedQtyRows.length > 0) {
        const preview = exceedQtyRows
          .slice(0, 3)
          .map((item) => `Row ${item.index + 1}`)
          .join(", ");
        const more =
          exceedQtyRows.length > 3 ? ` +${exceedQtyRows.length - 3} more` : "";
        BSAlertSwal2.show(
          "warning",
          `${labels.adjustOutExceedQty} Invalid: ${preview}${more}`,
        );
        return false;
      }
    }

    if (adjustMode === "plus") {
      const missingSerialRows = selectedRows
        .map((row, index) => ({
          index,
          row,
          rowKey: getAdjustRowKey(row, index),
          serial: String(
            adjustSerialByRow[getAdjustRowKey(row, index)] ??
              row.serial_number ??
              "",
          ).trim(),
        }))
        .filter(({ row, serial }) => isFullControl(row?.sn_control) && !serial);

      if (missingSerialRows.length > 0) {
        const preview = missingSerialRows
          .slice(0, 3)
          .map((item) => `Row ${item.index + 1}`)
          .join(", ");
        const more =
          missingSerialRows.length > 3
            ? ` +${missingSerialRows.length - 3} more`
            : "";
        BSAlertSwal2.show(
          "warning",
          `${labels.serialRequiredAdjustIn} Missing: ${preview}${more}`,
        );
        return false;
      }
    }

    return true;
  };

  const formatExpiryByLocale = (value) => {
    const formatted = formatDateOnly(value, displayLocale);
    return formatted || value || "-";
  };

  const loadPrimaryUom = async (itemNumber) => {
    if (!itemNumber) {
      setAdjustInForm((prev) => ({ ...prev, item_uom_id: "", uom: "" }));
      return;
    }

    try {
      const res = await AxiosMaster.post("/autocomplete", {
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
        where: `is_active=1 AND primary_uom=1 AND item_number='${escapeSqlValue(itemNumber)}'`,
        order_by: "sequence asc",
        include_blank: false,
        keyword: "",
        limit: 30,
      });

      const uomList = Array.isArray(res?.data?.data) ? res.data.data : [];
      const primaryUom =
        uomList.find(
          (row) =>
            String(row.primary_uom ?? row.primaryUom ?? "").trim() === "1",
        ) ||
        uomList[0] ||
        null;

      setAdjustInForm((prev) => ({
        ...prev,
        item_uom_id: primaryUom?.item_uom_id ?? primaryUom?.code ?? "",
        uom: primaryUom?.uom ?? primaryUom?.value ?? "",
      }));
    } catch (error) {
      console.error("loadPrimaryUom error:", error);
      setAdjustInForm((prev) => ({ ...prev, item_uom_id: "", uom: "" }));
    }
  };

  const loadAdjustInItemByNumber = async (itemNumberInput) => {
    const nextItemNumber = String(itemNumberInput ?? "").trim();
    if (!nextItemNumber) {
      setAdjustInForm((prev) => ({
        ...prev,
        item_master_id: "",
        item_number: "",
        item_description: "",
        lot_control: "",
        expiry_date_control: "",
        sn_control: "",
        item_uom_id: "",
        uom: "",
        lot_number: "",
        expiry_date: "",
        serial_number: "",
      }));
      return;
    }

    try {
      const res = await AxiosMaster.post("/autocomplete", {
        table: "t_inv_item",
        schema: "inv",
        columns: [
          {
            field: "item_master_id",
            display: false,
            filter: false,
            key: false,
          },
          { field: "item_number", display: true, filter: true, key: true },
          { field: "description", display: false, filter: true, key: false },
          { field: "lot_control", display: false, filter: false, key: false },
          {
            field: "expiry_date_control",
            display: false,
            filter: false,
            key: false,
          },
          { field: "sn_control", display: false, filter: false, key: false },
        ],
        where: `is_active=1 AND item_number='${escapeSqlValue(nextItemNumber)}'`,
        order_by: "item_number asc",
        include_blank: false,
        keyword: "",
        limit: 1,
      });

      const selected = Array.isArray(res?.data?.data) ? res.data.data[0] : null;
      if (!selected) {
        setAdjustInForm((prev) => ({
          ...prev,
          item_master_id: "",
          item_description: "",
          lot_control: "",
          expiry_date_control: "",
          sn_control: "",
          item_uom_id: "",
          uom: "",
          lot_number: "",
          expiry_date: "",
          serial_number: "",
        }));
        setAdjustInErrors((prev) => ({
          ...prev,
          item_number: labels.itemNotFound,
        }));
        return;
      }

      const nextLotControl = selected?.lot_control ?? "";
      const nextExpiryControl = selected?.expiry_date_control ?? "";
      const nextSerialControl = selected?.sn_control ?? "";
      const allowLotInput = isFullControl(nextLotControl);
      const allowExpiryInput = isFullControl(nextExpiryControl);
      const allowSerialInput = isFullControl(nextSerialControl);

      setAdjustInForm((prev) => ({
        ...prev,
        item_master_id: selected?.item_master_id ?? "",
        item_number: selected?.item_number ?? nextItemNumber,
        item_description: selected?.description ?? "",
        lot_control: nextLotControl,
        expiry_date_control: nextExpiryControl,
        sn_control: nextSerialControl,
        item_uom_id: "",
        uom: "",
        quantity: allowSerialInput ? "1" : prev.quantity,
        lot_number: allowLotInput ? prev.lot_number : "",
        expiry_date: allowExpiryInput ? prev.expiry_date : "",
        serial_number: allowSerialInput ? prev.serial_number : "",
      }));
      setAdjustInErrors((prev) => ({
        ...prev,
        item_number: undefined,
        uom: undefined,
        lot_number: undefined,
        expiry_date: undefined,
        serial_number: undefined,
      }));
      await loadPrimaryUom(selected?.item_number ?? nextItemNumber);
    } catch (error) {
      console.error("loadAdjustInItemByNumber error:", error);
      await BSAlertSwal2.show("error", labels.failedLoadItemInfo);
    }
  };

  const validateAdjustInReferences = async ({ itemNumber, location }) => {
    const nextErrors = {};
    const normalizedItemNumber = String(itemNumber ?? "").trim();
    const normalizedLocation = String(location ?? "").trim();

    try {
      const [itemRes, locationRes] = await Promise.all([
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_item",
          schema: "inv",
          columns: [
            { field: "item_number", display: true, filter: true, key: true },
          ],
          where: `is_active=1 AND item_number='${escapeSqlValue(normalizedItemNumber)}'`,
          order_by: "item_number asc",
          include_blank: false,
          keyword: "",
          limit: 1,
        }),
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_location",
          schema: "inv",
          columns: [
            { field: "location", display: true, filter: true, key: true },
          ],
          where: `is_active=1 AND location='${escapeSqlValue(normalizedLocation)}'`,
          order_by: "location asc",
          include_blank: false,
          keyword: "",
          limit: 1,
        }),
      ]);

      const hasItem =
        Array.isArray(itemRes?.data?.data) && itemRes.data.data.length > 0;
      const hasLocation =
        Array.isArray(locationRes?.data?.data) &&
        locationRes.data.data.length > 0;

      if (!hasItem) nextErrors.item_number = labels.itemNotFound;
      if (!hasLocation) nextErrors.location = labels.locationNotFound;
    } catch (error) {
      console.error("validateAdjustInReferences error:", error);
      await BSAlertSwal2.show("error", labels.failedValidateItemLocation);
      return { ok: false, errors: null };
    }

    if (Object.keys(nextErrors).length > 0) {
      setAdjustInErrors((prev) => ({ ...prev, ...nextErrors }));
      return { ok: false, errors: nextErrors };
    }

    return { ok: true, errors: {} };
  };

  const validateAdjustInLocationInput = async (locationInput) => {
    const normalizedLocation = String(locationInput ?? "").trim();
    if (!normalizedLocation) {
      return { ok: false, message: labels.locationRequired };
    }

    try {
      const res = await AxiosMaster.post("/autocomplete", {
        table: "t_inv_location",
        schema: "inv",
        columns: [
          { field: "location", display: true, filter: true, key: true },
        ],
        where: `is_active=1 AND location='${escapeSqlValue(normalizedLocation)}'`,
        order_by: "location asc",
        include_blank: false,
        keyword: "",
        limit: 1,
      });

      const hasLocation =
        Array.isArray(res?.data?.data) && res.data.data.length > 0;
      if (!hasLocation) {
        return { ok: false, message: labels.locationNotFound };
      }

      return { ok: true, value: normalizedLocation };
    } catch (error) {
      console.error("validateAdjustInLocationInput error:", error);
      return { ok: false, message: "Failed to validate location" };
    }
  };

  const handleSaveAdjust = async () => {
    if (!validateSelectedQty({ requireAdjustMode: true })) return;
    if (adjustMode === "plus" && hasSnFullSelection) {
      await BSAlertSwal2.show("warning", labels.plusNotAllowedSnFull);
      return;
    }
    const adjustmentType =
      adjustMode === "plus"
        ? "ADJUST_IN"
        : adjustMode === "minus"
          ? "ADJUST_OUT"
          : "";

    try {
      const response = await AxiosMaster.post("Inventory/Adjustment", {
        items: selectedRows.map((row, index) => {
          const rowKey = getAdjustRowKey(row, index);
          const item = {
            inventory_id_serials: row.inventory_id_serial,
            quantity: resolveAdjustQtyValue(row, index),
          };

          if (adjustMode === "plus" && isFullControl(row?.sn_control)) {
            const serial = String(
              adjustSerialByRow[rowKey] ?? row.serial_number ?? "",
            ).trim();
            item.serial_number = serial;
          }

          return item;
        }),
        adjustment_type: adjustmentType,
        remark: adjustRemark,
        user_id: userId,
        lang: (locale_id || props.lang || "EN").toString().trim().toUpperCase(),
      });
      const result = response?.data;
      if (result?.success === true) {
        await BSAlertSwal2.show(
          "success",
          result?.message || labels.adjustmentSaved,
        );
        resetAdjustStockDialog();
        setSelectedRows([]);
        if (gridRef.current) gridRef.current.refreshData();
      } else if (result?.errors?.length > 0) {
        const errorList = result.errors
          .map((e) => `<li style="text-align:left">${e}</li>`)
          .join("");
        await BSAlertSwal2.fire({
          icon: "warning",
          title: result?.message || labels.completedWithSomeErrors,
          html: `<ul style="margin:0;padding-left:1.2rem">${errorList}</ul>`,
        });
        if (gridRef.current) gridRef.current.refreshData();
      } else {
        await BSAlertSwal2.show(
          "error",
          result?.message || labels.adjustmentSaveFailed,
        );
      }
    } catch (error) {
      console.error("Adjustment error:", error);
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || labels.adjustmentSaveFailed,
      );
    }
  };

  const handleSaveAdjustIn = async () => {
    const newErrors = {};
    const lotRequired = isFullControl(adjustInForm.lot_control);
    const expiryRequired = isFullControl(adjustInForm.expiry_date_control);
    const serialRequired = isFullControl(adjustInForm.sn_control);
    const normalizedItemNumber = String(adjustInForm.item_number ?? "").trim();
    const normalizedLocation = String(adjustInForm.location ?? "").trim();

    if (!normalizedItemNumber) newErrors.item_number = labels.itemRequired;
    if (!adjustInForm.uom) newErrors.uom = labels.uomRequired;
    if (!adjustInForm.quantity || Number(adjustInForm.quantity) <= 0)
      newErrors.quantity = labels.quantityGreaterThanZero;
    if (serialRequired && Number(adjustInForm.quantity) !== 1)
      newErrors.quantity = labels.quantityMustBeOne;
    if (lotRequired && !adjustInForm.lot_number)
      newErrors.lot_number = labels.lotRequired;
    if (expiryRequired && !adjustInForm.expiry_date)
      newErrors.expiry_date = labels.expiryRequired;
    if (serialRequired && !adjustInForm.serial_number)
      newErrors.serial_number = labels.serialRequired;
    if (!normalizedLocation) newErrors.location = labels.locationRequired;
    if (!adjustInForm.inventory_status)
      newErrors.inventory_status = labels.statusRequired;
    if (!adjustInForm.receive_date)
      newErrors.receive_date = labels.receiveDateRequired;
    setAdjustInErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const referenceValidation = await validateAdjustInReferences({
      itemNumber: normalizedItemNumber,
      location: normalizedLocation,
    });
    if (!referenceValidation.ok) return;

    try {
      const payload = {
        item_number: normalizedItemNumber,
        quantity: Number(adjustInForm.quantity),
        location: normalizedLocation,
        inv_status: adjustInForm.inventory_status,
        receive_date: adjustInForm.receive_date,
        remark: adjustInForm.remark || null,
        user_id: userId,
        lang: (locale_id || props.lang || "EN").toString().trim().toUpperCase(),
      };

      if (lotRequired) payload.lot_number = adjustInForm.lot_number;
      if (expiryRequired) payload.expiry_date = adjustInForm.expiry_date;
      if (serialRequired) payload.serial_number = adjustInForm.serial_number;

      const response = await AxiosMaster.post("Inventory/AdjustIn", payload);
      const result = response?.data;
      if (result?.success === true) {
        await BSAlertSwal2.show(
          "success",
          result?.message || labels.adjustInSaved,
        );
        if (gridRef.current) gridRef.current.refreshData();
      } else if (result?.errors?.length > 0) {
        const errorList = result.errors
          .map((e) => `<li style="text-align:left">${e}</li>`)
          .join("");
        await BSAlertSwal2.fire({
          icon: "warning",
          title: result?.message || labels.completedWithSomeErrors,
          html: `<ul style="margin:0;padding-left:1.2rem">${errorList}</ul>`,
        });
      } else {
        await BSAlertSwal2.show(
          "error",
          result?.message || labels.adjustInSaveFailed,
        );
      }
    } catch (error) {
      console.error("AdjustIn error:", error);
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || labels.adjustInSaveFailed,
      );
    }
  };

  return (
    <Box>
      <Paper
        sx={{
          p: 2,
          //  mb: 3,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* BSDataGrid with real data */}
        <BSDataGrid
          bsCustomActions={[
            {
              label: labels.adjustStock,
              icon: <TuneIcon />,
              onClick: handleOpenAdjustStock,
              disabled: !canEdit,
              // variant: "contained",
              // sx: {
              //   bgcolor: "#4a56c5",
              //   color: "#fff",
              //   "&:hover": { bgcolor: "#3b47b3" },
              // },
            },
            {
              label: labels.adjustIn,
              icon: <AddBoxIcon />,
              onClick: handleOpenAdjustIn,
              disabled: !canEdit,
              // variant: "outlined",
              color: "warning",
              sx: {
                borderColor: "warning.main",
                "&:hover": {
                  bgcolor: "warning.main",
                  color: "white",
                },
              },
            },
          ]}
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="inv"
          bsObj="v_inv_inventory_for_change"
          bsObjBy="create_date desc"
          bsObjWh="loc_type<>'STG'"
          bsCols={[
            "inventory_id_serial",
            "sn_control",
            "zone",
            "location",
            "item_category",
            "item_number",
            "item_description",
            "lot_number",
            "expiry_date",
            "serial_number",
            "quantity",
            "quantity_allocated",
            "uom",
            "inv_status",
            "receive_date",
          ].join(",")}
          bsKeyId="inventory_id_serial"
          bsShowRowNumber={true}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsAllowDelete={false}
          bsShowCheckbox={true}
          bsVisibleView={permission?.is_view}
          bsBulkMode={{ enable: true }}
          bsDialogSize="Large"
          onCheckBoxSelected={(rows) =>
            setSelectedRows(Array.isArray(rows) ? rows : [])
          }
          bsColumnDefs={[
            { field: "inventory_id_serial", hide: true, showInForm: false },
            { field: "sn_control", hide: true, showInForm: false },
            {
              field: "inv_status",
              renderCell: (params) => (
                <Box
                  sx={{
                    ...getStatusChipStyle(params?.value),
                    minWidth: 88,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    py: 0.5,
                  }}
                >
                  {params?.value || "-"}
                </Box>
              ),
            },
          ]}
          bsComboBox={[
            {
              Column: "inv_status",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='inventory_status' AND is_active=1",
              ObjBy: "display_sequence asc",
              Default: "--- Select Status ---",
            },
          ]}
          onSelectionModelChange={(ids, rows) => {
            setSelectedRows(Array.isArray(rows) ? rows : ids);
          }}
        />
      </Paper>
      {/* Adjust Stock Dialog */}
      <BSDialog
        open={openAdjustStock}
        onClose={resetAdjustStockDialog}
        maxWidth="xl"
        title={labels.adjustStock}
        titleTypographyProps={{ sx: { fontWeight: 700 } }}
        contentDividers
        actionsSx={{ px: 3, py: 2 }}
        actions={
          <>
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<CloseIcon />}
                onClick={resetAdjustStockDialog}
                sx={ACTION_BUTTON_THEMES.close}
              >
                {labels.close}
              </Button>
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveAdjust}
                startIcon={<SaveOutlinedIcon />}
                sx={ACTION_BUTTON_THEMES.save}
              >
                {labels.save}
              </Button>
            </motion.span>
          </>
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "420px 1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 0.5 }}
              >
                {labels.adjustFor}
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {[
                  {
                    mode: "plus",
                    icon: (
                      <AddCircleIcon sx={{ fontSize: 22, color: "#10b981" }} />
                    ),
                    label: labels.plus,
                    activeColor: "rgba(16,185,129,0.8)",
                    activeBg: "rgba(16,185,129,0.08)",
                  },
                  {
                    mode: "minus",
                    icon: (
                      <RemoveCircleIcon
                        sx={{ fontSize: 22, color: "#ef4444" }}
                      />
                    ),
                    label: labels.minus,
                    activeColor: "rgba(239,68,68,0.8)",
                    activeBg: "rgba(239,68,68,0.08)",
                  },
                ].map(({ mode, icon, label, activeColor, activeBg }) => (
                  <motion.div
                    key={mode}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 22,
                    }}
                    style={{ flex: 1 }}
                  >
                    {(() => {
                      const disabled = mode === "plus" && hasSnFullSelection;
                      return (
                        <Box
                          onClick={() => {
                            if (disabled) {
                              BSAlertSwal2.show(
                                "warning",
                                labels.plusNotAllowedSnFull,
                              );
                              return;
                            }
                            setAdjustMode(mode);
                          }}
                          sx={{
                            cursor: disabled ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            px: 1.25,
                            py: 0.75,
                            border: "1px solid",
                            borderRadius: 2,
                            borderColor:
                              adjustMode === mode ? activeColor : "divider",
                            backgroundColor:
                              adjustMode === mode
                                ? activeBg
                                : "background.paper",
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          <Radio
                            size="small"
                            checked={adjustMode === mode}
                            onChange={() => {
                              if (disabled) {
                                BSAlertSwal2.show(
                                  "warning",
                                  labels.plusNotAllowedSnFull,
                                );
                                return;
                              }
                              setAdjustMode(mode);
                            }}
                            disabled={disabled}
                          />
                          {icon}
                          <Typography sx={{ fontWeight: 600 }}>
                            {label}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </motion.div>
                ))}
              </Box>
            </Box>
            <BSTextField
              label={labels.remark}
              placeholder={labels.reasonPlaceholder}
              value={adjustRemark}
              onChange={(value) => setAdjustRemark(value)}
              multiline
              minRows={2}
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 72,
                  alignItems: "flex-start",
                },
              }}
              fullWidth
            />
          </Box>
        </motion.div>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          {labels.selectedItems}{" "}
          <Typography component="span" color="text.secondary">
            {`· ${selectedCount} ${labels.item}`}
          </Typography>
        </Typography>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden" }}
          >
            <BSDataGridClient
              data={adjustStockRows}
              columns={adjustStockColumns}
              bsLocale={locale_id}
              bsShowRowNumber={false}
              showToolbar={false}
              pagination={false}
              hideFooter
              rowHeight={52}
              disableColumnMenu
              disableColumnFilter
              disableColumnSelector
              disableDensitySelector
              bsShowCheckbox={false}
            />
          </Paper>
        </motion.div>
      </BSDialog>

      {/* Adjust In Dialog */}
      <BSDialog
        open={openAdjustIn}
        onClose={resetAdjustInDialog}
        maxWidth="lg"
        title={labels.adjustInTitle}
        titleTypographyProps={{ sx: { fontWeight: 700 } }}
        contentDividers
        actionsSx={{ px: 3, py: 2 }}
        actions={
          <>
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<CloseIcon />}
                onClick={resetAdjustInDialog}
                sx={ACTION_BUTTON_THEMES.close}
              >
                {labels.close}
              </Button>
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveAdjustIn}
                startIcon={<SaveOutlinedIcon />}
                sx={ACTION_BUTTON_THEMES.save}
              >
                {labels.save}
              </Button>
            </motion.span>
          </>
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Alert icon={<AddCircleIcon />} severity="success" sx={{ mb: 2 }}>
            {labels.addNewStockHint}
          </Alert>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Item Number */}
            <BSAutoComplete
              bsTitle={labels.itemNumber}
              bsPreObj="inv"
              bsObj="t_inv_item"
              bsObjBy="item_number asc"
              bsObjWh="is_active=1"
              bsColumes={[
                {
                  field: "item_number",
                  display: true,
                  filter: true,
                  key: true,
                },
                {
                  field: "description",
                  display: true,
                  filter: true,
                  key: false,
                },
                {
                  field: "item_master_id",
                  display: false,
                  filter: false,
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
              ]}
              bsValue={adjustInForm.item_number}
              bsOnChange={async (selected) => {
                const nextItemNumber =
                  selected?.item_number ?? selected?.code ?? "";
                setAdjustInForm((prev) => ({
                  ...prev,
                  item_number: nextItemNumber,
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  item_number: undefined,
                }));
                await loadAdjustInItemByNumber(nextItemNumber);
              }}
              required
              error={!!adjustInErrors.item_number}
              helperText={adjustInErrors.item_number || ""}
              fullWidth
            />

            {/* Description (auto-filled) */}
            <BSTextField
              label={labels.description}
              value={adjustInForm.item_description}
              disabled
              fullWidth
            />

            {/* Lot Number */}
            <BSTextField
              label={labels.lotNumber}
              value={adjustInForm.lot_number}
              onChange={(value) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  lot_number: value,
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  lot_number: undefined,
                }));
              }}
              placeholder="LOT-..."
              disabled={!isFullControl(adjustInForm.lot_control)}
              required={isFullControl(adjustInForm.lot_control)}
              error={!!adjustInErrors.lot_number}
              helperText={
                adjustInErrors.lot_number ||
                (!isFullControl(adjustInForm.lot_control)
                  ? "None: ไม่ต้องกรอก"
                  : "")
              }
              fullWidth
            />

            {/* Expiry Date */}
            <BSDatepicker
              label={labels.expiryDate}
              value={
                adjustInForm.expiry_date
                  ? dayjs(adjustInForm.expiry_date)
                  : null
              }
              isDateOnly
              format={DATE_FORMAT}
              onChange={(value) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  expiry_date: value ? dayjs(value).format("YYYY-MM-DD") : "",
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  expiry_date: undefined,
                }));
              }}
              disabled={!isFullControl(adjustInForm.expiry_date_control)}
              required={isFullControl(adjustInForm.expiry_date_control)}
              error={!!adjustInErrors.expiry_date}
              helperText={
                adjustInErrors.expiry_date ||
                (!isFullControl(adjustInForm.expiry_date_control)
                  ? "None: ไม่ต้องกรอก"
                  : "")
              }
              fullWidth
            />

            {/* Serial Number */}
            <BSTextField
              label={labels.serialNumber}
              value={adjustInForm.serial_number}
              onChange={(value) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  serial_number: value,
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  serial_number: undefined,
                }));
              }}
              placeholder="SN-..."
              disabled={!isFullControl(adjustInForm.sn_control)}
              required={isFullControl(adjustInForm.sn_control)}
              error={!!adjustInErrors.serial_number}
              helperText={
                adjustInErrors.serial_number ||
                (!isFullControl(adjustInForm.sn_control)
                  ? "None: ไม่ต้องกรอก"
                  : "")
              }
              fullWidth
            />

            {/* Quantity */}
            <BSTextField
              label={labels.quantityLabel}
              type="number"
              value={adjustInForm.quantity}
              onKeyDown={blockInvalidNumberKeys}
              onPaste={blockNonDigitPaste}
              onChange={(value) => {
                const normalized = normalizeNonNegativeNumberInput(value);
                if (normalized === null) return;
                setAdjustInForm((prev) => ({
                  ...prev,
                  quantity: normalized,
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  quantity: undefined,
                }));
              }}
              disabled={isFullControl(adjustInForm.sn_control)}
              error={!!adjustInErrors.quantity}
              helperText={adjustInErrors.quantity || ""}
              inputProps={{ min: 1 }}
              fullWidth
            />

            {/* UOM from primary item_uom */}
            <BSTextField
              label={labels.uom}
              value={adjustInForm.uom}
              disabled
              error={!!adjustInErrors.uom}
              helperText={adjustInErrors.uom || ""}
              fullWidth
            />

            {/* Receive Date */}
            <BSDatepicker
              label={labels.receiveDate}
              value={
                adjustInForm.receive_date
                  ? dayjs(adjustInForm.receive_date)
                  : null
              }
              isDateOnly
              format={DATE_FORMAT}
              onChange={(value) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  receive_date: value ? dayjs(value).format("YYYY-MM-DD") : "",
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  receive_date: undefined,
                }));
              }}
              error={!!adjustInErrors.receive_date}
              helperText={adjustInErrors.receive_date || ""}
              fullWidth
            />

            {/* Location */}
            <BSAutoComplete
              bsTitle={labels.location}
              bsPreObj="inv"
              bsObj="t_inv_location"
              bsObjBy="location asc"
              bsObjWh="is_active=1 AND loc_type<>'STG'"
              bsColumes={[
                {
                  field: "location",
                  display: true,
                  filter: true,
                  key: true,
                },
              ]}
              bsValue={adjustInForm.location}
              bsOnChange={(selected) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  location: selected?.location ?? selected?.code ?? "",
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  location: undefined,
                }));
              }}
              required
              error={!!adjustInErrors.location}
              helperText={adjustInErrors.location || ""}
              fullWidth
            />

            {/* Inventory Status */}
            <BSAutoComplete
              bsTitle={labels.inventoryStatus}
              bsPreObj="sec"
              bsObj="t_com_combobox_item"
              bsColumes={[
                {
                  field: "display_member",
                  display: true,
                  filter: false,
                  key: false,
                },
                {
                  field: "value_member",
                  display: false,
                  filter: false,
                  key: true,
                },
              ]}
              bsObjBy="display_sequence asc"
              bsObjWh="group_name='inventory_status' AND is_active=1"
              bsValue={adjustInForm.inventory_status}
              bsOnChange={(selected) => {
                setAdjustInForm((prev) => ({
                  ...prev,
                  inventory_status: selected?.value_member ?? "",
                }));
                setAdjustInErrors((prev) => ({
                  ...prev,
                  inventory_status: undefined,
                }));
              }}
              required
              error={!!adjustInErrors.inventory_status}
              helperText={adjustInErrors.inventory_status || ""}
              fullWidth
            />
          </Box>
        </motion.div>

        <BSTextField
          multiline
          rows={3}
          fullWidth
          label={labels.remark}
          placeholder={labels.reasonPlaceholder}
          value={adjustInForm.remark}
          onChange={(value) =>
            setAdjustInForm((prev) => ({ ...prev, remark: value }))
          }
          sx={{ mt: 2 }}
        />
      </BSDialog>
    </Box>
  );
};

export default Adjustment;
