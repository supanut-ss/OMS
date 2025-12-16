import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tab,
  Tabs,
} from "@mui/material";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useCallback, useEffect, useState } from "react";
import AxiosMaster from "../../../utils/AxiosMaster";
import ProjectsHistory from "../History";
import ProjectsTeams from "../Teams";
import ProjectTask from "../Task";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import CloseIcon from "@mui/icons-material/Close";
import { renderInput } from "../../../components/FormRenderer";
import useForm from "../../../hooks/useForm";
import { useResource } from "../../../hooks/useResource";
import InvoiceHistory from "../InvoiceHistory";
import ProjectClose from "../ProjectClose";
import MAHistory from "../MAHistory";
const defaultData = {
  project_name: null,
  project_status: null,
  application_type: null,
  project_type: null,
  iso_type_id: null,
  sale_id: null,
  customer_id: null,
  plan_project_start: null,
  plan_project_end: null,
  is_active: "YES",
  project_no: "",
  record_type: "PROJECT",
  remark: "",
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
    "plan_project_end",
  ];
  const { formData, errors, updateField, validate, setFormData } = useForm(
    defaultData,
    requiredFields
  );
  const [tap, setTap] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(false);
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(await getResources("t_tmt_project_header", props.lang));
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);
  const handleClose = () => {
    setTap(0);
    setFormData({ ...defaultData });
    props.onClose(false);
  };
  const onChangeProjectHeaderID = (id) => {
    setTap(0);
    setFormData({ ...defaultData });
    props.onClose(false);
    props.onChangeProjectHeaderID(id);
  };
  const handleSave = async () => {
    if (!validate()) return;

    try {
      await AxiosMaster.post("/projects", formData)
        .then((response) => {
          console.log(response);
          if (response.data.message_code === 0) {
            BSAlertSwal2.show("success", "Project saved successfully");
            setFormData(response.data.data);
            setTaskRefresh(true);
          } else {
            BSAlertSwal2.show(
              "error",
              response?.data?.message || "Save failed"
            );
          }
        })
        .finally(() => {});
    } catch (err) {
      BSAlertSwal2.show("error", err.message, {
        title: "Failed to Save Record",
      });
    }
  };
  const fetchformData = useCallback(async () => {
    if (formData.project_header_id || props.projectID) {
      await AxiosMaster.get(
        `/projects/${formData.project_header_id || props.projectID}`
      )
        .then((response) => {
          if (response?.data?.message_code !== 0) {
            return;
          }
          setFormData(response.data.data);
        })
        .catch((error) => {
          BSAlertSwal2.error(
            "Error",
            "Failed to fetch project header data.</br>" + error
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectID]);
  useEffect(() => {
    fetchformData();
  }, [fetchformData]);
  return (
    <Dialog fullScreen open={props.open} onClose={handleClose}>
      <DialogTitle>
        {formData.project_header_id ? "Edit" : "Add"} {props.title}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={(theme) => ({
          position: "absolute",
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
        ) : (
          <Box sx={{ pl: 3, pr: 3 }}>
            {/* Form fields for formData */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "project_no",
                    headerName: getResource(resourceData, "project_no"),
                    component: "BSTextField",
                    variant: "filled",
                    readOnly: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "project_name",
                    headerName: getResource(resourceData, "project_name"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "parent_project_id",
                    headerName: getResource(resourceData, "parent_project_id"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "project_no asc",
                    bsObjWh: "is_active='YES' AND project_type='PROJECT'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "project_status",
                    headerName: getResource(resourceData, "project_status"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' AND group_name='project_status'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "application_type",
                    headerName: getResource(resourceData, "application_type"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh:
                      "is_active='YES' AND group_name='application_type'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "project_type",
                    headerName: getResource(resourceData, "project_type"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' AND group_name='project_type'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "iso_type_id",
                    headerName: getResource(resourceData, "iso_type_id"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "iso_type_name asc",
                    bsObjWh: "is_active='YES'",
                    required: true,
                    variant: formData.project_header_id ? "filled" : "standard",
                    disabled: formData.project_header_id ? true : false,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "po_number",
                    headerName: getResource(resourceData, "po_number"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "sale_id",
                    headerName: getResource(resourceData, "sale_id"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "sale_empolyee_code asc",
                    bsObjWh: "is_active='YES'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "customer_id",
                    headerName: getResource(resourceData, "customer_id"),
                    component: "BSAutoComplete",
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
                      },
                    ],
                    bsObjBy: "customer_code asc",
                    bsObjWh: "is_active='YES'",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    type: "decimal",
                    field: "manday",
                    headerName: getResource(resourceData, "manday"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "management_cost",
                    headerName: getResource(resourceData, "management_cost"),
                    component: "BSTextField",
                    variant: "standard",
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "travel_cost",
                    headerName: getResource(resourceData, "travel_cost"),
                    component: "BSTextField",
                    variant: "standard",
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "plan_project_date",
                    headerName: getResource(resourceData, "plan_project_date"),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "plan_project_start",
                    end: "plan_project_end",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "revise_project_date",
                    headerName: getResource(
                      resourceData,
                      "revise_project_date"
                    ),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "revise_project_start",
                    end: "revise_project_end",
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                  item: {
                    field: "actual_project_date",
                    headerName: getResource(
                      resourceData,
                      "actual_project_date"
                    ),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "actual_project_start",
                    end: "actual_project_end",
                  },
                  formData,
                  errors,
                  updateField,
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
                    headerName: getResource(resourceData, "remark"),
                    component: "BSTextField",
                    variant: "outlined",
                    multiline: true,
                    minRows: 3,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
            </Grid>
            {/* End of form fields for formData */}
            <Box>
              <Tabs
                value={tap}
                onChange={(e, newValue) => setTap(newValue)}
                sx={{ mt: 3 }}
              >
                <Tab label={getResource(resourceData, "task")} />
                <Tab label={getResource(resourceData, "project_teams")} />
                <Tab label={getResource(resourceData, "project_history")} />
                <Tab label={getResource(resourceData, "invoice_history")} />
                <Tab label={getResource(resourceData, "project_close")} />
                <Tab label={getResource(resourceData, "ma_history")} />
              </Tabs>
              <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
                {tap === 0 && (
                  <ProjectTask
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                    refresh={taskRefresh}
                    setRefresh={setTaskRefresh}
                    projectHeader={formData}
                  />
                )}
                {tap === 1 && (
                  <ProjectsTeams
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                  />
                )}
                {tap === 2 && (
                  <ProjectsHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                    onChangeProjectHeaderID={onChangeProjectHeaderID}
                  />
                )}
                {tap === 3 && (
                  <InvoiceHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                  />
                )}
                {tap === 4 && (
                  <ProjectClose
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                  />
                )}
                {tap === 5 && (
                  <MAHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                  />
                )}
              </Box>
            </Box>
          </Box>
        )}
        {props.children}
      </DialogContent>
      <DialogActions>
        <BSCloseOutlinedButton
          autoFocus
          onClick={handleClose}
          variant="outlined"
          className="btn-close-outlined"
        >
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
