import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useOutletContext } from "react-router-dom";

const Combobox = (props) => {
  const { permission } = useOutletContext();
  return (
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
        bsLocale={props.lang}
        bsPreObj="sec"
        bsObj="t_com_combobox_item"
        bsSyncDisplayDefault={false}
        bsCols="app_id
            ,group_name
            ,value_member
            ,display_member
            ,value_member1
            ,value_member2
            ,value_member3
            ,description
            ,display_sequence
            ,micro_service_name
            ,is_active
            ,create_by
            ,create_date"
        bsObjBy="t.create_date desc"
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
            Column: "group_name",
            Display: "display_member",
            Value: "value_member",
            Default: "--- Select Group Name ---",
            PreObj: "sec",
            Obj: "t_com_combobox_item",
            ObjWh: "group_name = 'combobox_group_name' AND is_active=1",
            ObjBy: "display_sequence asc",
          },
          {
            Column: "micro_service_name",
            Display: "display_member",
            Value: "value_member",
            Default: "--- Select Micro Service ---",
            PreObj: "sec",
            Obj: "t_com_combobox_item",
            ObjWh: "group_name = 'combobox_micro_service_name' AND is_active=1",
            ObjBy: "display_sequence asc",
          },
        ]}
        bsBulkMode={{
          enable: false,
          addInline: permission.is_add,
          edit: permission.is_edit,
          delete: permission.is_delete,
          add: permission.is_add,
        }}
        bsShowDescColumn={false}
        bsAllowAdd={permission.is_add}
        bsAllowEdit={permission.is_edit}
        showAdd={permission.is_add}
        bsVisibleEdit={permission.is_edit}
        bsVisibleDelete={permission.is_delete}
        bsAllowDelete={permission.is_delete}
        bsVisibleView={permission.is_view}
      />
    </Paper>
  );
};

export default Combobox;
