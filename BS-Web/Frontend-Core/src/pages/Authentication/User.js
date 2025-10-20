import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BsAutoComplete from "../../components/BSAutoComplete";
import Logger from "../../utils/logger";
import { UserContext } from "../../contexts/UserContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const activeOptions = [
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];

const initialForm = {
  user_id: "",
  user_group_id: "",
  first_name: "",
  last_name: "",
  locale_id: "",
  department: "",
  supervisor: "",
  email_address: "",
  domain: "",
  is_active: "",
  password: "",
};

const UserPage = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [locale_id, setLocale_id] = useState("en");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);
  const { register, update } = UserContext();
  const [emailError, setEmailError] = useState("");
  // Fix: Add selectedGroup state and sync with form.user_group_id
  const [selectedGroup, setSelectedGroup] = useState("");

  const handleOpenAdd = () => {
    setForm(initialForm);
    setSelectedGroup("");
    setEditMode(false);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setForm(row);
    setSelectedGroup(row.user_group_id || "");
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Email validation
    if (name === "email_address") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(
        value && !emailPattern.test(value) ? "Invalid email address" : ""
      );
    }

    // Sync dropdown value for user_group_id
    if (e.target.name === "user_group_id") {
      setSelectedGroup(value);
    }

    // // Sync dropdown value for user_group_id
    // if (e.target.name === "locale_id") {
    //   setselelo(value);
    // }
  };

  const handleGroupChange = (val) => {
    setSelectedGroup(val);
    setForm({ ...form, user_group_id: val });
  };

  const handleSave = async () => {
    // Validate required fields
    if (
      !form.user_id ||
      !form.user_group_id ||
      !form.first_name ||
      !form.last_name ||
      !form.locale_id ||
      !form.is_active
    ) {
      BSAlertSwal2.show("warning", "Please fill all required fields.");
      return;
    }
    if (editMode) {
      Logger.log("Edit:", form);
      const result = await update(form);
      if (result && result.message_code === "0") {
        BSAlertSwal2.show("success", result.message_text, {
          timer: 2000,
        });
      } else {
        BSAlertSwal2.show(
          "error",
          result?.message_text || "บันทึกข้อมูลไม่สำเร็จ"
        );
      }
    } else {
      Logger.log("Add:", form);
      form.password = "password"; // กำหนดรหัสผ่านเริ่มต้น
      const result = await register(form);
      if (result && result.message_code === "0") {
        BSAlertSwal2.show("success", result.message_text, {
          timer: 2000,
        });
      } else {
        BSAlertSwal2.show(
          "error",
          result?.message_text || "บันทึกข้อมูลไม่สำเร็จ"
        );
      }
    }
    setOpen(false);
  };

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>

        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="v_com_user"
          bsCols="user_id,
                  group_name, 
                  first_name,
                  last_name,
                  department,
                  email_address,
                  supervisor,
                  locale_id,
                  is_active,
                  create_by,
                  create_date,
                  update_by,
                  update_date"
          bsObjBy="user_id asc"
          bsComboBox={[
            {
              Column: "group_name",
              Display: "name",
              Value: "name",
              Default: "--- Select User Group ---",
              PreObj: "sec",
              Obj: "t_com_user_group",
              ObjWh: "is_active='YES'",
              ObjBy: "name asc",
            },
          ]}
          bsRowPerPage={20}
          bsShowDescColumn={false}
          onCheckBoxSelected={(rows) => {
            setSelectedRows(rows);
          }}
          onEdit={handleOpenEdit}
          onAdd={handleOpenAdd}
          height={500}
        />
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Row 1 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="User ID *"
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                required
                disabled={editMode}
              />
              <BsAutoComplete
                bsModel="select"
                bsTitle="Select Group *"
                bsPreObj="sec."
                bsObj="t_com_user_group"
                bsColumes={[
                  { field: "name", display: true },
                  { field: "user_group_id", display: false },
                ]}
                // bsFilters={[
                //   { field: "group_name", op: "=", value: "locale_id" },
                // ]}
                //bsValue={selectedPlatform} // ค่าเริ่มต้น = code ของ option
                bsObjWh="is_active='YES'"
                cacheKey="user_group_id"
                loadOnOpen={true}
                bsOnChange={(val) => handleChange("user_group_id", val)}
              />
              {/* <TextField
                fullWidth
                select
                label="User Group *"
                name="user_group_id"
                value={form.user_group_id}
                onChange={handleChange}
                required
              >
                {userGroups.map((g) => (
                  <MenuItem key={g.value} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </TextField> */}
            </Box>
            {/* Row 2 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="First Name *"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="Last Name *"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </Box>
            {/* Row 3 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <BsAutoComplete
                bsModel="select"
                bsTitle="Select Language *"
                bsPreObj="sec."
                bsObj="t_com_combobox_item"
                bsColumes={[
                  { field: "display_member", display: true },
                  { field: "group_name", display: false },
                ]}
                bsFilters={[
                  { field: "group_name", op: "=", value: "locale_id" },
                ]}
                //bsValue={selectedPlatform} // ค่าเริ่มต้น = code ของ option
                bsObjWh="group_name='locale_id'"
                cacheKey="locale_id"
                loadOnOpen={true}
                bsOnChange={(val) => handleChange("locale_id", val)}
              />
              {/* <TextField
                fullWidth
                select
                label="Locale *"
                name="locale_id"
                value={form.locale_id}
                onChange={handleChange}
                required
              >
                {locales.map((l) => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </TextField> */}
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={form.department}
                onChange={handleChange}
              />
            </Box>
            {/* Row 4 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Supervisor"
                name="supervisor"
                value={form.supervisor}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Email Address"
                name="email_address"
                value={form.email_address}
                onChange={handleChange}
                type="email"
                error={!!emailError}
                helperText={emailError}
              />
            </Box>
            {/* Row 5 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Domain"
                name="domain"
                value={form.domain}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                select
                label="Is Active *"
                name="is_active"
                value={form.is_active}
                onChange={handleChange}
                required
              >
                {activeOptions.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editMode ? "Save Changes" : "Add"}
          </Button>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserPage;
