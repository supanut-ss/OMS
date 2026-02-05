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
import MinimizeIcon from "@mui/icons-material/Minimize";
const ProjectsDialog = (props) => {
  const defaultData = props.ma ? {
    project_no: "",
    year: "",
    project_name: "-",
    project_status: "Open",
    master_project_id: null,
    application_type: null,
    customer_id: null,
    sale_id: null,
    actual_project_start: "",
    actual_project_end: "",
    project_type: "MA",
    is_active: "YES",
    record_type: "MA",
    remark: "",
    po_number: "",
    iso_type_id: 29
  } : {
    project_name: null,
    project_status: "Open",
    application_type: "WM3",
    project_type: "Project",
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
    "manday",
    "po_number"
  ];
  const { formData, errors, updateField, validate, setFormData } = useForm(
    { ...defaultData },
    requiredFields
  );
  const [tap, setTap] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(false);
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState();
  const [isSaving, setIsSaving] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(await getResources(props.ma ? "t_tmt_project_header_ma" : "t_tmt_project_header", props.lang));
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);
  const handleClose = () => {
    setMinimized(false);
    setOpen(false);
    setTap(0);
    setFormData({ ...defaultData });
    props.onClose(false);
  };
  const onChangeProjectHeaderID = ({ id, newtab, path }) => {
    if (!newtab) {
      setFocus(false);
      setOpen(false);
      setMinimized(false);
      setTap(0);
      setFormData({ ...defaultData });
      props.onClose(false);
    }
    props.onChangeProjectHeaderID({ id: id, newtab: newtab, path: path });
  };
  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    let body = { 
      ...formData, 
      master_project_id: formData.master_project_id !== "" ? formData.master_project_id : null,
      // 🔥 ตรวจสอบ iso_type_id ว่ามีค่าหรือไม่ ถ้าไม่มีให้ใช้ค่า default จาก defaultData
      iso_type_id: formData.iso_type_id || (props.ma ? 29 : null)
    }
    
    // 🔥 Debug log เพื่อตรวจสอบค่าก่อนส่ง
    console.log('📤 Saving project with body:', {
      ...body,
      iso_type_id: body.iso_type_id,
      project_type: body.project_type,
      record_type: body.record_type
    });
    
    try {
      const response = await AxiosMaster.post("/projects", body);

      if (response.data.message_code === 0) {
        BSAlertSwal2.show("success", "Project saved successfully", { title: "Success" });
        setFormData(response.data.data);
        setTaskRefresh(true);
      } else {
        BSAlertSwal2.show(
          "error",
          response?.data?.message || "Save failed"
        );
      }
    } catch (err) {
      BSAlertSwal2.show("error", err.message, {
        title: "Failed to Save Record",
      });
    } finally {
      setIsSaving(false);
    }
  };
  const fetchformData = useCallback(async () => {
    // 🔥 ถ้า dialog เปิดอยู่แล้ว
    if (open) {
      setFocus(true);
      return;
    }

    if (formData.project_header_id || props.projectID) {
      setLoading(true);
      await getLang();
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
        }).finally(() => {
          setLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectID]);
  useEffect(() => {
    fetchformData();
  }, [fetchformData]);
  useEffect(() => {
    if (props.open !== open) setOpen(true);
  }, [props.open])
  return (<>
    {!loading &&
      <Dialog fullScreen open={props.open && !minimized} onClose={handleClose}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 6, // กันปุ่ม close
          }}
        >
          {formData.project_header_id ? "Edit" : "Add"} {props.title}

          <Box>
            <IconButton
              size="small"
              onClick={() => setMinimized(true)}
              sx={{ mr: 1 }}
            >
              <MinimizeIcon />
            </IconButton>

            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
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
                  lang={props.lang}
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
          <BSSaveOutlinedButton autoFocus variant="outlined" onClick={handleSave}
            disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </BSSaveOutlinedButton>
        </DialogActions>
      </Dialog>
    }
    {minimized && (
      <Box
        tabIndex={0} // 🔥 ทำให้ focus ได้
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1300,
          px: 2,
          py: 1,
          bgcolor: "background.paper",
          boxShadow: focus ? 8 : 3,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          outline: focus ? "2px solid #1976d2" : "none",
          transition: "all .2s ease",
        }}
        onClick={() => {
          setFocus(false);
          setMinimized(false);
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      >
        <MinimizeIcon fontSize="small" />
        <span>
          {formData.project_header_id ? "Edit" : "Add"} {props.title} {formData.project_no && "[" + formData.project_no + "]"} {formData.project_name}
        </span>
      </Box>
    )}
  </>
  );
};

export default ProjectsDialog;
