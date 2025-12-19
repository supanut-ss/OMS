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
  useTheme,
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

// ============ Helper Functions ============
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

// ============ Priority Icon Component ============
const PriorityDisplay = ({ priority, showLabel = true, theme }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
    <FlagIcon fontSize="small" sx={{ color: getPriorityColor(priority, theme) }} />
    {showLabel && (
      <Typography variant="body2" fontWeight="medium">
        {priority || "-"}
      </Typography>
    )}
  </Box>
);

// ============ Info Field Component ============
const InfoField = ({ label, value, children, fullWidth = false, theme }) => (
  <Grid size={fullWidth ? 12 : { xs: 12, sm: 6, md: 4 }}>
    <Box
      sx={{
        px: 1,
        py: 0.7,
        backgroundColor: theme?.palette?.background?.paper || "#fff",
        borderRadius: 1,
        border: `1px solid ${theme?.palette?.divider || "#e0e0e0"}`,
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
        {label}
      </Typography>
      {children || (
        <Typography variant="body2" fontWeight="medium">
          {value || "-"}
        </Typography>
      )}
    </Box>
  </Grid>
);

// ============ Task Detail Dialog ============
const TaskDetailDialog = ({ open, onClose, taskData, lang }) => {
  const theme = useTheme();
  
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
              sx={{ backgroundColor: theme.palette.custom?.accordionContent || theme.palette.grey[100], borderRadius: 2 }}
            >
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Task Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: theme.palette.custom?.accordionContent || theme.palette.grey[100], pt: 0, pb: 1 }}>
              <Grid container spacing={1.2} rowSpacing={0.5}>
                <InfoField label="Project No" value={taskData?.project_no} theme={theme} />
                <InfoField
                  label="Project Name"
                  value={taskData?.project_name}
                  theme={theme}
                />
                <InfoField
                  label="Project Type"
                  value={taskData?.project_type}
                  theme={theme}
                />
                <InfoField label="Task Name" value={taskData?.task_name} theme={theme} />

                {/* Priority with icon */}
                <InfoField label="Priority" theme={theme}>
                  <PriorityDisplay priority={taskData?.priority} theme={theme} />
                </InfoField>

                <InfoField label="Issue Type" value={taskData?.issue_type} theme={theme} />
                <InfoField
                  label="Due Date"
                  value={`${formatDate(taskData?.start_date)} - ${formatDate(
                    taskData?.end_date
                  )}`}
                  theme={theme}
                />
                <InfoField label="Manday (Hour)" value={taskData?.manday} theme={theme} />

                {/* Full width fields */}
                <InfoField label="Task Description" fullWidth theme={theme}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {taskData?.task_description || "-"}
                  </Typography>
                </InfoField>

                <InfoField label="Remark" fullWidth theme={theme}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {taskData?.remark || "-"}
                  </Typography>
                </InfoField>
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
  const theme = useTheme();
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
                field: "start_date",
                headerName: "Start Date",
                type: "date",
                dateFormat: "dd/MM/yyyy",
              },
              {
                field: "end_date",
                headerName: "Due Date",
                type: "date",
                dateFormat: "dd/MM/yyyy",
              },
              {
                field: "priority",
                headerName: "Priority",
                width: 120,
                renderCell: (params) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FlagIcon sx={{ color: getPriorityColor(params.value, theme) }} />
                    <span>{params.value || "-"}</span>
                  </Box>
                ),
              },
            ]}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// ============ Section Configurations with Theme Support ============
const getSectionConfigs = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  
  return [
    {
      status: TASK_STATUS.OPEN,
      icon: <AssignmentIcon sx={{ color: isDark ? "#64B5F6" : "#1976d2" }} />,
      color: isDark ? "#1a3a5c" : "#e3f2fd",
    },
    {
      status: TASK_STATUS.IN_PROCESS,
      icon: <AssignmentLateIcon sx={{ color: isDark ? "#FFB74D" : "#ed6c02" }} />,
      color: isDark ? "#5c3a1a" : "#FFD8B3FF",
    },
    {
      status: TASK_STATUS.CLOSE,
      icon: <AssignmentTurnedInIcon sx={{ color: isDark ? "#81C784" : "#2e7d32" }} />,
      color: isDark ? "#1a3d28" : "#D5F5E1FF",
    },
  ];
};

// ============ Main MyTask Page ============
const MyTaskPage = (props) => {
  const { lang = "th" } = props;
  const theme = useTheme();

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

  // Get theme-aware section configurations
  const sections = getSectionConfigs(theme);

  return (
    <Paper
      elevation={3}
      sx={{ 
        p: 3, 
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#0d0d0e' 
          : theme.palette.custom?.paperBackground || theme.palette.background.paper 
      }}
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
