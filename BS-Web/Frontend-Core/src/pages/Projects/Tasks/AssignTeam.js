import { Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper } from "@mui/material";
import useForm from "../../../hooks/useForm";
import { renderInput } from "../../../components/FormRenderer";
import BSDataGrid from "../../../components/BSDataGrid";
import { useRef, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
const defaultData = {
    project_task_member_id: null
};

const requiredFields = [
];
const AssignTeam = (props) => {
    const { lang, project_header_id } = props;
    const {
        formData,
        errors,
        updateField,
        validate,
        setFormData
    } = useForm(defaultData, requiredFields);
    const [open, setOpen] = useState(false);
    const dataRef = useRef();
    const handleClose = () => {
        setOpen(false);
    }
    const handleAdd = () => {
        setFormData(prev => ({ ...prev, ...defaultData }))
        setOpen(true);
    }
    const handleEdit = (row) => {
        setFormData(prev => ({ ...prev, ...row }))
        setOpen(true);
    }
    const handleSave = () => {
        if (!validate) return;
        BSAlertSwal2.show("warning", "อยู่ในช่วงพัฒนา")
    }
    return <Paper elevation={3} sx={{ p: 2, backgroundColor: 'hsla(215, 15%, 97%, 0.5)' }}>
        <BSDataGrid
            ref={dataRef}
            bsLocale={lang}
            bsPreObj="tmt"
            bsObj="v_tmt_project_task_member"
            bsCols="fullname,manday"
            bsObjBy="project_task_member_id asc"
            onAdd={handleAdd}
            onEdit={handleEdit}
        />
        <Dialog open={open}
            onClose={handleClose} fullWidth maxWidth={"lg"} >
            <DialogTitle>{formData.project_task_member_id ? "Edit" : "Add"} {props.title}</DialogTitle>
            <IconButton
                aria-label="close"
                onClick={handleClose}
                sx={(theme) => ({
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: theme.palette.grey[500],
                })}
            >
                <CloseIcon />
            </IconButton>
            <DialogContent>
                <Grid container spacing={2} mt={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderInput({
                            item: {
                                field: "user_id",
                                headerName: "user_id",
                                component: 'BSAutoComplete',
                                bsMode: "single",
                                bsTitle: "user_id",
                                bsPreObj: "tmt.t_tmt_",
                                bsObj: "project_member",
                                bsColumes: [
                                    { field: "user_id", display: false, key: true },
                                    { field: "first_name", display: true },
                                    { field: "last_name", display: true }
                                ],
                                bsObjBy: "role asc",
                                bsObjWh: `project_header_id = '${project_header_id}' `,
                                variant: "standard",
                                required: true
                            },
                            formData,
                            errors,
                            updateField
                        })}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>

                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>

                    </Grid>
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
    </Paper>
}
export default AssignTeam;