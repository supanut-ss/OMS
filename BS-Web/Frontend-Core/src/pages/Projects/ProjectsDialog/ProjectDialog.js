import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useCallback, useEffect, useState } from "react";
import AxiosMaster from "../../../utils/AxiosMaster";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import CloseIcon from "@mui/icons-material/Close";
import useForm from "../../../hooks/useForm";
import { useResource } from "../../../hooks/useResource";
import FormProject from "./Form/Project";
import FormProjectMa from "./Form/Ma";
import TabsProject from "./FormTabs/TabsProject";
import TabsMa from "./FormTabs/TabsMa";
const ProjectsDialog = (props) => {
  const defaultData = props.ma ? {
    project_no: "",
    year: "",
    project_name: "-",
    project_status: null,
    master_project_id: null,
    application_type: "-",
    customer_id: null,
    sale_id: null,
   actual_project_start: "",
    actual_project_end: "",
    project_type: "MA",
    is_active: "YES",
    record_type: "MA",
    remark: "",
    po_number: "",
    iso_type_id: 0
  } : {
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
  const requiredFields = props.ma ? [
    "master_project_id",
    "year",
    "project_status",
    "customer_id",
    "sale_id",
    "actual_project_start",
    "actual_project_end"
  ] : [
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
    { ...defaultData },
    requiredFields
  );
  const [tap, setTap] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(false);
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(await getResources(props.ma ? "t_tmt_project_header_ma" : "t_tmt_project_header", props.lang));
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
  const onChangeProjectHeaderID = ({ id, newtab }) => {
    if (!newtab) {
      setTap(0);
      setFormData({ ...defaultData });
      props.onClose(false);
    }
    props.onChangeProjectHeaderID({ id: id, newtab: newtab });
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
        .finally(() => { });
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
            {props.ma ? (<FormProjectMa formData={formData} errors={errors} updateField={updateField} resourceData={resourceData} getResource={getResource} />) : (
              <FormProject formData={formData} errors={errors} updateField={updateField} resourceData={resourceData} getResource={getResource} />

            )}{/* End of form fields for formData */}
            {/* Tabs for additional information */}
            {formData.record_type === "PROJECT" && (
              <TabsProject
                formData={formData}
                resourceData={resourceData}
                getResource={getResource}
                onChangeProjectHeaderID={onChangeProjectHeaderID}
                tap={tap}
                setTap={setTap}
                taskRefresh={taskRefresh}
                setTaskRefresh={setTaskRefresh}
              />
            )}
            {formData.record_type === "MA" && (
              <TabsMa
                formData={formData}
                resourceData={resourceData}
                getResource={getResource}
                onChangeProjectHeaderID={onChangeProjectHeaderID}
                tap={tap}
                setTap={setTap}
                taskRefresh={taskRefresh}
                setTaskRefresh={setTaskRefresh}
                lang={props.lang}
              />
            )}
            {/* End of Tabs for additional information */}
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
