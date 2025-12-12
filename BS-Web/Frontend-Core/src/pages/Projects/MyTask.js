import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import FlagIcon from "@mui/icons-material/Flag";

import BSDataGrid from "../../components/BSDataGrid";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import TaskTracking from "./Tasks/TaskTracking";

// ============ Task Status Constants ============
const TASK_STATUS = {
  OPEN: "Open",
  IN_PROCESS: "In Process",
  CLOSE: "Close",
};

// Helper function to format date
const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateValue;
  }
};

// ============ Task Detail Dialog ============
const TaskDetailDialog = ({ open, onClose, taskData, lang }) => {
  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case TASK_STATUS.OPEN:
        return "info";
      case TASK_STATUS.IN_PROCESS:
        return "warning";
      case TASK_STATUS.CLOSE:
        return "success";
      default:
        return "default";
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AssignmentIcon />
          Task Details
          {taskData?.task_status && (
            <Chip
              label={taskData.task_status}
              color={getStatusColor(taskData.task_status)}
              size="medium"
            />
          )}
          {/* {taskData?.priority && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FlagIcon
                sx={{
                  color:
                    taskData.priority?.toLowerCase() === "urgent"
                      ? "#d32f2f"
                      : taskData.priority?.toLowerCase() === "high"
                      ? "#ed6c02"
                      : taskData.priority?.toLowerCase() === "normal" ||
                        taskData.priority?.toLowerCase() === "medium"
                      ? "#0288d1"
                      : "#9e9e9e",
                }}
              />
              <Chip
                label={taskData.priority}
                color={getPriorityColor(taskData.priority)}
                size="small"
                variant="outlined"
              />
            </Box>
          )} */}
        </DialogTitle>

        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ mt: 1 }}>
          {/* Task Info - Read Only */}
          <Accordion
            defaultExpanded
            sx={{ mb: 3, borderRadius: 2, "&:before": { display: "none" } }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ backgroundColor: "#fafafa", borderRadius: 2 }}
            >
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Task Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: "#fafafa", pt: 0, pb: 1 }}>
              <Grid container spacing={0.5}>
                {/* Project No */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Project No
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.project_no || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Project Name */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Project Name
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.project_name || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Project Type */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Project Type
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.project_type || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Task Name */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Task Name
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.task_name || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Priority */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Priority
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mt: 0.5,
                      }}
                    >
                      <FlagIcon
                        fontSize="small"
                        sx={{
                          color:
                            taskData?.priority?.toLowerCase() === "urgent"
                              ? "#d32f2f"
                              : taskData?.priority?.toLowerCase() === "high"
                              ? "#ed6c02"
                              : taskData?.priority?.toLowerCase() ===
                                  "normal" ||
                                taskData?.priority?.toLowerCase() === "medium"
                              ? "#0288d1"
                              : "#9e9e9e",
                        }}
                      />
                      <Typography variant="body2" fontWeight="medium">
                        {taskData?.priority || "-"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Issue Type */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Issue Type
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.issue_type || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Due Date (Start - End) */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Due Date
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {formatDate(taskData?.start_date)} -{" "}
                      {formatDate(taskData?.end_date)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Manday */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Manday (Hour)
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ mt: 0.5 }}
                    >
                      {taskData?.manday || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Task Description */}
                <Grid size={12}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Task Description
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                    >
                      {taskData?.task_description || "-"}
                    </Typography>
                  </Box>
                </Grid>

                {/* Remark */}
                <Grid size={12}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Remark
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                    >
                      {taskData?.remark || "-"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Task Tracking Component */}
          <TaskTracking
            projectTaskId={taskData?.project_task_id}
            lang={lang}
            taskData={taskData}
          />
        </DialogContent>

        <DialogActions>
          <BSCloseOutlinedButton onClick={onClose} variant="outlined">
            Close
          </BSCloseOutlinedButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ============ Task Status Section (Accordion) ============
