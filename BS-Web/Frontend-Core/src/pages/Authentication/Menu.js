import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const MenuPage = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [locale_id, setLocale_id] = useState("en");

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Group Management
        </Typography>
        <BSDataGrid
          bsLocale="th"
          bsPreObj="sec"
          bsObj="t_com_menu"
          bsCols="menu_group,menu_name,platform,process,menu_group_sequence,parent_menu_id,menu_sequence,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="menu_group_sequence asc, menu_sequence asc"
          //   bsObjWh="status='active'"
          bsRowPerPage={20}
          bsShowDescColumn={false}
          //   bsComboBox={[
          //     {
          //       Column: "status",
          //       Display: "name",
          //       Value: "id",
          //       Default: "--- Select Status ---",
          //       PreObj: "default",
          //       Obj: "t_wms_status",
          //       ObjWh: "active=1",
          //       ObjBy: "name asc",
          //       valueOptions: [
          //         { value: "active", label: "Active" },
          //         { value: "inactive", label: "Inactive" },
          //         { value: "pending", label: "Pending" },
          //       ],
          //     },
          //   ]}
          onCheckBoxSelected={(rows) => {
            console.log("Selected rows:", rows);
            setSelectedRows(rows);
          }}
          //   onEdit={(row) => console.log("Edit:", row)}
          //   onDelete={(id) => console.log("Delete:", id)}
          //   onAdd={() => console.log("Add new record")}
          height={500}
        />
      </Paper>
    </>
  );
};

export default MenuPage;
