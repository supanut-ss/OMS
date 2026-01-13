import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useResource } from "../../../hooks/useResource";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import BSDataGrid from "../../../components/BSDataGrid";
import BSAlertSwal2 from "../../../components/BSAlertSwal2";
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { renderInput } from "../../../components/FormRenderer";
import useForm from "../../../hooks/useForm";
import AxiosMaster from "../../../utils/AxiosMaster";
import SecureStorage from "../../../utils/SecureStorage";
import dayjs from "dayjs";

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => dayjs().format("YYYY-MM-DD");

// Helper function to format date for SQL (prevents milliseconds issue)
const formatDateForSql = (dateValue) => {
  if (!dateValue) return null;

  // Handle dayjs object
  if (dayjs.isDayjs(dateValue)) {
    return dateValue.format("YYYY-MM-DD");
  }

  // Handle Date object
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Handle string - try to parse and format
  if (typeof dateValue === "string") {
    const parsed = dayjs(dateValue);
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  return dateValue;
};

// Default form data for tracking
const defaultTrackingData = {
  project_task_tracking_id: null,
  project_task_id: null,
  issue_type: "",
  actual_work: "",
  actual_date: null,
  process_update: "",
  assignee_user_id: null,
};

// Required fields for tracking form
const requiredTrackingFields = [
  "issue_type",
  "actual_work",
  "actual_date",
  "process_update",
];

// Check if user is admin
const isAdmin = () => {
  const role = SecureStorage.get("role");
  console.log("role", role);
  return role === "Administrator";
};

// Get current user ID
const getCurrentUserId = () => {
  const userInfo = SecureStorage.get("userInfo");
  return userInfo?.UserId || userInfo?.user_id || userInfo?.userId || null;
};

/**
 * TaskTracking Component
 * Displays task tracking grid with add/edit/delete functionality
 *
 * @param {Object} props
 * @param {number} props.projectTaskId - The project task ID
 * @param {string} props.lang - Language for localization
 * @param {Object} props.taskData - Task data containing start_date and end_date for validation
 */
const TaskTracking = ({ projectTaskId, lang, taskData }) => {
  const trackingGridRef = useRef();
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  const { formData, errors, updateField, validate, setFormData } = useForm(
    defaultTrackingData,
    requiredTrackingFields
  );

  // Load resources on mount
  useEffect(() => {
    const loadResources = async () => {
      const data = await getResources("usp_tmt_project_task_tracking", lang);
      setResourceData(data);
    };
    loadResources();
  }, [lang]);

  // Handle save tracking
  const handleSaveTracking = async () => {
    if (!validate()) return;

    // Get assignee_user_id - BSAutoComplete (single mode) returns object { code, label, ... }
    // So we need to extract the code value
    let assigneeValue = formData.assignee_user_id;
    if (assigneeValue && typeof assigneeValue === "object") {
      assigneeValue = assigneeValue.code;
    }

    // Use assignee_user_id from form, fallback to current user only if null/undefined/empty
    const assigneeUserId =
      assigneeValue !== null &&
      assigneeValue !== undefined &&
      assigneeValue !== ""
        ? assigneeValue
        : getCurrentUserId();

    const payload = {
      ...formData,
      project_task_id: projectTaskId,
      ProjectTaskTrackingId: formData.project_task_tracking_id || null,
      ProjectTaskId: projectTaskId,
      IssueType: formData.issue_type,
      ActualWork: formData.actual_work,
      ActualDate: formatDateForSql(formData.actual_date),
      ProcessUpdate: formData.process_update,
      AssigneeUserId: assigneeUserId,
    };

    try {
      const res = await AxiosMaster.post("/mytask/tracking/save", payload);
      BSAlertSwal2.show(
        res.data.message_code === 0 ? "success" : "warning",
        res.data.message_code === 0
          ? getResource(resourceData, "Save_Success") || "Saved successfully"
          : res.data.message_text ||
              getResource(resourceData, "Save_Failed") ||
              "Save failed"
      );

      if (res.data.message_code === 0) {
        setOpenTrackingDialog(false);
        setFormData(defaultTrackingData);
        trackingGridRef.current?.refreshData();
      }
    } catch (error) {
      BSAlertSwal2.show(
        "error",
        getResource(resourceData, "Save_Error") ||
          "An error occurred while saving"
      );
    }
  };

  // Handle edit tracking
  const handleEditTracking = (row) => {
    setFormData({
      ...defaultTrackingData,
      ...row,
      // Map field "assignee" from SP to "assignee_user_id" for form
      assignee_user_id: row.assignee || row.assignee_user_id || null,
    });
    setOpenTrackingDialog(true);
  };

  // Handle add tracking
  const handleAddTracking = () => {
    setFormData({
      ...defaultTrackingData,
      project_task_id: projectTaskId,
      actual_date: getTodayDate(),
      assignee_user_id: getCurrentUserId(),
    });
    setOpenTrackingDialog(true);
  };

  // Handle delete tracking
  const handleDeleteTracking = async (id) => {
    BSAlertSwal2.fire({
      title:
        getResource(resourceData, "Delete_Confirm_Title") || "Delete Data?",
      text:
        getResource(resourceData, "Delete_Confirm_Text") ||
        "Are you sure you want to delete this data?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText:
        getResource(resourceData, "Delete_Confirm_Button") || "Yes, Delete!",
    }).then(async (conf) => {
      if (conf.isConfirmed) {
        const res = await AxiosMaster.post("/mytask/tracking/delete/" + id);
        BSAlertSwal2.show(
          res.data.message_code === 0 ? "success" : "warning",
          res.data.message_text ?? ""
        );
        trackingGridRef.current?.refreshData();
      }
    });
  };

  return (
    <>
      {/* Task Tracking Grid */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {getResource(resourceData, "task_tracking") || "Task Tracking"}
        </Typography>
        <BSDataGrid
          ref={trackingGridRef}
          bsLocale={lang}
          bsStoredProcedure="usp_tmt_project_task_tracking"
          bsStoredProcedureSchema="tmt"
          bsCols="process_update,actual_date,actual_work,issue_type,assignee_list,create_date,create_by,update_date,update_by"
          bsStoredProcedureParams={{
            in_intProjectTaskId: projectTaskId,
            in_vchUserId: getCurrentUserId(),
          }}
          showAdd={true}
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsVisibleEdit={true}
          bsVisibleDelete={true}
          onAdd={handleAddTracking}
          onEdit={handleEditTracking}
          onDelete={handleDeleteTracking}
          bsKeyId="project_task_tracking_id"
          bsColumnDefs={[
            {
              field: "process_update",
              width: 300,
            },
            {
              field: "assignee_list",
              type: "stringAvatar",
              // headerName: "Assignee",
              showTooltip: true,
            },
            {
              field: "actual_date",
              // headerName: "Actual Date",
              renderCell: (params) => {
                if (!params.value) return "-";
                try {
                  const date = new Date(params.value);
                  if (isNaN(date.getTime())) return params.value;
                  const day = String(date.getDate()).padStart(2, "0");
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const year = date.getFullYear();
                  return `${day}/${month}/${year}`;
                } catch {
                  return params.value;
                }
              },
            },
          ]}
        />
      </Paper>

      {/* Task Tracking Dialog */}
      <Dialog
        open={openTrackingDialog}
        onClose={() => setOpenTrackingDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {formData.project_task_tracking_id
            ? getResource(resourceData, "Edit_Form") || "Edit Task Tracking"
            : getResource(resourceData, "Add_Form") || "Add Task Tracking"}
        </DialogTitle>
        <IconButton
          onClick={() => setOpenTrackingDialog(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Assignee - Only visible for admin */}
              {isAdmin() && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  {renderInput({
                    item: {
                      field: "assignee_user_id",
                      headerName:
                        getResource(resourceData, "assignee") || "Assignee",
                      component: "BSAutoComplete",
                      bsMode: "single",
                      bsTitle:
                        getResource(resourceData, "assignee") || "Assignee",
                      bsPreObj: "tmt.",
                      bsObj: "t_tmt_project_task_member",
                      bsColumes: [
                        { field: "user_id", display: false, key: true },
                        { field: "first_name", display: true },
                        { field: "last_name", display: true },
                      ],
                      bsObjBy: "first_name asc",
                      bsObjWh: `project_header_id=${
                        taskData?.project_header_id || 0
                      } AND project_task_id=${projectTaskId || 0}`,
                      required: false,
                    },
                    formData,
                    errors,
                    updateField,
                  })}
                </Grid>
              )}

              {/* Issue Type (Task Tracking Type) */}
              <Grid size={{ xs: 12, sm: isAdmin() ? 6 : 4 }}>
                {renderInput({
                  item: {
                    field: "issue_type",
                    headerName:
                      getResource(resourceData, "issue_type") || "Issue Type",
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle:
                      getResource(resourceData, "issue_type") || "Issue Type",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                      { field: "value_member", display: false, key: true },
                      { field: "display_member", display: true },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' and group_name='issue_type'",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>

              {/* Actual Work (Work Hour) */}
              <Grid size={{ xs: 12, sm: isAdmin() ? 6 : 4 }}>
                {renderInput({
                  item: {
                    field: "actual_work",
                    headerName:
                      getResource(resourceData, "actual_work") ||
                      "Actual Work (Hours)",
                    component: "BSTextField",
                    type: "decimal",
                    required: true,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>

              {/* Actual Date */}
              <Grid size={{ xs: 12, sm: isAdmin() ? 6 : 4 }}>
                {renderInput({
                  item: {
                    field: "actual_date",
                    headerName:
                      getResource(resourceData, "actual_date") || "Actual Date",
                    component: "BSDatePicker",
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    required: true,
                    isRange: false,
                    // Validate: ไม่เกิน due date range ของ task
                    minDate: taskData?.start_date,
                    maxDate: taskData?.end_date,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>

              {/* Process Update (Description) */}
              <Grid size={12}>
                {renderInput({
                  item: {
                    field: "process_update",
                    headerName:
                      getResource(resourceData, "process_update") ||
                      "Process Update",
                    component: "BSTextField",
                    required: true,
                    variant: "outlined",
                    multiline: true,
                    minRows: 4,
                  },
                  formData,
                  errors,
                  updateField,
                })}
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>

        <DialogActions>
          <BSCloseOutlinedButton
            onClick={() => setOpenTrackingDialog(false)}
            variant="outlined"
          >
            Close
          </BSCloseOutlinedButton>
          <BSSaveOutlinedButton onClick={handleSaveTracking} variant="outlined">
            Save
          </BSSaveOutlinedButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskTracking;
