import { Dialog, DialogActions, DialogContent, DialogTitle, Grid } from "@mui/material";
import BSTextField from "../../../components/BSTextField";
import BSAutoComplete from "../../../components/BSAutoComplete";
import BSDatepicker from "../../../components/BSDatepicker";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useState } from "react";
import AxiosMaster from "../../../utils/AxiosMaster";

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
        remarks,
        open,
        onClose
    } = props;

    let data = [
        //     { field: "project_task_id", headerName: "Task ID", width: 100, required: true, component: 'BSTextField', value: project_task_id },
        //   { field: "project_task_phase_id", headerName: "Phase ID", width: 100, required: true, component: 'BSTextField', value: project_task_phase_id },
        // { field: "project_header_id", headerName: "Header ID", width: 100, required: true, component: 'BSTextField', value: project_header_id },
        {
            field: "task_status", headerName: "task status", width: 150, component: 'BSAutoComplete', bsMode: "single",
            bsTitle: "value_member",
            bsPreObj: "sec.t_com_",
            bsObj: "combobox_item",
            bsColumes:
                [
                    {
                        field: "value_member",
                        display: false,
                        filter: false,
                        key: true,
                    },
                    {
                        field: "display_member",
                        display: true,
                        filter: true,
                        key: false,
                    }
                ],
            bsObjBy: "display_sequence asc",
            bsObjWh: "is_active='YES' and group_name ='task_status'",
            variant: "standard",
            bsValue: { issue_type },
            size: 4,
            fullWidth: true
        },
        { field: "task_name", headerName: "Task Name", width: 250, component: 'BSTextField', value: task_name, size: { xs: 12, sm: 6, md: 4, lg: 3 } },
        {
            field: "priority", headerName: "Priority", width: 120, component: 'BSAutoComplete',
            bsMode: "single",
            bsTitle: "value_member",
            bsPreObj: "sec.t_com_",
            bsObj: "combobox_item",
            bsColumes:
                [
                    {
                        field: "value_member",
                        display: false,
                        filter: false,
                        key: true,
                    },
                    {
                        field: "display_member",
                        display: true,
                        filter: true,
                        key: false,
                    }
                ],
            bsObjBy: "display_sequence asc",
            bsObjWh: "is_active='YES' and group_name ='task_priority'",
            variant: "standard",
            bsValue: { priority },
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "issue_type", headerName: "Issue Type", width: 150, component: 'BSAutoComplete', bsMode: "single",
            bsTitle: "value_member",
            bsPreObj: "sec.t_com_",
            bsObj: "combobox_item",
            bsColumes:
                [
                    {
                        field: "value_member",
                        display: false,
                        filter: false,
                        key: true,
                    },
                    {
                        field: "display_member",
                        display: true,
                        filter: true,
                        key: false,
                    }
                ],
            bsObjBy: "display_sequence asc",
            bsObjWh: "is_active='YES' and group_name ='issue_type'",
            variant: "standard",
            bsValue: { issue_type },
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "due_date", headerName: "Due Date", width: 150, component: 'BSDatePicker', value: due_date, isRange: true, isDateOnly: false, format: "DD/MM/YYYY",
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "manday", headerName: "Manday", width: 120, component: 'BSTextField', value: manday,
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "sequence", headerName: "Sequence", width: 150, component: 'BSTextField', value: sequence,
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "description", headerName: "Task Description", width: 150, component: 'BSTextField', value: description,
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        },
        {
            field: "remarks", headerName: "Remarks", width: 150, component: 'BSTextField', value: remarks,
            size: { xs: 12, sm: 6, md: 4, lg: 3 }
        }
    ];
    const [errors, setErrors] = useState([]);
    const [formData, setFormData] = useState({});
    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };
    const validateForm = () => {

        let newErrors = {};
        data.filter(f => f.required).forEach(f => {
            if (!data[f] || data[f] === "") {
                newErrors[f] = "This field is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleClose = () => {
        onClose(false);
    }
    const handleSave = async () => {
        if (!validateForm()) return;


        await AxiosMaster.post("/projects/task", formData)
    }

    const renderInput = (item) => {
        switch (item.component) {
            case "BSTextField":
                return <BSTextField label={item.headerName} defaultValue={item.value} fullWidth required={item.required} onChange={(e) => updateField(item.field, e)} />;
            case "BSAutoComplete":
                return <BSAutoComplete label={item.headerName} defaultValue={item.bsValue} fullWidth bsOnChange={(e) => updateField(item.field, e?.code || "")}
                    bsMode={item.bsMode}
                    bsPreObj={item.bsPreObj}
                    bsObj={item.bsObj}
                    bsColumes={item.bsColumes}
                    bsObjBy={item.bsObjBy}
                    bsObjWh={item.bsObjWh}
                    variant={item.variant}
                />;
            case "BSDatePicker":
                return <BSDatepicker label={item.headerName} defaultValue={item.value} fullWidth isRange={item.isRange} isDateOnly={item.isDateOnly} format={item.format} />;
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle>Task Details</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                    {data.map((item, index) => (
                        <>
                            <Grid size={item.size} key={item.field}>
                                {renderInput(item)}
                            </Grid>

                            {
                                item.fullWidth && (
                                    <Grid size={item.size / 12}></Grid>
                                )
                            }
                        </>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <BSCloseOutlinedButton autoFocus onClick={handleClose} variant="outlined" className="btn-close-outlined">
                    Close
                </BSCloseOutlinedButton>
                <BSSaveOutlinedButton onClick={handleSave} autoFocus variant="outlined">
                    Save
                </BSSaveOutlinedButton>
            </DialogActions>
        </Dialog>
    );
};

export default TaskDialog;