import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const Combobox = (props) => {
    return <Paper sx={{ p: 2, mb: 3 }}>
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
            bsShowDescColumn = { false}
            bsAllowAdd = { true}
            bsAllowEdit = { true}
            bsAllowDelete = { true}
            />
    </Paper>
}
export default Combobox;