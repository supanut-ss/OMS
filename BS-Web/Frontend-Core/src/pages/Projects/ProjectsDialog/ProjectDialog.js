import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Tab, Tabs } from "@mui/material"
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useCallback, useEffect, useState } from "react";
import AxiosMaster from "../../../utils/AxiosMaster";
import BSTextField from "../../../components/BSTextField";
import BSAutoComplete from "../../../components/BSAutoComplete";
import BSDatepicker from "../../../components/BSDatepicker";
import dayjs from "dayjs";
import ProjectsHistory from "../History";
import ProjectsTeams from "../Teams";
import ProjectTask from "../Task";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import CloseIcon from '@mui/icons-material/Close';
const data = {
    "project_name": null,
    "project_status": null,
    "application_type": null,
    "project_type": null,
    "iso_type_id": null,
    "sale_id": null,
    "customer_id": null,
    "plan_project_start": null,
    "plan_project_end": null,
    "is_active": "YES",
    "project_no": "",
    "remark": ""
};
const ProjectsDialog = (props) => {
    const requiredFields = [
        "project_name",
        "project_status",
        "application_type",
        "project_type",
        "iso_type_id",
        "sale_id",
        "customer_id",
        "plan_project_start",
        "plan_project_end"
    ];

    const [formData, setFormData] = useState({ ...data });
    const [tap, setTap] = useState(0);
    const [errors, setErrors] = useState({});
    const [taskRefresh, setTaskRefresh] = useState(false);
    const handleClose = () => {
        setFormData({ ...data });
        props.onClose(false);

    };
    const validateForm = () => {

        let newErrors = {};
        requiredFields.forEach(f => {
            if (!formData[f] || formData[f] === "") {
                newErrors[f] = "This field is required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            await AxiosMaster.post("/projects", formData)
                .then((response) => {
                    console.log(response)
                    if (response.data.message_code === 0) {
                        BSAlertSwal2.show("success", "Project saved successfully");
                        setFormData(response.data.data);
                        setTaskRefresh(true);
                    } else {
                        BSAlertSwal2.show("error", response?.data?.message || "Save failed");
                    }
                }).finally(() => { })


        } catch (err) {
            BSAlertSwal2.show("error", err.message, {
                title: "Failed to Save Record",
            });
        }
    };
    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const fetchformData = useCallback(async () => {
        if (formData.project_header_id || props.projectID) {
            await AxiosMaster.get(`/projects/${formData.project_header_id || props.projectID}`)
                .then((response) => {
                    if (response?.data?.message_code !== 0) {
                        setFormData({ ...data });
                        return;
                    }
                    setFormData(response.data.data);
                })
                .catch((error) => {
                    BSAlertSwal2.error("Error", "Failed to fetch project header data.</br>" + error);
                });
        } else {
            setFormData({ ...data });
        }
    }, [props.projectID]);
    useEffect(() => {
        if (!props.open) {
            setFormData({ ...data });
            setErrors({});
        }
    }, [props.open]);
    useEffect(() => {
        fetchformData();
    }, [fetchformData]);
    return (<Dialog fullScreen
        open={props.open}
        onClose={handleClose}>
        <DialogTitle>{formData.project_header_id ? "Edit" : "Add"} {props.title}</DialogTitle>
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
            {formData === null && formData.project_header_id ? (
                <Box sx={{ p: 3 }}>Loading...</Box>
            ) :
                <Box sx={{ pl: 3, pr: 3 }}>
                    {/* Form fields for formData */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                label="project_no"
                                value={formData?.project_no || ""}
                                variant="filled"
                                readOnly={true}

                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                label="project_name"
                                value={formData?.project_name || ""}
                                variant="standard"
                                error={!!errors.project_name}
                                helperText={errors.project_name || ""}
                                required={true}
                                onChange={(e) => updateField("project_name", e)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="parent_project_id"
                                bsPreObj="tmt.t_tmt_"
                                bsObj="project_header"
                                bsColumes={[
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
                                    },
                                ]}
                                bsObjBy="project_no asc"
                                bsObjWh="is_active='YES' AND project_type='PROJECT'"
                                variant="standard"
                                bsValue={formData?.master_project_id}
                                bsOnChange={(val) => updateField("master_project_id", val?.code || null)}

                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="project_status"
                                bsPreObj="sec.t_com_"
                                bsObj="combobox_item"
                                bsColumes={[
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
                                ]}
                                bsObjBy="display_sequence asc"
                                bsObjWh="is_active='YES' AND group_name='project_status'"
                                variant="standard"
                                bsOnChange={(val) => updateField("project_status", val?.code || null)}
                                bsValue={formData?.project_status}
                                error={!!errors.project_status}
                                helperText={errors.project_status || ""}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="application_type"
                                bsPreObj="sec.t_com_"
                                bsObj="combobox_item"
                                bsColumes={[
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
                                ]}
                                bsObjBy="display_sequence asc"
                                bsObjWh="is_active='YES' AND group_name='application_type'"
                                variant="standard"
                                bsValue={formData?.application_type}
                                bsOnChange={(val) => updateField("application_type", val?.code || null)}
                                error={!!errors.application_type}
                                helperText={errors.application_type || ""}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="project_type"
                                bsPreObj="sec.t_com_"
                                bsObj="combobox_item"
                                bsColumes={[
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
                                ]}
                                bsObjBy="display_sequence asc"
                                bsObjWh="is_active='YES' AND group_name='project_type'"
                                variant="standard"
                                bsValue={formData?.project_type}
                                bsOnChange={(val) => updateField("project_type", val?.code || null)}
                                error={!!errors.project_type}
                                helperText={errors.project_type || ""}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="iso_type_id"
                                bsPreObj="tmt.t_tmt_"
                                bsObj="iso_type"
                                bsColumes={[
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
                                ]}
                                bsObjBy="iso_type_name asc"
                                bsObjWh="is_active='YES'"
                                bsValue={formData?.iso_type_id}
                                bsOnChange={(val) => updateField("iso_type_id", val?.code || null)}
                                error={!!errors.iso_type_id}
                                helperText={errors.iso_type_id || ""}
                                required={true}
                                variant={formData.project_header_id ? 'filled' : 'standard'}
                                disabled={formData.project_header_id ? true : false}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                type="string"
                                label="po_number"
                                value={formData?.po_number}
                                onChange={(e) => updateField("po_number", e)}
                                variant="standard"
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="sale_id"
                                bsPreObj="tmt.t_tmt_"
                                bsObj="sale"
                                bsColumes={[
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
                                ]}
                                bsObjBy="sale_empolyee_code asc"
                                bsObjWh="is_active='YES'"
                                variant="standard"
                                bsValue={formData?.sale_id}
                                bsOnChange={(val) => updateField("sale_id", val?.code || null)}
                                error={!!errors.sale_id}
                                helperText={errors.sale_id || ""}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="customer_id"
                                bsPreObj="tmt.t_tmt_"
                                bsObj="customer"
                                bsColumes={[
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
                                ]}
                                bsObjBy="customer_code asc"
                                bsObjWh="is_active='YES'"
                                variant="standard"
                                bsValue={formData?.customer_id}
                                bsOnChange={(val) => updateField("customer_id", val?.code || null)}
                                error={!!errors.customer_id}
                                helperText={errors.customer_id || ""}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                type="decimal"
                                label="manday"
                                value={formData?.manday}
                                onChange={(e) => updateField("manday", e)}
                                variant="standard"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                type="string"
                                label="management_cost"
                                value={formData?.management_cost}
                                onChange={(e) => updateField("management_cost", e)}
                                variant="standard"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSTextField
                                type="string"
                                label="travel_cost"
                                value={formData?.travel_cost}
                                onChange={(e) => updateField("travel_cost", e)}
                                variant="standard"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSDatepicker
                                label="Plan Project Date"
                                isRange={true}
                                isDateOnly={true}
                                value={[
                                    formData?.plan_project_start ? dayjs(formData.plan_project_start) : null,
                                    formData?.plan_project_end ? dayjs(formData.plan_project_end) : null
                                ]}
                                onChange={(newValue) => {
                                    updateField("plan_project_start", newValue[0] ? newValue[0].format("YYYY-MM-DD") : null);
                                    updateField("plan_project_end", newValue[1] ? newValue[1].format("YYYY-MM-DD") : null);
                                }}
                                format={"DD/MM/YYYY"}
                                error={!!errors.plan_project_start || !!errors.plan_project_end}
                                helperText={(errors.plan_project_start || "") || (errors.plan_project_end || "")}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSDatepicker
                                label="Revise Project Date"
                                isRange={true}
                                isDateOnly={true}
                                value={[
                                    formData?.revise_project_start ? dayjs(formData.revise_project_start) : null,
                                    formData?.revise_project_end ? dayjs(formData.revise_project_end) : null
                                ]}
                                onChange={(newValue) => {
                                    updateField("revise_project_start", newValue[0] ? newValue[0].format("YYYY-MM-DD") : null);
                                    updateField("revise_project_end", newValue[1] ? newValue[1].format("YYYY-MM-DD") : null);
                                }}
                                format={"DD/MM/YYYY"}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <BSDatepicker
                                label="Actual Project Date"
                                isRange={true}
                                isDateOnly={true}
                                value={[
                                    formData?.actual_project_start ? dayjs(formData.actual_project_start) : null,
                                    formData?.actual_project_end ? dayjs(formData.actual_project_end) : null
                                ]}
                                onChange={(newValue) => {
                                    updateField("actual_project_start", newValue[0] ? newValue[0].format("YYYY-MM-DD") : null);
                                    updateField("actual_project_end", newValue[1] ? newValue[1].format("YYYY-MM-DD") : null);
                                }}
                                format={"DD/MM/YYYY"}
                            />
                        </Grid>
                        <Grid size={12}>
                            <BSTextField
                                type="string"
                                label="Remark"
                                value={formData?.remark}
                                onChange={(e) => updateField("remark", e)}
                                variant="outlined"
                                multiline={true}
                                minRows={3}
                            />
                        </Grid>
                    </Grid>
                    {/* End of form fields for formData */}
                    <Box>
                        <Tabs value={tap} onChange={(e, newValue) => setTap(newValue)} sx={{ mt: 3 }}>
                            <Tab label="Task" />
                            <Tab label="Project Teams" />
                            <Tab label="Project History" />
                            <Tab label="Project Close" />
                        </Tabs>
                        <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
                            {tap === 0 && (<ProjectTask projectID={formData?.project_header_id || ""} lang={props.lang} refresh={taskRefresh} setRefresh={setTaskRefresh} projectHeader={formData} />)}
                            {tap === 1 && (<ProjectsTeams projectID={props.projectID} lang={props.lang} />)}
                            {tap === 2 && (<ProjectsHistory projectID={props.projectID} lang={props.lang} />)}
                            {tap === 2 && (<Box>Project Close</Box>)}
                        </Box>

                    </Box>
                </Box>
            }
            {props.children}
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

export default ProjectsDialog;