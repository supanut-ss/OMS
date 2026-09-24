/* eslint-disable no-undef */
import { useEffect, useState, useRef, useCallback } from "react";
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
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  // Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  // SmartToy as SmartToyIcon,
} from "@mui/icons-material";
import aiBotImg from "../assets/images/ai_bot.png";

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
import AiChatPopover from "../components/AiChatPopover";
import { motion } from "framer-motion";
import CustomBreadcrumbs from "../components/CustomBreadcrumbs";
const DEFAULT_DRAWER_WIDTH = 280;
const collapsedWidth = 72;
const SPLIT_HANDLE_WIDTH = 14;
const sidebarTransitionEasing = "cubic-bezier(0.22, 1, 0.36, 1)";
const sidebarTransitionDuration = 320;

const iconHoverMotion = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 320, damping: 22 },
};

const aiHoverMotion = {
  whileHover: { scale: 1.08, y: -1 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 320, damping: 20 },
};

const openedMixin = (theme) => ({
  width: DEFAULT_DRAWER_WIDTH,
  transition: theme.transitions.create("width", {
    easing: sidebarTransitionEasing,
    duration: sidebarTransitionDuration,
  }),
  overflowX: "hidden",
  backgroundColor: theme.palette.background.paper,
  borderRight: "none",

  borderRadius: "unset !importent",
});

