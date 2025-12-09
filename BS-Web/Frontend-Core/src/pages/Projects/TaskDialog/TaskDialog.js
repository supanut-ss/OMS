import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Tab, Tabs } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import dayjs from "dayjs";
import AxiosMaster from "../../../utils/AxiosMaster";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import AssignTeam from "../Tasks/AssignTeam";
import TaskTracking from "../Tasks/TaskTracking";

import useForm from "../../../hooks/useForm";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useEffect, useState } from "react";
import { renderInput } from "../../../components/FormRenderer";

const defaultData = {
    project_task_id: "",
    project_task_phase_id: null,
    task_status: null,
    task_name: null,
    priority: null,
    issue_type: null,
    start_date: null,
    end_date: null,
    manday: null,
    task_description: null,
    remark: "",
    task_no: "",
    close_by: "",
    close_remark: ""
};

const requiredFields = [
    "task_status",
    "task_name",
    "priority",
    "issue_type",
    "manday",
    "task_description",
    "start_date",
    "end_date"
];

const TaskDialog = ({ phases, projectHeader, open, onClose }) => {

    const {
        formData,
        errors,
        updateField,
        validate,
        setFormData
    } = useForm(defaultData, requiredFields);

    const [tap, setTap] = useState(0);

    const handleSave = async () => {
        if (!validate()) return;

        const res = await AxiosMaster.post("/projects/task", formData);
        BSAlertSwal2.show(
            res.data.message_code === 0 ? "success" : "warning",
            res.data.message_code === 0 ? "บันทึกสำเร็จ" : "บันทึกไม่สำเร็จ"
        );

        if (res.data.data) {
            setFormData(prev => ({ ...prev, ...res.data.data }));
        }
    };

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            project_task_id: phases.project_task_id,
            project_task_phase_id: phases.project_task_phase_id,
            project_header_id: projectHeader.project_header_id
        }));
    }, [phases]);

    useEffect(() => {
        if (!phases.project_task_id) return;

        AxiosMaster
            .get("/projects/task/" + phases.project_task_id)
            .then((res) => {
                if (res.data.message_code === 0) {
                    setFormData(prev => ({
                        ...prev,
                        ...res.data.data,
                        remark: res.data.data.remark ?? "",
                        close_by: res.data.data.close_by ?? "",
                        close_remark: res.data.data.close_remark ?? ""
                    }));
                }
            });
    }, [phases]);


    return (
        <Dialog open={open} onClose={() => onClose(false)} fullScreen>
            <DialogTitle>{formData.project_task_id ? "Edit" : "Add"} Task Details</DialogTitle>

            <IconButton onClick={() => onClose(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>

            <DialogContent sx={{ mt: 1 }}>

                {/* Task Status */}
                <Grid>
                    {renderInput({
                        item: {
                            field: "task_status",
                            headerName: "task status",
                            component: 'BSAutoComplete',
                            bsMode: "single",
                            bsTitle: "task_status",
                            bsPreObj: "sec.t_com_",
                            bsObj: "combobox_item",
                            bsColumes: [
                                { field: "value_member", display: false, key: true },
                                { field: "display_member", display: true }
                            ],
                            bsObjBy: "display_sequence asc",
                            bsObjWh: "is_active='YES' and group_name ='task_status'",
                            variant: "standard",
                            required: true
                        },
                        formData,
                        errors,
                        updateField
                    })}
                </Grid>

                <Grid container spacing={2} mt={2}>

                    {/* Project No */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "project_no",
                                headerName: "project_no",
                                component: "BSTextField",
                                value: projectHeader.project_no,
                                variant: "filled",
                                readOnly: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Project Name */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "project_name",
                                headerName: "project_name",
                                component: "BSTextField",
                                value: projectHeader.project_name,
                                variant: "filled",
                                readOnly: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Project Type */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "project_type",
                                headerName: "project_type",
                                component: "BSTextField",
                                value: projectHeader.project_type,
                                variant: "filled",
                                readOnly: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Task Name */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "task_name",
                                headerName: "task_name",
                                component: "BSTextField",
                                required: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Priority */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "priority",
                                headerName: "task_priority",
                                component: "BSAutoComplete",
                                bsMode: "single",
                                bsTitle: "task_priority",
                                bsPreObj: "sec.t_com_",
                                bsObj: "combobox_item",
                                bsColumes: [
                                    { field: "value_member", display: false, filter: false, key: true },
                                    { field: "display_member", display: true, filter: true, key: false },
                                ],
                                bsObjBy: "display_sequence asc",
                                bsObjWh: "is_active='YES' and group_name ='task_priority'",
                                variant: "standard"
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Issue Type */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "issue_type",
                                headerName: "issue_type",
                                component: "BSAutoComplete",
                                bsMode: "single",
                                bsTitle: "issue_type",
                                bsPreObj: "sec.t_com_",
                                bsObj: "combobox_item",
                                bsColumes: [
                                    { field: "value_member", display: false, filter: false, key: true },
                                    { field: "display_member", display: true, filter: true, key: false },
                                ],
                                bsObjBy: "display_sequence asc",
                                bsObjWh: "is_active='YES' and group_name ='issue_type'",
                                variant: "standard"
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Due Date */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "due_date",
                                headerName: "due_date",
                                component: "BSDatePicker",
                                isRange: true,
                                isDateOnly: true,
                                format: "DD/MM/YYYY",
                                start: "start_date",
                                end: "end_date"
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Manday */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "manday",
                                headerName: "manday",
                                component: "BSTextField",
                                type: "decimal",
                                required: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Description */}
                    <Grid size={12}>
                        {renderInput({
                            item: {
                                field: "task_description",
                                headerName: "task_description",
                                component: "BSTextField",
                                required: true,
                                variant: "outlined",
                                multiline: true,
                                minRows: 3
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>

                    {/* Remark */}
                    <Grid size={12}>
                        {renderInput({
                            item: {
                                field: "remark",
                                headerName: "remark",
                                component: "BSTextField",
                                variant: "outlined",
                                multiline: true,
                                minRows: 3
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>
                </Grid>

                {/* Tabs */}
                {formData.project_task_id && (
                    <Box>
                        <Tabs value={tap} onChange={(e, v) => setTap(v)} sx={{ mt: 3 }}>
                            <Tab label="Assign Team" />
                            <Tab label="Task Tracking" />
                        </Tabs>

                        <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
                            {tap === 0 && <AssignTeam project_task_id={formData.project_task_id} />}
                            {tap === 1 && <TaskTracking />}
                        </Box>
                    </Box>
                )}

            </DialogContent>
            <DialogActions>
                <BSCloseOutlinedButton onClick={() => onClose(false)} variant="outlined">Close</BSCloseOutlinedButton>
                <BSSaveOutlinedButton onClick={handleSave} variant="outlined">Save</BSSaveOutlinedButton>
            </DialogActions>
        </Dialog>
    );
};

export default TaskDialog;
