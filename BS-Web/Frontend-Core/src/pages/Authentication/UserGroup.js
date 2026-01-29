import React, { useEffect, useState } from "react";
import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

const UserGroupPage = (props) => {
 const { permission } = useOutletContext();
  const { getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  // ฟังก์ชันโหลด resource ของ group "UserGroup"
  const getLang = async () => {
    try {
      const res = await getResources("UserGroup"); // ตั้งชื่อ group ตามที่ backend กำหนด
      setResourceData(res);
    } catch (error) {
      console.error("getResources(UserGroup) error:", error);
    }
  };

  // โหลด resource ตอน mount และเมื่อ props.lang เปลี่ยน
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  console.log("UserGroupPage permissions:", permission);
  return (
    <>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          bsLocale={props.lang}
          // bsAutoPermission={true}
          bsPreObj="sec"
          bsObj="t_com_user_group"
          bsCols="app_id,name,description,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="name asc"
          bsShowDescColumn={false}
          bsUniqueFields={["name"]}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
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
          bsBulkMode={{
            enable: false, // Enable all bulk operations
            addInline: permission.is_add, // Add new rows inline instead of dialog
            edit: permission.is_edit,      // Enabled by default when enable=true
            delete: permission.is_delete,    // Enabled by default when enable=true
            add: permission.is_add,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          bsColumnDefs={[
            // {
            //   field: "app_id",
            //   headerName: "Application",
            // },
            {
              field: "is_active",
              defaultValue: "YES",
            },
          ]}
        />
      </Paper>
    </>
  );
};

export default UserGroupPage;
