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
import { useRef, useState, useMemo, useCallback, memo } from "react";
import { useResource } from "../../hooks/useResource";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FlagIcon from "@mui/icons-material/Flag";
import { Visibility } from "@mui/icons-material";
import { SvgIcon } from "@mui/material";

import BSDataGrid from "../../components/BSDataGrid";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import TaskTracking from "./Tasks/TaskTracking";
import { useOutletContext } from "react-router-dom";

// ============ Task Status Constants ============
const TASK_STATUS = {
  OPEN: "Opened",
  IN_PROCESS: "In Process",
  OVER_DUE: "Over Due",
  CLOSE: "Closed",
};

// Database values for stored procedure (must match database)
const DB_STATUS = {
  [TASK_STATUS.OPEN]: "Open",
  [TASK_STATUS.IN_PROCESS]: "In Process",
  [TASK_STATUS.OVER_DUE]: "OverDue",
  [TASK_STATUS.CLOSE]: "Close",
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

// Custom SVG Icon - Eye Close (for tasks without tracking)
const EyeCloseIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10a13.358 13.358 0 0 0 3 2.685M21 10a13.358 13.358 0 0 1-3 2.685m-8 1.624L9.5 16.5m.5-2.19a10.59 10.59 0 0 0 4 0m-4 0a11.275 11.275 0 0 1-4-1.625m8 1.624.5 2.191m-.5-2.19a11.275 11.275 0 0 0 4-1.625m0 0 1.5 1.815M6 12.685 4.5 14.5"
    />
  </SvgIcon>
);

