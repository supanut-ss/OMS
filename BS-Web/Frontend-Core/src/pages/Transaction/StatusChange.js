import { Box, Button, Chip, Typography, Paper, useTheme } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSDialog from "../../components/BSDialog";
import { useEffect, useState, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import SecureStorage from "../../utils/SecureStorage";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import BSAutoComplete from "../../components/BSAutoComplete";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import BSTextField from "../../components/BSTextField";

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
  statusChange: ["status_change", "Status Change"],
  statusChangeTitle: ["status_change_title", "Status Change"],
  status: ["status", "Status"],
  quantity: ["quantity", "Quantity"],
  remark: ["remark", "Remark"],
  close: ["close", "Close"],
  save: ["save", "Save"],
  permissionDenied: [
    "permission_denied_edit",
    "You do not have permission to edit.",
  ],
  selectAtLeastOne: [
    "select_at_least_one_status_change",
    "Please select at least one record to change status.",
  ],
  statusRequired: ["status_required", "Status is required"],
  quantityGreaterThanZero: [
    "quantity_must_greater_than_zero",
    "Quantity must be greater than 0",
  ],
  changeStatusSuccess: ["change_status_success", "Change status successfully."],
  changeStatusFailed: ["change_status_failed", "Failed to change status."],
  completedWithSomeErrors: [
    "completed_with_some_errors",
    "Completed with some errors",
  ],
  selectedRecords: ["selected_records", "record(s) selected."],
  snControlFixedQty: [
    "sn_control_full_fixed_qty",
    "SN Control Full: quantity fixed to 1",
  ],
};

