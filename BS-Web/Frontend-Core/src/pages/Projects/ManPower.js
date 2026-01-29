import React from "react";
import { Paper } from "@mui/material";
import { BSGanttChart } from "../../components/BSGanttChart";

/**
 * Uses stored procedure: tmt.usp_tmt_dashboard_project_timeline
 */
const ManPowerPage = () => {
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
    <>
      <Paper sx={{ p: 0, mb: 0,width:"100%" }}>
        <BSGanttChart
          // Data source
          procedureName="usp_tmt_dashboard_project_timeline"
          preObj="tmt"
          // Display options
          title="Project Timeline - Man Power"
          height={700}
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
      </Paper>
    </>
  );
};

export default ManPowerPage;
