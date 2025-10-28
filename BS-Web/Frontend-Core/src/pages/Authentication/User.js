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
  IconButton,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BsAutoComplete from "../../components/BSAutoComplete";
import Logger, { log } from "../../utils/logger";
import { UserContext } from "../../contexts/UserContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const activeOptions = [
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];

const initialForm = {
  user_id: "",
  user_group_id: "",
  first_name: "",
  last_name: "",
  locale_id: "en",
  department: "",
  supervisor: "",
  email_address: "",
  domain: "",
  is_active: "YES",
  password: "",
};

const UserPage = () => {
  const [locale_id, setLocale_id] = useState("en");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);
  const { registerUser, updateUser } = UserContext();
  const [emailError, setEmailError] = useState("");
  // Fix: Add selectedGroup state and sync with form.user_group_id
  const [selectedGroup, setSelectedGroup] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleChange = (eOrName, value) => {
    let name, val;

    // กรณีเป็น event จาก TextField
    if (eOrName?.target) {
      name = eOrName.target.name;
      val = eOrName.target.value;
    }
    // กรณีมาจาก BsAutoComplete
    else {
      if (eOrName === "user_group_id") {
        name = eOrName;
        val = value?.user_group_id ?? null;
        Logger.log("handleChange:", name, val);
      } else if (eOrName === "locale_id") {
        name = eOrName;
        val = value?.value ?? null;
        Logger.log("handleChange:", name, val);
      }
    }

    setForm({ ...form, [name]: val });

    // Email validation
    if (name === "email_address") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(
        val && !emailPattern.test(val) ? "Invalid email address" : ""
      );
    }

    // // Sync dropdown value for user_group_id
    // if (name === "user_group_id") {
    //   setSelectedGroup(val);
    // }
  };

  const handleGroupChange = (val) => {
    log("handleGroupChange:", val);
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
      //Logger.log("Edit:", form);
      const result = await updateUser(form);
      if (result && result.message_code === "0") {
        BSAlertSwal2.show("success", result.message_text, {
          timer: 2000,
        });
        setOpen(false);
      } else {
        BSAlertSwal2.show(
          "error",
          result?.message_text || "บันทึกข้อมูลไม่สำเร็จ"
        );
      }
    } else {
      Logger.log("Add:", form);
      //form.password = "password"; // กำหนดรหัสผ่านเริ่มต้น
      const result = await registerUser(form);
      if (result && result.message_code === "0") {
        BSAlertSwal2.show("success", result.message_text, {
          timer: 2000,
        });
        setOpen(false);
      } else {
        BSAlertSwal2.show(
          "error",
          result?.message_text || "บันทึกข้อมูลไม่สำเร็จ"
        );
      }
    }
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
          onEdit={handleOpenEdit}
          onAdd={handleOpenAdd}
        />
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Row 1 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label="User ID"
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                required
                disabled={editMode}
              />
              <TextField
                label="Password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                disabled={editMode}
                type={showPassword ? "text" : "password"}
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Box>
            {/* Row 2 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </Box>
            {/* Row 3 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="select"
                  bsTitle="Select Group *"
                  bsPreObj="sec.t_com_"
                  bsObj="user_group"
                  bsColumes={[
                    {
                      field: "user_group_id",
                      display: false,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "name",
                      display: true,
                      filter: true,
                      key: false,
                    },
                  ]}
                  bsObjBy=""
                  bsObjWh="is_active='YES'"
                  cacheKey="group_name"
                  //bsLoadOnOpen={true}
                  bsOnChange={(val) => handleGroupChange(val)}
                  bsValue={selectedGroup}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="select"
                  bsTitle="Select Language *"
                  bsPreObj="sec.t_com_"
                  bsObj="combobox_item"
                  bsColumes={[
                    {
                      field: "display_member",
                      display: true,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "group_name",
                      display: false,
                      filter: false,
                      key: false,
                    },
                  ]}
                  bsObjBy=""
                  bsObjWh="group_name='locale_id'"
                  cacheKey="locale_id"
                  //bsLoadOnOpen={frue}
                  bsOnChange={(val) => handleChange("locale_id", val)}
                  bsValue={form.locale_id}
                />
              </Box>
            </Box>
            {/* Row 4 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={form.department}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Supervisor"
                name="supervisor"
                value={form.supervisor}
                onChange={handleChange}
              />
            </Box>
            {/* Row 5 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
              <TextField
                fullWidth
                label="Domain"
                name="domain"
                value={form.domain}
                onChange={handleChange}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                select
                label="Is Active"
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
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editMode ? "Save Changes" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserPage;
