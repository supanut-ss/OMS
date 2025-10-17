import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const UserGroupPage = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [locale_id, setLocale_id] = useState("en");

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Group Management
        </Typography>
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="t_com_user_group"
          bsCols="name,description,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="name asc"
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

export default UserGroupPage;
