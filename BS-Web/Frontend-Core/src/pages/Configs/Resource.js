import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  FormHelperText,
  Paper,
  Button,
  Grid,
  MenuItem,
  TextField,
  OutlinedInput,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useRef, useState } from "react";
import BSAutoComplete from "../../components/BSAutoComplete";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import { useAuth } from "../../contexts/AuthContext";
import BSFullScreenLoader from "../../contexts/BSFullScreenLoader";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";
const defaultFormData = {
  resource_id: 0,
  app_id: "",
  platform: "",
  resource_group: "",
  resource_name: "",
  resource_en: "",
  resource_th: "",
  resource_other: "",
  description_en: "",
  description_th: "",
  descrption_other: "",
  is_active: "YES",
};
let errorFormData = {
  app_id: false,
  platform: false,
  resource_group: false,
};

const activeOptions = [
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];
const Resource = (props) => {
  const { permission } = useOutletContext();
  const { lang } = props;
  const [formData, setFormData] = useState(defaultFormData);
  const [openForm, setOpenForm] = useState(false);
  const [dialogTitleForm, setDialogTitleForm] = useState("Add Resource");
  const [loading, setLoading] = useState(false);
  const { resource } = useAuth();
  const { getResourceByGroupAndName } = useResource();
  const dataGridRef = useRef();
  const [locale_id, setLocale_id] = useState(lang || "en");
  const handleOpenEdit = (row) => {
    setDialogTitleForm(getResourceByGroupAndName("Resource", "Edit_Form", lang)?.resource_value || "Edit Form");
    setFormData({ ...row });
    setOpenForm(true);
  };
  const handleOpenAdd = () => {
    setDialogTitleForm(getResourceByGroupAndName("Resource", "Add_Form", lang)?.resource_value || "Add Form");
    setFormData(defaultFormData);
    setOpenForm(true);
  };
  const validateForm = () => {
    if (formData.app_id <= 0) {
      errorFormData.app_id = true;
    } else {
      errorFormData.app_id = false;
    }
    if (formData.platform.trim() === "") {
      errorFormData.platform = true;
    } else {
      errorFormData.platform = false;
    }
    if (formData.resource_group.trim() === "") {
      errorFormData.resource_group = true;
    } else {
      errorFormData.resource_group = false;
    }
  };
  const onSave = async () => {
    validateForm();
    if (
      errorFormData.app_id ||
      errorFormData.platform ||
      errorFormData.resource_group
    ) {
      setFormData({ ...formData });
      BSAlertSwal2.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fill in all required fields.",
      });
      return;
    }
    setFormData({ ...formData });
    try {
      await AxiosMaster.post("/resource/save", formData).then((res) => {
        if (res.data.message_code === "0") {
          BSAlertSwal2.fire({
            icon: "success",
            title: "Success",
            text: "Resource saved successfully.",
          }).then(async (res) => {
            setOpenForm(false);
            await resource();
            dataGridRef.current?.refreshData();
          });
          // Refresh data grid or perform other actions as needed
        } else {
          BSAlertSwal2.fire({
            icon: "error",
            title: "Error",
            text:
              res.data.message ||
              "An error occurred while saving the resource.",
          });
        }
      });
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
   setLocale_id(lang || "en");
  };
  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  return (
    <Box>
      <BSFullScreenLoader open={loading} />
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={lang}
          bsPreObj="sec"
          bsObj="t_com_resource"
          bsCols="app_id
                    ,platform
                    ,resource_group
                    ,resource_name
                    ,resource_en
                    ,resource_th
                    ,resource_other
                    ,description_en
                    ,description_th
                    ,descrption_other
                    ,is_active"
          bsObjBy="user_id asc"
          bsComboBox={[
            {
              Column: "app_id",
              Display: "application_name",
              Value: "app_id",
              Default: "--- Select Application ---",
              PreObj: "sec",
              Obj: "t_com_application",
              ObjWh: "is_active='YES'",
              ObjBy: "application_name asc",
            },
            {
              Column: "platform",
              Display: "display_member",
              Value: "display_member",
              Default: "--- Select Platform ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name = 'platform' AND is_active='YES'",
              ObjBy: "display_member asc",
            },
          ]}
          bsBulkMode={{
            enable: false, // Enable all bulk operations
            addInline: permission.is_add, // Add new rows inline instead of dialog
            edit: permission.is_edit,      // Enabled by default when enable=true
            delete: permission.is_delete,    // Enabled by default when enable=true
            add: permission.is_add,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          bsShowDescColumn={false}
          // onEdit={handleOpenEdit}
          // onAdd={handleOpenAdd}
          // bsAllowAdd={true}
          // bsAllowEdit={true}
          // bsAllowDelete={true}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
        />
      </Paper>
      <Dialog open={openForm} maxWidth="lg" onClose={() => setOpenForm(false)}>
        <DialogTitle>{dialogTitleForm}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1, mb: 1 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <BSAutoComplete
                  bsMode="single"
                  bsTitle="Select Application"
                  bsPreObj="sec.t_com_"
                  bsObj="application"
                  bsColumes={[
                    {
                      field: "app_id",
                      display: false,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "application_name",
                      display: true,
                      filter: false,
                      key: false,
                    },
                  ]}
                  bsObjBy="app_id asc"
                  bsObjWh=""
                  bsValue={formData.app_id + ""}
                  bsOnChange={(val) =>
                    setFormData({ ...formData, app_id: val?.app_id ?? "" })
                  }
                />
                {errorFormData.app_id && (
                  <FormHelperText error>Please enter App ID</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <BSAutoComplete
                  bsMode="single"
                  bsTitle="Select Platform"
                  bsPreObj="sec.t_com_"
                  bsObj="combobox_item"
                  bsColumes={[
                    {
                      field: "display_member",
                      display: true,
                      filter: false,
                      key: true,
                    },
                    //  { field: "display_member", display: true, filter: false, key: false },
                  ]}
                  bsObjBy="display_member asc"
                  bsObjWh="group_name = 'platform' AND is_active='YES'"
                  bsValue={formData.platform}
                  bsOnChange={(val) =>
                    setFormData({
                      ...formData,
                      platform: val?.display_member ?? "",
                    })
                  }
                />
                {errorFormData.platform && (
                  <FormHelperText error>Please enter Platform</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="resource_group">
                  {getResourceByGroupAndName("t_com_resource", "resource_group", locale_id)?.resource_value || "Resource Group"}
                </InputLabel>
                <OutlinedInput
                  id="resource_group"
                  value={formData.resource_group}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_group: e.target.value })
                  }
                  label="Resource Group"
                />
                {errorFormData.resource_group && (
                  <FormHelperText error>
                    Please enter Resource Group
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="resource_name">
                  {getResourceByGroupAndName("t_com_resource", "resource_name", locale_id)?.resource_value || "Resource Name"}
                </InputLabel>
                <OutlinedInput
                  id="resource_name"
                  value={formData.resource_name}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_name: e.target.value })
                  }
                  label="Resource Name"
                />
                {errorFormData.resource_name && (
                  <FormHelperText error>
                    Please enter Resource Name
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="resource_en">
                  {getResourceByGroupAndName("t_com_resource", "resource_en", locale_id)?.resource_value || "Resource (EN)"}
                </InputLabel>
                <OutlinedInput
                  id="resource_en"
                  value={formData.resource_en}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_en: e.target.value })
                  }
                  label="Resource (EN)"
                />
                {errorFormData.resource_en && (
                  <FormHelperText error>
                    Please enter Resource (EN)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="resource_th">
                  {getResourceByGroupAndName("t_com_resource", "resource_th", locale_id)?.resource_value || "Resource (TH)"}
                </InputLabel>
                <OutlinedInput
                  id="resource_th"
                  value={formData.resource_th}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_th: e.target.value })
                  }
                  label="Resource (TH)"
                />
                {errorFormData.resource_th && (
                  <FormHelperText error>
                    Please enter Resource (TH)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="resource_other">
                  {getResourceByGroupAndName("t_com_resource", "resource_other", locale_id)?.resource_value || "Resource (Other)"}
                </InputLabel>
                <OutlinedInput
                  id="resource_other"
                  value={formData.resource_other}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_other: e.target.value })
                  }
                  label="Resource (Other)"
                />
                {errorFormData.resource_other && (
                  <FormHelperText error>
                    Please enter Resource (Other)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="description_en">
                  {getResourceByGroupAndName("t_com_resource", "description_en", locale_id)?.resource_value || "Description (EN)"}
                </InputLabel>
                <OutlinedInput
                  id="description_en"
                  value={formData.description_en}
                  onChange={(e) =>
                    setFormData({ ...formData, description_en: e.target.value })
                  }
                  label="Description (EN)"
                />
                {errorFormData.description_en && (
                  <FormHelperText error>
                    Please enter Description (EN)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="description_th">
                  {getResourceByGroupAndName("t_com_resource", "description_th", locale_id)?.resource_value || "Description (TH)"}
                </InputLabel>
                <OutlinedInput
                  id="description_th"
                  value={formData.description_th}
                  onChange={(e) =>
                    setFormData({ ...formData, description_th: e.target.value })
                  }
                  label="Description (TH)"
                />
                {errorFormData.description_th && (
                  <FormHelperText error>
                    Please enter Description (TH)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="descrption_other">
                  {getResourceByGroupAndName("t_com_resource", "descrption_other", locale_id)?.resource_value || "Description (Other)"}
                </InputLabel>
                <OutlinedInput
                  id="descrption_other"
                  value={formData.descrption_other}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descrption_other: e.target.value,
                    })
                  }
                  label="Description (Other)"
                />
                {errorFormData.descrption_other && (
                  <FormHelperText error>
                    Please enter Description (Other)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <TextField
                  fullWidth
                  select
                  label={getResourceByGroupAndName("t_com_resource", "is_active", locale_id)?.resource_value || "Is Active"}
                  name="is_active"
                  value={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.value })
                  }
                  required
                >
                  {activeOptions.map((a) => (
                    <MenuItem key={a.value} value={a.value}>
                      {a.label}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
            </Grid>
          </Grid>
          {/* Add other form fields similarly */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>
            {getResourceByGroupAndName("Resource", "Cancel", locale_id)?.resource_value || "Cancel"}
          </Button>
          <Button variant="contained" onClick={onSave}>
            {getResourceByGroupAndName("Resource", "Save", locale_id)?.resource_value || "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Resource;
