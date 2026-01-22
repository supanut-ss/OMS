import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { BSGanttChart } from "../components/BSGanttChart";

/**
 * Test page for BSGanttChart component
 * Uses stored procedure: tmt.usp_tmt_dashboard_project_timeline
 */
const BSGanttChartTest = () => {
  // Handle task click
  const handleTaskClick = (task) => {
    console.log("Task clicked:", task);
    alert(`Clicked: ${task.text}\nLevel: ${task.data?.level || "unknown"}`);
  };

  // Handle data load
  const handleDataLoad = (data) => {
    console.log("Data loaded:", data?.length || 0, "rows");
  };

  // Handle error
  const handleError = (error) => {
    console.error("BSGanttChart error:", error);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        BSGanttChart Test Page
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Testing with stored procedure:{" "}
        <code>tmt.usp_tmt_dashboard_project_timeline</code>
      </Typography>

      <Box sx={{ mb: 4 }}>
        <BSGanttChart
          // Data source
          procedureName="usp_tmt_dashboard_project_timeline"
          preObj="tmt"
          // Display options
          title="Project Timeline - Employee Gantt View"
          // height={700}

          // Filter options
          showDateFilter={true}
          showEmployeeFilter={true}
          // Initial scale settings
          initialCellWidth={30}
          initialScale="day"
          // Holiday highlighting - query from tmt.t_tmt_holiday table directly
          holidayTableName="t_tmt_holiday"
          holidayPreObj="tmt"
          showHolidays={true}
          // Events
          onTaskClick={handleTaskClick}
          onDataLoad={handleDataLoad}
          onError={handleError}
          // Styling
          sx={{ boxShadow: 2 }}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        Usage Notes
      </Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        <li>
          <Typography variant="body2">
            <strong>Green bars</strong>: Project level (min_task_start_date to
            max_task_end_date)
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            <strong>Blue bars</strong>: Task level (task_start_date to
            task_end_date)
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Click on employee name to expand/collapse projects
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Click on project name to expand/collapse tasks
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Use date filters to filter by due date range
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Use employee multi-select to compare specific employees
          </Typography>
        </li>
      </Box>
    </Container>
  );
};

export default BSGanttChartTest;
