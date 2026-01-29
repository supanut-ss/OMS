import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BSDataGrid from "../../components/BSDataGrid";
import TaskDialog from "./TaskDialog";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import FlagIcon from "@mui/icons-material/Flag";
import BSLinearWithValueLabel from "../../components/LinearProgress/BSLinearProgressWithLabel";

// Theme-aware priority color function
const getPriorityColor = (priority, theme) => {
  const priorityColors = theme?.palette?.custom?.priority || {
    urgent: "#d32f2f",
    high: "#ed6c02",
    normal: "#0288d1",
    low: "#9e9e9e",
  };

  switch (priority?.toLowerCase()) {
    case "urgent":
      return priorityColors.urgent;
    case "high":
      return priorityColors.high;
    case "normal":
    case "medium":
      return priorityColors.normal;
    case "low":
    default:
      return priorityColors.low;
  }
};

const ProjectTask = (props) => {
  const { projectID, lang, refresh, setRefresh, projectHeader } = props;
  const theme = useTheme();

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
          BSAlertSwal2.show(
            res.data.message_code === "0" ? "success" : "warning",
            res.data.message_text ?? "",
          );
          if (phases?.project_task_phase_id) {
            gridRefs.current[phases.project_task_phase_id]?.refreshData();
          }
        });
      }
    });
  };
  const handleOpenEditTask = (rowData) => {
    setPhases(rowData);
    setOpenDialog(true);
  };

  const handleOpenAddTask = (phase) => {
    console.log(phase);
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
  };
  useEffect(() => {
    fetchTaskPhase();
  }, [fetchTaskPhase]);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        backgroundColor:
          theme.palette.custom?.paperBackground ||
          theme.palette.background.paper, width: "100%"
      }}
    >
      {taskPhases.length === 0 && !loading && (
        <Typography>No task phases available for this project.</Typography>
      )}
      {loading && <Typography>Loading task phases...</Typography>}

      {taskPhases.length > 0 &&
        taskPhases.map((phase) => (
          <Accordion key={phase.project_task_phase_id} sx={{ mb: 1 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor:
                  theme.palette.custom?.accordionHeader ||
                  theme.palette.grey[200],
              }}
            >
              <Typography variant="h6">{phase.phase_name}</Typography>
              <Box
                sx={{
                  flexGrow: 1,
                  ml: 2,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <BSLinearWithValueLabel
                    value={phase.progress_percent || 0}
                    width={300}
                  />
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails
              sx={{
                backgroundColor:
                  theme.palette.custom?.accordionContent ||
                  theme.palette.background.paper,
              }}
            >
              <BSDataGrid
                ref={(el) => {
                  if (el) gridRefs.current[phase.project_task_phase_id] = el;
                }}
                bsLocale={lang}
                bsStoredProcedure="usp_tmt_project_task"
                bsStoredProcedureSchema="tmt"
                filterMode="client"
                bsCols={
                  projectHeader.record_type === "MA"
                    ? "task_no,task_name,assignee,due_date,priority,manday,task_status"
                    : "task_name,assignee,due_date,priority,manday,task_status"
                }
                bsStoredProcedureParams={{
                  in_intProjectTaskPhaseId: phase.project_task_phase_id,
                }}
                bsShowRowNumber={true}
                showAdd={true}
                bsColumnDefs={[
                  {
                    field: "assignee",
                    type: "stringAvatar",
                    showTooltip: true,
                  },
                  { field: "task_status", type: "status" },
                  {
                    field: "priority",
                    width: 120,
                    renderCell: (params) => (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FlagIcon
                          sx={{ color: getPriorityColor(params.value, theme) }}
                        />
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
