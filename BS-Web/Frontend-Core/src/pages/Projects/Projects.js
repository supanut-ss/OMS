import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import ProjectsDialog from "./ProjectsDialog/ProjectDialog";
import { useRef, useState } from "react";

const Projects = (props) => {
    const [openDialog, setOpenDialog] = useState(false);
    const [projectHeaderID, setProjectHeaderID] = useState("");
    const dataGridRef = useRef();
    const handleCloseOpenDialog = (val) => {
        dataGridRef.current?.refreshData();
        setProjectHeaderID("");
        setOpenDialog(val)
    }
    return (<Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
            ref={dataGridRef}
            bsStoredProcedure="usp_tmt_project_header"
            bsStoredProcedureSchema="tmt"
            bsCols="project_header_id,project_no,project_name,project_status,customer_name, plan_project_start, plan_project_end, sale_name,create_by, create_date,update_by, update_date"
            bsShowRowNumber={true}
            showAdd={true}
            bsVisibleDelete={true}
            bsLocale={props.lang}
            bsAllowAdd={false}
            bsAllowEdit={true}
            bsAllowDelete={true}
            bsRowPerPage={20}
            onAdd={(r) => {
                setProjectHeaderID("");
                setOpenDialog(true);
            }}
            onEdit={(e) => {
                setProjectHeaderID(e.project_header_id || "");
                setOpenDialog(true);
            }}
            bsColumnDefs={[
                { field: "project_status", type: "status" },
            ]}
            bsFilterMode="client"
            bsVisibleEdit={true}
            bsShowCheckbox={false}

        />
        <ProjectsDialog open={openDialog} onClose={handleCloseOpenDialog} title="Project" projectID={projectHeaderID} />
    </Paper>);
}
export default Projects;