// ============ Priority Icon Component ============
const PriorityDisplay = ({ priority, showLabel = true, theme }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
    <FlagIcon
      fontSize="small"
      sx={{ color: getPriorityColor(priority, theme) }}
    />
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
const TaskDetailDialog = ({ open, onClose, taskData, lang, resourceData }) => {
  const theme = useTheme();
  const { getResourceByGroupAndName } = useResource();
  // Helper function to get resource with fallback
  const r = (key, fallback) =>
    getResourceByGroupAndName("usp_tmt_my_task", key)?.resource_value ||
    fallback;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AssignmentIcon />
          {r("Header", "Task Details")}
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
              sx={{
                backgroundColor:
                  theme.palette.custom?.accordionContent ||
                  theme.palette.grey[100],
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                {r("task_information", "Task Information")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                backgroundColor:
                  theme.palette.custom?.accordionContent ||
                  theme.palette.grey[100],
                pt: 0,
                pb: 1,
              }}
            >
              <Grid container spacing={1.2} rowSpacing={0.5}>
                <InfoField
                  label={r("project_no", "Project No")}
                  value={taskData?.project_no}
                  theme={theme}
                />
                <InfoField
                  label={r("project_name", "Project Name")}
                  value={taskData?.project_name}
                  theme={theme}
                />
                <InfoField
                  label={r("project_type", "Project Type")}
                  value={taskData?.project_type}
                  theme={theme}
                />
                <InfoField
                  label={r("task_name", "Task Name")}
                  value={taskData?.task_name}
                  theme={theme}
                />

                {/* Priority with icon */}
                <InfoField label={r("priority", "Priority")} theme={theme}>
                  <PriorityDisplay
                    priority={taskData?.priority}
                    theme={theme}
                  />
                </InfoField>

                <InfoField
                  label={r("issue_type", "Issue Type")}
                  value={taskData?.issue_type}
                  theme={theme}
                />
                <InfoField
                  label={r("due_date", "Due Date")}
                  value={`${formatDate(taskData?.start_date)} - ${formatDate(
                    taskData?.end_date,
                  )}`}
                  theme={theme}
                />
                <InfoField
                  label={r("manday", "Manday (Hour)")}
                  value={taskData?.manday}
                  theme={theme}
                />

                {/* Full width fields */}
                <InfoField
                  label={r("task_description", "Task Description")}
                  fullWidth
                  theme={theme}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {taskData?.task_description || "-"}
                  </Typography>
                </InfoField>

                <InfoField
                  label={r("remark", "Remark")}
                  fullWidth
                  theme={theme}
                >
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
            {r("close", "Close")}
          </BSCloseOutlinedButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ============ Over Due Section (Accordion) ============
// This section shows tasks from OPEN and IN_PROCESS where end_date < today
const OverDueSection = memo(function OverDueSection({
  color,
  lang,
  onViewTask,
  expanded,
  onToggle,
  gridRef,
  onDataBind: onDataBindProp,
}) {
  const { permission } = useOutletContext();
  const theme = useTheme();
  const dataGridRef = useRef();
  const [count, setCount] = useState(0);

  const effectiveGridRef = gridRef || dataGridRef;

  // Icon for Over Due section
  const icon = useMemo(() => {
    const isDark = theme.palette.mode === "dark";
    return <WarningAmberIcon sx={{ color: isDark ? "#FF6B6B" : "#d32f2f" }} />;
  }, [theme.palette.mode]);

  // Handle data loaded - filter for overdue items and notify parent
  const handleDataLoaded = useCallback(
    (data) => {
      const overDueCount = data?.length || 0;
      setCount(overDueCount);
      // Notify parent about data count for auto-expand logic
      if (onDataBindProp) {
        onDataBindProp(overDueCount);
      }
    },
    [onDataBindProp],
  );

  // For Over Due, we pass special parameter to get OPEN and IN_PROCESS with overdue filter
  const storedProcedureParams = useMemo(
    () => ({ in_vchTaskStatus: "OverDue" }),
    [],
  );

  // Memoize bsRowConfig to prevent re-renders
  const infoMainColor = theme.palette.info.main;
  const greyColor = theme.palette.grey[400];

  const rowConfig = useCallback(
    (row) => ({
      add: permission.is_add,
      edit: permission.is_edit,
      delete: permission.is_delete,
      viewIcon: row.task_tracking_count > 0 ? Visibility : EyeCloseIcon,
      viewIconColor: row.task_tracking_count > 0 ? infoMainColor : greyColor,
    }),
    [infoMainColor, greyColor],
  );

  // Memoize column definitions
  const priorityColors = useMemo(
    () => ({
      urgent: theme.palette.custom?.priority?.urgent || "#d32f2f",
      high: theme.palette.custom?.priority?.high || "#ed6c02",
      normal: theme.palette.custom?.priority?.normal || "#0288d1",
      low: theme.palette.custom?.priority?.low || "#9e9e9e",
    }),
    [theme.palette.mode],
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "task_status",
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={getStatusColor(params.value)}
            size="small"
          />
        ),
      },
      {
        field: "assignee_list",
        type: "stringAvatar",
        showTooltip: true,
      },
      {
        field: "start_date",
        type: "date",
        dateFormat: "dd/MM/yyyy",
      },
      {
        field: "end_date",
        type: "date",
        dateFormat: "dd/MM/yyyy",
      },
      {
        field: "priority",
        width: 120,
        renderCell: (params) => {
          const priority = params.value?.toLowerCase();
          let color = priorityColors.low;
          if (priority === "urgent") color = priorityColors.urgent;
          else if (priority === "high") color = priorityColors.high;
          else if (priority === "normal" || priority === "medium")
            color = priorityColors.normal;

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FlagIcon sx={{ color }} />
              <span>{params.value || "-"}</span>
            </Box>
          );
        },
      },
    ],
    [priorityColors],
  );

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{
        mb: 2,
        "&:before": { display: "none" },
        borderRadius: "12px !important",
        overflow: "hidden",
        "&:first-of-type": {
          borderTopLeftRadius: "12px !important",
          borderTopRightRadius: "12px !important",
        },
        "&:last-of-type": {
          borderBottomLeftRadius: "12px !important",
          borderBottomRightRadius: "12px !important",
        },
        "&.Mui-expanded": {
          borderRadius: "12px !important",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: color,
          "&:hover": { backgroundColor: color, filter: "brightness(0.95)" },
          borderRadius: expanded ? "12px 12px 0 0" : "12px",
          transition: "border-radius 0.15s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon}
          <Typography
            variant="h6"
            fontWeight="medium"
            sx={{
              color: theme.palette.mode === "dark" ? "#FF6B6B" : "#d32f2f",
            }}
          >
            {TASK_STATUS.OVER_DUE} ({count})
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2 }}>
        <BSDataGrid
          ref={effectiveGridRef}
          bsLocale={lang}
          bsStoredProcedure="usp_tmt_my_task"
          bsStoredProcedureSchema="tmt"
          bsCols="project_no,application_type,customer_name,project_name,task_name,task_status,assignee_list,start_date,end_date,manday,priority,project_type,create_by"
          bsStoredProcedureParams={storedProcedureParams}
          bsShowRowNumber={true}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={permission?.is_delete}
          bsAllowDelete={permission?.is_delete}
          bsVisibleView={permission?.is_view}
          onView={onViewTask}
          bsKeyId="project_task_id"
          bsFilterMode="client"
          onDataBind={handleDataLoaded}
          bsRowConfig={rowConfig}
          bsColumnDefs={columnDefs}
        />
      </AccordionDetails>
    </Accordion>
  );
});

// ============ Task Status Section (Accordion) ============
const TaskStatusSection = memo(function TaskStatusSection({
  status,
  color,
  lang,
  onViewTask,
  expanded,
  onToggle,
  gridRef,
}) {
  const { permission } = useOutletContext();
  const theme = useTheme();
  const dataGridRef = useRef();
  const [count, setCount] = useState(0);

  const effectiveGridRef = gridRef || dataGridRef;

  // Create icon based on status - memoized
  const icon = useMemo(() => {
    const isDark = theme.palette.mode === "dark";
    switch (status) {
      case TASK_STATUS.OPEN:
        return (
          <AssignmentIcon sx={{ color: isDark ? "#00D4FF" : "#1976d2" }} />
        );
      case TASK_STATUS.IN_PROCESS:
        return (
          <AssignmentLateIcon sx={{ color: isDark ? "#FFD93D" : "#ed6c02" }} />
        );
      case TASK_STATUS.CLOSE:
        return (
          <AssignmentTurnedInIcon
            sx={{ color: isDark ? "#6BCB77" : "#2e7d32" }}
          />
        );
      default:
        return <AssignmentIcon />;
    }
  }, [status, theme.palette.mode]);

  // Memoize handleDataLoaded to prevent re-renders
  const handleDataLoaded = useCallback((data) => {
    setCount(data?.length || 0);
  }, []);

  // Memoize stored procedure params to prevent BSDataGrid from re-loading
  // Use DB_STATUS mapping to convert display name to database value
  const storedProcedureParams = useMemo(
    () => ({ in_vchTaskStatus: DB_STATUS[status] || status }),
    [status],
  );

  // Memoize bsRowConfig to prevent re-renders
  // Use primitive values as dependencies, not objects
  const infoMainColor = theme.palette.info.main;
  const greyColor = theme.palette.grey[400];

  const rowConfig = useCallback(
    (row) => ({
      add: permission.is_add,
      edit: permission.is_edit,
      delete: permission.is_delete,
      viewIcon: row.task_tracking_count > 0 ? Visibility : EyeCloseIcon,
      viewIconColor: row.task_tracking_count > 0 ? infoMainColor : greyColor,
    }),
    [infoMainColor, greyColor],
  );

  // Memoize column definitions to prevent re-renders
  // Extract priority colors as primitives for stable dependencies
  const priorityColors = useMemo(
    () => ({
      urgent: theme.palette.custom?.priority?.urgent || "#d32f2f",
      high: theme.palette.custom?.priority?.high || "#ed6c02",
      normal: theme.palette.custom?.priority?.normal || "#0288d1",
      low: theme.palette.custom?.priority?.low || "#9e9e9e",
    }),
    [theme.palette.mode],
  ); // Only rebuild when theme mode changes

  const columnDefs = useMemo(
    () => [
      {
        field: "assignee_list",
        type: "stringAvatar",
        showTooltip: true,
      },
      {
        field: "start_date",
        type: "date",
        dateFormat: "dd/MM/yyyy",
      },
      {
        field: "end_date",
        type: "date",
        dateFormat: "dd/MM/yyyy",
      },
      {
        field: "priority",
        width: 120,
        renderCell: (params) => {
          const priority = params.value?.toLowerCase();
          let color = priorityColors.low;
          if (priority === "urgent") color = priorityColors.urgent;
          else if (priority === "high") color = priorityColors.high;
          else if (priority === "normal" || priority === "medium")
            color = priorityColors.normal;

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FlagIcon sx={{ color }} />
              <span>{params.value || "-"}</span>
            </Box>
          );
        },
      },
    ],
    [priorityColors],
  );

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{
        mb: 2,
        "&:before": { display: "none" },
        // Force consistent border-radius for all accordions
        borderRadius: "12px !important",
        overflow: "hidden",
        // Override MUI's automatic first/last item border-radius adjustments
        "&:first-of-type": {
          borderTopLeftRadius: "12px !important",
          borderTopRightRadius: "12px !important",
        },
        "&:last-of-type": {
          borderBottomLeftRadius: "12px !important",
          borderBottomRightRadius: "12px !important",
        },
        // Ensure all corners are consistent when collapsed
        "&.Mui-expanded": {
          borderRadius: "12px !important",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: color,
          "&:hover": { backgroundColor: color, filter: "brightness(0.95)" },
          // Ensure AccordionSummary has consistent border-radius
          borderRadius: expanded ? "12px 12px 0 0" : "12px",
          transition: "border-radius 0.15s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon}
          <Typography variant="h6" fontWeight="medium">
            {status} ({count})
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2 }}>
        <BSDataGrid
          ref={effectiveGridRef}
          bsLocale={lang}
          bsStoredProcedure="usp_tmt_my_task"
          bsStoredProcedureSchema="tmt"
          bsCols="project_no,application_type,customer_name,project_name,task_name,assignee_list,start_date,end_date,manday,priority,project_type,create_by"
          bsStoredProcedureParams={storedProcedureParams}
          bsShowRowNumber={true}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={permission?.is_delete}
          bsAllowDelete={permission?.is_delete}
          bsVisibleView={permission?.is_view}
          onView={onViewTask}
          bsKeyId="project_task_id"
          bsFilterMode="client"
          onDataBind={handleDataLoaded}
          bsRowConfig={rowConfig}
          bsColumnDefs={columnDefs}
        />
      </AccordionDetails>
    </Accordion>
  );
});

