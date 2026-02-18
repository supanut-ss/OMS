import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
import { alpha } from "@mui/material/styles";
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

import BSGanttChartToolbar from "./BSGanttChartToolbar";
import { useGanttData } from "./useGanttData";
import { getLocaleText } from "./locales";
import { useResource } from "../../hooks/useResource";
import SecureStorage from "../../utils/SecureStorage";
import Logger from "../../utils/logger";
import AxiosMaster from "../../utils/AxiosMaster";

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
      initialCellWidth = 30,
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

      // Holiday highlighting
      holidays = [], // Array of holiday dates: [{ date: '2026-01-01', name: 'New Year' }, ...] or ['2026-01-01', ...]
      holidayProcedureName = null, // SP name to fetch holidays (e.g., 'usp_tmt_get_holidays')
      holidayTableName = null, // Table name to fetch holidays directly (e.g., 't_tmt_holiday')
      holidayPreObj = null, // Schema prefix for holiday SP or table (e.g., 'tmt')
      showHolidays = true, // Show/hide holiday highlighting

      // Custom styles
      sx = {},
    },
    ref,
  ) => {
    // Debug: Check if component receives props
    if (holidayTableName) {
      Logger.debug(
        "BSGanttChart: Rendered with holidayTableName:",
        holidayTableName,
      );
    }

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
    const [showFullscreenHint, setShowFullscreenHint] = useState(false);

    // Tooltip state
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [tooltipContent, setTooltipContent] = useState("");

    // Holiday state
    const [holidayDates, setHolidayDates] = useState(new Map()); // Map<dateString, holidayName>
    const [holidaysLoaded, setHolidaysLoaded] = useState(false); // Track if holidays have been loaded

    // Sticky scrollbar state
    const stickyScrollRef = useRef(null);
    const [chartScrollWidth, setChartScrollWidth] = useState(0);
    const [chartClientWidth, setChartClientWidth] = useState(0);
    const [gridWidth, setGridWidth] = useState(0); // Track grid panel width for scrollbar offset
    const [isScrollSyncing, setIsScrollSyncing] = useState(false);

    // Hooks - MUST be called before any useEffect that uses them
    const theme = useTheme();
    const lang = SecureStorage.get("lang");
    const localeText = useMemo(() => getLocaleText(), [lang]); // Re-fetch when lang changes
    const { getResources } = useResource();
    const {
      loading,
      error,
      employees,
      projects,
      fetchData,
      getFilteredTasks,
      allTasks,
    } = useGanttData();

    // Refs
    const chartContainerRef = React.useRef(null);
    const ganttInstance = React.useRef(null);

    // Inject global styles - updates when theme changes
    useEffect(() => {
      const styleId = "bs-gantt-global-styles";

      // Remove existing style to update with new theme colors
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      // Determine colors based on theme
      const isDark = theme.palette.mode === "dark";
      const headerBgColor = isDark ? "#1e1e1e" : "#ffffff";
      const headerTextColor = isDark ? "#ffffff" : "#000000";
      const shadowColor = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)";

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* ===== STICKY HEADER STYLES (JavaScript-controlled via transform) ===== */
        /* Headers need solid background to cover content when "sticky" via transform */
        body .wx-gantt .wx-grid .wx-header,
        body .wx-gantt .wx-header {
          background-color: ${headerBgColor} !important;
          color: ${headerTextColor} !important;
          box-shadow: 0 2px 4px ${shadowColor} !important;
        }
        
        body .wx-gantt .wx-area .wx-scale,
        body .wx-gantt .wx-scale {
          background-color: ${headerBgColor} !important;
          color: ${headerTextColor} !important;
          box-shadow: 0 2px 4px ${shadowColor} !important;
        }
        
        /* Header cells also need background */
        body .wx-gantt .wx-header .wx-cell,
        body .wx-gantt .wx-scale .wx-cell {
          background-color: ${headerBgColor} !important;
          color: ${headerTextColor} !important;
        }
        
        /* ===== HOLIDAY STYLES ===== */
        /* Holiday Header - Purple background */
        body .wx-gantt .wx-scale .wx-cell.wx-holiday {
          background-color: rgba(156, 39, 176, 0.4) !important;
          background: rgba(156, 39, 176, 0.4) !important;
          color: ${isDark ? "#e1bee7" : "#4a148c"} !important;
          font-weight: bold !important;
        }
        /* Holiday Body Cells - Fix height/position and apply purple background */
        body .wx-gantt .wx-gantt-holidays .wx-holiday {
          position: absolute !important;
          height: 100% !important;
          top: 0 !important;
          background-color: rgba(156, 39, 176, 0.3) !important;
          background: rgba(156, 39, 176, 0.3) !important;
        }
        /* Fullscreen button - Fixed position at bottom-right of viewport */
        .wx-fullscreen .wx-fullscreen-button {
          position: fixed !important;
          bottom: 60px !important;
          right: 40px !important;
          top: auto !important;
          z-index: 1000 !important;
          background: ${isDark ? "rgba(30,30,30,0.9)" : "rgba(255, 255, 255, 0.45)"} !important;
          border-radius: 8px !important;
          padding: 8px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
          border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .wx-fullscreen .wx-fullscreen-button .wx-fullscreen-icon {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1 !important;
          display: block !important;
        }
        .wx-fullscreen .wx-fullscreen-button:hover {
          background: ${isDark ? "rgba(50,50,50,1)" : "rgba(255, 255, 255, 1)"} !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
          transform: scale(1.05);
        }
        /* Fullscreen mode - Enable scrolling */
        .wx-fullscreen-scroll-fix {
          overflow: auto !important;
          height: 100vh !important;
        }
      `;
      document.head.appendChild(style);
      Logger.debug(
        "BSGanttChart: Injected global styles for theme:",
        theme.palette.mode,
      );

      // Cleanup on unmount
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          styleToRemove.remove();
        }
      };
    }, [theme.palette.mode]);

    // Fullscreen Handler
    const handleToggleFullscreen = useCallback(() => {
      if (!chartContainerRef.current) return;

      if (!document.fullscreenElement) {
        chartContainerRef.current.requestFullscreen().catch((err) => {
          Logger.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }, []);

    // Effect: Handle Fullscreen State Class
    useEffect(() => {
      const handleFullscreenChange = () => {
        const el = chartContainerRef.current;
        if (!el) return;

        if (document.fullscreenElement === el) {
          el.classList.add("wx-gantt-fullscreen-active");
          // Show fullscreen hint
          setShowFullscreenHint(true);
          // Auto-hide after 3 seconds
          setTimeout(() => setShowFullscreenHint(false), 4000);
        } else {
          el.classList.remove("wx-gantt-fullscreen-active");
          setShowFullscreenHint(false);
        }
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
      };
    }, []);

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
              const dayName = new Intl.DateTimeFormat(locale, {
                weekday: "short",
              }).format(date);
              const dayNum = new Intl.DateTimeFormat(locale, {
                day: "numeric",
              }).format(date);
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
              const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
              return `W${weekNo}`;
            },
          },
        ],
        month: [
          {
            unit: "year",
            step: 1,
            format: (date) =>
              new Intl.DateTimeFormat(locale, { year: "numeric" }).format(date),
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
            // DEBUG: Log row data to understand structure
            console.log("📅 Column row:", row.text, {
              "row.start": row.start,
              "row.end": row.end,
              "row.originalStartDate": row.originalStartDate,
              "row.originalEndDate": row.originalEndDate,
            });
            // Use original dates from root level for display, fall back to row dates
            const displayStart = row.originalStartDate || row.start;
            const displayEnd = row.originalEndDate || row.end;
            if (!displayStart || !displayEnd) return "-";
            const formatDate = (date) => {
              const d = new Date(date);
              const day = String(d.getDate()).padStart(2, "0");
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
            };
            return `${formatDate(displayStart)} - ${formatDate(displayEnd)}`;
          },
        },
        {
          id: "man_day",
          header: localeText.bsColumnManDay || "Man Day (Hours)",
          align: "center",
          width: 80,
          template: (value, row, col) => {
            // value is the man_day field from task object (set in useGanttData.js)
            return value
              ? parseFloat(value).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-";
          },
        },
        {
          id: "actual_man_day",
          header: localeText.bsColumnActualManDay || "Actual Man Day (Hours)",
          align: "center",
          width: 80,
          template: (value, row, col) => {
            // value is the actual_man_day field from task object (set in useGanttData.js)
            return value
              ? parseFloat(value).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-";
          },
        },
      ];
      return columns;
    }, [localeText]);

    // Tooltip template
    const tooltipTemplate = useCallback(
      (task) => {
        // console.log("Tooltip called for:", task);
        // Use original dates from root level for display, fall back to task dates
        const displayStart = task.originalStartDate || task.start_date;
        const displayEnd = task.originalEndDate || task.end_date;
        const startDate = new Date(displayStart).toLocaleDateString(
          lang === "en" ? "en-US" : "th-TH",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        );
        const endDate = new Date(displayEnd).toLocaleDateString(
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
            ${task.progress !== undefined ? `<div>${progressLabel}: ${Math.round(task.progress * 100)}%</div>` : ""}
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

    // Process holidays prop into Map for quick lookup
    useEffect(() => {
      if (!showHolidays) {
        setHolidayDates(new Map());
        setHolidaysLoaded(true); // Mark as loaded even when disabled
        return;
      }

      const holidayMap = new Map();

      // Process holidays prop (array of dates or objects)
      if (holidays && holidays.length > 0) {
        holidays.forEach((holiday) => {
          if (typeof holiday === "string") {
            // Simple date string: '2026-01-01'
            const dateKey = holiday.split("T")[0]; // Remove time part if exists
            holidayMap.set(dateKey, "Holiday");
          } else if (holiday && holiday.date) {
            // Object with date and name: { date: '2026-01-01', name: 'New Year' }
            const dateKey = String(holiday.date).split("T")[0];
            holidayMap.set(dateKey, holiday.name || "Holiday");
          }
        });
        setHolidayDates(holidayMap);
        setHolidaysLoaded(true); // Mark as loaded when holidays prop is processed
      } else if (!holidayProcedureName && !holidayTableName) {
        // No holidays prop and no SP/table to fetch from
        setHolidaysLoaded(true);
      }
      // If there's a holidayProcedureName or holidayTableName, the other useEffect will handle loading
    }, [holidays, showHolidays, holidayProcedureName, holidayTableName]);

    // Fetch holidays from SP or Table
    useEffect(() => {
      //   console.warn("[BSGanttChart] Holiday Effect Triggered. showHolidays:", showHolidays, "holidayTableName:", holidayTableName);

      //   // TEST: Force add Jan 1, 2026 and Today as holiday to test rendering
      //   const testDate = "2026-01-01";
      //   const todayDate = new Date().toISOString().split('T')[0];
      // //   console.warn(`[BSGanttChart] TEST: Forcing holidays on ${testDate} and ${todayDate} to verify CSS/Rendering`);

      //   setHolidayDates(prev => {
      //       const m = new Map(prev);
      //       m.set(testDate, "Test Holiday 1");
      //       m.set(todayDate, "Test Holiday Today");
      //       return m;
      //   });

      const fetchHolidays = async () => {
        // Skip if neither SP nor table is specified, or holidays are disabled
        if ((!holidayProcedureName && !holidayTableName) || !showHolidays) {
          // console.warn("BSGanttChart: Holiday fetch skipped (params missing or disabled)");
          return;
        }

        try {
          //   console.warn("BSGanttChart: Starting holiday fetch...");
          let response;

          if (holidayTableName) {
            // console.warn(
            //   "BSGanttChart: Fetching holidays from table",
            //   holidayPreObj
            //     ? `${holidayPreObj}.${holidayTableName}`
            //     : holidayTableName,
            // );

            // Use POST to Dynamic/bs-datagrid (AxiosMaster already has /api prefix)
            response = await AxiosMaster.post("Dynamic/bs-datagrid", {
              tableName: holidayTableName,
              schemaName: holidayPreObj || "dbo",
              pageSize: 1000, // Get all holidays
              page: 1,
              customWhere: "is_active = 'YES'",
              customOrderBy: "holiday_date ASC",
            });
            // console.warn("BSGanttChart: Holiday API response received", response?.status);
          } else if (holidayProcedureName) {
            // ...
            // Query from stored procedure
            const fullProcedureName = holidayPreObj
              ? `${holidayPreObj}.${holidayProcedureName}`
              : holidayProcedureName;

            Logger.debug(
              "BSGanttChart: Fetching holidays from SP",
              fullProcedureName,
            );

            response = await AxiosMaster.get(
              `GenericSP/execute/${fullProcedureName}`,
            );
          }

          // Handle response data
          let data =
            response?.data?.rows || response?.data?.data || response?.data;

          if (data && Array.isArray(data)) {
            const holidayMap = new Map();

            data.forEach((row) => {
              // bs-datagrid wraps data in .data property, SP returns flat rows
              const rowData = row.data || row;

              // Try common field names for date and name
              const dateValue =
                rowData.holiday_date ||
                rowData.date ||
                rowData.holidayDate ||
                rowData.HolidayDate ||
                rowData.HOLIDAY_DATE;
              const nameValue =
                rowData.holiday_name ||
                rowData.name ||
                rowData.holidayName ||
                rowData.HolidayName ||
                rowData.HOLIDAY_NAME ||
                rowData.description ||
                "Holiday";

              if (dateValue) {
                const dateKey = String(dateValue).split("T")[0];
                holidayMap.set(dateKey, nameValue);
                // Log first few holidays
                if (holidayMap.size <= 3) {
                  Logger.debug(
                    `BSGanttChart: Parsed holiday: ${dateKey} - ${nameValue}`,
                  );
                }
              }
            });

            Logger.debug(
              "BSGanttChart: Total holidays loaded:",
              holidayMap.size,
            );

            Logger.log(
              "BSGanttChart: Loaded",
              holidayMap.size,
              "holidays",
              Array.from(holidayMap.keys()),
            );

            setHolidayDates((prevMap) => {
              const mergedMap = new Map(holidayMap);
              prevMap.forEach((value, key) => {
                mergedMap.set(key, value);
              });
              Logger.debug(
                "BSGanttChart: Holiday map updated, size:",
                mergedMap.size,
              );
              return mergedMap;
            });
            setHolidaysLoaded(true); // Mark holidays as loaded after fetch completes
          } else {
            Logger.debug(
              "BSGanttChart: No valid holiday data found in response",
            );
            setHolidaysLoaded(true); // Mark as loaded even if no data found
          }
        } catch (err) {
          console.error("BSGanttChart: Failed to fetch holidays", err);
          Logger.error("BSGanttChart: Failed to fetch holidays", err);
          setHolidaysLoaded(true); // Mark as loaded even on error to prevent indefinite loading
        }
      };

      fetchHolidays();
    }, [holidayProcedureName, holidayTableName, holidayPreObj, showHolidays]);

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

    // Handle Expand All
    const handleExpandAll = useCallback(() => {
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          // Only expand parent nodes (user and project levels)
          // Check type or data.level depending on how data is structured
          const isParent =
            t.type === "user" ||
            t.type === "project" ||
            t.data?.level === "user" ||
            t.data?.level === "project";

          if (isParent) {
            return { ...t, open: true };
          }
          return t;
        }),
      );
    }, []);

    // Handle Collapse All
    const handleCollapseAll = useCallback(() => {
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          // Only collapse parent nodes
          const isParent =
            t.type === "user" ||
            t.type === "project" ||
            t.data?.level === "user" ||
            t.data?.level === "project";

          if (isParent) {
            return { ...t, open: false };
          }
          return t;
        }),
      );
    }, []);

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
                  { year: "numeric", month: "short", day: "numeric" },
                )
              : "-";
            const endDate = endDateValue
              ? new Date(endDateValue).toLocaleDateString(
                  lang === "en" ? "en-US" : "th-TH",
                  { year: "numeric", month: "short", day: "numeric" },
                )
              : "-";
            // Format manday values with thousand separators
            const manDay = task.man_day
              ? parseFloat(task.man_day).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-";
            const actualManDay = task.actual_man_day
              ? parseFloat(task.actual_man_day).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-";

            const tooltipText = `${task.text}\n${localeText.bsStartDate || "Start"}: ${startDate}\n${localeText.bsEndDate || "End"}: ${endDate}\n${localeText.bsColumnManDay || "Man Day"}: ${manDay}\n${localeText.bsColumnActualManDay || "Actual Man Day"}: ${actualManDay}`;
            bar.setAttribute("data-tooltip", tooltipText);
            bar.setAttribute("data-tooltip-applied", "true");
            bar.removeAttribute("title");

            bar.addEventListener(
              "mouseenter",
              () => {
                setTooltipContent(tooltipText);
                setTooltipVisible(true);
              },
              true,
            );

            bar.addEventListener(
              "mousemove",
              (e) => {
                setTooltipPosition({ x: e.clientX + 15, y: e.clientY + 15 });
              },
              true,
            );

            bar.addEventListener(
              "mouseleave",
              () => {
                setTooltipVisible(false);
              },
              true,
            );
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

    // ===== STICKY HEADER IMPLEMENTATION via JavaScript =====
    // SVAR Gantt has nested scroll containers that prevent CSS sticky from working
    // This effect manually synchronizes header position when scrolling vertically
    useEffect(() => {
      if (!tasks || tasks.length === 0) return;

      let animationFrameId = null;
      let cleanupFn = null;

      // Determine background color based on theme
      const headerBgColor =
        theme.palette.mode === "dark" ? "#1e1e1e" : "#ffffff";
      const headerTextColor =
        theme.palette.mode === "dark" ? "#ffffff" : "#000000";

      const applyStickyHeaders = () => {
        const containerEl = chartContainerRef.current;
        if (!containerEl) return null;

        const ganttEl = containerEl.querySelector(".wx-gantt");
        if (!ganttEl) {
          console.log("[StickyHeader] .wx-gantt not found");
          return null;
        }

        // Debug: Log DOM structure (only once)
        // console.log("[StickyHeader] SVAR Gantt DOM structure:");
        // console.log("  - ganttEl children:", Array.from(ganttEl.children).map(c => c.className));

        // Find all possible scroll containers
        const possibleContainers = [
          containerEl, // The outer Box container
          ganttEl.querySelector(".wx-content"),
          ganttEl.querySelector(".wx-layout"),
          ganttEl.querySelector(".wx-body"),
          ganttEl,
        ].filter(Boolean);

        // Find the actual scroll container (the one that has scrollHeight > clientHeight)
        let scrollContainer = possibleContainers.find(
          (c) => c.scrollHeight > c.clientHeight,
        );

        // If no scrollable container found, use the outer container
        if (!scrollContainer) {
          scrollContainer = containerEl;
        }

        // Find header elements - try multiple selectors
        const gridHeader =
          ganttEl.querySelector(".wx-grid .wx-header") ||
          ganttEl.querySelector(".wx-header");
        const timelineScale =
          ganttEl.querySelector(".wx-area .wx-scale") ||
          ganttEl.querySelector(".wx-scale") ||
          ganttEl.querySelector(".wx-timeline .wx-scale");

        if (!gridHeader && !timelineScale) {
          console.log("[StickyHeader] No headers found!");
          return null;
        }

        // Apply initial styles for theme
        const applyHeaderStyles = (scrollTop) => {
          if (gridHeader) {
            gridHeader.style.transform = `translateY(${scrollTop}px)`;
            gridHeader.style.zIndex = "100";
            gridHeader.style.position = "relative";
            gridHeader.style.backgroundColor = headerBgColor;
            gridHeader.style.color = headerTextColor;
          }

          if (timelineScale) {
            timelineScale.style.transform = `translateY(${scrollTop}px)`;
            timelineScale.style.zIndex = "100";
            timelineScale.style.position = "relative";
            timelineScale.style.backgroundColor = headerBgColor;
            timelineScale.style.color = headerTextColor;
          }
        };

        const handleScroll = () => {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }

          animationFrameId = requestAnimationFrame(() => {
            const scrollTop = scrollContainer.scrollTop;
            applyHeaderStyles(scrollTop);
          });
        };

        // Attach scroll listener
        scrollContainer.addEventListener("scroll", handleScroll, {
          passive: true,
        });

        // Initial positioning with current scroll position
        applyHeaderStyles(scrollContainer.scrollTop);

        // Return cleanup function
        return () => {
          scrollContainer.removeEventListener("scroll", handleScroll);
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          // Reset styles
          if (gridHeader) {
            gridHeader.style.transform = "";
            gridHeader.style.zIndex = "";
            gridHeader.style.position = "";
            gridHeader.style.backgroundColor = "";
            gridHeader.style.color = "";
          }
          if (timelineScale) {
            timelineScale.style.transform = "";
            timelineScale.style.zIndex = "";
            timelineScale.style.position = "";
            timelineScale.style.backgroundColor = "";
            timelineScale.style.color = "";
          }
        };
      };

      // Wait for Gantt to render
      const timeoutId = setTimeout(() => {
        cleanupFn = applyStickyHeaders();
      }, 800);

      return () => {
        clearTimeout(timeoutId);
        if (cleanupFn) {
          cleanupFn();
        }
      };
    }, [tasks, theme.palette.mode]); // Re-run when theme changes

    // Debug: Log when holidayDates changes
    useEffect(() => {
      if (holidayDates.size > 0) {
        Logger.log(
          "BSGanttChart: holidayDates updated, size:",
          holidayDates.size,
          "keys:",
          Array.from(holidayDates.keys()).slice(0, 5),
        );
      }
    }, [holidayDates]);

    // Apply holiday highlighting via DOM manipulation - using cell position calculation
    useEffect(() => {
      if (!showHolidays || holidayDates.size === 0) return;

      const applyHolidayHighlighting = () => {
        // Debug logging removed - use Logger.debug for development

        // Method 1: Find scale header cells and match by position/text
        const ganttEl = document.querySelector(".wx-gantt");
        if (!ganttEl) {
          Logger.debug("[BSGanttChart] DOM Highlight: .wx-gantt not found");
          return;
        }

        // Find all cells in the timeline grid area
        const allCells = ganttEl.querySelectorAll('[class*="cell"]');
        // Debug logging removed - too verbose

        // Log structure of first few cells
        allCells.forEach((cell, i) => {
          if (i < 3) {
            // Debug logging removed
            const debugInfo = {
              class: cell.className,
              text: cell.textContent?.trim()?.substring(0, 20),
            };
          }
        });

        // SVAR Gantt uses CSS left position to place cells
        // We need to calculate which cell corresponds to which date
        // Find the scale header row that shows dates
        const scaleRow = ganttEl.querySelector(".wx-scale");
        if (scaleRow) {
          const dateLabels = scaleRow.querySelectorAll(".wx-cell");
          // Debug logging removed
        }
      };

      // Apply after a delay to ensure Gantt has rendered
      const timeoutId = setTimeout(applyHolidayHighlighting, 1500);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [holidayDates, showHolidays, tasks]);

    // ===== WEEKEND HEADER HIGHLIGHTING via DOM manipulation =====
    // SVAR Gantt's highlightTime only applies to body cells, not header/scale cells
    // This effect adds wx-weekend class to scale header cells for weekends
    useEffect(() => {
      if (!tasks || tasks.length === 0) return;

      const applyWeekendHeaderHighlighting = () => {
        const ganttEl = document.querySelector(".wx-gantt");
        if (!ganttEl) return;

        // Get the scale rows - typically 2 rows: month row and day row
        const scaleRows = ganttEl.querySelectorAll(".wx-scale .wx-row");
        if (scaleRows.length < 2) return;

        // Day row is usually the second row (index 1)
        const dayRow = scaleRows[1];
        if (!dayRow) return;

        // Get the month row to determine which month each day belongs to
        const monthRow = scaleRows[0];
        const monthCells = monthRow?.querySelectorAll(".wx-cell") || [];

        // Build month ranges
        const monthRanges = [];
        monthCells.forEach((cell) => {
          const left = parseFloat(cell.style.left) || cell.offsetLeft;
          const width = parseFloat(cell.style.width) || cell.offsetWidth;
          const text = cell.textContent?.trim() || "";
          monthRanges.push({ left, right: left + width, text });
        });

        // Thai and English month names
        const thaiMonths = [
          "มกราคม",
          "กุมภาพันธ์",
          "มีนาคม",
          "เมษายน",
          "พฤษภาคม",
          "มิถุนายน",
          "กรกฎาคม",
          "สิงหาคม",
          "กันยายน",
          "ตุลาคม",
          "พฤศจิกายน",
          "ธันวาคม",
        ];
        const enMonths = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];

        // Get all day cells
        const dayCells = dayRow.querySelectorAll(".wx-cell");

        dayCells.forEach((cell) => {
          // Skip if already processed
          if (cell.getAttribute("data-weekend-checked")) return;
          cell.setAttribute("data-weekend-checked", "true");

          const cellLeft = parseFloat(cell.style.left) || cell.offsetLeft;
          const cellText = cell.textContent?.trim() || "";

          // Extract day number from cell text
          const dayMatch = cellText.match(/(\d+)/);
          if (!dayMatch) return;
          const dayNum = parseInt(dayMatch[1], 10);

          // Find which month this cell belongs to
          let monthText = "";
          for (const range of monthRanges) {
            if (cellLeft >= range.left && cellLeft < range.right) {
              monthText = range.text;
              break;
            }
          }

          if (!monthText && monthRanges.length > 0) {
            monthText = monthRanges[monthRanges.length - 1].text;
          }

          if (!monthText) return;

          // Parse month and year from monthText
          let monthIndex = -1;
          let yearNum = 0;

          // Try Thai months first
          for (let i = 0; i < thaiMonths.length; i++) {
            if (monthText.includes(thaiMonths[i])) {
              monthIndex = i;
              const yearMatch = monthText.match(/(\d{4})/);
              if (yearMatch) {
                yearNum = parseInt(yearMatch[1], 10);
                if (yearNum > 2500) yearNum -= 543; // Convert Buddhist year
              }
              break;
            }
          }

          // Try English months if Thai didn't match
          if (monthIndex < 0) {
            const lowerMonth = monthText.toLowerCase();
            for (let i = 0; i < enMonths.length; i++) {
              if (lowerMonth.includes(enMonths[i])) {
                monthIndex = i;
                const yearMatch = monthText.match(/(\d{4})/);
                if (yearMatch) yearNum = parseInt(yearMatch[1], 10);
                break;
              }
            }
          }

          if (monthIndex < 0 || yearNum === 0) return;

          // Create date and check if weekend
          const date = new Date(yearNum, monthIndex, dayNum);
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Add weekend class
            if (!cell.classList.contains("wx-weekend")) {
              cell.classList.add("wx-weekend");
            }
          }
        });
      };

      // Apply after delay to ensure Gantt has rendered
      const timeoutId = setTimeout(applyWeekendHeaderHighlighting, 1500);

      // Also observe for DOM changes (e.g., when user scrolls the timeline)
      const observer = new MutationObserver(() => {
        clearTimeout(window._weekendHighlightDebounce);
        window._weekendHighlightDebounce = setTimeout(
          applyWeekendHeaderHighlighting,
          300,
        );
      });

      const scaleElement = document.querySelector(".wx-gantt .wx-scale");
      if (scaleElement) {
        observer.observe(scaleElement, { childList: true, subtree: true });
      }

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(window._weekendHighlightDebounce);
        observer.disconnect();
      };
    }, [tasks]);

    // Apply tooltip to holiday header cells using native title attribute
    const applyHolidayTooltips = useCallback(() => {
      if (!showHolidays || holidayDates.size === 0) return;

      // Find all holiday cells in the scale header
      const holidayCells = document.querySelectorAll(
        ".wx-gantt .wx-scale .wx-cell.wx-holiday",
      );
      if (holidayCells.length === 0) {
        Logger.debug(
          "[BSGanttChart] applyHolidayTooltips: No holiday cells found",
        );
        return;
      }

      Logger.debug(
        "[BSGanttChart] applyHolidayTooltips: Found",
        holidayCells.length,
        "holiday cells",
      );

      // Get the month scale row (first row in scale has months)
      const scaleRows = document.querySelectorAll(
        ".wx-gantt .wx-scale .wx-row",
      );
      if (scaleRows.length < 2) {
        Logger.debug(
          "[BSGanttChart] applyHolidayTooltips: Scale rows not found",
        );
        return;
      }

      const monthRow = scaleRows[0];
      const monthCells = monthRow ? monthRow.querySelectorAll(".wx-cell") : [];

      // Build a map of left position ranges to month/year
      const monthRanges = [];
      monthCells.forEach((cell) => {
        const left = parseFloat(cell.style.left) || cell.offsetLeft;
        const width = parseFloat(cell.style.width) || cell.offsetWidth;
        const text = cell.textContent?.trim() || "";
        monthRanges.push({ left, right: left + width, text });
      });

      // Debug logging removed - monthRanges

      holidayCells.forEach((cell) => {
        // Skip if already applied
        if (cell.getAttribute("data-holiday-tooltip-applied")) return;

        const cellLeft = parseFloat(cell.style.left) || cell.offsetLeft;
        const cellText = cell.textContent?.trim() || "";

        // Extract day number from cell text (format like "พฤ.\n1" or just "1")
        const dayMatch = cellText.match(/(\d+)/);
        if (!dayMatch) return;
        const dayNum = parseInt(dayMatch[1], 10);

        // Find which month this cell belongs to - use >= left (inclusive start)
        let monthText = "";
        for (const range of monthRanges) {
          // Cell belongs to month if its left edge is >= month start and < month end
          if (cellLeft >= range.left && cellLeft < range.right) {
            monthText = range.text;
            break;
          }
        }

        // If still not found, try the last month (edge case for boundary)
        if (!monthText && monthRanges.length > 0) {
          const lastRange = monthRanges[monthRanges.length - 1];
          if (cellLeft >= lastRange.left) {
            monthText = lastRange.text;
          }
        }

        if (!monthText) {
          Logger.debug(
            "[BSGanttChart] Could not find month for cell at left:",
            cellLeft,
          );
          return;
        }

        // Parse month from text
        const thaiMonths = [
          "มกราคม",
          "กุมภาพันธ์",
          "มีนาคม",
          "เมษายน",
          "พฤษภาคม",
          "มิถุนายน",
          "กรกฎาคม",
          "สิงหาคม",
          "กันยายน",
          "ตุลาคม",
          "พฤศจิกายน",
          "ธันวาคม",
        ];
        const enMonths = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];

        let monthIndex = -1;
        let yearNum = 0;

        // Try Thai months first
        for (let i = 0; i < thaiMonths.length; i++) {
          if (monthText.includes(thaiMonths[i])) {
            monthIndex = i;
            const yearMatch = monthText.match(/(\d{4})/);
            if (yearMatch) {
              yearNum = parseInt(yearMatch[1], 10) - 543; // Convert BE to CE
            }
            break;
          }
        }

        // Try English months if Thai didn't match
        if (monthIndex < 0) {
          for (let i = 0; i < enMonths.length; i++) {
            if (monthText.toLowerCase().includes(enMonths[i])) {
              monthIndex = i;
              const yearMatch = monthText.match(/(\d{4})/);
              if (yearMatch) {
                yearNum = parseInt(yearMatch[1], 10);
              }
              break;
            }
          }
        }

        if (monthIndex < 0 || yearNum === 0) {
          Logger.debug(
            "[BSGanttChart] Could not parse month/year from:",
            monthText,
          );
          return;
        }

        // Construct date key
        const dateKey = `${yearNum}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

        // Look up the holiday name
        const holidayName = holidayDates.get(dateKey);

        // Logger.debug('[BSGanttChart] Holiday lookup:', dateKey, holidayName || 'NOT FOUND');

        if (holidayName) {
          cell.setAttribute("data-holiday-tooltip-applied", "true");
          cell.setAttribute("data-holiday-date", dateKey);
          cell.setAttribute("title", `🎉 ${holidayName}`); // Native tooltip
          cell.style.cursor = "help";
        }
      });
    }, [holidayDates, showHolidays]);

    // Apply holiday tooltips after holidays are loaded and Gantt renders
    // Also reapply when tasks change (e.g., after filtering)
    useEffect(() => {
      if (!showHolidays || holidayDates.size === 0) return;

      // Apply after delay to ensure cells are rendered with wx-holiday class
      const timeoutId = setTimeout(applyHolidayTooltips, 2500);

      // Also observe for DOM changes (e.g., when user scrolls the timeline)
      const observer = new MutationObserver(() => {
        // Debounce to avoid rapid calls
        clearTimeout(window._holidayTooltipDebounce);
        window._holidayTooltipDebounce = setTimeout(applyHolidayTooltips, 500);
      });

      const scaleElement = document.querySelector(".wx-gantt .wx-scale");
      if (scaleElement) {
        observer.observe(scaleElement, { childList: true, subtree: true });
      }

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(window._holidayTooltipDebounce);
        observer.disconnect();
      };
    }, [holidayDates, showHolidays, tasks, applyHolidayTooltips]);

    // Sticky scrollbar: Sync with inner chart horizontal scroll
    useEffect(() => {
      if (!tasks || tasks.length === 0) return;

      let isSyncing = false; // Use local variable instead of state for performance
      let resizeObserver = null;
      let mutationObserver = null;
      let cleanupFn = null;

      const findChartElement = () => {
        // Find the chart area that has horizontal scroll
        const chartEl = document.querySelector(".wx-gantt .wx-chart");
        return chartEl;
      };

      const updateScrollDimensions = (chartEl) => {
        if (chartEl) {
          const newScrollWidth = chartEl.scrollWidth;
          const newClientWidth = chartEl.clientWidth;
          // Also find the grid panel width
          const gridEl = document.querySelector(".wx-gantt .wx-grid");
          const newGridWidth = gridEl ? gridEl.offsetWidth : 0;
          
          console.log("📏 Scroll Dimensions:", {
            scrollWidth: newScrollWidth,
            clientWidth: newClientWidth,
            gridWidth: newGridWidth,
            maxScrollLeft: newScrollWidth - newClientWidth,
            currentScrollLeft: chartEl.scrollLeft,
          });
          setChartScrollWidth(newScrollWidth);
          setChartClientWidth(newClientWidth);
          setGridWidth(newGridWidth);
        }
      };

      const setupScrollSync = () => {
        const chartEl = findChartElement();
        if (!chartEl) return;

        // Update scroll dimensions initially
        updateScrollDimensions(chartEl);

        // Set up ResizeObserver to update dimensions when chart resizes
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            updateScrollDimensions(chartEl);
          });
        });
        resizeObserver.observe(chartEl);

        // Set up MutationObserver to update dimensions when chart content changes
        mutationObserver = new MutationObserver(() => {
          requestAnimationFrame(() => {
            updateScrollDimensions(chartEl);
          });
        });
        mutationObserver.observe(chartEl, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });

        // Sync: Chart scroll → Sticky scrollbar (use requestAnimationFrame for smooth sync)
        const handleChartScroll = () => {
          if (isSyncing) return;
          const stickyEl = stickyScrollRef.current;
          if (stickyEl) {
            requestAnimationFrame(() => {
              stickyEl.scrollLeft = chartEl.scrollLeft;
            });
          }
        };

        // Sync: Sticky scrollbar → Chart
        const handleStickyScrollLocal = () => {
          if (isSyncing) return;
          isSyncing = true;
          requestAnimationFrame(() => {
            chartEl.scrollLeft = stickyScrollRef.current?.scrollLeft || 0;
            isSyncing = false;
          });
        };

        chartEl.addEventListener("scroll", handleChartScroll, {
          passive: true,
        });
        if (stickyScrollRef.current) {
          stickyScrollRef.current.addEventListener(
            "scroll",
            handleStickyScrollLocal,
            { passive: true },
          );
        }

        // Return cleanup function
        cleanupFn = () => {
          chartEl.removeEventListener("scroll", handleChartScroll);
          if (stickyScrollRef.current) {
            stickyScrollRef.current.removeEventListener(
              "scroll",
              handleStickyScrollLocal,
            );
          }
        };
      };

      // Wait for chart to render
      const timeoutId = setTimeout(() => {
        setupScrollSync();
      }, 2000);

      // Also update dimensions periodically to catch any missed updates
      const intervalId = setInterval(() => {
        const chartEl = findChartElement();
        if (chartEl) {
          updateScrollDimensions(chartEl);
        }
      }, 3000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        if (resizeObserver) resizeObserver.disconnect();
        if (mutationObserver) mutationObserver.disconnect();
        if (cleanupFn) cleanupFn();
      };
    }, [tasks]);

    // Handle sticky scrollbar scroll → sync to chart (backup handler for JSX onScroll)
    const handleStickyScroll = useCallback((e) => {
      const chartEl = document.querySelector(".wx-gantt .wx-chart");
      if (chartEl) {
        requestAnimationFrame(() => {
          chartEl.scrollLeft = e.target.scrollLeft;
        });
      }
    }, []);

    // Highlight weekends and holidays using official SVAR highlightTime prop
    const highlightTime = useCallback(
      (date, unit) => {
        if (unit === "day") {
          // Format date as YYYY-MM-DD for lookup
          // Note: create keys for both local and ISO dates to handle timezone/midnight edge cases
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const localDateKey = `${year}-${month}-${day}`;

          const isoDateKey = date.toISOString().split("T")[0];

          // Debug log for specific date (New Year 2026)
          // Commented out for production
          // if (localDateKey === "2026-01-01") {
          //   Logger.debug("BSGanttChart highlightTime: Checking New Year 2026", {...});
          // }

          if (showHolidays && holidayDates.size > 0) {
            // Only use local date key - ISO date can be off by 1 day due to timezone
            if (holidayDates.has(localDateKey)) {
              return "wx-holiday";
            }
          }

          // Check if it's a weekend (Saturday or Sunday)
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            return "wx-weekend";
          }
        }
        return "";
      },
      [holidayDates, showHolidays],
    );

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
          // borderRadius: 2,
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
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: theme.palette.background.paper,
            }}
          >
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
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onToggleFullscreen={handleToggleFullscreen}
              // Localization
              localeText={localeText}
              // Loading
              loading={loading}
            />
          </Box>
        )}

        {/* Gantt Chart */}
        <Box
          ref={chartContainerRef}
          sx={{
            // Use maxHeight to constrain and enable scrolling within the visible area
            height: height,
            maxHeight: height,
            position: "relative",
            overflowY: "auto",
            overflowX: "hidden", // Hide native horizontal scrollbar; use sticky bar instead
            // Custom scrollbar styling for the main container
            scrollbarWidth: "thin",
            scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
            "&::-webkit-scrollbar": {
              width: 6,
              height: 6,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(theme.palette.primary.main, 0.4),
              borderRadius: 8,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.6),
              },
            },
            // Let SVAR Gantt handle its own layout and scrolling
            "& .wx-gantt": {
              height: "100%",
              display: "flex",
              flexDirection: "column",
              scrollbarWidth: "thin",
              scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
            },
            // Only style scrollbars, don't override scroll behavior
            "& .wx-gantt ::-webkit-scrollbar": {
              width: 6,
              height: 6,
            },
            "& .wx-gantt ::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "& .wx-gantt ::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(theme.palette.primary.main, 0.4),
              borderRadius: 8,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.6),
              },
            },
            // ===== STICKY HEADER STYLES (controlled via JavaScript transform) =====
            // Headers need solid background to cover content when transformed
            "& .wx-gantt .wx-grid .wx-header": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "#1e1e1e !important"
                  : "#ffffff !important",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 2px 4px rgba(0,0,0,0.3) !important"
                  : "0 2px 4px rgba(0,0,0,0.15) !important",
            },
            "& .wx-gantt .wx-area .wx-scale": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "#1e1e1e !important"
                  : "#ffffff !important",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 2px 4px rgba(0,0,0,0.3) !important"
                  : "0 2px 4px rgba(0,0,0,0.15) !important",
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
            "& .wx-gantt .wx-grid .wx-row:not(.wx-header) .wx-cell:nth-child(3), & .wx-gantt .wx-grid .wx-row:not(.wx-header) .wx-cell:nth-child(4)":
              {
                textAlign: "right !important",
              },
            // Custom bar colors using SVAR Gantt CSS class pattern: .wx-bar.wx-task.{type}
            // User level - Green (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.user": {
              backgroundColor: "#66bb6a !important", // Green 400
              borderColor: "#43a047 !important", // Green 600
              color: "#ffffff !important", // Dark Green Text
            },
            "& .wx-gantt .wx-bar.wx-task.user .wx-progress-percent": {
              backgroundColor: "#43a047 !important", // Green 600
            },
            // Project level - Blue (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.project": {
              backgroundColor: "#42a5f5 !important", // Blue 400
              borderColor: "#1e88e5 !important", // Blue 600
              color: "#ffffff !important", // Dark Blue Text
            },
            "& .wx-gantt .wx-bar.wx-task.project .wx-progress-percent": {
              backgroundColor: "#1e88e5 !important", // Blue 600
            },
            // Task level - Orange (More Saturated)
            "& .wx-gantt .wx-bar.wx-task.work_task": {
              backgroundColor: "#ffa726 !important", // Orange 400
              borderColor: "#fb8c00 !important", // Orange 600
              color: "#ffffff !important", // Dark Orange Text
            },
            "& .wx-gantt .wx-bar.wx-task.work_task .wx-progress-percent": {
              backgroundColor: "#fb8c00 !important", // Orange 600
            },
            // Weekend highlighting (Saturday/Sunday) - Light red
            // Body cells (applied by highlightTime)
            "& .wx-gantt .wx-cell.wx-weekend, & .wx-gantt .wx-weekend": {
              backgroundColor: "rgba(255, 200, 200, 0.3) !important", // Light red for weekends
            },
            // Header/Scale cells (applied via DOM manipulation)
            "& .wx-gantt .wx-scale .wx-cell.wx-weekend": {
              backgroundColor: "rgba(255, 200, 200, 0.4) !important", // Slightly more visible on header
              color:
                theme.palette.mode === "dark"
                  ? "#ffcdd2 !important"
                  : "#c62828 !important", // Red text
            },
            // Holiday highlighting - Purple for holidays
            // Header cells
            "& .wx-gantt .wx-scale .wx-cell.wx-holiday": {
              backgroundColor: "rgba(156, 39, 176, 0.4) !important",
              background: "rgba(156, 39, 176, 0.4) !important",
              color:
                theme.palette.mode === "dark"
                  ? "#e1bee7 !important"
                  : "#4a148c !important",
              borderBottom: "2px solid rgba(107, 23, 122, 0.4) !important",
            },
            // Body cells - fix height/position
            "& .wx-gantt .wx-gantt-holidays .wx-holiday": {
              position: "absolute !important",
              height: "100% !important",
              top: "0 !important",
              backgroundColor: "rgba(156, 39, 176, 0.3) !important",
              background: "rgba(156, 39, 176, 0.3) !important",
            },
          }}
        >
          {(loading || !holidaysLoaded) && (
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

          {/* Fullscreen hint - shows when entering fullscreen */}
          {showFullscreenHint && (
            <Alert
              severity="info"
              sx={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                boxShadow: 3,
                animation: "fadeInOut 3s ease-in-out",
                "@keyframes fadeInOut": {
                  "0%": { opacity: 0 },
                  "10%": { opacity: 1 },
                  "80%": { opacity: 1 },
                  "100%": { opacity: 0 },
                },
              }}
            >
              {localeText.bsFullscreenHint ||
                "Press ESC to exit fullscreen mode"}
            </Alert>
          )}

          {!loading && holidaysLoaded && tasks.length === 0 && (
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
          )}

          {!loading &&
            holidaysLoaded &&
            tasks.length > 0 &&
            (theme.palette.mode === "dark" ? (
              <WillowDark>
                <Gantt
                  key={`gantt-dark-${holidayDates.size}`}
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
                  key={`gantt-light-${holidayDates.size}`}
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
            ))}
        </Box>

        {/* Sticky Horizontal Scrollbar - Synced with chart */}
        {chartScrollWidth > chartClientWidth && tasks.length > 0 && (
          <Box
            ref={stickyScrollRef}
            onScroll={handleStickyScroll}
            sx={{
              position: "sticky",
              bottom: 0,
              left: 0,
              right: 0,
              marginLeft: `${gridWidth}px`, // Offset by grid panel width
              width: `calc(100% - ${gridWidth}px)`, // Only cover chart area
              height: "20px",
              overflowX: "auto",
              overflowY: "hidden",
              backgroundColor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f9f9f9",
              borderTop: `1px solid ${theme.palette.divider}`,
              zIndex: 100,
              // Custom scrollbar styling
              scrollbarWidth: "thin",
              scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
              "&::-webkit-scrollbar": {
                height: 6,
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(theme.palette.primary.main, 0.4),
                borderRadius: 8,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.6),
                },
              },
            }}
          >
            {/* Inner div with same width as chart scroll area */}
            <div style={{ width: chartScrollWidth, height: "1px" }} />
          </Box>
        )}

        {/* Custom Mouse-Following Tooltip */}
        {tooltipVisible && (
          <Box
            sx={{
              position: "fixed",
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(50,50,50,0.95)"
                  : "rgba(0,0,0,0.85)",
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
