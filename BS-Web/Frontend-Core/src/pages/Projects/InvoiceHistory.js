import { useState, useRef, useEffect, useCallback } from "react";
import { Paper, Box, Stack } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const InvoiceHistory = (props) => {
  const { getResourceByGroupAndName } = useResource();
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  // If a projectID is provided from props, use it to filter the grid by project_header_id
  const bsObjWh = props.projectID
    ? `project_header_id='${props.projectID}'`
    : undefined;

  // Default values for new records - set project_header_id from props
  // Always default `is_cancel` to 'NO'
  const defaultFormValues = props.projectID
    ? { project_header_id: props.projectID, is_cancel: "NO" }
    : { is_cancel: "NO" };

  const gridRef = useRef();


  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // ===============================
  // 📊 State สำหรับเก็บข้อมูล summary
  // ===============================
  const [totals, setTotals] = useState({
    po: 0,
    invoice: 0,
    remain: 0,
  });

  // ===============================
  // 📦 รับข้อมูลจาก BSDataGrid แล้วคำนวณผลรวม
  // ใช้ onFilteredDataChange เพื่อให้ summary แสดงตามข้อมูลที่ผ่าน filter แล้ว
  // ===============================
  const handleFilteredDataChange = useCallback((data) => {
    let totalPO = 0;
    let totalInvoice = 0;

    data.forEach((row) => {
      const amount = parseFloat(row.amount) || 0;

      if (row.document_type === "PO") {
        totalPO += amount;
      }

      if (row.document_type === "Invoice" || row.document_type === "INVOICE") {
        totalInvoice += amount;
      }
    });

    setTotals({
      po: totalPO,
      invoice: totalInvoice,
      remain: totalPO - totalInvoice,
    });
  }, []);

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="tmt"
          bsObj="t_tmt_project_invoice"
          bsCols="project_invoice_id,
          project_header_id,
          document_type,
          document_no,
          document_date,
          due_date,
          amount,
          description,
          is_incentive_requested,
          is_cancel,
          project_header_id,
          create_by,
          create_date,
          update_by,
          update_date"
          bsObjBy="document_type desc, document_no asc"
          bsObjWh={bsObjWh}
          bsComboBox={[
            {
              Column: "document_type",
              Display: "display_member",
              Value: "value_member",
              Default:
                getResourceByGroupAndName("t_tmt_project_invoice", "document_type", locale_id)?.resource_value ||
                "--- Select Document Type ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "is_active='YES' and group_name ='document_type'",
              ObjBy: "display_sequence asc",
            },
          ]}
          bsBulkMode={{
            enable: true, // Enable all bulk operations
            addInline: true, // Add new rows inline instead of dialog
            edit: true,      // Enabled by default when enable=true
            // delete: true,    // Enabled by default when enable=true
            // add: true,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          bsShowDescColumn={false}
          bsDefaultFormValues={defaultFormValues}
          bsUniqueFields={[
            { fields: ["project_header_id", "document_type", "document_no"] },
          ]}
          bsHiddenColumns={["project_header_id"]}
          bsKeyId="project_invoice_id"
          onFilteredDataChange={handleFilteredDataChange}
        />

        {/* สรุปผลรวม Total PO Amount*/}
        <Box
          sx={{
            display: "flex",
            justifyContent: "right",
            mt: 3,
          }}
        >
          <Box sx={{ minWidth: 360, textAlign: "right" }}>
            <Stack spacing={0.5}>
              <Box>
                <strong>
                  {getResourceByGroupAndName("t_tmt_project_invoice", "Total PO Amount", locale_id)?.resource_value ||
                    "Total PO Amount"}
                </strong>
                &nbsp;&nbsp;
                {totals.po.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Box>

              <Box>
                <strong>
                  {getResourceByGroupAndName("t_tmt_project_invoice", "Total Invoice Amount", locale_id)?.resource_value ||
                    "Total Invoice Amount"}
                </strong>
                &nbsp;&nbsp;
                {totals.invoice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Box>

              <Box
                sx={{
                  fontWeight: 600,
                  color: totals.remain < 0 ? "error.main" : "text.primary",
                }}
              >
                <strong>
                  {getResourceByGroupAndName("t_tmt_project_invoice", "Remain", locale_id)?.resource_value || "Remain"}
                </strong>
                &nbsp;&nbsp;
                {totals.remain.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </>
  );
};

export default InvoiceHistory;
