import { useState, useRef, useEffect } from "react";
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
import { UserContext } from "../../contexts/UserContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useResource } from "../../hooks/useResource";

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
  is_active: "YES",
  password: "",
};

const UserPage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);
  const { registerUser, updateUser, deleteUser, resetPassword } = UserContext();
  const [emailError, setEmailError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectLocale, setSelectLocale] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPopupResetPasswordOpen, setIsPopupResetPasswordOpen] =
    useState(false);
  const gridRef = useRef();
  const [newPassword, setNewPassword] = useState("");
  const [openPwDialog, setOpenPwDialog] = useState(false);

  // โหลด resource ของ group "User"
  const getLang = async () => {
    try {
      const res = await getResources("User");
      setResourceData(res);
      console.log("Loaded User resources:", res);
    } catch (error) {
      console.error("getResources(User) error:", error);
    }
  };

  useEffect(() => {
    setLocale_id(props.lang || "en");
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const handleOpenAdd = () => {
    setForm(initialForm);
    setSelectedGroup("");
    setSelectLocale("");
    setEditMode(false);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setForm({
      ...row,
      [row.name]: (row.val ?? "").toString(),
    });
    setSelectedGroup(row.user_group_id || "");
    setSelectLocale(row.locale_id || "");
    setEditMode(true);
    setOpen(true);
  };

  const handleOpenDelete = async (row) => {
    const result = await deleteUser(row);
    if (result && String(result.message_code) === "0") {
      BSAlertSwal2.show("success", result.message_text, { timer: 2000 });
    } else {
      BSAlertSwal2.show(
        "error",
        result?.message_text ||
          getResource(resourceData, "SaveFailed") ||
          "Save failed"
      );
    }
  };

  const handleClose = () => setOpen(false);
  const handleResetPass = () => setIsPopupResetPasswordOpen(true);

  const handleChange = (eOrName, value) => {
    let name, val;

    if (eOrName?.target) {
      name = eOrName.target.name;
      val = eOrName.target.value;
    } else {
      if (eOrName === "user_group_id") {
        name = eOrName;
        val = value?.user_group_id ?? null;
      } else if (eOrName === "locale_id") {
        name = eOrName;
        val = value?.value ?? null;
      }
    }

    setForm({ ...form, [name]: val });

    if (name === "email_address") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(
        val && !emailPattern.test(val)
          ? getResource(resourceData, "InvalidEmail") || "Invalid email address"
          : ""
      );
    }
  };

  const handleGroupChange = (val) => {
    setSelectedGroup(val);
    setForm({ ...form, user_group_id: val });
  };

  const handleLocaleChange = (val) => {
    setSelectLocale(val);
    setForm({ ...form, locale_id: val });
  };

  const handleSave = async () => {
    if (
      !form.user_id ||
      !form.user_group_id ||
      !form.first_name ||
      !form.last_name ||
      !form.locale_id ||
      !form.is_active
    ) {
      BSAlertSwal2.show(
        "warning",
        getResource(resourceData, "FillRequiredFields") ||
          "Please fill all required fields."
      );
      return;
    }

    let result;
    if (editMode) {
      result = await updateUser(form);
    } else {
      result = await registerUser(form);
    }

    if (result && String(result.message_code) === "0") {
      BSAlertSwal2.show("success", result.message_text, { timer: 2000 });
      setOpen(false);
      gridRef.current?.refreshData();
    } else {
      BSAlertSwal2.show(
        "error",
        result?.message_text ||
          getResource(resourceData, "SaveFailed") ||
          "Save failed"
      );
    }
  };

  const sendChangePassword = async () => {
    setIsPopupResetPasswordOpen(false);
    const result = await resetPassword(form.user_id);

    if (result && String(result.message_code) === "0") {
      setNewPassword(result.message_text);
      setOpenPwDialog(true);
    } else {
      BSAlertSwal2.show(
        "error",
        result?.message_text ||
          getResource(resourceData, "SaveFailed") ||
          "Save failed"
      );
    }
  };

  const handleCopy = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // HTTPS / secure context
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("Copied to clipboard!");
        })
        .catch(() => fallbackCopy(text));
    } else {
      // HTTP / insecure context
      fallbackCopy(text);
    }
  };

  const fallbackCopy = async (text) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;

      // ต้องกำหนด style แบบนี้เพื่อให้ Chrome/Edge ยอม copy
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      // ปล่อยให้ DOM attach ก่อน
      await new Promise((r) => setTimeout(r, 0));

      textarea.focus();
      textarea.select();

      const success = document.execCommand("copy");

      document.body.removeChild(textarea);

      alert(success ? "Copied OK!" : "Copy failed");
    } catch (err) {
      alert("Copy error: " + err);
    }
  };

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="v_com_user"
          bsCols="user_id,group_name,first_name,last_name,department,email_address,supervisor,locale_id,is_active,create_by,create_date,update_by,update_date,user_group_id"
          bsObjBy="user_id asc"
          bsComboBox={[
            {
              Column: "group_name",
              Display: "name",
              Value: "name",
              Default:
                getResource(resourceData, "SelectUserGroup") ||
                "--- Select User Group ---",
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
          onDelete={handleOpenDelete}
          bsKeyId="user_id"
        />
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode
            ? getResource(resourceData, "EditUser") || "Edit User"
            : getResource(resourceData, "AddUser") || "Add User"}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Row 1 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label={getResource(resourceData, "UserID")}
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                required
                disabled={editMode}
              />
              <TextField
                label={getResource(resourceData, "Password")}
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
                label={getResource(resourceData, "FirstName")}
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
                  bsTitle={getResource(resourceData, "SelectUserGroup")}
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
                  bsOnChange={(val) => handleGroupChange(val.user_group_id)}
                  bsValue={selectedGroup}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="select"
                  bsTitle={getResource(resourceData, "SelectLanguage")}
                  bsPreObj="sec.t_com_"
                  bsObj="combobox_item"
                  bsColumes={[
                    {
                      field: "value_member",
                      display: false,
                      filter: false,
                      key: true,
                    },
                    {
                      field: "display_member",
                      display: true,
                      filter: false,
                      key: false,
                    },
                  ]}
                  bsObjBy=""
                  bsObjWh="group_name='locale_id'"
                  cacheKey="locale_id"
                  //bsLoadOnOpen={frue}
                  bsOnChange={(val) => handleLocaleChange(val.code)}
                  bsValue={selectLocale}
                />
              </Box>
            </Box>
            {/* Row 4 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label={getResource(resourceData, "Department")}
                name="department"
                value={form.department}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label={getResource(resourceData, "Supervisor")}
                name="supervisor"
                value={form.supervisor}
                onChange={handleChange}
              />
            </Box>
            {/* Row 5 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label={getResource(resourceData, "EmailAddress")}
                name="email_address"
                value={form.email_address}
                onChange={handleChange}
                type="email"
                error={!!emailError}
                helperText={emailError}
              />
              <TextField
                fullWidth
                label={getResource(resourceData, "Domain")}
                name="domain"
                value={form.domain}
                onChange={handleChange}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                select
                label={getResource(resourceData, "IsActive")}
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
        <DialogActions
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
          <Button onClick={handleResetPass} variant="contained" color="error">
            {getResource(resourceData, "ResetPassword") || "Reset Password"}
          </Button>
          <Box>
            <Button onClick={handleClose} sx={{ mr: 1 }}>
              {getResource(resourceData, "Cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              {editMode
                ? getResource(resourceData, "SaveChanges") || "Save Changes"
                : getResource(resourceData, "Add") || "Add"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Reset Password Popup */}
      <Dialog
        open={isPopupResetPasswordOpen}
        onClose={() => setIsPopupResetPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {getResource(resourceData, "ResetPassword") || "Reset Password"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {getResource(resourceData, "ConfirmResetPassword") ||
              "Confirm resetting the user's password."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsPopupResetPasswordOpen(false)}
            color="primary"
          >
            {getResource(resourceData, "Cancel") || "Cancel"}
          </Button>
          <Button
            onClick={sendChangePassword}
            color="primary"
            variant="contained"
          >
            {getResource(resourceData, "Confirm") || "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Password Popup */}
      <Dialog
        open={openPwDialog}
        onClose={() => setOpenPwDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, padding: 2, minWidth: 350 } }}
      >
        <DialogTitle
          sx={{ fontWeight: "bold", textAlign: "center", fontSize: "1.3rem" }}
        >
          {getResource(resourceData, "NewPassword") || "New Password"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={newPassword}
            InputProps={{
              readOnly: true,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", paddingBottom: 2 }}>
          {/* <Button
            variant="contained"
            color="primary"
            onClick={() => handleCopy(newPassword)}
            style={{ visibility: "hidden" }}
          >
            Copy
          </Button> */}
          <Button variant="outlined" onClick={() => setOpenPwDialog(false)}>
            {getResource(resourceData, "Close") || "Close"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserPage;
