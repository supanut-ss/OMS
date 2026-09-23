import { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSTextField from "../../components/BSTextField";
import BsAutoComplete from "../../components/BSAutoComplete";
import { UserContext } from "../../contexts/UserContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useResource } from "../../hooks/useResource";
import BSCloseOutlinedButton from "../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../components/Button/BSSaveOutlinedButton";
import { useOutletContext } from "react-router-dom";
import { ButtonConfigs } from "../../utils/ButtonConfigs";
const activeOptions = [
  { value: true, label: "YES" },
  { value: false, label: "NO" },
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
  is_active: true,
  password: "",
  location: "",
};

const USER_GROUP_COLUMNS = [
  { field: "user_group_id", display: false, filter: false, key: true },
  { field: "name", display: true, filter: true, key: false },
];

const LOCALE_COLUMNS = [
  { field: "value_member", display: false, filter: false, key: true },
  { field: "display_member", display: true, filter: false, key: false },
];

const SUPERVISOR_COLUMNS = [
  { field: "user_id", display: true, filter: false, key: true },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

const normalizeIsActive = (value) => {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  const normalized = String(value).toUpperCase();
  return normalized === "YES" || normalized === "TRUE";
};

const UserPage = (props) => {
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const { getResourceByGroupAndName } = useResource();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);
  const { registerUser, updateUser, deleteUser, resetPassword } = UserContext();
  const [emailError, setEmailError] = useState("");
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

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const val = form.email_address || "";
      setEmailError(
        val && !EMAIL_PATTERN.test(val)
          ? getResourceByGroupAndName("t_com_user", "InvalidEmail", locale_id)
              ?.resource_value || "Invalid email address"
          : "",
      );
    }, 220);

    return () => clearTimeout(timer);
  }, [form.email_address, getResourceByGroupAndName, locale_id, open]);

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

  const getLabelText = (key) =>
    getResourceByGroupAndName("t_com_user", key, locale_id)
      ?.resource_description || humanize(key);

  const labels = useMemo(
    () => ({
      user_id:
        getResourceByGroupAndName("t_com_user", "user_id", locale_id)
          ?.resource_value || "User ID",
      password:
        getResourceByGroupAndName("t_com_user", "password", locale_id)
          ?.resource_value || "Password",
      first_name:
        getResourceByGroupAndName("t_com_user", "first_name", locale_id)
          ?.resource_value || "First Name",
      last_name:
        getResourceByGroupAndName("t_com_user", "last_name", locale_id)
          ?.resource_value || "Last Name",
      user_group_id:
        getResourceByGroupAndName("t_com_user", "user_group_id", locale_id)
          ?.resource_value || "User Group",
      locale_id:
        getResourceByGroupAndName("t_com_user", "locale_id", locale_id)
          ?.resource_value || "Locale ID",
      department:
        getResourceByGroupAndName("t_com_user", "department", locale_id)
          ?.resource_value || "Department",
      supervisor:
        getResourceByGroupAndName("t_com_user", "supervisor", locale_id)
          ?.resource_value || "Supervisor",
      email_address:
        getResourceByGroupAndName("t_com_user", "email_address", locale_id)
          ?.resource_value || "Email Address",
      domain:
        getResourceByGroupAndName("t_com_user", "domain", locale_id)
          ?.resource_value || "Domain",
      is_active:
        getResourceByGroupAndName("t_com_user", "is_active", locale_id)
          ?.resource_value || "Is Active",
      EditUser:
        getResourceByGroupAndName("t_com_user", "EditUser", locale_id)
          ?.resource_value || "Edit User",
      AddUser:
        getResourceByGroupAndName("t_com_user", "AddUser", locale_id)
          ?.resource_value || "Add User",
      SaveFailed:
        getResourceByGroupAndName("t_com_user", "SaveFailed", locale_id)
          ?.resource_value || "Save failed",
      ResetPassword:
        getResourceByGroupAndName("t_com_user", "ResetPassword", locale_id)
          ?.resource_value || "Reset Password",
      Cancel:
        getResourceByGroupAndName("t_com_user", "Cancel", locale_id)
          ?.resource_value || "Cancel",
      SaveChanges:
        getResourceByGroupAndName("t_com_user", "SaveChanges", locale_id)
          ?.resource_value || "Save Changes",
      Add:
        getResourceByGroupAndName("t_com_user", "Add", locale_id)
          ?.resource_value || "Add",
      Confirm:
        getResourceByGroupAndName("t_com_user", "Confirm", locale_id)
          ?.resource_value || "Confirm",
      ConfirmResetPassword:
        getResourceByGroupAndName(
          "t_com_user",
          "ConfirmResetPassword",
          locale_id,
        )?.resource_value || "Confirm resetting the user's password.",
      NewPassword:
        getResourceByGroupAndName("t_com_user", "NewPassword", locale_id)
          ?.resource_value || "New Password",
      Close:
        getResourceByGroupAndName("t_com_user", "Close", locale_id)
          ?.resource_value || "Close",
      FillRequiredFields:
        getResourceByGroupAndName("t_com_user", "FillRequiredFields", locale_id)
          ?.resource_value || "Please fill all required fields.",
      SelectUserGroup:
        getResourceByGroupAndName("t_com_user", "SelectUserGroup", locale_id)
          ?.resource_value || "--- Select User Group ---",
      InvalidEmail:
        getResourceByGroupAndName("t_com_user", "InvalidEmail", locale_id)
          ?.resource_value || "Invalid email address",
    }),
    [getResourceByGroupAndName, locale_id],
  );

  const gridComboOptions = useMemo(
    () => [
      {
        Column: "group_name",
        Display: "name",
        Value: "name",
        Default: labels.SelectUserGroup,
        PreObj: "sec",
        Obj: "t_com_user_group",
        ObjWh: "is_active=1",
        ObjBy: "name asc",
      },
    ],
    [labels.SelectUserGroup],
  );

  const handleOpenAdd = () => {
    setForm(initialForm);
    setEditMode(false);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    const rawActive = row.is_active;
    const normalizedActive =
      rawActive === true ||
      rawActive === 1 ||
      String(rawActive).toUpperCase() === "YES" ||
      String(rawActive).toUpperCase() === "TRUE";

    setForm({
      ...row,
      [row.name]: row.val === null ? "" : row.val,
      is_active: normalizedActive,
    });

    setEditMode(true);
    setOpen(true);
  };

  const handleOpenDelete = async (row) => {
    const result = await deleteUser(row);
    if (result && String(result.message_code) === "0") {
      BSAlertSwal2.show("success", result.message_text, { timer: 2000 });
    } else {
      BSAlertSwal2.show("error", result?.message_text || labels.SaveFailed);
    }
  };

  const handleClose = () => setOpen(false);
  const handleResetPass = () => setIsPopupResetPasswordOpen(true);

  const handleChange = (eOrName, value) => {
    let name;
    let val;

    if (eOrName?.target) {
      name = eOrName.target.name;
      val = eOrName.target.value ?? "";
    } else if (typeof eOrName === "string") {
      name = eOrName;
      val = value ?? "";
    }

    if (!name) return;

    if (name === "user_id") {
      val = String(val).replace(/[^A-Za-z0-9_.-]/g, "");
    }

    if (name === "is_active") {
      val = normalizeIsActive(val);
    }

    setForm((prev) => ({ ...prev, [name]: val }));
  };
  const handleGroupChange = (val) => {
    setForm((prev) => ({ ...prev, user_group_id: val?.user_group_id ?? "" }));
  };

  const handleLocaleChange = (val) => {
    setForm((prev) => ({ ...prev, locale_id: val?.code ?? "" }));
  };

  const handleSupervisorChange = (val) => {
    setForm((prev) => ({ ...prev, supervisor: val?.code ?? "" }));
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
      const missingLabels = missing.map((k) => getLabelText(k));
      const baseMsg = labels.FillRequiredFields;
      BSAlertSwal2.show("warning", `${baseMsg} (${missingLabels.join(", ")})`);
      return;
    }

    if (!USERNAME_PATTERN.test(String(form.user_id || ""))) {
      BSAlertSwal2.show(
        "warning",
        "Username can only contain A-Z, a-z, 0-9, _, -, and .",
      );
      return;
    }

    let result;
    const payload = {
      ...form,
      is_active: normalizeIsActive(form.is_active),
    };

    if (editMode) {
      result = await updateUser(payload);
    } else {
      result = await registerUser(payload);
    }

    if (result && String(result.message_code) === "0") {
      BSAlertSwal2.show("success", result.message_text, { timer: 2000 });
      setOpen(false);
      gridRef.current?.refreshData();
    } else {
      BSAlertSwal2.show("error", result?.message_text || labels.SaveFailed);
    }
  };

  const sendChangePassword = async () => {
    setIsPopupResetPasswordOpen(false);
    const result = await resetPassword(form.user_id);

    if (result && String(result.message_code) === "0") {
      setNewPassword(result.message_text);
      setOpenPwDialog(true);
    } else {
      BSAlertSwal2.show("error", result?.message_text || labels.SaveFailed);
    }
  };

  return (
    <>
      <Paper
        sx={{
          p: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
          bsComboBox={gridComboOptions}
          bsShowDescColumn={false}
          onEdit={handleOpenEdit}
          onAdd={handleOpenAdd}
          onDelete={handleOpenDelete}
          bsKeyId="user_id"
          bsColumnDefs={[
            {
              field: "user_group_id",
              hide: true,
            },
          ]}
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
        <DialogTitle>{editMode ? labels.EditUser : labels.AddUser}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Row 1 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <BSTextField
                sx={{ flex: 1 }}
                label={labels.user_id}
                name="user_id"
                value={form.user_id}
                onChange={(val) => handleChange("user_id", val)}
                required
                disabled={editMode}
                inputProps={{
                  maxLength: 50,
                }}
              />
              <BSTextField
                label={labels.password}
                name="password"
                value={form.password}
                onChange={(val) => handleChange("password", val)}
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
              <BSTextField
                fullWidth
                label={labels.first_name}
                name="first_name"
                value={form.first_name}
                onChange={(val) => handleChange("first_name", val)}
                required
              />
              <BSTextField
                fullWidth
                label={labels.last_name}
                name="last_name"
                value={form.last_name}
                onChange={(val) => handleChange("last_name", val)}
                required
              />
            </Box>
            {/* Row 3 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="single"
                  bsTitle={labels.user_group_id}
                  bsPreObj="sec"
                  bsObj="t_com_user_group"
                  bsColumes={USER_GROUP_COLUMNS}
                  bsObjBy=""
                  bsObjWh="is_active=1"
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
                  bsMode="select"
                  bsTitle={labels.locale_id}
                  bsPreObj="sec"
                  bsObj="t_com_combobox_item"
                  bsColumes={LOCALE_COLUMNS}
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
                <BSTextField
                  fullWidth
                  label={labels.department}
                  name="department"
                  value={form.department}
                  onChange={(val) => handleChange("department", val)}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <BsAutoComplete
                  bsMode="single"
                  bsTitle={labels.supervisor}
                  bsPreObj="sec"
                  bsObj="t_com_user"
                  bsColumes={SUPERVISOR_COLUMNS}
                  bsObjBy=""
                  bsObjWh={`user_id<>'${form.user_id}'`}
                  bsCacheKey="supervisor"
                  bsOnChange={(val) => handleSupervisorChange(val)}
                  bsValue={form.supervisor}
                />
              </Box>
            </Box>
            {/* Row 5 */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <BSTextField
                fullWidth
                label={labels.email_address}
                name="email_address"
                value={form.email_address}
                onChange={(val) => handleChange("email_address", val)}
                type="email"
                error={!!emailError}
                helperText={emailError}
              />
              <BSTextField
                fullWidth
                label={labels.domain}
                name="domain"
                value={form.domain}
                onChange={(val) => handleChange("domain", val)}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <BSTextField
                fullWidth
                select
                label={labels.is_active}
                name="is_active"
                value={form.is_active}
                onChange={(val) => handleChange("is_active", val)}
                required
              >
                {activeOptions.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </BSTextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={editMode && { display: "flex", justifyContent: "space-between" }}
        >
          {editMode && (
            <Button
              onClick={handleResetPass}
              variant="contained"
              color="error"
              sx={ACTION_BUTTON_THEMES.error}
            >
              {labels.ResetPassword}
            </Button>
          )}
          <Box>
            <BSCloseOutlinedButton onClick={handleClose}>
              {labels.Cancel}
            </BSCloseOutlinedButton>

            <BSSaveOutlinedButton onClick={handleSave} sx={{ ml: 1 }}>
              {labels.SaveChanges /* } {editMode ?  : labels.Add} */}
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
        <DialogTitle>{labels.ResetPassword}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {labels.ConfirmResetPassword}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsPopupResetPasswordOpen(false)}
            color="primary"
          >
            {labels.Cancel}
          </Button>
          <Button
            onClick={sendChangePassword}
            color="primary"
            variant="contained"
          >
            {labels.Confirm}
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
          {labels.NewPassword}
        </DialogTitle>
        <DialogContent>
          <BSTextField
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
            {labels.Close}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserPage;
