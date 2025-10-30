import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const MenuPage = () => {
  const [locale_id, setLocale_id] = useState("en");

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Menu
        </Typography>
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="t_com_menu"
          bsCols="menu_id,menu_group,menu_name,platform,process,menu_group_sequence,parent_menu_id,menu_sequence,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="menu_group_sequence asc, menu_sequence asc"
          //   bsObjWh="status='active'"
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
            {
              Column: "platform",
              Display: "display_member",
              Value: "display_member",
              Default: "--- Select Platform ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='platform' AND is_active='YES'",
              ObjBy: "display_member asc",
            },
            {
              Column: "menu_group",
              Display: "menu_group",
              Value: "menu_group",
              Default: "--- Select Menu Group ---",
              PreObj: "sec",
              Obj: "t_com_menu",
              ObjWh: "GROUP BY menu_group",
              ObjBy: "menu_group asc",
            },
          ]}
          onCheckBoxSelected={(rows) => {
            console.log("Selected rows:", rows);
            //setSelectedRows(rows);
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
