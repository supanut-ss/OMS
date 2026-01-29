import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

const SalePage = (props) => {
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
          {getResourceByGroupAndName("MasterSale", "Master Sale", locale_id)?.resource_value || "Master Sale"}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_sale"
          bsObjBy="create_date desc"
          bsDialogSize="Large"
          bsDialogColumns={3}
          bsCols="sale_empolyee_code,sale_name,email,is_active,create_by,create_date,update_by,update_date"
          bsUniqueFields={["sale_empolyee_code"]}
          bsBulkMode={{
            enable: false, // Enable all bulk operations
            addInline: permission.is_add, // Add new rows inline instead of dialog
            edit: permission.is_edit,      // Enabled by default when enable=true
            delete: permission.is_delete,    // Enabled by default when enable=true
            add: permission.is_add,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
        // bsColumnDefs={[
        //   {
        //     field: "sale_empolyee_code",
        //     editable: true,
        //     readOnly: true,
        //   }, 
        // ]}
        />
      </Paper>
    </Box>
  );
};

export default SalePage;
