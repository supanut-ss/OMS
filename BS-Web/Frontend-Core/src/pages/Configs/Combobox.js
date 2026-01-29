import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useOutletContext } from "react-router-dom";

const Combobox = (props) => {
    const { permission } = useOutletContext();
    return <Paper sx={{ p: 2, mb: 3, width: "100%" }}>
        <BSDataGrid
            bsLocale={props.lang}
            bsPreObj="sec"
            bsObj="t_com_combobox_item"
            bsCols="
            group_name
            ,value_member
            ,display_member
            ,value_member1
            ,value_member2
            ,value_member3
            ,description
            ,display_sequence
            ,is_active
            ,create_by
            ,create_date"
            bsObjBy="create_date desc"
            bsComboBox={[
                {
                    Column: "app_id",
                    Display: "application_name",
                    Value: "app_id",
                    Default: "--- Select Application ---",
                    PreObj: "sec",
                    Obj: "t_com_application",
                    ObjWh: "",
                    ObjBy: "application_name asc",
                }]}
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
}
export default Combobox;