const closedMixin = (theme) => ({
  width: collapsedWidth,
  transition: theme.transitions.create("width", {
    easing: sidebarTransitionEasing,
    duration: sidebarTransitionDuration,
  }),
  overflowX: "hidden",
  backgroundColor: theme.palette.background.paper,
  borderRight: "none",
});

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: DEFAULT_DRAWER_WIDTH,
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
  const [isPinned, setIsPinned] = useState(true); // กดปุ่ม
  const [isHoverOpen, setIsHoverOpen] = useState(false); // hover
  const sidebarVisible = isPinned || isHoverOpen;
  const sidebarWidth = DEFAULT_DRAWER_WIDTH;
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [themePaletteAnchor, setThemePaletteAnchor] = useState(null);
  // const navigate = useNavigate();
  //const apiUrl = Config.API_URL;
  const apiUrl = Config.API_NOTIFY;
  const {
    bannerNotify,
    fetchBannerNotify,
    enqueue,
    enqueueAlarm,
    notifications,
    getNotifications,
    totalUnread,
    total,
  } = useNotifications();

  // Mock user data - ในอนาคตใช้ข้อมูลจาก useAuth แทน
  const [role, setRole] = useState("User");
  const [currentUser, setCurrentUser] = useState(null);
  const connectionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPopupResetPasswordOpen, setIsPopupResetPasswordOpen] =
    useState(false);

  // AI Assistant State
  const [activeAiConfigs, setActiveAiConfigs] = useState([]);
  const [aiPopoverAnchor, setAiPopoverAnchor] = useState(null);
  const splitResizeRafRef = useRef(0);
  const splitResizeCleanupRef = useRef(() => {});
  const hasFetchedBannerRef = useRef(false);
  const activeMenuRef = useRef(null);

  useEffect(() => {
    const fetchAiConfigs = async () => {
      try {
        const token = SecureStorage.get("token");
        if (!token) return;
        const res = await fetch(`${Config.API_URL}/ai/active-configs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActiveAiConfigs(data || []);
        }
      } catch (error) {
        console.error("Fetch AI Configs Error:", error);
      }
    };
    fetchAiConfigs();
  }, []);

  const showAiButton = activeAiConfigs.includes(location.pathname);
  const handleAiClick = (event) => setAiPopoverAnchor(event.currentTarget);
  const handleAiClose = () => setAiPopoverAnchor(null);

  useEffect(() => {
    if (!showAiButton && aiPopoverAnchor) {
      setAiPopoverAnchor(null);
    }
  }, [showAiButton, aiPopoverAnchor]);

  const toggleDrawer = () => {
    setIsPinned((prev) => !prev);
  };
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const handleMouseEnterSidebar = () => {
    if (isPinned) return;

    clearTimeout(closeTimerRef.current);

    openTimerRef.current = setTimeout(() => {
      setIsHoverOpen(true);
    }, 300);
  };

  const handleMouseLeaveSidebar = () => {
    if (isPinned) return;

    clearTimeout(openTimerRef.current);

    closeTimerRef.current = setTimeout(() => {
      setIsHoverOpen(false);
    }, 200);
  };

  const clearSplitResizeListeners = useCallback(() => {
    splitResizeCleanupRef.current?.();
    splitResizeCleanupRef.current = () => {};
    if (splitResizeRafRef.current) {
      cancelAnimationFrame(splitResizeRafRef.current);
      splitResizeRafRef.current = 0;
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);
  useEffect(() => {
    return () => {
      clearSplitResizeListeners();
    };
  }, [clearSplitResizeListeners]);

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
      connectionRef.current.stop().catch(() => {});
      connectionRef.current = null;
    }

    // Call logout in background (non-blocking)
    logout()
      .then((data) => {
        if (data.status) {
          let timerInterval;
          BSAlertSwal2.fire({
            icon: "success",
            title: lang === "th" ? "ออกจากระบบสำเร็จ" : "Logout Success",
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; margin-top: 10px; font-family: 'Prompt', sans-serif;">
                <style>
                  .swal-circle-bg {
                    stroke: rgba(0, 0, 0, 0.08);
                  }
                  .swal2-dark-mode .swal-circle-bg {
                    stroke: rgba(255, 255, 255, 0.1);
                  }
                </style>
                <div style="font-size: 15px; color: inherit; text-align: center; font-weight: 500;">
                  ${
                    lang === "th"
                      ? "ระบบกำลังจะนำคุณไปยังหน้าเข้าสู่ระบบในอีก..."
                      : "Redirecting to login page in..."
                  }
                </div>
                <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
                  <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg);">
                    <circle class="swal-circle-bg" cx="32" cy="32" r="28" fill="none" stroke-width="4.5"></circle>
                    <circle id="swal-svg-progress" cx="32" cy="32" r="28" fill="none" stroke="#22c55e" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="0" style="transition: stroke-dashoffset 0.05s linear;"></circle>
                  </svg>
                  <span id="swal-countdown" style="font-size: 20px; font-weight: 700; color: #22c55e;">3</span>
                </div>
              </div>
            `,
            timer: 3000,
            timerProgressBar: false,
            showConfirmButton: false,
            didOpen: () => {
              const totalDuration = 3000;
              const startTime = Date.now();
              const countdownNumber = document.getElementById("swal-countdown");
              const progressCircle =
                document.getElementById("swal-svg-progress");

              timerInterval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const timeLeft = Math.max(0, totalDuration - elapsedTime);

                if (countdownNumber) {
                  countdownNumber.textContent = Math.ceil(timeLeft / 1000);
                }

                if (progressCircle) {
                  const dashoffset = 176 * (1 - timeLeft / totalDuration);
                  progressCircle.style.strokeDashoffset = dashoffset;
                }

                if (timeLeft <= 0) {
                  clearInterval(timerInterval);
                }
              }, 30);
            },
            willClose: () => {
              clearInterval(timerInterval);
            },
          }).then(() => {
            window.location.href = Config.BASE_URL + "/login";
          });
        } else {
          BSAlertSwal2.fire({
            icon: "warning",
            title: lang === "th" ? "ออกจากระบบไม่สำเร็จ" : "Logout Failed",
            confirmButtonText: "OK",
          }).then(() => {
            window.location.reload();
          });
        }
      })
      .catch(() => {
        window.location.href = Config.BASE_URL + "/login";
      });
  }, [logout, handleUserMenuClose, lang]);
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
    const storedUserInfo = SecureStorage.get("userInfo");
    const hasUser = storedUserInfo !== null && storedUserInfo !== "";
    const nextRole = SecureStorage.get("role") ?? "User";

    if (hasUser) {
      setCurrentUser(storedUserInfo);
      setRole(nextRole);
      return;
    }

    setCurrentUser(null);
    setRole("User");
  }, []);

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
      connectionRef.current.stop().catch(() => {});
      connectionRef.current = null;
    }
    try {
      let builder = new signalR.HubConnectionBuilder()
        .withUrl(
          `${apiUrl}/notificationHub?userId=${encodeURIComponent(currentUser.UserId)}`,
          {
            accessTokenFactory: () => SecureStorage.get("token") || "",
          },
        )
        .withAutomaticReconnect();

      // Disable SignalR logs in production, keep informative logs in development
      builder = builder.configureLogging(
        process.env.NODE_ENV === "production"
          ? signalR.LogLevel.None
          : signalR.LogLevel.Information,
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
      connection
        .start(() => {})
        .catch((err) => {
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
  }, [apiUrl, currentUser?.UserId, enqueue, enqueueAlarm]);
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
    // Reset loading indicator after route change.
    setLoading((prev) => (prev ? false : prev));
  }, [location.pathname]);

  useEffect(() => {
    if (hasFetchedBannerRef.current) return;
    hasFetchedBannerRef.current = true;
    fetchBannerNotify();
  }, [fetchBannerNotify]);
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

          // width: !isMobile
          //   ? (isPinned
          //     ? `calc(100% - ${sidebarWidth + SPLIT_HANDLE_WIDTH}px)`
          //     : `calc(100% - ${collapsedWidth}px)`)
          //   : "100%",

          bgcolor:
            mode === "light" ? theme.palette.primary.main : "background.paper",

          color: mode === "light" ? "#fff" : "text.primary",

          transition: theme.transitions.create(["width", "margin"], {
            easing: sidebarTransitionEasing,
            duration: sidebarTransitionDuration,
          }),

          borderRadius: "unset",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            color: mode === "light" ? "#fff" : "text.primary",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* <Box component={motion.div} {...iconHoverMotion}>
              <IconButton
                color="inherit"
                aria-label="toggle menu"
                edge="start"
                onClick={toggleDrawer}
                sx={{
                  mr: 2,
                  //...(sidebarVisible && !isMobile && { display: "none" }),
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
            <img
              src={`${process.env.PUBLIC_URL}/images/logo.png`}
              alt="App Logo"
              style={{ width: 50, height: 50 }}
            />
            { {(!sidebarVisible || isMobile) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600, color: mode === "light"
                      ? "#fff"
                      : "text.primary",
                  }}
                >
                  {Config.APP_NAME}
                </Typography>
              </Box>
            )}
            {!isDashboard && !isMobile && sidebarVisible && (
              <CustomBreadcrumbs lang={lang} mode={mode} />
            )} } */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <IconButton
                color="inherit"
                onClick={toggleDrawer}
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuIcon />
              </IconButton>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pl: 1.5,
                  pr: 1.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha("#fff", 0.12),
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  component="img"
                  src={`${process.env.PUBLIC_URL}/images/logo.png`}
                  alt="Logo"
                  sx={{
                    width: 38,
                    height: 38,
                    objectFit: "contain",
                  }}
                />

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    OMS System
                  </Typography>

                  {/* <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.8,
                      lineHeight: 1,
                    }}
                  >
                    Matching Tag System
                  </Typography> */}
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {showAiButton && (
              <Tooltip
                title={lang === "th" ? "ผู้ช่วย AI อัจฉริยะ" : "AI Assistant"}
              >
                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  <Box component={motion.div} {...aiHoverMotion}>
                    <IconButton
                      onClick={handleAiClick}
                      sx={{
                        position: "relative",
                        zIndex: 1,
                        borderRadius: "50%",
                        p: 0,
                        width: 48,
                        height: 48,
                        overflow: "hidden",
                        background: "transparent",
                        border: "none",
                        transition: "all 0.25s ease",
                        "&:hover .robot-img": {
                          animation: "robotWiggle 0.45s ease-in-out",
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={aiBotImg}
                        alt="AI Assistant"
                        className="robot-img"
                        sx={{
                          width: 48,
                          height: 48,
                          objectFit: "contain",
                          animation: "robotBob 3s ease-in-out infinite",
                          "@keyframes robotBob": {
                            "0%, 100%": { transform: "translateY(0px)" },
                            "50%": { transform: "translateY(-2.5px)" },
                          },
                          "@keyframes robotWiggle": {
                            "0%": { transform: "rotate(0deg)" },
                            "20%": { transform: "rotate(-18deg) scale(1.1)" },
                            "60%": { transform: "rotate(18deg) scale(1.1)" },
                            "100%": { transform: "rotate(0deg)" },
                          },
                        }}
                      />
                    </IconButton>
                  </Box>
                  {/* Online indicator dot */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#22c55e",
                      border: "1.5px solid",
                      borderColor:
                        mode === "light"
                          ? theme.palette.primary.main
                          : "background.paper",
                      zIndex: 2,
                      animation: "dotPulse 2s ease-in-out infinite",
                      "@keyframes dotPulse": {
                        "0%, 100%": {
                          boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
                        },
                        "50%": { boxShadow: "0 0 0 4px rgba(34,197,94,0)" },
                      },
                      pointerEvents: "none",
                    }}
                  />
                </Box>
              </Tooltip>
            )}
            {/* Theme toggle */}
            <Tooltip title={lang === "th" ? "เปลี่ยนธีม" : "Toggle theme"}>
              <Box component={motion.div} {...iconHoverMotion}>
                <IconButton
                  color="inherit"
                  onClick={toggleColorMode}
                  aria-label="toggle theme"
                  sx={{ borderRadius: 2, p: 1.5 }}
                >
                  {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Box>
            </Tooltip>

            <Tooltip title={lang === "th" ? "ชุดสีธีม" : "Theme palette"}>
              <Box component={motion.div} {...iconHoverMotion}>
                <IconButton
                  color="inherit"
                  onClick={handleThemePaletteClick}
                  aria-label="theme palette"
                  sx={{ borderRadius: 2, p: 1.5 }}
                >
                  <PaletteIcon />
                </IconButton>
              </Box>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="เมนูผู้ใช้">
              <Box component={motion.div} {...iconHoverMotion}>
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
                      bgcolor:
                        mode === "light" ? "#fff" : theme.palette.primary.main,
                      color:
                        mode === "light" ? theme.palette.primary.main : "#fff",
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
                      currentUser?.FirstName + " " + currentUser?.LastName,
                    )}
                  </Avatar>
                </IconButton>
              </Box>
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
        <MenuNoti
          notifications={notifications}
          handleNotificationClose={handleNotificationClose}
        />
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
        <MenuItem
          selected={themeName === "theme-dark-navy"}
          onClick={() => {
            setThemeName("theme-dark-navy");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#1E2A78",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม กรมท่าเข้ม" : "Theme Dark Navy"}
        </MenuItem>
        <MenuItem
          selected={themeName === "theme-red-accent"}
          onClick={() => {
            setThemeName("theme-red-accent");
            handleThemePaletteClose();
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "#E53935",
              mr: 1.5,
            }}
          />
          {lang === "th" ? "ธีม แดงแอคเซนต์" : "Theme Red Accent"}
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
                currentUser?.FirstName + " " + currentUser?.LastName,
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

      {/* AI Assistant Popover Component */}
      <AiChatPopover
        open={Boolean(aiPopoverAnchor)}
        anchorEl={aiPopoverAnchor}
        onClose={handleAiClose}
        process={location.pathname}
        userId={currentUser?.UserId}
        userName={[currentUser?.FirstName, currentUser?.LastName]
          .filter(Boolean)
          .join(" ")}
        lang={lang}
      />

      {/* Sidebar Drawer */}
      <StyledDrawer
        ref={activeMenuRef}
        variant={isMobile ? "temporary" : "permanent"}
        open={sidebarVisible}
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        onClose={() => {
          if (isMobile) {
            setOpen(false);
            setIsPinned(false);
          }
          console.log("Sidebar closed on mobile");
        }}
        ModalProps={{ keepMounted: true }}
        sx={{
          position: "fixed",
          zIndex: theme.zIndex.drawer,
          "& .MuiDrawer-paper": {
            position: "fixed",
            zIndex: theme.zIndex.drawer + 2,
            top: theme.spacing(8),
            pt: isMobile ? 1.5 : 2,
            width: sidebarVisible ? sidebarWidth : collapsedWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
            pointerEvents: "auto",
          },
          backgroundColor:
            theme.palette.custom?.sidebarBackground ||
            theme.palette.background.paper,

          transition: "transform 500ms ease",
        }}
      >
        <Divider sx={{ display: "none" }} />
        <SidebarMenu
          setLoading={setLoading}
          open={sidebarVisible} // state ที่ควบคุม sidebar เปิด/ปิด
          isMobile={isMobile} // ไว้ใช้สำหรับ mobile responsive
          setOpen={() => {
            // ismobile true เปิด sidebar false ปิด sidebar
            if (isMobile) {
              setOpen((prev) => !prev);
              setIsPinned((prev) => !prev);
            }
          }} // ฟังก์ชันเปลี่ยนค่า open
          theme={theme} // ส่ง theme ของ MUI เข้าไป
          lang={lang}
          activeMenuRef={activeMenuRef}
        />
      </StyledDrawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexGrow: 1,
          p: { xs: 0, sm: 0, md: 0 },
          pl: !isPinned ? "12px" : 0,
          mt: 8,
          ml: !isMobile
            ? isPinned
              ? `${sidebarWidth}px`
              : `${collapsedWidth}px`
            : 0,
          transition: theme.transitions.create("width", {
            easing: sidebarTransitionEasing,
            duration: sidebarTransitionDuration,
          }),
          bgcolor: theme.palette.custom?.mainBackground || "background.default",
          height: `calc(100vh - 64px)`,
        }}
      >
        {/* Breadcrumb */}
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            py: 1,
            bgcolor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            zIndex: 10,
          }}
        >
          <CustomBreadcrumbs lang={lang} mode={mode} theme={theme} />
        </Box>

        {/* Scroll Area */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            //     px: 2,

            scrollbarWidth: "thin",
            scrollbarColor: `${alpha(
              theme.palette.primary.main,
              0.5,
            )} transparent`,

            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(theme.palette.primary.main, 0.35),
              borderRadius: 8,
            },
            height: "100%",
          }}
        >
          <Outlet />
        </Box>
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