// ============ Section Configurations with Glassmorphism ============
const getSectionConfigs = (theme) => {
  const isDark = theme.palette.mode === "dark";

  return [
    {
      status: TASK_STATUS.OVER_DUE,
      color: isDark
        ? theme.palette.custom?.sectionOverDue || "rgba(255, 107, 107, 0.15)"
        : "#ffebee",
      isOverDue: true,
    },
    {
      status: TASK_STATUS.OPEN,
      color: isDark
        ? theme.palette.custom?.sectionOpen || "rgba(0, 212, 255, 0.12)"
        : "#e3f2fd",
    },
    {
      status: TASK_STATUS.IN_PROCESS,
      color: isDark
        ? theme.palette.custom?.sectionInProcess || "rgba(255, 217, 61, 0.12)"
        : "#FFD8B3FF",
    },
    {
      status: TASK_STATUS.CLOSE,
      color: isDark
        ? theme.palette.custom?.sectionClose || "rgba(107, 203, 119, 0.12)"
        : "#D5F5E1FF",
    },
  ];
};

// ============ Main MyTask Page ============
const MyTaskPage = (props) => {
  const { lang = "th" } = props;
  const theme = useTheme();
  const { getResourceByGroupAndName } = useResource();
  // Keep refs to each section grid so we can refresh after closing the dialog
  const overDueGridRef = useRef(null);
  const openGridRef = useRef(null);
  const inProcessGridRef = useRef(null);
  const closeGridRef = useRef(null);

  // Memoize sectionGridRefs to prevent unnecessary re-renders
  const sectionGridRefs = useMemo(
    () => ({
      [TASK_STATUS.OVER_DUE]: overDueGridRef,
      [TASK_STATUS.OPEN]: openGridRef,
      [TASK_STATUS.IN_PROCESS]: inProcessGridRef,
      [TASK_STATUS.CLOSE]: closeGridRef,
    }),
    [],
  );

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    [TASK_STATUS.OVER_DUE]: true, // Start expanded to load data, will collapse if no data
    [TASK_STATUS.OPEN]: true,
    [TASK_STATUS.IN_PROCESS]: true,
    [TASK_STATUS.CLOSE]: false, // Close section collapsed by default
  });

  // State for task detail dialog
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Memoize toggle handlers for each status to prevent re-renders
  const handleToggleOverDue = useCallback(() => {
    setExpandedSections((prev) => ({
      ...prev,
      [TASK_STATUS.OVER_DUE]: !prev[TASK_STATUS.OVER_DUE],
    }));
  }, []);

  const handleToggleOpen = useCallback(() => {
    setExpandedSections((prev) => ({
      ...prev,
      [TASK_STATUS.OPEN]: !prev[TASK_STATUS.OPEN],
    }));
  }, []);

  const handleToggleInProcess = useCallback(() => {
    setExpandedSections((prev) => ({
      ...prev,
      [TASK_STATUS.IN_PROCESS]: !prev[TASK_STATUS.IN_PROCESS],
    }));
  }, []);

  const handleToggleClose = useCallback(() => {
    setExpandedSections((prev) => ({
      ...prev,
      [TASK_STATUS.CLOSE]: !prev[TASK_STATUS.CLOSE],
    }));
  }, []);

  // Map status to toggle handler
  const toggleHandlers = useMemo(
    () => ({
      [TASK_STATUS.OVER_DUE]: handleToggleOverDue,
      [TASK_STATUS.OPEN]: handleToggleOpen,
      [TASK_STATUS.IN_PROCESS]: handleToggleInProcess,
      [TASK_STATUS.CLOSE]: handleToggleClose,
    }),
    [
      handleToggleOverDue,
      handleToggleOpen,
      handleToggleInProcess,
      handleToggleClose,
    ],
  );

  // Handle Over Due data loaded - auto expand if has data
  const handleOverDueDataLoaded = useCallback((count) => {
    setExpandedSections((prev) => ({
      ...prev,
      [TASK_STATUS.OVER_DUE]: count > 0,
    }));
  }, []);

  // Handle view task detail - memoized
  const handleViewTask = useCallback((taskData) => {
    setSelectedTask(taskData);
    setOpenTaskDialog(true);
  }, []);

  // Handle close task dialog - memoized
  const handleCloseTaskDialog = useCallback(() => {
    setOpenTaskDialog(false);
    setSelectedTask(null);

    // Refresh visible task lists so data is up-to-date after closing
    // (e.g., when tracking was added/edited inside the dialog)
    overDueGridRef.current?.forceRefresh?.();
    openGridRef.current?.forceRefresh?.();
    inProcessGridRef.current?.forceRefresh?.();
    closeGridRef.current?.forceRefresh?.();
  }, []);

  // Memoize theme-aware section configurations to prevent re-renders
  const sections = useMemo(
    () => getSectionConfigs(theme),
    [theme.palette.mode],
  );

  return (
    <Paper
      elevation={0}
      sx={{ height: "100vh", p: 3, width: "100%" }}
      // sx={(t) => ({
      //   height: "auto",
      //   p: 3,
      //   // Glassmorphism background
      //   backgroundColor:
      //     t.palette.mode === "dark"
      //       ? t.palette.custom?.glass?.background || "rgba(20, 20, 25, 0.6)"
      //       : t.palette.custom?.paperBackground || t.palette.background.paper,
      //   // Backdrop blur for glass effect
      //   backdropFilter: t.palette.mode === "dark" ? "blur(20px)" : "none",
      //   // Subtle glass border
      //   border:
      //     t.palette.mode === "dark"
      //       ? `1px solid ${t.palette.custom?.glass?.border || "rgba(255, 255, 255, 0.08)"
      //       }`
      //       : "none",
      //   // Rounded corners
      //   borderRadius: 3,
      //   // Glass shadow
      //   boxShadow:
      //     t.palette.mode === "dark"
      //       ? t.palette.custom?.glass?.shadow || "0 8px 32px rgba(0, 0, 0, 0.4)"
      //       : undefined,
      //   // Smooth transition
      //   transition: "all 0.3s ease", width: "100%"
      // })}
    >
      {/* <Typography
        variant="h5"
        fontWeight="bold"
        gutterBottom
        sx={(t) => ({
          mb: 3,
          // Gradient text in dark mode
          background:
            t.palette.mode === "dark"
              ? "linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)"
              : "inherit",
          backgroundClip: t.palette.mode === "dark" ? "text" : "unset",
          WebkitBackgroundClip: t.palette.mode === "dark" ? "text" : "unset",
          color: t.palette.mode === "dark" ? "transparent" : "inherit",
        })}
      >
        {getResourceByGroupAndName("usp_tmt_my_task", "my_tasks")
          ?.resource_value || "My Tasks"}
      </Typography> */}

      {/* Over Due Section - rendered separately */}
      <OverDueSection
        color={sections.find((s) => s.status === TASK_STATUS.OVER_DUE)?.color}
        lang={lang}
        onViewTask={handleViewTask}
        expanded={expandedSections[TASK_STATUS.OVER_DUE]}
        onToggle={toggleHandlers[TASK_STATUS.OVER_DUE]}
        gridRef={sectionGridRefs[TASK_STATUS.OVER_DUE]}
        onDataBind={handleOverDueDataLoaded}
      />

      {/* Other Task Status Sections */}
      {sections
        .filter((s) => !s.isOverDue)
        .map((section) => (
          <TaskStatusSection
            key={section.status}
            status={section.status}
            color={section.color}
            lang={lang}
            onViewTask={handleViewTask}
            expanded={expandedSections[section.status]}
            onToggle={toggleHandlers[section.status]}
            gridRef={sectionGridRefs[section.status]}
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
