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
import CloseIcon from "@mui/icons-material/Close";
import AxiosMaster from "../../../utils/AxiosMaster";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import AssignTeam from "../Tasks/AssignTeam";
import TaskTracking from "../Tasks/TaskTracking";

import useForm from "../../../hooks/useForm";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useCallback, useEffect, useState } from "react";
import { renderInput } from "../../../components/FormRenderer";
import { useResource } from "../../../hooks/useResource";
import Selector from "../../../components/Selector";
import TaskProject from "./TaskProject";
import TaskMa from "./TaskMa";
import BSFileUpload from "../../../components/BSFileUpload";
import dayjs from "dayjs";

const TaskDialog = ({ phases, projectHeader, open, onClose, lang }) => {
  const defaultData = {
    project_task_id: "",
    project_task_phase_id: null,
    task_status: "Open",
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
    close_remark: "",
    is_incident: "YES",
  };

  const requiredFields =
    projectHeader.record_type === "PROJECT"
      ? [
        "task_status",
        "task_name",
        "priority",
        "issue_type",
        "manday",
        "task_description",
        "start_date",
        "end_date",
      ]
      : [
        "task_name",
        "priority",
        "issue_type",
        "start_date",
        "end_date",
        "manday",
        "start_incident_date",
        "task_description",
      ];
  const { formData, errors, updateField, validate, setFormData } = useForm(
    defaultData,
    requiredFields
  );

  const [tap, setTap] = useState(0);
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState();
  const [resourceDataProject, setResourceDataProject] = useState();
  const [isSaving, setIsSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(
      await getResources(
        projectHeader.record_type === "PROJECT"
          ? "t_tmt_project_task"
          : "t_tmt_project_task_ma",
        lang
      )
    );
    setResourceDataProject(
      await getResources(
        projectHeader.record_type === "PROJECT"
          ? "t_tmt_project_header"
          : "t_tmt_project_header_ma",
        lang
      )
    );
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const handleSave = async () => {
    try {
      if (isSaving) return;
      if (!validate()) return;
      setIsSaving(true);
      let body = {
        ...formData,
        start_incident_date: formData.start_incident_date ? dayjs(formData.start_incident_date).format("YYYY-MM-DDTHH:mm:ss") : formData.start_incident_date,
        response_date: formData.response_date ? dayjs(formData.response_date).format("YYYY-MM-DDTHH:mm:ss") : formData.response_date,
        resolve_duration_date: formData.resolve_duration_date ? dayjs(formData.resolve_duration_date).format("YYYY-MM-DDTHH:mm:ss") : formData.resolve_duration_date,
        plan_response_date: formData.plan_response_date ? dayjs(formData.plan_response_date).format("YYYY-MM-DDTHH:mm:ss") : formData.plan_response_date,
        plan_resolve_duration_date: formData.plan_resolve_duration_date ? dayjs(formData.plan_resolve_duration_date).format("YYYY-MM-DDTHH:mm:ss") : formData.plan_resolve_duration_date
      }
      const res = await AxiosMaster.post("/projects/task", body);
      BSAlertSwal2.show(
        res.data.message_code === 0 ? "success" : "warning",
        res.data.message_code === 0 ? "บันทึกสำเร็จ" : "บันทึกไม่สำเร็จ"
      );

      if (res.data.data) {
        setFormData((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      BSAlertSwal2.show("error", err.message, {
        title: "บันทึกไม่สำเร็จ",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      project_task_id: phases.project_task_id,
      project_task_phase_id: phases.project_task_phase_id,
      project_header_id: projectHeader.project_header_id,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);
  const fetchData = useCallback(() => {
    if (!phases.project_task_id) return;
    getLang();
    AxiosMaster.get("/projects/task/" + phases.project_task_id).then((res) => {
      if (res.data.message_code === 0) {
        setFormData((prev) => ({
          ...prev,
          ...res.data.data,
          remark: res.data.data.remark ?? "",
          close_by: res.data.data.close_by ?? "",
          close_remark: res.data.data.close_remark ?? "",
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullScreen>
      <DialogTitle>
        {formData.project_task_id ? "Edit" : "Add"} Task Details
      </DialogTitle>

      <IconButton
        onClick={() => onClose(false)}
        sx={{ position: "absolute", right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ mt: 1 }}>
        {/* Task Status */}
        <Grid>
          <Selector
            value={formData.task_status}
            setValue={(val) => updateField("task_status", val)}
          />
        </Grid>

        {projectHeader.record_type === "PROJECT" && (
          <TaskProject
            formData={formData}
            errors={errors}
            updateField={updateField}
            getResource={getResource}
            resourceData={resourceData}
            resourceDataProject={resourceDataProject}
            projectHeader={projectHeader}
            renderInput={renderInput}
          />
        )}
        {projectHeader.record_type === "MA" && (
          <TaskMa
            formData={formData}
            errors={errors}
            updateField={updateField}
            getResource={getResource}
            resourceData={resourceData}
            resourceDataProject={resourceDataProject}
            projectHeader={projectHeader}
            renderInput={renderInput}
          />
        )}
        {/* Tabs */}
        {formData.project_task_id && (
          <Box>
            <Tabs label={getResource(resourceData, "task")} value={tap} onChange={(e, v) => setTap(v)} sx={{ mt: 3 }}>
              <Tab label={getResource(resourceData, "assign_team")} />
              <Tab label={getResource(resourceData, "task_tracking")} />
              <Tab label={getResource(resourceData, "upload_image")} />
            </Tabs>

            <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
              {tap === 0 && (
                <AssignTeam
                  title="Assign Team"
                  project_task_id={formData.project_task_id}
                  project_header_id={projectHeader.project_header_id}
                  lang={lang}
                />
              )}
              {tap === 1 && (
                <TaskTracking
                  projectTaskId={formData.project_task_id}
                  lang={lang}
                  taskData={formData}
                />
              )}
              {tap === 2 && (
                <BSFileUpload
                  attachConfig={{
                    preObj: "tmt",
                    attachTable: "t_tmt_project_task_tracking_attach_file",
                    foreignKey: "project_task_id",
                    foreignKeyValue: formData?.project_task_id,
                    fileNameColumn: "file_name",
                    pathColumn: "path_file",
                    primaryKey: "tracking_file_id",
                    maxFiles: 10,
                    maxFileSize: 1024 * 1024 * 10,
                    additionalData: {
                      project_task_id: formData?.project_task_id,
                    },
                  }}
                  locale={lang}
                />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <BSCloseOutlinedButton
          onClick={() => onClose(false)}
          variant="outlined"
        >
          Close
        </BSCloseOutlinedButton>
        <BSSaveOutlinedButton
          variant="outlined"
          onClick={handleSave}
          disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </BSSaveOutlinedButton>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDialog;
