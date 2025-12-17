import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
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
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [open, setOpen] = useState(false);
  const dataGridRef = useRef(null);
  const { formData, errors, updateField, validate, setFormData } = useForm(
    defaultData,
    requiredFields
  );
  const getLang = async () => {
    const res = await getResources("Projects Teams");
    setResourceData(res);
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
  const handleDelete = (id) => {
    BSAlertSwal2.fire({
      title: "ลบข้อมูล?",
      text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย",
    }).then(async (conf) => {
      if (conf.isConfirmed) {
        await AxiosMaster.post("/projects/team/delete/" + id).then((res) => {
          BSAlertSwal2.show(
            res?.data?.message_code === "0" ? "success" : "warning",
            res?.data?.message_text ?? "error"
          );
          dataGridRef.current.refreshData();
        });
      }
    });
  };
  const handleAdd = () => {
    setFormData({ ...defaultData, project_header_id: props.projectID });
    setOpen(true);
  };
  const handleEdit = (row) => {
    setFormData((prev) => ({ ...prev, ...row }));
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleSave = () => {
    callAddOrEdit();
    setOpen(false);
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsCols="Assignee,role,description"
          bsStoredProcedureSchema="tmt"
          bsStoredProcedure="usp_project_teams" // ✔ ชื่อ stored ถูกต้อง
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          showAdd={true}
          bsShowRowNumber={true}
          bsRowPerPage={20}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          // bsAllowAdd={true}
          // bsAllowEdit={true}
          //  bsAllowDelete={true}
          bsFilterMode="client"
          bsStoredProcedureParams={{ project_id: props.projectID }}
        />
      </Paper>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth={"lg"}>
        <DialogTitle>
          {formData.project_task_member_id ? "Edit" : "Add"} {props.title}
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
                  headerName: "user_id",
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
                  headerName: "role",
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
                  headerName: "description",
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
            Close
          </BSCloseOutlinedButton>
          <BSSaveOutlinedButton
            onClick={handleSave}
            autoFocus
            variant="outlined"
          >
            Save
          </BSSaveOutlinedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsTeams;
