import { Box, Dialog, DialogContent, DialogTitle, Grid, IconButton, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
import CloseIcon from '@mui/icons-material/Close';
import { renderInput } from "../../components/FormRenderer";
import useForm from "../../hooks/useForm";
const ProjectsHistory = (props) => {
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState([]);
    const [resoureDataProjects, setResourceDataProjects] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const dataGridRef = useRef(null);

    const getLang = async () => {
        const res = await getResources("Projects History");
        setResourceDataProjects(await getResources("t_tmt_project_header"));
        setResourceData(res);
    };
    const {
        formData,
        errors,
        updateField,
        setFormData
    } = useForm({}, []);
    const handleViewTask = (data) => {
        setFormData(data);
        setOpenDialog(true);
    };
    const handleClose = () => {
        setOpenDialog(false);
    }
    useEffect(() => {
        getLang();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {getResource(resourceData, "Projects History")}
                </Typography>

                <BSDataGrid
                    ref={dataGridRef}
                    bsLocale={props.lang}
                    bsStoredProcedureSchema="tmt"
                    bsStoredProcedure="usp_project_history"   // ✔ ชื่อ stored ถูกต้อง
                    bsCols="project_no, project_name,project_type,iso_type_name,actual_project_start,actual_project_end,create_date"
                    bsStoredProcedureParams={{
                        ProjectHeaderId: props.projectID || null,
                    }}
                    showAdd={false}
                    bsVisibleView={true}
                    bsVisibleEdit={false}
                    bsVisibleDelete={false}
                    bsKeyId="project_header_id"
                    bsFilterMode="client"
                    onView={handleViewTask}
                />
            </Paper>
            <Dialog fullWidth maxWidth={"lg"}
                open={openDialog}
                onClose={handleClose}>
                <DialogTitle>View</DialogTitle>
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
                    <Box sx={{ pl: 3, pr: 3 }}>
                        {/* Form fields for formData */}
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "project_no",
                                        headerName: getResource(resoureDataProjects, "project_no"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "project_name",
                                        headerName: getResource(resoureDataProjects, "project_name"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        required: true,
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "parent_project_id",
                                        headerName: getResource(resoureDataProjects, "parent_project_id"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "parent_project_id",
                                        bsPreObj: "tmt.t_tmt_",
                                        bsObj: "project_header",
                                        bsColumes: [
                                            {
                                                field: "project_header_id",
                                                display: false,
                                                filter: false,
                                                key: true,
                                            },
                                            {
                                                field: "project_no",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            },
                                            {
                                                field: "project_name",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            }
                                        ],
                                        bsObjBy: "project_no asc",
                                        bsObjWh: "is_active='YES' AND project_type='PROJECT'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "project_status",
                                        headerName: getResource(resoureDataProjects, "project_status"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "project_status",
                                        bsPreObj: "sec.t_com_",
                                        bsObj: "combobox_item",
                                        bsColumes: [
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
                                        bsObjWh: "is_active='YES' AND group_name='project_status'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "application_type",
                                        headerName: getResource(resoureDataProjects, "application_type"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "application_type",
                                        bsPreObj: "sec.t_com_",
                                        bsObj: "combobox_item",
                                        bsColumes: [
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
                                        bsObjWh: "is_active='YES' AND group_name='application_type'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "project_type",
                                        headerName: getResource(resoureDataProjects, "project_type"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "project_type",
                                        bsPreObj: "sec.t_com_",
                                        bsObj: "combobox_item",
                                        bsColumes: [
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
                                        bsObjWh: "is_active='YES' AND group_name='project_type'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "iso_type_id",
                                        headerName: getResource(resoureDataProjects, "iso_type_id"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "iso_type_id",
                                        bsPreObj: "tmt.t_tmt_",
                                        bsObj: "iso_type",
                                        bsColumes: [
                                            {
                                                field: "iso_type_id",
                                                display: false,
                                                filter: false,
                                                key: true,
                                            },
                                            {
                                                field: "iso_type_name",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            }
                                        ],
                                        bsObjBy: "iso_type_name asc",
                                        bsObjWh: "is_active='YES'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "po_number",
                                        headerName: getResource(resoureDataProjects, "po_number"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        required: true,
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "sale_id",
                                        headerName: getResource(resoureDataProjects, "sale_id"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "sale_id",
                                        bsPreObj: "tmt.t_tmt_",
                                        bsObj: "sale",
                                        bsColumes: [
                                            {
                                                field: "sale_id",
                                                display: false,
                                                filter: false,
                                                key: true,
                                            },
                                            {
                                                field: "sale_empolyee_code",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            },
                                            {
                                                field: "sale_name",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            }
                                        ],
                                        bsObjBy: "sale_empolyee_code asc",
                                        bsObjWh: "is_active='YES'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "customer_id",
                                        headerName: getResource(resoureDataProjects, "customer_id"),
                                        component: 'BSAutoComplete',
                                        bsMode: "single",
                                        bsTitle: "customer_id",
                                        bsPreObj: "tmt.t_tmt_",
                                        bsObj: "customer",
                                        bsColumes: [
                                            {
                                                field: "customer_id",
                                                display: false,
                                                filter: false,
                                                key: true,
                                            },
                                            {
                                                field: "customer_code",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            },
                                            {
                                                field: "customer_name",
                                                display: true,
                                                filter: true,
                                                key: false,
                                            }
                                        ],
                                        bsObjBy: "customer_code asc",
                                        bsObjWh: "is_active='YES'",
                                        required: true,
                                        variant: 'filled',
                                        disabled: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        type: "decimal",
                                        field: "manday",
                                        headerName: getResource(resoureDataProjects, "manday"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        required: true,
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "management_cost",
                                        headerName: getResource(resoureDataProjects, "management_cost"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "travel_cost",
                                        headerName: getResource(resoureDataProjects, "travel_cost"),
                                        component: "BSTextField",
                                        variant: "filled",
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "plan_project_date",
                                        headerName: getResource(resoureDataProjects, "plan_project_date"),
                                        component: "BSDatePicker",
                                        isRange: true,
                                        isDateOnly: true,
                                        format: "DD/MM/YYYY",
                                        start: "plan_project_start",
                                        end: "plan_project_end",
                                        required: true,
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "revise_project_date",
                                        headerName: getResource(resoureDataProjects, "revise_project_date"),
                                        component: "BSDatePicker",
                                        isRange: true,
                                        isDateOnly: true,
                                        format: "DD/MM/YYYY",
                                        start: "revise_project_start",
                                        end: "revise_project_end",
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                {renderInput({
                                    item: {
                                        field: "actual_project_date",
                                        headerName: getResource(resoureDataProjects, "actual_project_date"),
                                        component: "BSDatePicker",
                                        isRange: true,
                                        isDateOnly: true,
                                        format: "DD/MM/YYYY",
                                        start: "actual_project_start",
                                        end: "actual_project_end",
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                            {/* <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            {renderInput({
                                item: {
                                    field: "record_type",
                                    headerName: "record_type",
                                    component: "BSTextField",
                                    variant: "filled",
                                    readOnly: true
                                },
                                formData,
                                errors,
                                updateField
                            })}
                        </Grid> */}
                            <Grid size={12}>
                                {renderInput({
                                    item: {
                                        field: "remark",
                                        headerName: getResource(resoureDataProjects, "remark"),
                                        component: "BSTextField",
                                        variant: "outlined",
                                        multiline: true,
                                        minRows: 3,
                                        readOnly: true
                                    },
                                    formData,
                                    errors,
                                    updateField
                                })}
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ProjectsHistory;