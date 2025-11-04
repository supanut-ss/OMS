import React, { useState } from "react";
import { Typography, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const UserGroupPage = () => {
  const [locale_id, setLocale_id] = useState("en");

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="t_com_user_group"
          bsCols="user_group_id,name,description,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="name asc"
          bsRowPerPage={20}
          bsShowDescColumn={false}
          bsComboBox={[
            {
              Column: "app_id",
              Display: "application_name",
              Value: "app_id",
              Default: "--- Select Application ---",
              PreObj: "sec",
              Obj: "t_com_application",
              ObjWh: "is_active='YES'",
              ObjBy: "application_name asc",
            },
          ]}
          bsBulkDelete={true}
          // bsBulkAdd={true}
          bsBulkEdit={true}
        />
      </Paper>
    </>
  );
};

export default UserGroupPage;
