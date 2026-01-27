import { useState, useCallback, useMemo, useEffect } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import Logger from "../../utils/logger";

/**
 * Custom hook for fetching and transforming Gantt chart data
 * Transforms flat SP result into hierarchical SVAR Gantt format
 *
 * Hierarchy: User → Project → Task
 * - Green bars: project dates (min_task_start_date, max_task_end_date)
 * - Blue bars: task dates (task_start_date, task_end_date)
 *
 * SP: tmt.usp_tmt_dashboard_project_timeline
 * Parameters:
 * - @in_dtStartDate: DATE (required)
 * - @in_dtEndDate: DATE (required)
 * - @in_vchProjectHeaderID: INT (optional)
 * - @in_xmlUserID: XML (optional, format: <XMLData><data_read>userId</data_read></XMLData>)
 */
export const useGanttData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  /**
   * Convert array of employee IDs/objects to XML format for SP parameter
   * Format: <XMLData><data_read>userId1</data_read><data_read>userId2</data_read></XMLData>
   * @param {Array} employeeList - Array of employee objects or IDs
   * @returns {string|null} XML string or null if empty
   */
  const convertEmployeesToXml = useCallback((employeeList) => {
    if (!employeeList || employeeList.length === 0) return null;

    const dataReadParts = employeeList.map((emp) => {
      const userId = typeof emp === "object" ? emp.id : emp;
      return `<data_read>${userId}</data_read>`;
    });

    return `<XMLData>${dataReadParts.join("")}</XMLData>`;
  }, []);

  /**
   * Format date to YYYY-MM-DD format for SP
   * @param {Date|string} date - Date to format
   * @returns {string|null} Formatted date string
   */
  const formatDateForSP = useCallback((date) => {
    if (!date) return null;

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Normalize date string to local date (extract date part only, ignore time)
   * SQL Server dates may come as "2026-01-13T00:00:00" (local) or "2026-01-13T00:00:00Z" (UTC)
   * We want to extract just the date part: 2026-01-13
   * @param {string|Date} dateStr - Date string or Date object
   * @returns {Date} Local date at midnight
   */
  const normalizeDate = useCallback((dateStr) => {
    if (!dateStr) return null;

    // If it's a string, parse the date part directly to avoid timezone issues
    if (typeof dateStr === "string") {
      // Extract YYYY-MM-DD from string like "2026-01-13T00:00:00" or "2026-01-13"
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
        const day = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
    }

    // Fallback for Date objects - use local components
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  /**
   * Add one day to date for SVAR Gantt end date (exclusive)
   * SVAR Gantt treats end date as exclusive, so we need to add 1 day
   * to display the bar including the end date
   * @param {Date} date - Date to adjust (should already be normalized)
   * @returns {Date} Date with 1 day added
   */
  const adjustEndDateForGantt = useCallback((date) => {
    if (!date) return null;
    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() + 1);
    return adjusted;
  }, []);

  /**
   * Transform flat SP result to hierarchical SVAR Gantt format
   * @param {Array} data - Raw data from stored procedure
   * @returns {Array} Tasks array in SVAR Gantt format
   */
  const transformToGanttTasks = useCallback(
    (data) => {
      if (!data || data.length === 0) return [];

      const tasks = [];
      const userMap = new Map();

      // Debug: Log first row to understand data structure
      if (data.length > 0) {
        Logger.log("🔍 Sample row data:", JSON.stringify(data[0], null, 2));
      }

      // First pass: Group by user and project
      data.forEach((row) => {
        // Use name-based key since user_id may be 0 for all records
        const userName =
          `${row.first_name || ""} ${row.last_name || ""}`.trim();
        const projectId = row.project_header_id;

        // Skip rows without user name
        if (!userName || userName === "system system") return;

        // Create unique user key based on name
        const userKey = userName.toLowerCase().replace(/\s+/g, "_");

        // Create user entry
        if (!userMap.has(userKey)) {
          userMap.set(userKey, {
            id: `user_${userKey}`,
            text: userName,
            type: "user", // Custom type for CSS styling - Green
            css: "bs-gantt-item-user", // Explicit CSS class
            open: true,
            parent: 0,
            // Initialize man_day totals for user level (will be summed from projects)
            man_day: 0,
            actual_man_day: 0,
            barColor: "#66bb6a", // Green 400
            data: {
              level: "user",
              userId: row.user_id || userKey,
              barColor: "#66bb6a",
            },
            projects: new Map(),
          });
        }

        const user = userMap.get(userKey);

        // Skip if no project
        if (!projectId) return;

        // Create project entry under user
        const projectKey = `${userKey}_${projectId}`;
        if (!user.projects.has(projectKey)) {
          const projStartDate = normalizeDate(row.min_task_start_date);
          const projEndDateOriginal = normalizeDate(row.max_task_end_date);
          const projEndDate = projEndDateOriginal
            ? adjustEndDateForGantt(projEndDateOriginal)
            : null;

          user.projects.set(projectKey, {
            id: `proj_${projectKey}`,
            text: row.project_name || row.project_no || `Project ${projectId}`,
            type: "project", // Custom type for CSS styling - Blue
            css: "bs-gantt-item-project", // Explicit CSS class
            open: false,
            parent: `user_${userKey}`,
            start: projStartDate,
            end: projEndDate,
            progress: 0,
            // Add man_day and actual_man_day at root level for SVAR Gantt column access
            man_day: row.total_task_plan_manday || 0,
            actual_man_day: row.total_actual_work || 0,
            barColor: "#42a5f5", // Blue 400
            // Store original dates at root level (SVAR Gantt overwrites 'data' property)
            originalStartDate: projStartDate,
            originalEndDate: projEndDateOriginal,
            data: {
              level: "project",
              projectId: projectId,
              projectNo: row.project_no,
              totalPlanManday: row.total_task_plan_manday,
              totalActualWork: row.total_actual_work,
              barColor: "#42a5f5",
            },
            tasks: [],
          });
        }

        const project = user.projects.get(projectKey);

        // Create task entry under project
        if (row.task_no) {
          const taskId = `task_${userKey}_${projectId}_${row.task_no}`;
          // Avoid duplicate tasks
          if (!project.tasks.find((t) => t.id === taskId)) {
            const taskStartDate = normalizeDate(row.task_start_date);
            const taskEndDateNormalized = normalizeDate(row.task_end_date);
            const taskEndDateAdjusted = taskEndDateNormalized
              ? adjustEndDateForGantt(taskEndDateNormalized)
              : null;

            // Debug log to verify date normalization and adjustment
            if (row.task_end_date && taskEndDateAdjusted) {
              Logger.log(
                `📅 Task ${row.task_no}: Raw="${row.task_end_date}", Normalized=${taskEndDateNormalized?.toLocaleDateString()}, Adjusted=${taskEndDateAdjusted?.toLocaleDateString()}`,
              );
            }

            project.tasks.push({
              id: taskId,
              text: row.task_name || `Task ${row.task_no}`,
              type: "work_task",
              css: "bs-gantt-item-task", // Keep as backup
              parent: `proj_${projectKey}`,
              start: taskStartDate,
              end: taskEndDateAdjusted,
              progress: 0,
              // Add man_day and actual_man_day at root level for SVAR Gantt column access
              man_day: row.task_plan_manday || 0,
              actual_man_day: row.actual_work || 0,
              barColor: "#ffa726", // Orange 400
              // Store original dates at root level (SVAR Gantt overwrites 'data' property)
              originalStartDate: taskStartDate,
              originalEndDate: taskEndDateNormalized,
              data: {
                level: "task",
                taskNo: row.task_no,
                taskDescription: row.task_description,
                planManday: row.task_plan_manday,
                actualWork: row.actual_work,
                barColor: "#ffa726",
              },
            });
          }
        }
      });

      // Default date range for summary tasks without dates
      const defaultStart = new Date();
      const defaultEnd = new Date();
      defaultEnd.setMonth(defaultEnd.getMonth() + 1);
      // Adjust default end for Gantt display
      const adjustedDefaultEnd = adjustEndDateForGantt(defaultEnd);

      userMap.forEach((user) => {
        // Calculate user date range from all projects
        let userStart = null;
        let userEnd = null;
        let userOriginalStart = null;
        let userOriginalEnd = null;
        let hasValidProjects = false;

        user.projects.forEach((project) => {
          // Check if project has dates or tasks
          const hasProjectDates = project.start && project.end;
          const hasTasks = project.tasks && project.tasks.length > 0;

          if (hasProjectDates || hasTasks) {
            hasValidProjects = true;
            if (project.start && (!userStart || project.start < userStart)) {
              userStart = project.start;
            }
            if (project.end && (!userEnd || project.end > userEnd)) {
              userEnd = project.end;
            }
            // Track original dates for display (now at project root level)
            const projOriginalStart = project.originalStartDate || project.start;
            const projOriginalEnd = project.originalEndDate;
            if (
              projOriginalStart &&
              (!userOriginalStart || projOriginalStart < userOriginalStart)
            ) {
              userOriginalStart = projOriginalStart;
            }
            if (
              projOriginalEnd &&
              (!userOriginalEnd || projOriginalEnd > userOriginalEnd)
            ) {
              userOriginalEnd = projOriginalEnd;
            }
          }
        });

        // Skip users with no valid projects
        if (!hasValidProjects) return;

        // Ensure user has dates (required for summary tasks)
        // Note: userEnd is already adjusted since it comes from project.end which is adjusted
        const finalUserStart = userStart || defaultStart;
        const finalUserEnd = userEnd || adjustedDefaultEnd;

        // Calculate user totals from all projects
        let userManDay = 0;
        let userActualManDay = 0;
        user.projects.forEach((project) => {
          userManDay += parseFloat(project.man_day) || 0;
          userActualManDay += parseFloat(project.actual_man_day) || 0;
        });

        // Add user task
        tasks.push({
          id: user.id,
          text: user.text,
          type: user.type,
          open: user.open,
          parent: user.parent,
          start: finalUserStart,
          end: finalUserEnd,
          progress: 0,
          man_day: userManDay,
          actual_man_day: userActualManDay,
          barColor: user.barColor, // Green for user
          // Store original dates at root level (SVAR Gantt overwrites 'data' property)
          originalStartDate: userOriginalStart || finalUserStart,
          originalEndDate: userOriginalEnd || defaultEnd,
          data: user.data,
        });

        // Add project tasks
        user.projects.forEach((project) => {
          const hasProjectDates = project.start && project.end;
          const hasTasks = project.tasks && project.tasks.length > 0;

          // Skip projects without dates and without tasks
          if (!hasProjectDates && !hasTasks) return;

          // Ensure project has dates
          const finalProjectStart = project.start || finalUserStart;
          const finalProjectEnd = project.end || finalUserEnd;

          tasks.push({
            id: project.id,
            text: project.text,
            type: project.type,
            open: project.open,
            parent: project.parent,
            start: finalProjectStart,
            end: finalProjectEnd,
            progress: project.progress,
            man_day: project.man_day,
            actual_man_day: project.actual_man_day,
            barColor: project.barColor, // Blue for project
            // Include original dates from project root level
            originalStartDate: project.originalStartDate || finalProjectStart,
            originalEndDate: project.originalEndDate,
            data: project.data,
          });

          // Add task tasks
          project.tasks.forEach((task) => {
            // Ensure task has dates - original dates are already at task root level
            if (task.start && task.end) {
              tasks.push(task);
            } else {
              tasks.push({
                ...task,
                start: task.start || finalProjectStart,
                end: task.end || finalProjectEnd,
                // Preserve original dates, use fallbacks if needed
                originalStartDate: task.originalStartDate || task.start || finalProjectStart,
                originalEndDate: task.originalEndDate || project.originalEndDate,
              });
            }
          });
        });
      });

      Logger.log("📊 Transformed Gantt tasks:", tasks);
      return tasks;
    },
    [adjustEndDateForGantt, normalizeDate],
  );

  /**
   * Extract unique employees from data for filter dropdown
   * @param {Array} data - Raw data from stored procedure
   * @returns {Array} Employee list for filter
   */
  const extractEmployees = useCallback((data) => {
    if (!data || data.length === 0) return [];

    const employeeMap = new Map();
    data.forEach((row) => {
      // Use actual user_id from SP (now returned as string)
      const userId = row.user_id;
      const fullName = `${row.first_name || ""} ${row.last_name || ""}`.trim();

      // Skip empty names, system users, or missing user_id
      if (!fullName || fullName === "system system" || !userId) return;

      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          id: userId, // Use actual user_id for filtering
          label: fullName,
          firstName: row.first_name,
          lastName: row.last_name,
        });
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "th"),
    );
  }, []);

  /**
   * Extract unique projects from data for filter dropdown
   * @param {Array} data - Raw data from stored procedure
   * @returns {Array} Project list for filter
   */
  const extractProjects = useCallback((data) => {
    if (!data || data.length === 0) return [];

    const projectMap = new Map();
    data.forEach((row) => {
      const projectId = row.project_header_id;
      const projectNo = row.project_no || "";
      const projectName = row.project_name || "";

      // Skip if no project id or name
      if (!projectId || !projectName) return;

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          label: projectNo ? `${projectNo} - ${projectName}` : projectName,
          projectNo: projectNo,
          projectName: projectName,
        });
      }
    });

    return Array.from(projectMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "th"),
    );
  }, []);
  /**
   * Fetch data from stored procedure
   * Uses the dedicated /api/Gantt/timeline endpoint
   * (Bypasses generic /dynamic/procedure which causes COLUMN_NAME errors)
   *
   * @param {object} options - Fetch options
   * @param {string} options.procedureName - SP name (kept for API compatibility, not used)
   * @param {Date} options.startDate - Start date (required for SP)
   * @param {Date} options.endDate - End date (required for SP)
   * @param {number} options.projectHeaderId - Optional project ID filter
   * @param {Array} options.selectedEmployees - Optional employee list for filtering
   * @param {string} options.preObj - Schema mapping (kept for API compatibility, not used)
   */
  const fetchData = useCallback(
    async ({
      procedureName,
      startDate,
      endDate,
      projectHeaderId = null,
      selectedEmployees = [],
      preObj = null,
    }) => {
      try {
        setLoading(true);
        setError(null);

        // Format dates for SP (ISO 8601 format)
        const formattedStartDate = formatDateForSP(startDate);
        const formattedEndDate = formatDateForSP(endDate);

        // Convert employees to XML format
        const xmlUserIds = convertEmployeesToXml(selectedEmployees);

        // Build request body for the dedicated Gantt timeline endpoint
        const requestBody = {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          projectHeaderId: projectHeaderId,
          xmlUserIds: xmlUserIds,
        };

        Logger.log(
          "🚀 Fetching Gantt data via /api/Gantt/timeline:",
          requestBody,
        );

        // Call the dedicated Gantt timeline endpoint
        const response = await AxiosMaster.post("/Gantt/timeline", requestBody);

        // Handle response from dedicated endpoint
        let data = [];
        const result = response.data;

        if (result?.data && Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray(result)) {
          data = result;
        } else if (result?.recordset) {
          data = result.recordset;
        } else if (result?.rows) {
          data = result.rows;
        }

        setRawData(data);
        setEmployees(extractEmployees(data));
        setProjects(extractProjects(data));

        Logger.log("✅ Gantt data fetched:", {
          rowCount: data.length,
          sampleData: data.slice(0, 2),
        });

        // Return transformed tasks directly (avoids React state timing issues)
        // The API has already filtered the data, so transform it immediately
        const transformedTasks = transformToGanttTasks(data);
        return { rawData: data, tasks: transformedTasks };
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch Gantt data";
        Logger.error("❌ Failed to fetch Gantt data:", errorMsg);
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      extractEmployees,
      formatDateForSP,
      convertEmployeesToXml,
      transformToGanttTasks,
    ],
  );

  /**
   * Filter data by date range and selected employees
   * @param {object} filters - Filter options
   * @param {Date} filters.startDate - Start date filter
   * @param {Date} filters.endDate - End date filter
   * @param {Array} filters.selectedEmployees - Selected employee IDs
   * @returns {Array} Filtered Gantt tasks
   */
  const getFilteredTasks = useCallback(
    (filters = {}) => {
      const { startDate, endDate, selectedEmployees = [] } = filters;

      let filteredData = [...rawData];

      // Filter by date range (using max_task_end_date for due date filter)
      if (startDate) {
        filteredData = filteredData.filter((row) => {
          const rowEnd = row.max_task_end_date
            ? new Date(row.max_task_end_date)
            : null;
          return rowEnd && rowEnd >= new Date(startDate);
        });
      }

      if (endDate) {
        filteredData = filteredData.filter((row) => {
          const rowStart = row.min_task_start_date
            ? new Date(row.min_task_start_date)
            : null;
          return rowStart && rowStart <= new Date(endDate);
        });
      }

      // Filter by selected employees (using name-based key since user_id may be 0)
      if (selectedEmployees.length > 0) {
        const selectedIds = selectedEmployees.map((e) =>
          typeof e === "object" ? e.id : e,
        );
        filteredData = filteredData.filter((row) => {
          // Create userKey from name (same as extractEmployees)
          const userName =
            `${row.first_name || ""} ${row.last_name || ""}`.trim();
          const userKey = userName.toLowerCase().replace(/\s+/g, "_");
          return selectedIds.includes(userKey);
        });
      }

      return transformToGanttTasks(filteredData);
    },
    [rawData, transformToGanttTasks],
  );

  /**
   * Get all tasks (no filtering)
   */
  const getAllTasks = useMemo(() => {
    return transformToGanttTasks(rawData);
  }, [rawData, transformToGanttTasks]);

  return {
    // State
    loading,
    error,
    rawData,
    employees,
    projects,

    // Methods
    fetchData,
    getFilteredTasks,

    // Computed
    allTasks: getAllTasks,
    transformToGanttTasks,
  };
};

export default useGanttData;
