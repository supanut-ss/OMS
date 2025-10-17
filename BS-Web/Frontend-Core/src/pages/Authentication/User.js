import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const UserPage = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [locale_id, setLocale_id] = useState("en");

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="v_com_user"
          bsCols="user_id,
                  group_name, 
                  first_name,
                  last_name,
                  department,
                  email_address,
                  supervisor,
                  locale_id,
                  is_active,
                  create_by,
                  create_date,
                  update_by,
                  update_date"
          bsObjBy="user_id asc"
          //   bsPinColsLeft="user_id,first_name,last_name"
          //   bsPinColsRight="actions"
          bsRowPerPage={20}
          bsShowDescColumn={false}
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

export default UserPage;
