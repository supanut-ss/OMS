/* eslint-disable no-undef */
import CustomBreadcrumbs from "../components/CustomBreadcrumbs";
import { useEffect, useState, useRef, useCallback, use } from "react";
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
  Badge,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  // Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

import { Outlet, useLocation } from "react-router-dom";
import { useColorMode } from "../themes/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

import { styled, alpha } from "@mui/material/styles";
//import logoMiniSvg from "../assets/logo.jpg";
import SidebarMenu from "./SidebarMenu";
import TopLinearProgress from "../components/TopLinearProgress";
import SecureStorage from "../utils/SecureStorage";
import BSAlertSwal2 from "../components/BSAlertSwal2";
import Config from "../utils/Config";
import LanguageSwitch from "../components/LanguageSwitch";
import * as signalR from "@microsoft/signalr";
import { useNotifications } from "../contexts/NotificationsProvider";
import ResetPasswordDialog from "./Dialogs/ResetPasswordDialog";
import NotifyDialog from "./Dialogs/NotifyDialog";
import MenuNoti from "./MenuNotify";
import PopupNotification from "./Dialogs/PopupNotification";
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
  borderRight: "none",

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
  borderRight: "none",
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
  const { toggleColorMode, mode, themeName, setThemeName } = useColorMode();
  const { logout } = useAuth();
  const location = useLocation();

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [open, setOpen] = useState(!isMobile);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [themePaletteAnchor, setThemePaletteAnchor] = useState(null);
  // const navigate = useNavigate();
  //const apiUrl = Config.API_URL;
  const apiUrl = Config.API_NOTIFY;
  const { bannerNotify,fetchBannerNotify,enqueue, enqueueAlarm, notifications, getNotifications, totalUnread, total } = useNotifications();
  // ตรวจสอบว่าเป็นหน้า dashboard (home) หรือไม่
  const isDashboard =
    location.pathname === "/" || location.pathname === "/home";

  // Mock user data - ในอนาคตใช้ข้อมูลจาก useAuth แทน
  const [role, setRole] = useState("User");
  const [currentUser, setCurrentUser] = useState(null);
  const connectionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPopupResetPasswordOpen, setIsPopupResetPasswordOpen] = useState(false);

  const toggleDrawer = () => setOpen((prev) => !prev);

  const handleNotificationClick = useCallback((event) => {
    setNotificationAnchor(event.currentTarget);
  }, []);

  const handleNotificationClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  const handleUserMenuClick = useCallback((event) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  const handleThemePaletteClick = useCallback((event) => {
    setThemePaletteAnchor(event.currentTarget);
  }, []);

  const handleThemePaletteClose = useCallback(() => {
    setThemePaletteAnchor(null);
  }, []);

  // Debounce timer for getNotifications to prevent excessive API calls
  const debounceTimerRef = useRef(null);

  const handleLogout = useCallback(async () => {
    handleUserMenuClose();

    // Ensure SignalR connection is stopped on logout (non-blocking)
    if (connectionRef.current) {
      connectionRef.current.stop().catch(() => { });
      connectionRef.current = null;
    }

    // Call logout in background (non-blocking)
    logout().then((data) => {
      if (data.status) {
        BSAlertSwal2.fire({
          icon: "success",
          title: "Logout Success",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.href = Config.BASE_URL + "/login";
        });
      } else {
        BSAlertSwal2.fire({
          icon: "warning",
          title: "Logout Failed",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.reload();
        });
      }
    }).catch(() => {
      window.location.href = Config.BASE_URL + "/login";
    });
  }, [logout, handleUserMenuClose]);
  const handleResetPassword = useCallback(() => {
    setIsPopupResetPasswordOpen(true);
    handleUserMenuClose();
  }, [handleUserMenuClose]);
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

      // Non-blocking message handler with debounced notification fetch
      const debouncedGetNoti = () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          callGetNoti();
        }, 500); // Increased debounce delay
      };

      connection.on("ReceiveAll", (msg) => {
        // Use requestAnimationFrame to defer notification to next frame
        requestAnimationFrame(() => {
          if (!msg?.message) return;
          // Fire notification immediately (non-blocking)
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

          // Fetch notifications asynchronously with debounce
          debouncedGetNoti();
        });
      });

      connection.on("ReceiveUser", (msg) => {
        // Use requestAnimationFrame to defer notification to next frame
        requestAnimationFrame(() => {
          if (!msg?.message) return;
          // Fire notification immediately (non-blocking)
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

          // Fetch notifications asynchronously with debounce
          debouncedGetNoti();
        });
      });


      // Reduce connection timeout overhead
      connection.serverTimeoutInMilliseconds = 60000; // ✅ ดี
      // Add connection keep-alive
      connection.keepAliveIntervalInMilliseconds = 15000;
      connection.start(() => {
      }).catch((err) => {
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
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const conn = connectionRef.current;
      if (conn) {
        conn.onclose();
        conn.stop();
        connectionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, currentUser, enqueue, enqueueAlarm]);
  const callGetNoti = useCallback(async () => {
    // Prevent simultaneous API calls
    if (callGetNoti.pending) return;
    callGetNoti.pending = true;

    try {
      await getNotifications(10);
    } finally {
      callGetNoti.pending = false;
    }
  }, [getNotifications]);
  useEffect(() => {
    if (total === -1) callGetNoti();
  }, [total, callGetNoti]);
  useEffect(() => {
    // เรียก fetchBannerNotify เมื่อ component mount หรือ route เปลี่ยน
     if (loading) {
      setLoading(false);
    }
    if (!bannerNotify) {
      fetchBannerNotify();
    }
  }, [location.pathname, fetchBannerNotify]);
  return (
    <Box
      sx={{
        display: "flex",
        // minHeight: "100vh",
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
          bgcolor: mode === "light" ? theme.palette.primary.main : "background.paper",
          color: mode === "light" ? "#fff" : "text.primary",
          borderBottom:
            mode === "light"
              ? `1px solid ${theme.palette.primary.dark}`
              : `1px solid ${theme.palette.divider}`,
          "& .MuiTypography-root":
            mode === "light"
              ? {
                color: "#fff",
                fontWeight: 700,
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
              }
              : undefined,
          "& .MuiIconButton-root":
            mode === "light"
              ? {
                color: "#fff",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
              }
              : undefined,
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
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {Config.APP_NAME}
                </Typography>
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

            <Tooltip title={lang === "th" ? "ชุดสีธีม" : "Theme palette"}>
              <IconButton
                color="inherit"
                onClick={handleThemePaletteClick}
                aria-label="theme palette"
                sx={{ borderRadius: 2, p: 1.5 }}
              >
                <PaletteIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="การแจ้งเตือน">
              <IconButton
                color="inherit"
                onClick={handleNotificationClick}
                aria-label="notifications"
                sx={{ borderRadius: 2, p: 1.5 }}
              >
                <Badge badgeContent={totalUnread} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

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
                    bgcolor: mode === "light" ? "#fff" : theme.palette.primary.main,
                    color: mode === "light" ? theme.palette.primary.main : "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border:
                      mode === "light"
                        ? `1px solid ${theme.palette.primary.contrastText}`
                        : "none",
                    boxShadow:
                      mode === "light"
                        ? "0 2px 6px rgba(0, 0, 0, 0.25)"
                        : "none",
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
        <TopLinearProgress open={loading} placement="below-appbar" />
      </AppBar>
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
            คุณมีการแจ้งเตือน {totalUnread} รายการที่ยังไม่ได้อ่าน
          </Typography>
        </Box>
        <MenuNoti notifications={notifications} handleNotificationClose={handleNotificationClose} />
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: "pointer", fontWeight: 500 }}
            onClick={() => {
              setIsNotifyDialogOpen(true);
              handleNotificationClose();
            }}
          >
            ดูการแจ้งเตือนทั้งหมด
          </Typography>
        </Box>
      </Menu>

      <Menu
        anchorEl={themePaletteAnchor}
        open={Boolean(themePaletteAnchor)}
        onClose={handleThemePaletteClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          selected={themeName === "theme-1"}
          onClick={() => {
            setThemeName("theme-1");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#3f51b5",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม อินดิโก้" : "Theme Indigo"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-2"}
          onClick={() => {
            setThemeName("theme-2");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#5677fc",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม บลู" : "Theme Blue"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-purple"}
          onClick={() => {
            setThemeName("theme-purple");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#9c27b0",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม ม่วง" : "Theme Purple"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-teal"}
          onClick={() => {
            setThemeName("theme-teal");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#009688",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม ทีล" : "Theme Teal"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-orange"}
          onClick={() => {
            setThemeName("theme-orange");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#ff8a4b",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม ส้ม" : "Theme Orange"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-pastel"}
          onClick={() => {
            setThemeName("theme-pastel");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#9BC2B2",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม ซอฟต์พาสเทล" : "Theme Soft Pastel"}
        </MenuItem>
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
              justifyContent: "space-between",
              width: "100%",
              px: open ? 2 : 1,
            }}
          >
            {open ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: "unset",
                }}
              >
                <img
                  src={`${process.env.PUBLIC_URL}/images/logo.png`}
                  alt="App Logo"
                  style={{ width: 50, height: 50 }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {Config.APP_NAME}
                </Typography>
              </Box>
            ) : (
              <img
                src={`${process.env.PUBLIC_URL}/images/logo.png`}
                alt="App Logo"
                style={{ width: 50, height: 50 }}
              />
            )}
            {!isMobile && (
              <IconButton
                onClick={toggleDrawer}
                aria-label={open ? "collapse menu" : "expand menu"}
                sx={{
                  borderRadius: "999px",
                  p: 0.75,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                }}
              >
                {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            )}
          </Box>
        </DrawerHeader>
        <Divider sx={{ display: "none" }} />
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
          display: "flex",
          flexGrow: 1,
          p: { xs: 0, sm: 0, md: 0 },
          mt: 8,
          borderLeft: { xs: "none", md: `1px solid ${theme.palette.divider}` },
          width: {
            xs: 0,
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
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.primary.main, 0.35),
            borderRadius: 8,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.55),
          },
        }}
      >
        <Outlet />
      </Box>
      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={isPopupResetPasswordOpen}
        lang={lang}
        onClose={() => setIsPopupResetPasswordOpen(false)}
        currentUser={currentUser}
        loading={loading}
        setLoading={setLoading}
      />
      <NotifyDialog
        open={isNotifyDialogOpen}
        onClose={() => setIsNotifyDialogOpen(false)}
      />
      <PopupNotification data={bannerNotify} />
      {/* End Main content */}
    </Box>
  );
}
