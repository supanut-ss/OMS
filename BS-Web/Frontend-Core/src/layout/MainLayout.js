/* eslint-disable no-undef */
import CustomBreadcrumbs from "../components/CustomBreadcrumbs";
import { useEffect, useState, useRef } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  // Badge,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  FormHelperText,
  Input,
  InputAdornment,
  ListItemAvatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Notifications as NotificationsIcon,
  // Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import { Outlet, useLocation } from "react-router-dom";
import { useColorMode } from "../themes/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

import { styled } from "@mui/material/styles";
//import logoMiniSvg from "../assets/logo.jpg";
import logoHorizontalSvg from "../assets/logo.svg";
import SidebarMenu from "./SidebarMenu";
import TopLinearProgress from "../components/TopLinearProgress";
import SecureStorage from "../utils/SecureStorage";
import BSAlertSwal2 from "../components/BSAlertSwal2";
import Config from "../utils/Config";
import AxiosMaster from "../utils/AxiosMaster";
import LanguageSwitch from "../components/LanguageSwitch";
import * as signalR from "@microsoft/signalr";
import { useNotifications } from "../contexts/NotificationsProvider";
import secureStorage from "../utils/SecureStorage";
const drawerWidth = 280;
const collapsedWidth = 72;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,

  borderRadius: "unset !importent",
});

const closedMixin = (theme) => ({
  width: collapsedWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
});

const DrawerHeader = styled("div")(({ theme }) => ({
  borderRadius: "unset",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export default function MainLayout({ lang, onChangeLang }) {
  const theme = useTheme();
  const { toggleColorMode, mode } = useColorMode();
  const { logout } = useAuth();
  const location = useLocation();

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [open, setOpen] = useState(!isMobile);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // State สำหรับควบคุมการโชว์พาสเวิร์ด
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // const navigate = useNavigate();
  //const apiUrl = Config.API_URL;
  const apiUrl = Config.API_NOTIFY;
  const { enqueue, enqueueAlarm } = useNotifications();
  // ตรวจสอบว่าเป็นหน้า dashboard (home) หรือไม่
  const isDashboard =
    location.pathname === "/" || location.pathname === "/home";

  // Mock data สำหรับ notifications
  const notifications = [
    { id: 1, title: "งานใหม่ถูกมอบหมาย", time: "5 นาทีที่แล้ว", unread: true },
    {
      id: 2,
      title: "รายงานประจำสัปดาห์พร้อม",
      time: "1 ชั่วโมงที่แล้ว",
      unread: true,
    },
    {
      id: 3,
      title: "ระบบจะปิดปรับปรุงในคืนนี้",
      time: "3 ชั่วโมงที่แล้ว",
      unread: false,
    },
  ];

  // Mock user data - ในอนาคตใช้ข้อมูลจาก useAuth แทน
  const [role, setRole] = useState("User");
  const [currentUser, setCurrentUser] = useState(null);
  const connectionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPopupResetPasswordOpen, setIsPopupResetPasswordOpen] =
    useState(false);
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
  const handleResetPassword = () => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsPopupResetPasswordOpen(true);
    handleUserMenuClose();
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
      await AxiosMaster.post("/reset_password", password)
        .then((res) => {
          if (res.data.message_code === "0") {
            BSAlertSwal2.show("success", lang === "th" ? "เปลี่ยนรหัสผ่านสำเร็จ" : "Password Changed Successfully", { timer: 3000 });
          } else {
            BSAlertSwal2.show("error", res.data.message_text || (lang === "th" ? "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" : "An error occurred while changing the password."));
          }
          setIsPopupResetPasswordOpen(false);
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
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  const unreadCount = notifications.filter((n) => n.unread).length;

  const toggleDrawer = () => setOpen((prev) => !prev);

  // const handleNotificationClick = (event) => {
  //   setNotificationAnchor(event.currentTarget);
  // };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();

    // Ensure SignalR connection is stopped on logout
    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
        if (process.env.NODE_ENV !== "production") {
          console.info("SignalR disconnected on logout");
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("SignalR disconnect error on logout:", err);
        }
      } finally {
        connectionRef.current = null;
      }
    }

    // เรียกใช้ logout function จาก AuthContext
    let data = await logout();
    // Navigate ไปหน้า login
    if (data.status) {
      BSAlertSwal2.fire({
        icon: "success",
        title: "Logout Success",
        confirmButtonText: "OK",
      }).then((result) => {
        window.location.href = Config.BASE_URL + "/login";
      });
    } else {
      BSAlertSwal2.fire({
        icon: "warning",
        title: "Logout Failed",
        confirmButtonText: "OK",
      }).then((result) => {
        window.location.reload();
      });
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  useEffect(() => {
    if (
      SecureStorage.get("userInfo") !== null &&
      SecureStorage.get("userInfo") !== ""
    ) {
      setCurrentUser(SecureStorage.get("userInfo"));
      setRole(SecureStorage.get("role") ?? "User");
    } else {
      setCurrentUser();
      setRole("User");
    }
  }, [location]);
  useEffect(() => {
    if (!currentUser?.UserId) return;

    // If an existing connection is present, stop and clear it before creating a new one
    if (connectionRef.current) {
      connectionRef.current.stop().catch(() => { });
      connectionRef.current = null;
    }
    try {
      let builder = new signalR.HubConnectionBuilder()
        .withUrl(`${apiUrl}/notificationHub?userId=${encodeURIComponent(currentUser.UserId)}`, {
          accessTokenFactory: () => SecureStorage.get("token") || ""
        })
        .withAutomaticReconnect();

      // Disable SignalR logs in production, keep informative logs in development
      builder = builder.configureLogging(
        process.env.NODE_ENV === "production"
          ? signalR.LogLevel.None
          : signalR.LogLevel.Information
      );

      const connection = builder.build();

      connectionRef.current = connection;

      connection.on("ReceiveAll", (msg) => {
        console.log(msg);
        if (msg.userId === currentUser.UserId) return;

        if (msg.type === "alarm") {
          enqueueAlarm({
            title: msg.title,
            message: msg.message,
          });
        } else {
          enqueue({
            message: msg.message,
            severity: msg.type,
            duration: 3000,
          });
        }
      });

      connection.on("ReceiveUser", (msg) => {
        console.log(msg);
        if (msg.userId !== currentUser.UserId) return;

        if (msg.type === "alarm") {
          enqueueAlarm({
            title: msg.title,
            message: msg.message,
          });
        } else {
          enqueue({
            message: msg.message,
            severity: msg.type,
            duration: 3000,
          });
        }
      });


      connection.serverTimeoutInMilliseconds = 60000;
      connection.start().catch((err) => {
        // Only log start errors in non-production environments
        if (process.env.NODE_ENV !== "production") {
          console.error("SignalR connection error:", err);
        }
      });

      // Attach reconnect handlers but avoid logging in production
      connection.onreconnecting((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("SignalR reconnecting:", err);
        }
      });
      connection.onreconnected(() => {
        if (process.env.NODE_ENV !== "production") {
          console.info("SignalR reconnected");
        }
      });
    } catch (ex) {
      if (process.env.NODE_ENV !== "production") {
        console.error(ex);
      }
    }
    return () => {
      const conn = connectionRef.current;
      if (conn) {
        conn.onclose();
        conn.stop();
        connectionRef.current = null;
      }
    };
  }, [apiUrl, currentUser, enqueue]);
  console.log("MainLayout render Menu:", secureStorage.get("menu"));
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <CssBaseline />
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: "blur(8px)",
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open &&
            !isMobile && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
          borderRadius: "unset",
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="toggle menu"
              edge="start"
              onClick={toggleDrawer}
              sx={{
                mr: 2,
                ...(open && !isMobile && { display: "none" }),
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <MenuIcon />
            </IconButton>

            {(!open || isMobile) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <img
                  src={logoHorizontalSvg}
                  alt={Config.APP_NAME}
                  style={{ height: 32 }}
                />
              </Box>
            )}
            {!isDashboard && !isMobile && open && (
              <CustomBreadcrumbs lang={lang} />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LanguageSwitch
              lang={lang}
              changeLanguage={(s) => onChangeLang(s)}
            />
            {/* Theme toggle */}
            <Tooltip title={lang === "th" ? "เปลี่ยนธีม" : "Toggle theme"}>
              <IconButton
                color="inherit"
                onClick={toggleColorMode}
                aria-label="toggle theme"
                sx={{ borderRadius: 2, p: 1.5 }}
              >
                {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            {/* <Tooltip title="การแจ้งเตือน">
              <IconButton
                color="inherit"
                onClick={handleNotificationClick}
                aria-label="notifications"
                sx={{ borderRadius: 2, p: 1.5 }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip> */}

            {/* User Menu */}
            <Tooltip title="เมนูผู้ใช้">
              <IconButton
                onClick={handleUserMenuClick}
                sx={{
                  borderRadius: 2,
                  p: 0.5,
                  ml: 1,
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: theme.palette.primary.main,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {getInitials(
                    currentUser?.FirstName + " " + currentUser?.LastName
                  )}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {/*liner process*/}
      <TopLinearProgress open={loading} />
      {/* Notification Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: {
            width: 360,
            maxWidth: "90vw",
            mt: 1,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            การแจ้งเตือน
          </Typography>
          <Typography variant="body2" color="text.secondary">
            คุณมีการแจ้งเตือน {unreadCount} รายการที่ยังไม่ได้อ่าน
          </Typography>
        </Box>
        {notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={handleNotificationClose}
            sx={{
              py: 2,
              px: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              "&:last-child": { borderBottom: "none" },
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: notification.unread ? "primary.main" : "grey.400",
                }}
              >
                <NotificationsIcon />
              </Avatar>
            </ListItemAvatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: notification.unread ? 600 : 400,
                    flex: 1,
                  }}
                >
                  {notification.title}
                </Typography>
                {notification.unread && (
                  <Chip
                    label="ใหม่"
                    size="small"
                    color="primary"
                    sx={{ fontSize: "0.7rem", height: 20 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {notification.time}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: "pointer", fontWeight: 500 }}
            onClick={handleNotificationClose}
          >
            ดูการแจ้งเตือนทั้งหมด
          </Typography>
        </Box>
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            width: 280,
            mt: 1,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: theme.palette.primary.main,
                fontSize: "1.25rem",
                fontWeight: 600,
              }}
            >
              {getInitials(
                currentUser?.FirstName + " " + currentUser?.LastName
              )}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {currentUser?.FirstName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.FirstName}
              </Typography>
              <Chip
                label={role}
                size="small"
                sx={{
                  mt: 0.5,
                  fontSize: "0.7rem",
                  height: 20,
                  bgcolor: "primary.50",
                  color: "primary.700",
                }}
              />
            </Box>
          </Box>
        </Box>

        <MenuItem onClick={handleResetPassword} sx={{ py: 1.5, px: 3 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={lang === "th" ? "เปลี่ยนรหัสผ่าน" : "Reset Password"}
          />
        </MenuItem>
        {/*
        <MenuItem onClick={handleUserMenuClose} sx={{ py: 1.5, px: 3 }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="ตั้งค่า" />
        </MenuItem> */}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.5,
            px: 3,
            color: "error.main",
            "&:hover": {
              bgcolor: "error.50",
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText primary={lang === "th" ? "ออกจากระบบ" : "Logout"} />
        </MenuItem>
      </Menu>

      {/* Sidebar Drawer */}
      <StyledDrawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => isMobile && setOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <DrawerHeader>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
              width: "100%",
              px: open ? 2 : 0,
            }}
          >
            {open && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: "unset",
                }}
              >
                <img
                  src={`${process.env.PUBLIC_URL}/images/logo.svg`}
                  alt="App Logo"
                  style={{ width: 32, height: 32 }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {Config.APP_NAME}
                </Typography>
              </Box>
            )}
            {!isMobile && (
              <IconButton
                onClick={toggleDrawer}
                aria-label="close menu"
                sx={{
                  borderRadius: 2,
                  p: 1,
                  ...(open && { ml: "auto" }),
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            )}
          </Box>
        </DrawerHeader>
        <Divider />
        <SidebarMenu
          setLoading={setLoading}
          open={open} // state ที่ควบคุม sidebar เปิด/ปิด
          isMobile={isMobile} // ไว้ใช้สำหรับ mobile responsive
          setOpen={setOpen} // ฟังก์ชันเปลี่ยนค่า open
          theme={theme} // ส่ง theme ของ MUI เข้าไป
          lang={lang}
        />
      </StyledDrawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 0, sm: 3, md: 1 },
          mt: 8,
          width: {
            xs: "100%",
            md: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          bgcolor: theme.palette.custom?.mainBackground || "background.default",
          height: `calc(100vh - ${theme.spacing(8)})`,
          position: "relative",
          overflow: "auto",
        }}
      >
        {/* <Button onClick={async () => {
          await AxiosMaster.post(`${Config.API_URL}/notify/all`, { message: "พักเที่ยง" });
        }}>send noti</Button> */}
        <Outlet />
      </Box>
      {/* Reset Password Popup */}
      <Dialog
        open={isPopupResetPasswordOpen}
        onClose={() => setIsPopupResetPasswordOpen(false)}
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
            <InputLabel htmlFor="new-password">
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
            onClick={() => setIsPopupResetPasswordOpen(false)}
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
      </Dialog>
    </Box>
  );
}
