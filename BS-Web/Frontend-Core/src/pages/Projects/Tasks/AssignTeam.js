import { Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper } from "@mui/material";
import useForm from "../../../hooks/useForm";
import { renderInput } from "../../../components/FormRenderer";
import BSDataGrid from "../../../components/BSDataGrid";
import { useEffect, useRef, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import AxiosMaster from "../../../utils/AxiosMaster";
import { useResource } from "../../../hooks/useResource";
const defaultData = {
    project_task_member_id: null,
    project_header_id: null,
    project_task_id: null,
    user_id: null,
    description: "",
    manday: 0,
};

const requiredFields = [
];
const AssignTeam = (props) => {
    const { lang, project_header_id, project_task_id } = props;
    const {
        formData,
        errors,
        updateField,
        validate,
        setFormData
    } = useForm(defaultData, requiredFields);
    const [open, setOpen] = useState(false);
    const dataRef = useRef();
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getLang = async () => {
        setResourceData(await getResources("t_tmt_project_task_member", lang));
    }
    useEffect(() => {
        getLang()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang])
    const handleClose = () => {
        dataRef.current.refreshData();
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
    const handleDelete = async (id) => {
        BSAlertSwal2.fire({
            title: "ลบข้อมูล?",
            text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ใช่, ลบเลย",
        }).then(async (conf) => {
            if (conf.isConfirmed) {
                await AxiosMaster.post("/projects/task/assign_team/delete/" + id).then((res) => {
                    BSAlertSwal2.show(res?.data?.message_code === "0" ? "success" : "warning", res?.data?.message_text ?? "error")
                    dataRef.current.refreshData();
                })
            }
        })
    }
    const handleSave = async () => {
        if (!validate) return;
        let data = {
            ...formData,
            project_header_id: project_header_id || null,
            project_task_id: project_task_id || null
        }
        await AxiosMaster.post("/projects/task/assign_team", data)
            .then((res) => {
                BSAlertSwal2.show(res?.data?.message_code === "0" ? "success" : "warning", res?.data?.message_text ?? "error")
            })
    }
    return <Paper elevation={3} sx={{ p: 2, backgroundColor: 'hsla(215, 15%, 97%, 0.5)' }}>
        <BSDataGrid
            ref={dataRef}
            bsLocale={lang}
            bsStoredProcedure="usp_tmt_project_task_member"
            bsStoredProcedureSchema="tmt"
            bsCols="fullname,manday"
            bsStoredProcedureParams={{
                ProjectTaskId: project_task_id,
            }}
            bsShowRowNumber={true}
            showAdd={true}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
                                headerName: getResource(resourceData, "user_id"),
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
                        {renderInput({
                            item: {
                                type: "decimal",
                                field: getResource(resourceData, "manday"),
                                headerName: "manday",
                                component: "BSTextField",
                                variant: "standard"
                            },
                            formData,
                            errors,
                            updateField
                        })}
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