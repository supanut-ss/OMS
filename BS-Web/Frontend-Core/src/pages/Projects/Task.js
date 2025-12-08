import { Accordion, AccordionDetails, AccordionSummary, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BSDataGrid from "../../components/BSDataGrid";
import TaskDialog from "./TaskDialog/TaskDialog";  // ← import Dialog

const ProjectTask = (props) => {
    const { projectID, lang, refresh, setRefresh } = props;

    const [loading, setLoading] = useState(false);
    const [taskPhases, setTaskPhases] = useState([]);

    // ------ Dialog States ------
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogData, setDialogData] = useState(null);

    const handleOpenEditTask = (rowData) => {
        setDialogData(rowData);
        setOpenDialog(true);
    };

    const handleOpenAddTask = () => {
        setDialogData({
            project_task_id: null,
            project_task_phase_id: null,
            project_header_id: projectID,
            task_name: "",
            priority: "",
            issue_type: "",
            due_date: null,
            manday: "",
            sequence: "",
            description: "",
            remarks: ""
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDialogData(null);
    };
    useEffect(() => {
        if (refresh) {
            setTaskPhases([]);
            callTaskPhase(projectID);
            setRefresh(false);
        }
    }, [refresh, projectID]);
    const fetchTaskPhase = useCallback(async () => {
        try {
            if (!projectID && projectID <= 0) return;
            if (taskPhases.length > 0) return;

            await callTaskPhase(projectID);
        } catch (err) {
            setLoading(false);
        }
    }, [projectID]);
    const callTaskPhase = async (id) => {
        setLoading(true);

        await AxiosMaster.get(`/projects/task/phases/${id}`)
            .then((response) => {
                if (response?.data?.message_code !== 0) {
                    return;
                }

                setTaskPhases(response.data.data || []);
            })
            .finally(() => setLoading(false));
    }
    useEffect(() => {
        fetchTaskPhase();
    }, [fetchTaskPhase]);

    return (
        <Paper elevation={3} sx={{ p: 2, backgroundColor: 'hsla(215, 15%, 97%, 0.5)' }}>
            {taskPhases.length === 0 && !loading && (<Typography>No task phases available for this project.</Typography>)}
            {loading && (<Typography>Loading task phases...</Typography>)}

            {taskPhases.length > 0 && taskPhases.map((phase) => (
                <Accordion key={phase.project_task_phase_id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{phase.phase_name}</Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                        <BSDataGrid
                            bsLocale={lang}
                            bsPreObj="tmt"
                            bsObj="v_tmt_project_task"
                            bsCols="task_name,assignee,due_date,priority,manday,task_status"
                            bsObjBy="user_id asc"
                            bsObjWh={`project_task_phase_id = ${phase.project_task_phase_id}`}
                            onEdit={handleOpenEditTask}
                            onAdd={() => handleOpenAddTask(phase)}   // ← ส่ง phase ถ้าต้องการ
                            bsKeyId="project_task_id"
                        />
                    </AccordionDetails>
                </Accordion>
            ))}

            {/* ---------- TaskDialog ---------- */}
            {openDialog && (
                <TaskDialog
                    open={openDialog}
                    onClose={handleCloseDialog}
                    project_task_id={taskPhases.project_task_id || ""}
                    project_task_phase_id={taskPhases.project_task_phase_id || ""}
                    project_header_id={taskPhases.project_header_id}
                    {...dialogData}
                />
            )}
        </Paper>
    );
};

export default ProjectTask;