const StatusChange = (props) => {
  const theme = useTheme();
  const initialFormData = {
    inv_status: "",
    quantity: "",
    remark: "",
  };
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
  const displayLocale = useMemo(() => {
    const lang = (locale_id || props.lang || "en").toString().toLowerCase();
    return lang.startsWith("th") ? "th" : "en";
  }, [locale_id, props.lang]);
  const gridRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [statusOptions, setStatusOptions] = useState([]);
  const [errors, setErrors] = useState({});

  const selectedCount = selectedRows.length;
  const singleSelectedRow = selectedCount === 1 ? selectedRows[0] : null;
  const isSingleSnFull = isFullControl(singleSelectedRow?.sn_control);
  const areAllSelectedSnFull =
    selectedCount > 0 &&
    selectedRows.every((row) => isFullControl(row?.sn_control));
  const showQuantityInput = selectedCount <= 1;
  const effectiveQuantity = showQuantityInput
    ? isSingleSnFull
      ? 1
      : Number(formData.quantity)
    : areAllSelectedSnFull
      ? 1
      : null;

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        const res = await getResources(RESOURCE_GROUP, props.lang || "en");
        setResourceData(res || []);
      } catch (e) {
        console.error(`getResources(${RESOURCE_GROUP}) error:`, e);
      }
    };
    loadRes();
    // Load status options for dropdown
    const fetchStatusOptions = async () => {
      try {
        // Use the same config as bsComboBox for inv_status
        const res = await AxiosMaster.get("GetComboBox", {
          params: {
            preObj: "sec",
            obj: "t_com_combobox_item",
            objWh: "group_name='inventory_status' AND is_active=1",
            objBy: "display_sequence asc",
          },
        });
        setStatusOptions(res?.data || []);
      } catch (e) {
        setStatusOptions([]);
      }
    };
    fetchStatusOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  useEffect(() => {
    if (!openDialog) return;
    if (selectedCount === 1 && isSingleSnFull) {
      setFormData((prev) => ({ ...prev, quantity: 1 }));
      setErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  }, [isSingleSnFull, openDialog, selectedCount]);

  const userInfo = useMemo(() => {
    const raw = SecureStorage.get("userInfo");
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch (e) {
      console.warn("Invalid userInfo JSON:", raw);
      return {};
    }
  }, []);
  const handleSelectedRows = (selectedRows) => {
    setSelectedRows(selectedRows || []);
  };
  const resetDialogState = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setErrors({});
  };
  const userId = userInfo?.UserId ?? userInfo?.userId ?? "";
  const handleChangeStatus = async () => {
    // ฟังก์ชันนี้จะถูกเรียกเมื่อกดปุ่มยืนยันการเปลี่ยนแปลงใน popup
    // จะทำการอัพเดตข้อมูลในฐานข้อมูลและรีเฟรช BSDataGrid
    if (!canEdit) {
      alert(labels.permissionDenied);
      return;
    }
    if (!selectedRows || selectedRows.length === 0) {
      await BSAlertSwal2.show("warning", labels.selectAtLeastOne);
      return;
    }
    // Validate form
    let newErrors = {};
    if (!formData.inv_status) newErrors.inv_status = labels.statusRequired;
    if (
      showQuantityInput &&
      !isSingleSnFull &&
      (Number.isNaN(Number(formData.quantity)) ||
        Number(formData.quantity) <= 0)
    ) {
      newErrors.quantity = labels.quantityGreaterThanZero;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      const response = await AxiosMaster.post("Inventory/StatusChange", {
        inventory_id_serials: selectedRows.map(
          (row) => row.inventory_id_serial,
        ),
        inventory_status: formData.inv_status,
        quantity: effectiveQuantity,
        remark: formData.remark,
        user_id: userId,
        lang: (locale_id || props.lang || "EN").toString().trim().toUpperCase(),
      });
      const result = response?.data;
      if (result?.success === true) {
        await BSAlertSwal2.show(
          "success",
          result?.message || labels.changeStatusSuccess,
        );
        resetDialogState();
        setSelectedRows([]);
        if (gridRef.current) {
          gridRef.current.refreshData();
        }
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
          result?.message || labels.changeStatusFailed,
        );
      }
    } catch (error) {
      console.error("StatusChange error:", error);
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || labels.changeStatusFailed,
      );
    }
  };
  const handleOpenStatusDialog = async () => {
    if (!canEdit) {
      await BSAlertSwal2.show("warning", labels.permissionDenied);
      return;
    }
    if (!selectedRows || selectedRows.length === 0) {
      await BSAlertSwal2.show("warning", labels.selectAtLeastOne);
      return;
    }
    setFormData(initialFormData);
    setErrors({});
    setOpenDialog(true);
  };
  return (
    <Box>
      {/* BSDataGrid with selection */}
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
        <BSDataGrid
          bsCustomActions={[
            {
              label: labels.statusChange,
              icon: <ChangeCircleIcon />,
              onClick: handleOpenStatusDialog,
              disabled: !canEdit,
              // variant: "contained",
              // color: "primary",
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
          onCheckBoxSelected={handleSelectedRows}
          bsColumnDefs={[
            {
              field: "inventory_id_serial",
              hide: true,
              showInForm: false,
            },
            {
              field: "sn_control",
              hide: true,
              showInForm: false,
            },
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
            // Support both BSDataGrid v6/v7 signature
            setSelectedRows(Array.isArray(rows) ? rows : ids);
          }}
        />
      </Paper>
      {/* Dialog for status change */}
      <BSDialog
        open={openDialog}
        onClose={resetDialogState}
        maxWidth="sm"
        title={labels.statusChangeTitle}
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
                onClick={resetDialogState}
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
                onClick={handleChangeStatus}
                size="small"
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                sx={ACTION_BUTTON_THEMES.save}
              >
                {labels.save}
              </Button>
            </motion.span>
          </>
        }
      >
        <Typography gutterBottom>
          {`${selectedRows.length} ${labels.selectedRecords}`}
        </Typography>
        {/* inv_status dropdown */}
        <BSAutoComplete
          bsTitle={labels.status}
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
          bsObjWh={"group_name='inventory_status' AND is_active=1"}
          bsValue={formData.inv_status}
          bsOnChange={(selected) => {
            setFormData((prev) => ({
              ...prev,
              inv_status: selected?.value_member ?? "",
            }));
            setErrors((prev) => ({ ...prev, inv_status: undefined }));
          }}
          required
          error={!!errors.inv_status}
          helperText={errors.inv_status || ""}
          fullWidth
        />
        {showQuantityInput && (
          <BSTextField
            label={labels.quantity}
            type="number"
            value={isSingleSnFull ? 1 : formData.quantity}
            onKeyDown={blockInvalidNumberKeys}
            onPaste={blockNonDigitPaste}
            onChange={(value) => {
              const normalized = normalizeNonNegativeNumberInput(value);
              if (normalized === null) return;
              setFormData((prev) => ({ ...prev, quantity: normalized }));
              setErrors((prev) => ({ ...prev, quantity: undefined }));
            }}
            disabled={isSingleSnFull}
            error={!!errors.quantity}
            helperText={
              errors.quantity ||
              (isSingleSnFull ? labels.snControlFixedQty : "")
            }
            margin="normal"
            fullWidth
            inputProps={{ min: 1 }}
          />
        )}
        {/* remark textbox */}
        <BSTextField
          label={labels.remark}
          value={formData.remark}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, remark: value }))
          }
          margin="normal"
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
        />
      </BSDialog>
    </Box>
  );
};

export default StatusChange;
