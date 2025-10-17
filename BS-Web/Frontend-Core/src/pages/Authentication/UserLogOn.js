import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const UserLogOnPage = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>
        <BSDataGrid
          bsLocale="th"
          bsPreObj="sec"
          bsObj="t_com_user"
          bsCols="user_id,first_name,last_name,locale_id,domain,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="user_id asc"
          //   bsObjWh="status='active'"
          bsPinColsLeft="user_id,first_name,last_name"
          bsPinColsRight="actions"
          bsRowPerPage={20}
          bsBulkEdit={true}
          bsBulkAdd={true}
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
          onEdit={(row) => console.log("Edit:", row)}
          onDelete={(id) => console.log("Delete:", id)}
          onAdd={() => console.log("Add new record")}
          height={500}
        />
      </Paper>
    </>
  );
};

export default UserLogOnPage;
