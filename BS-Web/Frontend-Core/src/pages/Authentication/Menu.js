import React, { useEffect, useState } from "react";
import { Typography, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const MenuPage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  // ฟังก์ชันโหลด resource ของ group "Menu"
  const getLang = async () => {
    try {
      const res = await getResources("Menu"); // backend group ชื่อ "Menu"
      setResourceData(res);
    } catch (error) {
      console.error("getResources(Menu) error:", error);
    }
  };

  // โหลด resource ตอน mount และเมื่อ props.lang เปลี่ยน
  useEffect(() => {
    setLocale_id(props.lang || "en");
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Menu") || "Menu"}
        </Typography>

        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="t_com_menu"
          bsCols="menu_id,menu_group,menu_name,platform,process,menu_group_sequence,parent_menu_id,menu_sequence,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="platform desc,menu_group_sequence asc, menu_sequence asc"
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
              ObjWh: "is_active='YES'",
              ObjBy: "menu_group asc",
              ObjGrp: "menu_group",
            },
          ]}
          bsBulkMode={{
            enable: true, // Enable all bulk operations
            addInline: true, // Add new rows inline instead of dialog
            // edit: true,      // Enabled by default when enable=true
            // delete: true,    // Enabled by default when enable=true
            // add: true,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
        />
      </Paper>
    </>
  );
};

export default MenuPage;
