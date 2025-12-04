import { Dialog, DialogContent, DialogTitle, Grid } from "@mui/material";
import BSTextField from "../../../components/BSTextField";
import BSAutoComplete from "../../../components/BSAutoComplete";
import BSDatepicker from "../../../components/BSDatepicker";

const TaskDialog = (props) => {
    let {
        project_task_id,
        project_task_phase_id,
        project_header_id,
        task_name,
        priority,
        issue_type,
        due_date,
        manday,
        sequence,
        description,
        remarks
    } = props;

    let data = [
        { field: "project_task_id", headerName: "Task ID", width: 100, required: true, component: 'BSTextField', value: project_task_id },
        { field: "project_task_phase_id", headerName: "Phase ID", width: 100, required: true, component: 'BSTextField', value: project_task_phase_id },
        { field: "project_header_id", headerName: "Header ID", width: 100, required: true, component: 'BSTextField', value: project_header_id },
        { field: "task_name", headerName: "Task Name", width: 250, component: 'BSTextField', value: task_name },
        { field: "priority", headerName: "Priority", width: 120, component: 'BSAutoComplete', value: priority },
        { field: "issue_type", headerName: "Issue Type", width: 150, component: 'BSAutoComplete', value: issue_type },
        { field: "due_date", headerName: "Due Date", width: 150, component: 'BSDatePicker', value: due_date, isRange: true, isDateOnly: false, format: "DD/MM/YYYY" },
        { field: "manday", headerName: "Manday", width: 120, component: 'BSTextField', value: manday },
        { field: "sequence", headerName: "Sequence", width: 150, component: 'BSTextField', value: sequence },
        { field: "description", headerName: "Task Description", width: 150, component: 'BSTextField', value: description },
        { field: "remarks", headerName: "Remarks", width: 150, component: 'BSTextField', value: remarks }
    ];

    const renderInput = (item) => {
        switch (item.component) {
            case "BSTextField":
                return <BSTextField label={item.headerName} defaultValue={item.value} fullWidth required={item.required} />;
            case "BSAutoComplete":
                return <BSAutoComplete label={item.headerName} defaultValue={item.value} fullWidth />;
            case "BSDatePicker":
                return <BSDatepicker label={item.headerName} defaultValue={item.value} fullWidth isRange={item.isRange} isDateOnly={item.isDateOnly} format={item.format} />;
            default:
                return null;
        }
    };

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Task Details</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                    {data.map((item) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.field}>
                            {renderInput(item)}
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDialog;