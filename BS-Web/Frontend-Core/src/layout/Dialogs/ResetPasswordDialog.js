import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, IconButton, Input, InputAdornment, InputLabel, Typography } from "@mui/material";
import { useState } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { UserContext } from "../../contexts/UserContext";

const ResetPasswordDialog = ({ open, onClose, lang, currentUser, loading, setLoading }) => {
  const { newPassword } = UserContext();
  const [password, setPassword] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [errorPassword, setErrorPassword] = useState({
    new_password: {
      status: false,
      message: "",
    },
    confirm_password: {
      status: false,
      message: "",
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (pw) => {
    if (pw.length < 8) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"
            : "Password must be at least 8 characters long.",
      };
    } else if (pw.length > 20) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีความยาวไม่เกิน 20 ตัวอักษร"
            : "Password must not exceed 20 characters.",
      };
    } else if (!/[A-Z]/.test(pw)) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ อย่างน้อย 1 ตัว"
            : "Password must contain at least one uppercase letter.",
      };
    } else if (!/[a-z]/.test(pw)) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก อย่างน้อย 1 ตัว"
            : "Password must contain at least one lowercase letter.",
      };
    } else if (!/[0-9]/.test(pw)) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีตัวเลข อย่างน้อย 1 ตัว"
            : "Password must contain at least one number.",
      };
    } else if (!/[!@#$%^&*]/.test(pw)) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องมีอักขระพิเศษ อย่างน้อย 1 ตัว (!@#$%^&*)"
            : "Password must contain at least one special character (!@#$%^&*).",
      };
    } else if (/\s/.test(pw)) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องไม่มีช่องว่าง"
            : "Password must not contain spaces.",
      };
    } else if (
      pw.toLowerCase().includes(currentUser?.FirstName.toLowerCase()) ||
      pw.toLowerCase().includes(currentUser?.LastName.toLowerCase())
    ) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องไม่ประกอบด้วยชื่อหรือสกุลของคุณ"
            : "Password must not contain your first or last name.",
      };
      // } else if (pw.toLowerCase().includes(currentUser?.Email.toLowerCase()) && pw !== "@" ) {
      //   return { status: true, message: lang === "th" ? 'รหัสผ่านต้องไม่ประกอบด้วยอีเมลของคุณ' : 'Password must not contain your email.' };
    } else if (
      pw.toLowerCase().includes("1234") ||
      pw.toLowerCase().includes("abcd")
    ) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องไม่ประกอบด้วยลำดับตัวอักษรหรือตัวเลขที่ง่ายต่อการคาดเดา เช่น 1234 หรือ abcd"
            : "Password must not contain easily guessable sequences like 1234 or abcd.",
      };
    } else if (
      pw.toLowerCase() === "password" ||
      pw.toLowerCase() === "qwerty" ||
      pw.toLowerCase() === "letmein"
    ) {
      return {
        status: true,
        message:
          lang === "th"
            ? "รหัสผ่านต้องไม่ใช่รหัสผ่านที่ใช้บ่อยหรือคาดเดาได้ง่าย เช่น password, qwerty, letmein"
            : "Password must not be a commonly used or easily guessable password like password, qwerty, letmein.",
      };
    } else if (pw.length === 0) {
      return {
        status: true,
        message:
          lang === "th" ? "กรุณากรอกรหัสผ่าน" : "Please enter a password.",
      };
    } else {
      return { status: false, message: "" };
    }
  };
  const onChangePassword = (e) => {
    let validate = validatePassword(e.target.value);
    if (validate.status) {
      setErrorPassword({ ...errorPassword, new_password: validate });
    } else {
      setErrorPassword({
        ...errorPassword,
        new_password: { status: false, message: "" },
      });
    }
    setPassword({ ...password, new_password: e.target.value });
  };
  const onChangeConfirmPassword = (e) => {
    let validate = validatePassword(password.new_password);
    if (validate.status) {
      setErrorPassword({ ...errorPassword, confirm_password: validate });
    } else if (password.new_password !== e.target.value) {
      setErrorPassword({
        ...errorPassword,
        confirm_password: {
          status: true,
          message:
            lang === "th" ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match.",
        },
      });
    } else {
      setErrorPassword({
        ...errorPassword,
        confirm_password: { status: false, message: "" },
      });
    }
    setPassword({ ...password, confirm_password: e.target.value });
  };

  const sendChangePassword = async () => {
    let validateNewPassword = validatePassword(password.new_password);
    let validateConfirmPassword = validatePassword(password.confirm_password);
    if (validateNewPassword.status) {
      setErrorPassword({ ...errorPassword, new_password: validateNewPassword });
    }
    if (
      validateConfirmPassword.status ||
      password.new_password !== password.confirm_password
    ) {
      setErrorPassword({
        ...errorPassword,
        confirm_password: validateConfirmPassword.status
          ? validateConfirmPassword
          : {
            status: true,
            message:
              lang === "th" ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match.",
          },
      });
    }
    if (
      !validateNewPassword.status &&
      !validateConfirmPassword.status &&
      password.new_password === password.confirm_password
    ) {
      setLoading(true);
      const res = await newPassword(password);
      console.log("res:", res);
      if (res?.message_code === 0 || res.message_code === "0") {
        BSAlertSwal2.show("success", lang === "th" ? "เปลี่ยนรหัสผ่านสำเร็จ" : "Password Changed Successfully", { timer: 3000 });
      } else {
        BSAlertSwal2.show("error", res.message_text || (lang === "th" ? "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" : "An error occurred while changing the password."));
      }
      setLoading(false);
      headleClose();
    }
  };

  const headleClose = () => {
    setPassword({
      new_password: "",
      confirm_password: "",
    });
    setErrorPassword({
      new_password: {
        status: false,
        message: "",
      },
      confirm_password: {
        status: false,
        message: "",
      },
    });
    onClose();
  }
  return (
    <Dialog
      open={open}
      onClose={headleClose}
      maxWidth="sm"
      fullWidth
    >
      {/* เนื้อหาของ Popup Reset Password จะอยู่ที่นี่ */}
      <DialogTitle>
        {lang === "th" ? "เปลี่ยนรหัสผ่าน" : "Reset Password"}
      </DialogTitle>
      <DialogContent>
        {/* ใส่ฟอร์มเปลี่ยนรหัสผ่านที่นี่ */}
        <Typography variant="body2" color="text.secondary">
          {lang === "th"
            ? "กรุณากรอกรหัสผ่านใหม่ของคุณด้านล่าง"
            : "Please enter your new password below."}
        </Typography>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel htmlFor="n
            ew-password">
            {lang === "th" ? "รหัสผ่านใหม่" : "New Password"}
          </InputLabel>
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password.new_password}
            onChange={(e) => onChangePassword(e)}
            label={lang === "th" ? "รหัสผ่านใหม่" : "New Password"}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
          {errorPassword.new_password.status && (
            <FormHelperText sx={{ color: "red" }}>
              {errorPassword.new_password.message}
            </FormHelperText>
          )}
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel htmlFor="confirm-password">
            {lang === "th" ? "ยืนยันรหัสผ่านใหม่" : "Confirm New Password"}
          </InputLabel>
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={password.confirm_password}
            onChange={(e) => onChangeConfirmPassword(e)}
            label={
              lang === "th" ? "ยืนยันรหัสผ่านใหม่" : "Confirm New Password"
            }
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
          {errorPassword.confirm_password.status && (
            <FormHelperText sx={{ color: "red" }}>
              {errorPassword.confirm_password.message}
            </FormHelperText>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={headleClose}
          color="primary"
        >
          {lang === "th" ? "ยกเลิก" : "Cancel"}
        </Button>
        <Button
          onClick={sendChangePassword}
          color="primary"
          variant="contained"
        >
          {lang === "th" ? "บันทึก" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>);
};
export default ResetPasswordDialog;