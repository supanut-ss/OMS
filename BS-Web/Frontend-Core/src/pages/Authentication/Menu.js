import React, { useEffect, useState } from "react";
import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useOutletContext } from "react-router-dom";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const MenuPage = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  // โหลด resource ตอน mount และเมื่อ props.lang เปลี่ยน
  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const handleDelete = async (menuId) => {
    const confirmed = await BSAlertSwal2.confirm("ต้องการลบ Menu นี้หรือไม่?", {
      title: "ยืนยันการลบ",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirmed) return;

    try {
      await AxiosMaster.post("/dynamic/delete", {
        tableName: "t_com_menu",
        schemaName: "sec",
        whereConditions: {
          menu_id: menuId,
        },
      });
    } catch (error) {
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || "ลบ Menu ไม่สำเร็จ",
      );
    }
  };

  return (
    <>
      <Paper
        sx={{
          p: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="t_com_menu"
          bsKeyId="menu_id"
          bsCols="menu_id,menu_group,menu_name,platform,menu_type,process,menu_group_sequence,parent_menu_id,menu_sequence,is_active,create_by,create_date,update_by,update_date"
          bsObjBy="platform desc,menu_group_sequence asc, menu_sequence asc"
          bsShowDescColumn={false}
          bsUniqueFields={["name,menu_group,platform"]}
          bsColumnDefs={[
            {
              field: "menu_id",
              hide: true,
              showInForm: false,
            },
          ]}
          bsComboBox={[
            {
              Column: "app_id",
              Display: "application_name",
              Value: "app_id",
              Default: "--- Select Application ---",
              PreObj: "sec",
              Obj: "t_com_application",
              ObjWh: "is_active=1",
              ObjBy: "application_name asc",
            },
            {
              Column: "platform",
              Display: "display_member",
              Value: "display_member",
              Default: "--- Select Platform ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='platform' AND is_active=1",
              ObjBy: "display_member asc",
            },
            // {
            //   Column: "menu_group",
            //   Display: "menu_group",
            //   Value: "menu_group",
            //   Default: "--- Select Menu Group ---",
            //   PreObj: "sec",
            //   Obj: "t_com_menu",
            //   ObjWh: "is_active=1",
            //   ObjBy: "menu_group asc",
            //   ObjGrp: "menu_group",
            // },
            {
              Column: "menu_type",
              Display: "display_member",
              Value: "display_member",
              Default: "--- Select Menu Type ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name='menu_type' AND is_active=1",
              ObjBy: "display_member asc",
              ObjGrp: "display_member",
            },
          ]}
          bsBulkMode={{
            enable: false, // Enable all bulk operations
            addInline: permission.is_add, // Add new rows inline instead of dialog
            edit: permission.is_edit, // Enabled by default when enable=true
            delete: permission.is_delete, // Enabled by default when enable=true
            add: permission.is_add, // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          onDelete={handleDelete}
          bsVisibleView={permission.is_view}
        />
      </Paper>
    </>
  );
};

export default MenuPage;
