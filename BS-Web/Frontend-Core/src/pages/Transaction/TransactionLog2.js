import { Box, Chip, Paper, useTheme } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";

const RESOURCE_GROUP = "t_inv_tran_log";

const LABEL_DEFS = {
  selectOwner: ["select_owner", "--- Select Owner ---"],
  selectWarehouse: ["select_warehouse", "--- Select Warehouse ---"],
  selectStatus: ["select_status", "--- Select Status ---"],
  selectOrderType: ["select_order_type", "--- Select Order Type ---"],
  selectTransactionType: [
    "select_transaction_type",
    "--- Select Transaction Type ---",
  ],
  selectSubTransactionType: [
    "select_sub_transaction_type",
    "--- Select Sub Transaction Type ---",
  ],
};

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

const TransactionLog2 = (props) => {
  const theme = useTheme();
  const { permission } = useOutletContext();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper
        sx={{
          p: 2,
          // mb: 3,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="inv"
          bsObj="t_inv_tran_log"
          bsObjBy="create_date desc"
          bsCols={[
            "tran_type",
            "sub_tran_type",
            "description",
            "warehouse",
            "owner_code",
            "location",
            "after_location",
            "item_number",
            "item_description",
            "quantity",
            "uom",
            "inv_status",
            "after_inv_status",
            "receive_date",
            "lot_number",
            "after_lot_number",
            "expiry_date",
            "after_expiry_date",
            "serial_number",
            "order_number",
            "reference_number",
            "line_number",
            "order_type",
            "user_def1",
            "user_def2",
            "user_def3",
            "user_def4",
            "device",
            "create_by",
            "create_date",
          ].join(",")}
          bsKeyId="tran_id"
          bsShowRowNumber={true}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsAllowDelete={false}
          bsVisibleView={permission?.is_view}
          bsColumnDefs={[
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
            {
              field: "after_inv_status",
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
          bsBulkMode={{
            enable: false,
            addInline: permission.is_add,
            edit: false,
            delete: false,
            add: false,
          }}
          // bsBulkMode={{ enable: true }}
          bsDialogSize="Large"
          bsComboBox={[
            {
              Column: "owner_code",
              Display: "owner_code",
              Value: "owner_code",
              PreObj: "inv",
              Obj: "t_inv_owner",
              ObjBy: "owner_code asc",
              Default: labels.selectOwner,
            },
            {
              Column: "warehouse",
              Display: "warehouse",
              Value: "warehouse",
              PreObj: "inv",
              Obj: "t_inv_warehouse",
              ObjBy: "warehouse asc",
              Default: labels.selectWarehouse,
            },
            {
              Column: "inv_status",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='inventory_status' AND is_active=1",
              ObjBy: "display_sequence asc",
              Default: labels.selectStatus,
            },
            {
              Column: "after_inv_status",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='inventory_status' AND is_active=1",
              ObjBy: "display_sequence asc",
              Default: labels.selectStatus,
            },
            {
              Column: "order_type",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh:
                "group_name IN ('inbound_order_type','outbound_order_type') AND is_active=1",
              ObjBy: "display_sequence asc",
              ObjGrp: "value_member",
              Default: labels.selectOrderType,
            },
            {
              Column: "tran_type",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='tran_type' AND is_active=1",
              ObjBy: "display_sequence asc",
              Default: labels.selectTransactionType,
            },
            {
              Column: "sub_tran_type",
              Display: "display_member",
              Value: "value_member",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='sub_tran_type' AND is_active=1",
              ObjBy: "display_sequence asc",
              Default: labels.selectSubTransactionType,
            },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default TransactionLog2;
