import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useResource } from "../../hooks/useResource";
import CloseIcon from "@mui/icons-material/Close";
import { renderInput } from "../../components/FormRenderer";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import useForm from "../../hooks/useForm";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
const defaultData = {
  project_member_id: null,
  project_header_id: null,
  user_id: null,
  role: null,
  description: null,
};
const requiredFields = ["user_id", "role"];
const ProjectsTeams = (props) => {
  const { project_header_id } = props;
  const { getResourceByGroupAndName } = useResource();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [open, setOpen] = useState(false);
  const dataGridRef = useRef(null);
  const { formData, errors, updateField, validate } = useForm(
    defaultData,
    requiredFields
  );

  // Memoize stored procedure params to prevent infinite re-renders
  const storedProcedureParams = useMemo(
    () => ({ in_intProjectId: props.projectID }),
    [props.projectID]
  );

  const getLang = async () => {
    setLocale_id(props.lang || "en")
  };
  const callAddOrEdit = async () => {
    if (!validate) return;
    await AxiosMaster.post("/projects/team", formData).then((res) => {
      BSAlertSwal2.show(
        res?.data?.message_code === "0" ? "success" : "warning",
        res?.data?.message_text ?? "error"
      );
      dataGridRef.current.refreshData();
    });
  };

  // Memoize callbacks to prevent infinite re-renders
  // const handleDelete = useCallback((id) => {
  //   BSAlertSwal2.fire({
  //     title: "ลบข้อมูล?",
  //     text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonText: "ใช่, ลบเลย",
  //   }).then(async (conf) => {
  //     if (conf.isConfirmed) {
  //       await AxiosMaster.post("/projects/team/delete/" + id).then((res) => {
  //         BSAlertSwal2.show(
  //           res?.data?.message_code === "0" ? "success" : "warning",
  //           res?.data?.message_text ?? "error"
  //         );
  //         dataGridRef.current.refreshData();
  //       });
  //     }
  //   });
  // }, []);

  // const handleAdd = useCallback(() => {
  //   setFormData({ ...defaultData, project_header_id: props.projectID });
  //   setOpen(true);
  // }, [props.projectID, setFormData]);

  // const handleEdit = useCallback(
  //   (row) => {
  //     setFormData((prev) => ({ ...prev, ...row }));
  //     setOpen(true);
  //   },
  //   [setFormData]
  // );

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSave = () => {
    callAddOrEdit();
    setOpen(false);
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);
  // Memoize comboBox configuration
  const comboBoxConfig = useMemo(
    () => [
      {
        Column: "assign_user_id",
        Display: "first_name,last_name", // รองรับ multiple fields แล้ว
        Value: "user_id",
        Default: "--- Select Assignee ---",
        PreObj: "sec",
        Obj: "t_com_user",
        ObjWh: `is_active='YES'`,
        ObjBy: "first_name asc",
      },
      {
        Column: "role",
        Display: "display_member", // รองรับ multiple fields แล้ว
        Value: "value_member",
        Default: "--- Select Role ---",
        PreObj: "sec",
        Obj: "t_com_combobox_item",
        ObjWh: `is_active='YES' and group_name ='role'`,
        ObjBy: "display_sequence asc",
      },
    ],
    [project_header_id]
  );
  // Memoize column definitions
  const columnDefs = useMemo(
    () => ({
      project_member_id: { hide: true },
      project_header_id: { hide: true },
      assign_user_id: {
        required: true,
      },
      role: {
        required: true,
      },
      create_by: { hide: true },
      create_date: { hide: true },
      update_by: { hide: true },
      update_date: { hide: true },
    }),
    []
  );
  // Memoize bulk mode configuration
  const bulkModeConfig = useMemo(
    () => ({
      enable: true,
      addInline: true, // Add new rows inline
      edit: true
      //   showCheckbox: true,
      //   showSplitButton: true,
    }),
    []
  );
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsStoredProcedureCrud={true}
          bsCols="assign_user_id,role,description"
          bsStoredProcedureSchema="tmt"
          bsStoredProcedure="usp_project_teams"
          // onAdd={handleAdd}
          // onEdit={handleEdit}
          //  onDelete={handleDelete}
          // bsAllowAdd={true}
          // bsAllowEdit={true}
          //  bsAllowDelete={true}
          bsVisibleEdit={true}
          bsVisibleDelete={true}
          bsColumnDefs={columnDefs}
          bsComboBox={comboBoxConfig}
          bsFilterMode="client"
          bsStoredProcedureParams={storedProcedureParams}
          bsBulkMode={bulkModeConfig}
          showAdd={true}
        />
      </Paper>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth={"lg"}>
        <DialogTitle>
          {formData.project_member_id
            ? getResourceByGroupAndName("Projects Teams", "Edit_From", locale_id)?.resource_value || "Edit From" 
            : getResourceByGroupAndName("Projects Teams", "Add_From", locale_id)?.resource_value || "Add From"}
          {props.title}
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
          <Grid container spacing={2} mt={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {renderInput({
                item: {
                  field: "user_id",
                  headerName: getResourceByGroupAndName("Projects Teams", "user_id", locale_id)?.resource_value || "User ID" ,
                  component: "BSAutoComplete",
                  bsMode: "single",
                  bsTitle: "user_id",
                  bsPreObj: "sec.t_com_",
                  bsObj: "user",
                  bsColumes: [
                    { field: "user_id", display: false, key: true },
                    { field: "first_name", display: true },
                    { field: "last_name", display: true },
                  ],
                  bsObjBy: "user_id asc",
                  variant: "standard",
                  required: true,
                },
                formData,
                errors,
                updateField,
              })}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {renderInput({
                item: {
                  field: "role",
                  headerName: getResourceByGroupAndName("Projects Teams", "role", locale_id)?.resource_value || "Role",
                  component: "BSAutoComplete",
                  bsMode: "single",
                  bsTitle: "role",
                  bsPreObj: "sec.t_com_",
                  bsObj: "combobox_item",
                  bsColumes: [
                    { field: "value_member", display: false, key: true },
                    { field: "display_member", display: true },
                  ],
                  bsObjWh: "is_active='YES' and group_name ='role'",
                  bsObjBy: "display_sequence asc",
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
                  field: "description",
                  headerName: getResourceByGroupAndName("Projects Teams", "description", locale_id)?.resource_value || "Description",
                  component: "BSTextField",
                  variant: "standard",
                },
                formData,
                errors,
                updateField,
              })}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <BSCloseOutlinedButton
            autoFocus
            onClick={handleClose}
            variant="outlined"
            className="btn-close-outlined"
          >
            {getResourceByGroupAndName("Projects Teams", "Close", locale_id)?.resource_value || "Close"}
          </BSCloseOutlinedButton>
          <BSSaveOutlinedButton
            onClick={handleSave}
            autoFocus
            variant="outlined"
          >
            {getResourceByGroupAndName("Projects Teams", "Save", locale_id)?.resource_value || "Save" }
          </BSSaveOutlinedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsTeams;
