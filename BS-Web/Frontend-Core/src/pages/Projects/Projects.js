import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const Projects = (props) => {
    return (<Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
            bsStoredProcedure="usp_tmt_project_header"
            bsStoredProcedureSchema="tmt"
            bsCols="project_no,project_name,project_status,customer_name, plan_project_start, plan_project_end, sale_name,create_by, create_date,update_by, update_date"
            bsShowRowNumber={true}
            showAdd={true}
            bsVisibleDelete={false}
            bsLocale={props.lang}
            bsAllowAdd={false}
            bsAllowEdit={true}
            bsAllowDelete={false}
            bsRowPerPage={20}
            onAdd={() => { console.log("Add new project") }}
            onEdit={() => { console.log("Edit project") }}
            bsFilterMode="client"
            bsVisibleEdit={true}
            bsShowCheckbox={false}

        />
    </Paper>);
}
export default Projects;