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
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import { useOutletContext } from "react-router-dom";

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
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const { getResourceByGroupAndName } = useResource();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);
  const { registerUser, updateUser, deleteUser, resetPassword } = UserContext();
  const [emailError, setEmailError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectLocale, setSelectLocale] = useState("");
  const [selectSupervisor, setSelectSupervisor] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPopupResetPasswordOpen, setIsPopupResetPasswordOpen] =
    useState(false);
  const gridRef = useRef();
  const [newPassword, setNewPassword] = useState("");
  const [openPwDialog, setOpenPwDialog] = useState(false);

  

  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Helper to produce a readable label for a field key.
  const humanize = (key) => {
    if (!key) return "";
    return key
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => {
        if (!w) return "";
        const up = w.toUpperCase();
        if (up === "ID") return "ID";
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  };

  const getLabelText = (key) => getResourceByGroupAndName("t_com_user", key, locale_id)?.resource_description || humanize(key);

  const handleOpenAdd = () => {
    setForm(initialForm);
    setSelectedGroup("");
    setSelectLocale("");
    setSelectSupervisor("");
    setEditMode(false);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setForm({
      ...row,
      [row.name]: row.val === null ? "" : row.val,
    });

    setSelectedGroup(row.user_group_id || "");
    setSelectLocale(row.locale_id || "");
    setSelectSupervisor(row.supervisor || "");

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
        getResourceByGroupAndName("t_com_user", "SaveFailed", locale_id) ||
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
      val = eOrName.target.value ?? "";
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
          ? getResourceByGroupAndName("t_com_user", "InvalidEmail", locale_id)?.resource_value || "Invalid email address"
          : ""
      );
    }
  };

  const handleGroupChange = (val) => {
    setForm({ ...form, user_group_id: val?.user_group_id ?? "" });
  };

  const handleLocaleChange = (val) => {
    setForm({ ...form, locale_id: val?.code ?? "" });
  };

  const handleSupervisorChange = (val) => {
    setForm({ ...form, supervisor: val?.code ?? "" });
  };

  const handleSave = async () => {
    // Validate required fields and collect any missing ones
    const requiredKeys = [
      "user_id",
      "user_group_id",
      "first_name",
      "last_name",
      "locale_id",
      "is_active",
    ];

    const missing = requiredKeys.filter((k) => {
      const v = form[k];
      return v === null || v === undefined || String(v).trim() === "";
    });

    if (missing.length > 0) {
      const labels = missing.map((k) => getLabelText(k));
      const baseMsg =
        getResourceByGroupAndName("t_com_user", "FillRequiredFields", locale_id)?.resource_value ||
        "Please fill all required fields.";
      BSAlertSwal2.show("warning", `${baseMsg} (${labels.join(", ")})`);
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
        getResourceByGroupAndName("t_com_user", "SaveFailed", locale_id)?.resource_value ||
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
        getResourceByGroupAndName("t_com_user", "SaveFailed", locale_id)?.resource_value ||
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
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={gridRef}
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
          domain,
          is_active,
          create_by,
          create_date,
          update_by,
          update_date,
          user_group_id"
          bsObjBy="user_id asc"
          bsComboBox={[
            {
              Column: "group_name",
              Display: "name",
              Value: "name",
              Default:
                getResourceByGroupAndName("t_com_user", "SelectUserGroup", locale_id)?.resource_value ||
                "--- Select User Group ---",
              PreObj: "sec",
              Obj: "t_com_user_group",
              ObjWh: "is_active='YES'",
              ObjBy: "name asc",
            },
          ]}
          bsShowDescColumn={false}
          onEdit={handleOpenEdit}
          onAdd={handleOpenAdd}
          onDelete={handleOpenDelete}
          bsKeyId="user_id"
          bsColumnDefs={{
            field: "user_group_id",
            hide: true,
          }}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
        />
      </Paper>

      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          handleClose();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode
            ? getResourceByGroupAndName("t_com_user", "EditUser", locale_id)?.resource_value || "Edit User"
            : getResourceByGroupAndName("t_com_user", "AddUser", locale_id)?.resource_value || "Add User"}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Row 1 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                sx={{ flex: 1 }}
                label={getResourceByGroupAndName("t_com_user", "user_id", locale_id)?.resource_value || "User ID"}
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                required
                disabled={editMode}
              />
              <TextField
                label={getResourceByGroupAndName("t_com_user", "password", locale_id)?.resource_value || "Password"}
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
                label={getResourceByGroupAndName("t_com_user", "first_name", locale_id)?.resource_value || "First Name"}
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label={getResourceByGroupAndName("t_com_user", "last_name", locale_id)?.resource_value || "Last Name"}
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
                  bsMode="single"
                  bsTitle={getResourceByGroupAndName("t_com_user", "user_group_id", locale_id)?.resource_value || "User Group"}
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
                  bsOnChange={(val) => {
                    handleGroupChange(val);
                  }}
                  bsValue={form.user_group_id}
                  required={true}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="single"
                  bsTitle={getResourceByGroupAndName("t_com_user", "locale_id", locale_id)?.resource_value || "Locale ID"}
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
                    }
                  ]}
                  bsObjBy=""
                  bsObjWh="group_name='locale_id'"
                  cacheKey="locale_id"
                  //bsLoadOnOpen={frue}
                  bsOnChange={(val) => handleLocaleChange(val)}
                  bsValue={form.locale_id}
                  required={true}
                />
              </Box>
            </Box>
            {/* Row 4 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label={getResourceByGroupAndName("t_com_user", "department", locale_id)?.resource_value || "Department"}
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="single"
                  bsTitle={getResourceByGroupAndName("t_com_user", "supervisor", locale_id)?.resource_value || "Supervisor"}
                  bsPreObj="sec.t_com_"
                  bsObj="user"
                  bsColumes={[
                    {
                      field: "user_id",
                      display: true,
                      filter: false,
                      key: true,
                    },
                  ]}
                  bsObjBy=""
                  bsObjWh={`user_id<>'${form.user_id}'`}
                  bsCacheKey="supervisor"
                  //bsLoadOnOpen={frue}
                  bsOnChange={(val) =>
                    handleSupervisorChange(val?.user_id ?? "")
                  }
                  bsValue={form.supervisor}
                />
              </Box>
            </Box>
            {/* Row 5 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label={getResourceByGroupAndName("t_com_user", "email_address", locale_id)?.resource_value || "Email Address"}
                name="email_address"
                value={form.email_address}
                onChange={handleChange}
                type="email"
                error={!!emailError}
                helperText={emailError}
              />
              <TextField
                fullWidth
                label={getResourceByGroupAndName("t_com_user", "domain", locale_id)?.resource_value || "Domain"}
                name="domain"
                value={form.domain}
                onChange={handleChange}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                select
                label={getResourceByGroupAndName("t_com_user", "is_active", locale_id)?.resource_value || "Is Active"}
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
          sx={editMode && { display: "flex", justifyContent: "space-between" }}
        >
          {editMode && (
            <Button onClick={handleResetPass} variant="contained" color="error">
              {getResourceByGroupAndName("t_com_user", "ResetPassword", locale_id)?.resource_value || "Reset Password"}
            </Button>
          )}
          <Box>
            <BSCloseOutlinedButton onClick={handleClose}>
              {getResourceByGroupAndName("t_com_user", "Cancel", locale_id)?.resource_value || "Cancel"}
            </BSCloseOutlinedButton>

            <BSSaveOutlinedButton onClick={handleSave}>
              {editMode
                ? getResourceByGroupAndName("t_com_user", "SaveChanges", locale_id)?.resource_value || "Save Changes"
                : getResourceByGroupAndName("t_com_user", "Add", locale_id)?.resource_value || "Add"}
            </BSSaveOutlinedButton>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Reset Password Popup */}
      <Dialog
        open={isPopupResetPasswordOpen}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          setIsPopupResetPasswordOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {getResourceByGroupAndName("t_com_user", "ResetPassword", locale_id)?.resource_value || "Reset Password"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {getResourceByGroupAndName("t_com_user", "ConfirmResetPassword", locale_id)?.resource_value ||
              "Confirm resetting the user's password."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsPopupResetPasswordOpen(false)}
            color="primary"
          >
            {getResourceByGroupAndName("t_com_user", "Cancel", locale_id)?.resource_value || "Cancel"}
          </Button>
          <Button
            onClick={sendChangePassword}
            color="primary"
            variant="contained"
          >
            {getResourceByGroupAndName("t_com_user", "Confirm", locale_id)?.resource_value || "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Password Popup */}
      <Dialog
        open={openPwDialog}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          setOpenPwDialog(false);
        }}
        PaperProps={{ sx: { borderRadius: 3, padding: 2, minWidth: 350 } }}
      >
        <DialogTitle
          sx={{ fontWeight: "bold", textAlign: "center", fontSize: "1.3rem" }}
        >
          {getResourceByGroupAndName("t_com_user", "NewPassword", locale_id)?.resource_value || "New Password"}
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
            {getResourceByGroupAndName("t_com_user", "Close", locale_id)?.resource_value || "Close"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserPage;
