import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const Projects = (props) => {
    return (<Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
            bsStoredProcedure="usp_tmt_project_header"
            bsStoredProcedureSchema="tmt"
            bsCols="
                project_no,
                project_name,
                project_status,
                application_type,
                project_type,
                po_number,
                manday,
                management_cost,
                travel_cost,
                plan_project_start,
                plan_project_end,
                revise_project_start,
                revise_project_end,
                actual_project_start,
                actual_project_end,
                remark,
                is_active,
                create_by,
                create_date,
                update_by,
                update_date"
            bsShowRowNumber={true}
            showAdd={true}
            bsVisibleDelete={false}
            bsLocale={props.lang}
            bsAllowAdd={false}
            bsAllowEdit={false}
            bsAllowDelete={false}
            bsRowPerPage={20}
            onAdd={() => { console.log("Add new project") }}
            bsFilterMode="client"
            bsVisibleEdit={false}
            bsShowCheckbox={false}
            
        />
    </Paper>);
}
export default Projects;