import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

import BSGanttChartToolbar from "./BSGanttChartToolbar";
import { useGanttData } from "./useGanttData";
import { getLocaleText } from "./locales";
import { useResource } from "../../hooks/useResource";
import SecureStorage from "../../utils/SecureStorage";
import Logger from "../../utils/logger";

/**
 * BSGanttChart - Configurable Gantt Chart Component
 * Uses SVAR React Gantt (MIT License) with BSDataGrid-like configuration pattern
 *
 * Features:
 * - Hierarchical display: User → Project → Task
 * - Date range filtering
 * - Employee multi-select filtering
 * - Configurable scale and cell sizes
 * - Localization support (EN/TH)
 * - Resource-based labels
 */
const BSGanttChart = forwardRef(
  (
    {
      // Data source (stored procedure)
      procedureName = "",
      procedureParams = {},
      preObj = null,

      // Filtering options
      showDateFilter = true,
      showEmployeeFilter = true,
      dateFilterField = "max_task_end_date", // Field for due date filtering

      // Initial filter values
      initialStartDate = null,
      initialEndDate = null,
      initialSelectedEmployees = [],

      // Display customization
      columns: customColumns = null,
      scales: customScales = null,
      initialCellWidth = 60,
      initialCellHeight = 38,
      initialScaleHeight = 40,
      initialScale = "day",
      height = 600,

      // Resource/Localization
      resourceGroup = null,
      title = null,

      // Appearance
      showToolbar = true,
      readonly = true,

      // Events
      onTaskClick = null,
      onDataLoad = null,
      onError = null,

      // Custom styles
      sx = {},
    },
    ref,
  ) => {
    // State
    const [tasks, setTasks] = useState([]);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [selectedEmployees, setSelectedEmployees] = useState(
      initialSelectedEmployees,
    );
    const [selectedProject, setSelectedProject] = useState(null);
    const [cellWidth, setCellWidth] = useState(initialCellWidth);
    const [cellHeight, setCellHeight] = useState(initialCellHeight);
    const [scaleHeight, setScaleHeight] = useState(initialScaleHeight);
    const [currentScale, setCurrentScale] = useState(initialScale);
    const [isInitialized, setIsInitialized] = useState(false);

    // Tooltip state
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [tooltipContent, setTooltipContent] = useState("");

    // Hooks
    const theme = useTheme();
    const lang = SecureStorage.get("lang");
    const localeText = useMemo(() => getLocaleText(), [lang]); // Re-fetch when lang changes
    const { getResources } = useResource();
    const { loading, error, employees, projects, fetchData, getFilteredTasks, allTasks } =
      useGanttData();

    // Generate scales based on current scale setting
    const scales = useMemo(() => {
      if (customScales) return customScales;

      const locale = lang === "en" ? "en-US" : "th-TH";

      const scaleConfigs = {
        day: [
          {
            unit: "month",
            step: 1,
            format: (date) =>
              new Intl.DateTimeFormat(locale, {
                month: "long",
                year: "numeric",
              }).format(date),
          },
          {
            unit: "day",
            step: 1,
            format: (date) => {
              const dayName = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
              const dayNum = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
              return `${dayName}\n${dayNum}`;
            },
          },
        ],
        week: [
          {
            unit: "month",
            step: 1,
            format: (date) =>
              new Intl.DateTimeFormat(locale, {
                month: "long",
                year: "numeric",
              }).format(date),
          },
          {
            unit: "week",
            step: 1,
            format: (date) => {
              // Simple week number calculation
              const d = new Date(
                Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
              );
              d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
              const weekNo = Math.ceil(
                ((d - yearStart) / 86400000 + 1) / 7,
              );
              return `W${weekNo}`;
            },
          },
        ],
        month: [
          {
            unit: "year",
            step: 1,
            format: (date) =>
              new Intl.DateTimeFormat(locale, { year: "numeric" }).format(
                date,
              ),
          },
          {
            unit: "month",
            step: 1,
            format: (date) =>
              new Intl.DateTimeFormat(locale, { month: "short" }).format(date),
          },
        ],
      };

      return scaleConfigs[currentScale] || scaleConfigs["day"];
    }, [customScales, currentScale, lang]);

    // Generate columns for the grid area
    const columns = useMemo(() => {
      if (customColumns) return customColumns;

      return [
        {
          id: "text",
          header: localeText.bsColumnName || "ชื่อ",
          //flexgrow: 2,
          width: 250, // Increased from 250
        },
        {
          id: "duration",
          header: localeText.bsColumnDuration || "Start - End Date",
          // flexgrow: 2,
          align: "center",
          width: 180, // Increased from 180 to 250
          template: (value, row, col) => {
            if (!row.start || !row.end) return "-";
            const formatDate = (date) => {
              const d = new Date(date);
              const day = String(d.getDate()).padStart(2, "0");
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
            };
            return `${formatDate(row.start)} - ${formatDate(row.end)}`;
          },
        },
        {
          id: "man_day",
          header: localeText.bsColumnManDay || "Man Day (Hours)",
          align: "center",
          width: 80,
          template: (value, row, col) => {
            // value is the man_day field from task object (set in useGanttData.js)
            return value ? parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
          },
        },
        {
          id: "actual_man_day",
          header: localeText.bsColumnActualManDay || "Actual Man Day (Hours)",
          align: "center",
          width: 80,
          template: (value, row, col) => {
            // value is the actual_man_day field from task object (set in useGanttData.js)
            return value ? parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
          },
        },
      ];
      return columns;
    }, [localeText]);

    // Tooltip template
    const tooltipTemplate = useCallback(
      (task) => {
        // console.log("Tooltip called for:", task);
        const startDate = new Date(task.start_date).toLocaleDateString(
          lang === "en" ? "en-US" : "th-TH",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        );
        const endDate = new Date(task.end_date).toLocaleDateString(
          lang === "en" ? "en-US" : "th-TH",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        );

        const progressLabel = localeText.bsProgress || "Progress";
        const startLabel = localeText.bsStartDate || "Start";
        const endLabel = localeText.bsEndDate || "End";
        
        return `
          <div class="wx-gantt-tooltip-content">
            <div style="font-weight: bold; margin-bottom: 4px;">${task.text}</div>
            <div>${startLabel}: ${startDate}</div>
            <div>${endLabel}: ${endDate}</div>
            ${task.progress !== undefined ? `<div>${progressLabel}: ${Math.round(task.progress * 100)}%</div>` : ''}
          </div>
        `;
      },
      [lang, localeText],
    );

    // Define custom task types for color styling
    const taskTypes = useMemo(
      () => [
        { id: "summary", label: "Summary" },
        { id: "task", label: "Task" },
        { id: "work_task", label: "Work Task" },
        { id: "user", label: "User" },
        { id: "project", label: "Project" },
        { id: "milestone", label: "Milestone" },
      ],
      [],
    );

    // Fetch data on mount
    const loadData = useCallback(
      async (filterOverrides = {}) => {
        if (!procedureName) {
          Logger.warn("BSGanttChart: No procedureName provided");
          return;
        }

        // Use provided dates or fall back to state or defaults
        const fetchStartDate =
          filterOverrides.startDate !== undefined
            ? filterOverrides.startDate
            : startDate || getDefaultStartDate();
        const fetchEndDate =
          filterOverrides.endDate !== undefined
            ? filterOverrides.endDate
            : endDate || getDefaultEndDate();
        const fetchEmployees =
          filterOverrides.selectedEmployees !== undefined
            ? filterOverrides.selectedEmployees
            : selectedEmployees;

        const fetchProjectHeaderId =
          filterOverrides.projectHeaderId !== undefined
            ? filterOverrides.projectHeaderId
            : selectedProject?.id || procedureParams?.projectHeaderId || null;

        try {
          // fetchData now returns { rawData, tasks } directly
          const result = await fetchData({
            procedureName,
            startDate: fetchStartDate,
            endDate: fetchEndDate,
            projectHeaderId: fetchProjectHeaderId,
            selectedEmployees: fetchEmployees,
            preObj,
          });

          if (onDataLoad) {
            onDataLoad(result.rawData);
          }

          setIsInitialized(true);

          // Use tasks directly from fetchData result (avoids React state timing issues)
          setTasks(result.tasks);
        } catch (err) {
          Logger.error("BSGanttChart: Failed to load data", err);
          if (onError) {
            onError(err);
          }
        }
      },
      [
        procedureName,
        procedureParams,
        preObj,
        startDate,
        endDate,
        selectedEmployees,
        fetchData,
        onDataLoad,
        onError,
        selectedProject,
      ],
    );

    // Get default date range (current month if not specified)
    const getDefaultStartDate = useCallback(() => {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }, []);

    const getDefaultEndDate = useCallback(() => {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }, []);

    // Initial data load
    useEffect(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Re-fetch when date filters change (SP handles filtering)
    const handleDateFilterChange = useCallback(
      (type, value) => {
        if (type === "start") {
          setStartDate(value);
          // Re-fetch with new start date
          loadData({ startDate: value });
        } else if (type === "end") {
          setEndDate(value);
          // Re-fetch with new end date
          loadData({ endDate: value });
        }
      },
      [loadData],
    );

    // Re-fetch when employee selection changes
    const handleEmployeeFilterChange = useCallback(
      (newEmployees) => {
        setSelectedEmployees(newEmployees);
        // Re-fetch with selected employees
          loadData({ selectedEmployees: newEmployees });
      },
      [loadData],
    );

    // Re-fetch when project selection changes
    const handleProjectFilterChange = useCallback(
      (newProject) => {
        setSelectedProject(newProject);
        // Re-fetch with selected project
        loadData({ projectHeaderId: newProject?.id || null });
      },
      [loadData],
    );

    // Update tasks from raw data (client-side filtering is no longer needed since SP handles it)
    useEffect(() => {
      if (!isInitialized) return;
      // Tasks are already set from loadData, but update if allTasks changes
      if (allTasks && allTasks.length > 0) {
        setTasks(allTasks);
      }
    }, [isInitialized, allTasks]);

    // Handle task click
    const handleTaskClick = useCallback(
      (task) => {
        Logger.log("BSGanttChart: Task clicked", task);
        if (onTaskClick) {
          onTaskClick(task);
        }
      },
      [onTaskClick],
    );

    // Clear all filters and re-fetch with defaults
    const handleClearFilters = useCallback(() => {
      // Use default dates: first and last day of current month
      const now = new Date();
      const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
      setSelectedEmployees([]);
      setSelectedProject(null);
      // Re-fetch with default dates and no filters
      loadData({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        selectedEmployees: [],
        projectHeaderId: null,
      });
    }, [loadData]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        refresh: loadData,
        clearFilters: handleClearFilters,
        setFilters: ({ startDate: sd, endDate: ed, employees: emp }) => {
          if (sd !== undefined) setStartDate(sd);
          if (ed !== undefined) setEndDate(ed);
          if (emp !== undefined) setSelectedEmployees(emp);
        },
        getTasks: () => tasks,
        getAllTasks: () => allTasks,
      }),
      [loadData, handleClearFilters, tasks, allTasks],
    );

    // Custom task renderer to apply colors
    const taskTemplate = useCallback((task) => {
      const barColor =
        task.data?.barColor ||
        (task.data?.level === "user"
          ? "#4caf50" // Green for user
          : task.data?.level === "project"
            ? "#2196f3" // Blue for project
            : task.data?.level === "task"
              ? "#ff9800" // Orange for task
              : "#9e9e9e");

      return {
        ...task,
        css: `background-color: ${barColor}`,
      };
    }, []);

    // Function to apply tooltips to bars
    const applyTooltipsToNewBars = useCallback(() => {
      const bars = document.querySelectorAll(".wx-gantt .wx-bar");
      
      bars.forEach((bar) => {
        // Skip bars that already have tooltip listeners
        if (bar.hasAttribute("data-tooltip-applied")) return;
        
        const taskId = bar.getAttribute("data-id");
        if (taskId) {
          const task = tasks.find((t) => String(t.id) === String(taskId));
          if (task) {
            const startDateValue = task.start || task.start_date;
            const endDateValue = task.end || task.end_date;

            const startDate = startDateValue
              ? new Date(startDateValue).toLocaleDateString(
                  lang === "en" ? "en-US" : "th-TH",
                  { year: "numeric", month: "short", day: "numeric" }
                )
              : "-";
            const endDate = endDateValue
              ? new Date(endDateValue).toLocaleDateString(
                  lang === "en" ? "en-US" : "th-TH",
                  { year: "numeric", month: "short", day: "numeric" }
                )
              : "-";
            // Format manday values with thousand separators
            const manDay = task.man_day ? parseFloat(task.man_day).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
            const actualManDay = task.actual_man_day ? parseFloat(task.actual_man_day).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";

            const tooltipText = `${task.text}\n${localeText.bsStartDate || "Start"}: ${startDate}\n${localeText.bsEndDate || "End"}: ${endDate}\n${localeText.bsColumnManDay || "Man Day"}: ${manDay}\n${localeText.bsColumnActualManDay || "Actual Man Day"}: ${actualManDay}`;
            bar.setAttribute("data-tooltip", tooltipText);
            bar.setAttribute("data-tooltip-applied", "true");
            bar.removeAttribute("title");

            bar.addEventListener("mouseenter", () => {
              setTooltipContent(tooltipText);
              setTooltipVisible(true);
            }, true);

            bar.addEventListener("mousemove", (e) => {
              setTooltipPosition({ x: e.clientX + 15, y: e.clientY + 15 });
            }, true);

            bar.addEventListener("mouseleave", () => {
              setTooltipVisible(false);
            }, true);
          }
        }
      });
    }, [tasks, lang, localeText]);

    // Inject tooltip data-attribute into bar elements after render
    // Use MutationObserver to handle dynamically added bars (when expanding rows)
    useEffect(() => {
      if (!tasks || tasks.length === 0) return;

      // Initial application after delay
      const timeoutId = setTimeout(() => {
        applyTooltipsToNewBars();
      }, 500);

      // Watch for new bars being added (when user expands collapsed rows)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            applyTooltipsToNewBars();
          }
        });
      });

      const ganttElement = document.querySelector(".wx-gantt .wx-area");
      if (ganttElement) {
        observer.observe(ganttElement, { childList: true, subtree: true });
      }

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }, [tasks, lang, localeText, applyTooltipsToNewBars]);

    // Highlight weekends using official SVAR highlightTime prop
    const highlightTime = useCallback((date, unit) => {
      if (unit === "day") {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return "wx-weekend";
        }
      }
      return "";
    }, []);

    // Render error state
    if (error && !loading) {
      return (
        <Paper sx={{ p: 3, ...sx }}>
          <Alert severity="error">{error}</Alert>
        </Paper>
      );
    }

    return (
      <Paper
        sx={{
          overflow: "hidden",
          borderRadius: 2,
          ...sx,
        }}
      >
        {/* Title */}
        {title && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6">{title}</Typography>
          </Box>
        )}

        {/* Toolbar - Made sticky so it doesn't scroll away */}
        {showToolbar && (
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: theme.palette.background.paper,
          }}>
            <BSGanttChartToolbar
              // Filter state
              startDate={startDate}
              endDate={endDate}
              selectedEmployees={selectedEmployees}
              employees={employees}
              selectedProject={selectedProject}
              projects={projects}
              // Scale/size state
              cellWidth={cellWidth}
              scaleHeight={scaleHeight}
              currentScale={currentScale}
              // Callbacks
              onStartDateChange={(val) => handleDateFilterChange("start", val)}
              onEndDateChange={(val) => handleDateFilterChange("end", val)}
              onEmployeesChange={handleEmployeeFilterChange}
              onProjectChange={handleProjectFilterChange}
              onCellWidthChange={setCellWidth}
              onScaleHeightChange={setScaleHeight}
              onScaleChange={setCurrentScale}
              onRefresh={loadData}
              onClearFilters={handleClearFilters}
              // Localization
              localeText={localeText}
              // Loading
              loading={loading}
            />
          </Box>
        )}

        {/* Gantt Chart */}
        <Box
          sx={{
            height: height,
            position: "relative",
            overflow: "auto", // Ensure scrollbars are visible
            "& .wx-gantt": {
              height: "100% !important",
              overflow: "auto !important", // Show scrollbars in Gantt
            },
            // Ensure scrollbars are always visible
            // "& .wx-gantt .wx-chart": {
            //   overflow: "auto !important",
            // },
            "& .wx-gantt .wx-grid": {
              overflow: "auto !important",
            },
            // Enable text wrapping in scale cells (timeline header) for day name/number format
            "& .wx-gantt .wx-scale .wx-cell": {
              whiteSpace: "pre-line !important",
              lineHeight: "1.3 !important",
              textAlign: "center !important",
            },
            "& .wx-gantt .wx-scale .wx-text": {
              whiteSpace: "pre-line !important",
              textAlign: "center !important",
            },
            // Enable text wrapping in header cells
            "& .wx-gantt .wx-header .wx-cell": {
              whiteSpace: "normal !important",
              wordWrap: "break-word !important",
              lineHeight: "1.2 !important",
            },
            "& .wx-gantt .wx-header .wx-text": {
              whiteSpace: "normal !important",
              wordWrap: "break-word !important",
              textOverflow: "clip !important",
              overflow: "visible !important",
            },
            // Right-align cell values for man_day and actual_man_day columns (3rd and 4th columns)
            // Target data cells, not header cells
            "& .wx-gantt .wx-grid .wx-row:not(.wx-header) .wx-cell:nth-child(3), & .wx-gantt .wx-grid .wx-row:not(.wx-header) .wx-cell:nth-child(4)": {
              textAlign: "right !important",
            },
            // Custom bar colors using SVAR Gantt CSS class pattern: .wx-bar.wx-task.{type}
            // User level - Green (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.user": {
              backgroundColor: "#66bb6a !important", // Green 400
              borderColor: "#43a047 !important",     // Green 600
              color: "#ffffff !important",           // Dark Green Text
            },
            "& .wx-gantt .wx-bar.wx-task.user .wx-progress-percent": {
              backgroundColor: "#43a047 !important", // Green 600
            },
            // Project level - Blue (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.project": {
              backgroundColor: "#42a5f5 !important", // Blue 400
              borderColor: "#1e88e5 !important",     // Blue 600
              color: "#ffffff !important",           // Dark Blue Text
            },
            "& .wx-gantt .wx-bar.wx-task.project .wx-progress-percent": {
              backgroundColor: "#1e88e5 !important", // Blue 600
            },
            // Task level - Orange (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.work_task": {
              backgroundColor: "#ffa726 !important", // Orange 400
              borderColor: "#fb8c00 !important",     // Orange 600
              color: "#ffffff !important",           // Dark Orange Text
            },
            "& .wx-gantt .wx-bar.wx-task.work_task .wx-progress-percent": {
              backgroundColor: "#fb8c00 !important", // Orange 600
            },
            // Weekend highlighting (Saturday/Sunday)
            "& .wx-gantt .wx-cell.weekend, & .wx-gantt .wx-weekend": {
              backgroundColor: "rgba(255, 200, 200, 0.3) !important", // Light red for weekends
            },
            "& .wx-gantt .wx-scale-cell.weekend": {
              backgroundColor: "rgba(255, 200, 200, 0.3) !important",
            },
          }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                zIndex: 10,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && tasks.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">
                {localeText.bsNoData || "No data available"}
              </Typography>
            </Box>
          ) : (
            <>
              {theme.palette.mode === "dark" ? (
                <WillowDark>
                  <Gantt
                    tasks={tasks}
                    scales={scales}
                    columns={columns}
                    taskTypes={taskTypes}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    scaleHeight={scaleHeight}
                    readonly={readonly}
                    zoom
                    highlightTime={highlightTime}
                  />
                </WillowDark>
              ) : (
                <Willow>
                  <Gantt
                    tasks={tasks}
                    scales={scales}
                    columns={columns}
                    taskTypes={taskTypes}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    scaleHeight={scaleHeight}
                    readonly={readonly}
                    zoom
                    highlightTime={highlightTime}
                  />
                </Willow>
              )}
            </>
          )}
        </Box>

        {/* Custom Mouse-Following Tooltip */}
        {tooltipVisible && (
          <Box
            sx={{
              position: "fixed",
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              backgroundColor: theme.palette.mode === "dark" ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.85)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              whiteSpace: "pre-line",
              zIndex: 9999,
              pointerEvents: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              maxWidth: "300px",
            }}
          >
            {tooltipContent}
          </Box>
        )}
      </Paper>
    );
  },
);

BSGanttChart.displayName = "BSGanttChart";

export default BSGanttChart;