const TaskStatusSection = ({
  status,
  icon,
  color,
  lang,
  onViewTask,
  expanded,
  onToggle,
}) => {
  const dataGridRef = useRef();
  const [count, setCount] = useState(0);

  // Handle data loaded to get count
  const handleDataLoaded = (data) => {
    setCount(data?.length || 0);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{
        mb: 2,
        "&:before": { display: "none" },
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: color,
          "&:hover": { backgroundColor: color, filter: "brightness(0.95)" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {icon}
          <Typography variant="h6" fontWeight="medium">
            {status}
          </Typography>
          <Badge badgeContent={count} color="primary" max={999}>
            <Box sx={{ width: 8 }} />
          </Badge>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2 }}>
        {expanded && (
          <BSDataGrid
            ref={dataGridRef}
            bsLocale={lang}
            bsStoredProcedure="usp_tmt_my_task"
            bsStoredProcedureSchema="tmt"
            bsCols="project_no,project_name,task_name,assignee_list,start_date,end_date,manday,project_type,priority"
            bsStoredProcedureParams={{ TaskStatus: status }}
            bsShowRowNumber={true}
            showAdd={false}
            bsVisibleView={true}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            onView={onViewTask}
            bsKeyId="project_task_id"
            bsFilterMode="client"
            onDataLoaded={handleDataLoaded}
            bsRowPerPage={20}
            bsColumnDefs={[
              {
                field: "assignee_list",
                type: "stringAvatar",
                headerName: "Assignee",
                showTooltip: true,
              },
              {
                field: "priority",
                headerName: "Priority",
                width: 120,
                renderCell: (params) => {
                  const priority = params.value?.toLowerCase();
                  let color = "#9e9e9e"; // Default grey

                  switch (priority) {
                    case "urgent":
                      color = "#d32f2f"; // Danger/Error red
                      break;
                    case "high":
                      color = "#ed6c02"; // Warning orange
                      break;
                    case "normal":
                    case "medium":
                      color = "#0288d1"; // Info blue
                      break;
                    case "low":
                      color = "#9e9e9e"; // Grey
                      break;
                    default:
                      color = "#9e9e9e";
                  }

                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FlagIcon sx={{ color }} />
                      <span>{params.value || "-"}</span>
                    </Box>
                  );
                },
              },
            ]}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// ============ Main MyTask Page ============
const MyTaskPage = (props) => {
  const { lang = "th" } = props;

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    [TASK_STATUS.OPEN]: true,
    [TASK_STATUS.IN_PROCESS]: true,
    [TASK_STATUS.CLOSE]: false, // Close section collapsed by default
  });

  // State for task detail dialog
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Handle toggle accordion
  const handleToggleSection = (status) => () => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  // Handle view task detail
  const handleViewTask = (taskData) => {
    setSelectedTask(taskData);
    setOpenTaskDialog(true);
  };

  // Handle close task dialog
  const handleCloseTaskDialog = () => {
    setOpenTaskDialog(false);
    setSelectedTask(null);
  };

  // Section configurations
  const sections = [
    {
      status: TASK_STATUS.OPEN,
      icon: <AssignmentIcon sx={{ color: "#1976d2" }} />,
      color: "#e3f2fd",
    },
    {
      status: TASK_STATUS.IN_PROCESS,
      icon: <AssignmentLateIcon sx={{ color: "#ed6c02" }} />,
      color: "#FFD8B3FF",
    },
    {
      status: TASK_STATUS.CLOSE,
      icon: <AssignmentTurnedInIcon sx={{ color: "#2e7d32" }} />,
      color: "#D5F5E1FF",
    },
  ];

  return (
    <Paper
      elevation={3}
      sx={{ p: 3, backgroundColor: "hsla(215, 15%, 97%, 0.5)" }}
    >
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
        My Tasks
      </Typography>

      {sections.map((section) => (
        <TaskStatusSection
          key={section.status}
          status={section.status}
          icon={section.icon}
          color={section.color}
          lang={lang}
          onViewTask={handleViewTask}
          expanded={expandedSections[section.status]}
          onToggle={handleToggleSection(section.status)}
        />
      ))}

      {/* Task Detail Dialog */}
      {openTaskDialog && (
        <TaskDetailDialog
          open={openTaskDialog}
          onClose={handleCloseTaskDialog}
          taskData={selectedTask}
          lang={lang}
        />
      )}
    </Paper>
  );
};

export default MyTaskPage;
