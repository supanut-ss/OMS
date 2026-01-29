import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

const CustomerPage = (props) => {
 const { permission } = useOutletContext();
  const { getResourceByGroupAndName } = useResource();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const dataGridRef = useRef(null); // ref

  // โหลด resource ตามภาษาที่เปลี่ยน
  const getLang = async () => {
    setLocale_id(props.lang || "en");
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <Typography variant="h6" gutterBottom>
          {getResourceByGroupAndName("Customer", "Master Customer", locale_id)?.resource_value || "Master Customer"}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          // bsAutoPermission={true} // Auto-apply permissions from menu settings
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_customer"
          // bsObjBy="create_date desc"
          bsUniqueFields={["customer_code"]}
          bsCols="customer_code,customer_name,description,addr_line_1,is_active,create_by,create_date,update_by,update_date"
          // ===== NEW: Consolidated Bulk Mode Configuration =====
          bsBulkMode={{
            enable: false, // Enable all bulk operations
            addInline: permission.is_add, // Add new rows inline instead of dialog
            edit: permission.is_edit,      // Enabled by default when enable=true
            delete: permission.is_delete,    // Enabled by default when enable=true
            add: permission.is_add,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          bsDialogSize="Large"
          bsDialogColumns={3}
          bsDialogTab={[
            {
              Column:
                "customer_code,customer_name,description,addr_line_1,addr_line_2,addr_line_3,province,postal_code,country_name,phone,email,is_active",
              name: "Profile",
            },
            {
              Column:
                "user_def1,user_def2,user_def3,user_def4,user_def5,user_def6,user_def7,user_def8,user_def9,user_def10",
              name: "User Define Data",
            },
          ]}
          bsColumnDefs={[
            {
              field: "customer_code",
              editable: true,
              readOnly: true,
            },
            {
              field: "user_def9",
              type: "dateTime",
              dateTimeFormat: "dd/MM/yyyy HH:mm",
            },
            {
              field: "user_def10",
              type: "dateTime",
              dateTimeFormat: "dd/MM/yyyy HH:mm",
            },
          ]}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
        />
      </Paper>
    </Box>
  );
};

export default CustomerPage;
