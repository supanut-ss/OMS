import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BSDataGrid from "../../components/BSDataGrid";
import TaskDialog from "./TaskDialog/TaskDialog";  // ← import Dialog
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import FlagIcon from "@mui/icons-material/Flag";
const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case "urgent":
            return "#d32f2f";
        case "high":
            return "#ed6c02";
        case "normal":
        case "medium":
            return "#0288d1";
        case "low":
        default:
            return "#9e9e9e";
    }
};
const ProjectTask = (props) => {
    const { projectID, lang, refresh, setRefresh, projectHeader } = props;

    const [loading, setLoading] = useState(false);
    const [taskPhases, setTaskPhases] = useState([]);
    const [phases, setPhases] = useState({});
    const gridRefs = useRef({});
    // ------ Dialog States ------
    const [openDialog, setOpenDialog] = useState(false);
    const handleDeleteTask = async (id) => {
        BSAlertSwal2.fire({
            title: "ลบข้อมูล?",
            text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ใช่, ลบเลย",
        }).then(async (conf) => {
            if (conf.isConfirmed) {
                await AxiosMaster.post("/projects/task/delete/" + id).then((res) => {
                    BSAlertSwal2.show(res.data.message_code === "0" ? "success" : "warning", res.data.message_text ?? "")
                    if (phases?.project_task_phase_id) {
                        gridRefs.current[phases.project_task_phase_id]?.refreshData();
                    }
                })
            }
        });
    }
    const handleOpenEditTask = (rowData) => {
        setPhases(rowData);
        setOpenDialog(true);
    };

    const handleOpenAddTask = (phase) => {
        console.log(phase)
        setPhases(phase);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        if (phases?.project_task_phase_id) {
            gridRefs.current[phases.project_task_phase_id]?.refreshData();
        }
        setOpenDialog(false);
        setPhases({});
    };
    const refreshData = useCallback(() => {
        if (refresh) {
            setTaskPhases([]);
            callTaskPhase(projectID);
            setRefresh(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh, projectID]);
    useEffect(() => {
        refreshData();
    }, [refreshData]);
    const fetchTaskPhase = useCallback(async () => {
        try {
            if (!projectID && projectID <= 0) return;
            if (taskPhases.length > 0) return;

            await callTaskPhase(projectID);
        } catch (err) {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Accordion key={phase.project_task_phase_id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "#B2D5D5" }}>
                        <Typography variant="h6">{phase.phase_name}</Typography>
                    </AccordionSummary>

                    <AccordionDetails sx={{ backgroundColor: "#fafafa" }}>
                        <BSDataGrid
                            ref={el => {
                                if (el) gridRefs.current[phase.project_task_phase_id] = el;
                            }}
                            bsLocale={lang}
                            bsStoredProcedure="usp_tmt_project_task"
                            bsStoredProcedureSchema="tmt"
                            bsCols="task_name,assignee,due_date,priority,manday,task_status"
                            bsStoredProcedureParams={{
                                ProjectTaskPhaseId: phase.project_task_phase_id,
                            }}
                            bsShowRowNumber={true}
                            showAdd={true}
                            bsColumnDefs={[{
                                field: "assignee",
                                type: "stringAvatar",
                                showTooltip: true,
                            },
                            { field: "task_status", type: "status" },
                            {
                                field: "priority",
                                width: 120,
                                renderCell: (params) => (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <FlagIcon sx={{ color: getPriorityColor(params.value) }} />
                                        <span>{params.value || "-"}</span>
                                    </Box>
                                ),
                            },
                            ]}
                            onEdit={handleOpenEditTask}
                            onAdd={() => handleOpenAddTask(phase)}
                            onDelete={handleDeleteTask}
                            bsKeyId="project_task_id"
                        />
                    </AccordionDetails>
                </Accordion>
            ))}

            {/* ---------- TaskDialog ---------- */}
            {openDialog && (
                <TaskDialog
                    lang={lang}
                    open={openDialog}
                    onClose={handleCloseDialog}
                    phases={phases}
                    projectHeader={projectHeader}
                />
            )}
        </Paper>
    );
};

export default ProjectTask;
