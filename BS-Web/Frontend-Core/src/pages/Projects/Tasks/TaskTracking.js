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
import { useRef, useState } from "react";
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
// TODO: Edit this function according to your user role management
const isAdmin = () => {
  const userInfo = SecureStorage.get("userInfo");
  console.log("userInfo", userInfo);
  return userInfo?.role === "admin" || userInfo?.is_admin === true;
};

// Get current user ID
const getCurrentUserId = () => {
  const userInfo = SecureStorage.get("userInfo");
  return userInfo?.user_id || userInfo?.userId || null;
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

  const { formData, errors, updateField, validate, setFormData } = useForm(
    defaultTrackingData,
    requiredTrackingFields
  );

  // Handle save tracking
  const handleSaveTracking = async () => {
    if (!validate()) return;

    const payload = {
      ...formData,
      project_task_id: projectTaskId,
      ProjectTaskTrackingId: formData.project_task_tracking_id || null,
      ProjectTaskId: projectTaskId,
      IssueType: formData.issue_type,
      ActualWork: formData.actual_work,
      ActualDate: formData.actual_date,
      ProcessUpdate: formData.process_update,
      AssigneeUserId: formData.assignee_user_id || getCurrentUserId(),
    };

    try {
      const res = await AxiosMaster.post("/mytask/tracking/save", payload);
      BSAlertSwal2.show(
        res.data.message_code === 0 ? "success" : "warning",
        res.data.message_code === 0
          ? "บันทึกสำเร็จ"
          : res.data.message_text || "บันทึกไม่สำเร็จ"
      );

      if (res.data.message_code === 0) {
        setOpenTrackingDialog(false);
        setFormData(defaultTrackingData);
        trackingGridRef.current?.refreshData();
      }
    } catch (error) {
      BSAlertSwal2.show("error", "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // Handle edit tracking
  const handleEditTracking = (row) => {
    setFormData({
      ...defaultTrackingData,
      ...row,
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
      title: "ลบข้อมูล?",
      text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย",
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
          Task Tracking
        </Typography>
        <BSDataGrid
          ref={trackingGridRef}
          bsLocale={lang}
          bsStoredProcedure="usp_tmt_project_task_tracking"
          bsStoredProcedureSchema="tmt"
          bsCols="process_update,actual_date,actual_work,issue_type,assignee_list,create_date,create_by,update_date,update_by"
          bsStoredProcedureParams={{
            ProjectTaskId: projectTaskId,
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
              field: "assignee_list",
              type: "stringAvatar",
              headerName: "Assignee",
              showTooltip: true,
            },
            {
              field: "actual_date",
              headerName: "Actual Date",
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
          {formData.project_task_tracking_id ? "Edit" : "Add"} Task Tracking
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
                      headerName: "Assignee",
                      component: "BSAutoComplete",
                      bsMode: "single",
                      bsTitle: "Assignee",
                      bsPreObj: "tmt.",
                      bsObj: "t_tmt_project_task_member",
                      bsColumes: [
                        { field: "user_id", display: false, key: true },
                        { field: "first_name", display: true },
                        { field: "last_name", display: true },
                      ],
                      bsObjBy: "first_name asc",
                      bsObjWh: `is_active='YES' AND project_header_id=${
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
                    headerName: "issue_type",
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "issue_type",
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
              <Grid size={{ xs: 12, sm: 4 }}>
                {renderInput({
                  item: {
                    field: "actual_work",
                    headerName: "actual_work",
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
              <Grid size={{ xs: 12, sm: 4 }}>
                {renderInput({
                  item: {
                    field: "actual_date",
                    headerName: "actual_date",
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
                    headerName: "process_update",
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
