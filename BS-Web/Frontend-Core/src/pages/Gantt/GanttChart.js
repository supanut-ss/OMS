import { Box, Typography } from "@mui/material";
import { BSGanttChart } from "../../components/BSGanttChart";

const GanttChart = () => {
    // Handle task click
    const handleTaskClick = (task) => {
        alert(`Clicked: ${task.text}\nLevel: ${task.data?.level || "unknown"}`);
    };

    // Handle data load
    const handleDataLoad = (data) => {

    };

    // Handle error
    const handleError = (error) => {

    };
    return <>
        <BSGanttChart
            // Data source
            procedureName="usp_tmt_dashboard_project_timeline"
            preObj="tmt"

            // Display options
            title="Project Timeline - Employee Gantt View"
            height={"60vh"}

            // Filter options
            showDateFilter={true}
            showEmployeeFilter={true}

            // Initial scale settings
            initialCellWidth={60}
            initialScale="day"

            // Events
            onTaskClick={handleTaskClick}
            onDataLoad={handleDataLoad}
            onError={handleError}

            // Styling
            sx={{ boxShadow: 2 }}
        />
        <Box component="ul" sx={{ pl: 4 }}>
            <li>
                <Typography variant="body2">
                    <strong>Green bars</strong>: Project level (min_task_start_date to max_task_end_date)
                </Typography>
            </li>
            <li>
                <Typography variant="body2">
                    <strong>Blue bars</strong>: Task level (task_start_date to task_end_date)
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
    </>;
}
export default GanttChart;