import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import ProjectsDialog from "./ProjectsDialog/ProjectDialog";
import { use, useEffect, useRef, useState } from "react";
import secureStorage from "../../utils/SecureStorage";
import Config from "../../utils/Config";

const Projects = (props) => {
    const [openDialog, setOpenDialog] = useState(false);
    const [projectHeaderID, setProjectHeaderID] = useState("");
    const dataGridRef = useRef();
    const handleCloseOpenDialog = (val) => {
        dataGridRef.current?.refreshData();
        setProjectHeaderID("");
        setOpenDialog(val)
    }
    const onChangeProjectHeaderID = ({
        id,
        newtab = false
    }) => {
        if (newtab) {
            secureStorage.set("project_header_id", id);
            window.open(`${Config.BASE_URL ?? ""}/projects`, '_blank', 'noopener,noreferrer');
            return;
        } else {
            setProjectHeaderID(id);
            setOpenDialog(true);
        }
    }
    useEffect(() => {
        const storedProjectHeaderID = secureStorage.get("project_header_id");
        if (storedProjectHeaderID) {
            setProjectHeaderID(storedProjectHeaderID);
            setOpenDialog(true);
            secureStorage.remove("project_header_id");
        }
    }, []);
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
        <ProjectsDialog open={openDialog} onClose={handleCloseOpenDialog} title="Project" projectID={projectHeaderID} lang={props.lang} onChangeProjectHeaderID={onChangeProjectHeaderID} />
    </Paper>);
}
export default Projects;