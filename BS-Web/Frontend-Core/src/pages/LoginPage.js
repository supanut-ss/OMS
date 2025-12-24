import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoSvg from "../assets/logo.svg";
import Config from "../utils/Config";
import secureStorage from "../utils/SecureStorage";
import { useResource } from "../hooks/useResource";

export default function LoginPage({ setLang }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState();
  const { login, resource, menu, role, version, resetLocationPermission, startLocationTracking, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    usersname: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  let checkVersion = false;
  const [isVersion, setIsVersion] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simple validation
    if (!formData.usersname || !formData.password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      setLoading(false);
      return;
    }

    try {
      // Mock login - in real app, call API here
      let data = await login(formData);
      setLang(data?.lang ?? "en");
      if (data.status) {
        let status_resource = isVersion ? await resource() : true;
        if (status_resource) {
          await role();
          let status_menu = await menu();
          if (status_menu) {
            const from = location.state?.from?.pathname || "/";
            navigate(from);
          }
        }

      } else {
        setError(data.message)
      }
      setLoading(false);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };
  const getVersion = useCallback(async () => {
    if (!checkVersion) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      checkVersion = true;
      setResourceData(await getResources("Login"));
      let vs = await version({
        version_control_name: "RESOURCE_WEB",
        application_license: Config.LICENSE_KEY
      });
      if (secureStorage.get("version") !== vs) {
        secureStorage.set("version", vs);
        setIsVersion(true);
      }

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    getVersion();
  }, [getVersion]);

  // Geolocation permission request: auto-prompt once on page load.
  const [geoPrompted, setGeoPrompted] = useState(false);
  const [geoErrorMessage, setGeoErrorMessage] = useState("");
  const [showGeoSettingsDialog, setShowGeoSettingsDialog] = useState(false);

  const openBrowserLocationSettings = () => {
    try {
      const ua = navigator.userAgent || "";
      // Many browsers block opening internal chrome:// or edge:// pages from regular pages.
      // Instead, open a help article with step-by-step instructions as the safe fallback.
      if (ua.includes("Firefox")) {
        // Firefox sometimes allows about: preferences to open; try it, fallback to support page
        const win = window.open("about:preferences#privacy");
        if (!win) {
          window.open("https://support.mozilla.org/th/kb/firefox-and-location");
        }
        return;
      }

      // For Chrome / Edge / Chromium-based browsers, opening chrome:// or edge:// is blocked.
      // So open a trusted help article that describes how to change Location permission instead.
      window.open("https://support.google.com/chrome/answer/142065?hl=th");
    } catch (e) {
      // ignore failures and show manual instructions in dialog
      console.error("Failed to open browser settings page:", e);
      window.open("https://support.google.com/chrome/answer/142065?hl=th");
    }
  };

  const requestGeolocationPermission = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setGeoErrorMessage("เบราว์เซอร์นี้ไม่รองรับ Geolocation");
      return;
    }
    // Avoid re-prompting automatically more than once
    if (geoPrompted) return;
    setGeoPrompted(true);

    const handleError = (err) => {
      // Permission denied / blocked
      if (err && err.code === 1) {
        setGeoErrorMessage("ตำแหน่งถูกบล็อกเพื่อปกป้องความเป็นส่วนตัว — หากต้องการให้ทำงานให้เปิดการอนุญาตในตั้งค่าเบราว์เซอร์");
        // Show dialog to instruct user how to re-enable permissions
        setShowGeoSettingsDialog(true);
      } else if (err && err.message && err.message.includes("Only secure origins")) {
        setGeoErrorMessage("Geolocation ต้องการ origin ที่ปลอดภัย (HTTPS) หรือ localhost");
      } else {
        setGeoErrorMessage("ไม่สามารถเข้าถึงตำแหน่ง: " + (err?.message || "ไม่ทราบสาเหตุ"));
      }
    };

    // Use Permissions API when available to check state first
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((res) => {
            if (res.state === "granted" || res.state === "prompt") {
              navigator.geolocation.getCurrentPosition(
                () => {
                  setGeoErrorMessage("");
                  // Reset AliveContext permission flag so it can start sending again
                  try {
                    if (typeof resetLocationPermission === "function") resetLocationPermission();
                    if (isAuthenticated && typeof startLocationTracking === "function") {
                      startLocationTracking();
                    }
                  } catch (e) {
                    console.error("Error while reenabling location tracking:", e);
                  }
                },
                handleError
              );
            } else if (res.state === "denied") {
              setGeoErrorMessage("ตำแหน่งถูกบล็อกเพื่อปกป้องความเป็นส่วนตัว — หากต้องการให้ทำงานให้เปิดการอนุญาตในตั้งค่าเบราว์เซอร์");
              setShowGeoSettingsDialog(true);
            }
          })
          .catch(() => {
            // Fallback: try to request position which should trigger prompt
            navigator.geolocation.getCurrentPosition(
              () => {
                setGeoErrorMessage("");
                try {
                  if (typeof resetLocationPermission === "function") resetLocationPermission();
                  if (isAuthenticated && typeof startLocationTracking === "function") {
                    startLocationTracking();
                  }
                } catch (e) {
                  console.error("Error while reenabling location tracking:", e);
                }
              },
              handleError
            );
          });
      } else {
        // No Permissions API: request directly to trigger prompt
        navigator.geolocation.getCurrentPosition(
          () => {
            setGeoErrorMessage("");
            try {
              if (typeof resetLocationPermission === "function") resetLocationPermission();
              if (isAuthenticated && typeof startLocationTracking === "function") {
                startLocationTracking();
              }
            } catch (e) {
              console.error("Error while reenabling location tracking:", e);
            }
          },
          handleError
        );
      }
    } catch (err) {
      handleError(err);
    }
  }, [geoPrompted]);

  useEffect(() => {
    requestGeolocationPermission();
  }, [requestGeolocationPermission]);

  return (<>
    {loading && <LinearProgress />}
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
        p: 2,
      }}
    >
      <Card
        elevation={8}
        sx={{
          maxWidth: 440,
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          backdropFilter: "blur(10px)",
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: "50%",
                height: "auto",
                mx: "auto",
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoSvg}
                alt="Timesheet Logo"
                style={{ width: "50%", height: "50%" }}
              />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 1,
              }}
            >
              {Config.APP_NAME}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: "1.1rem" }}
            >
              Log in to manage your tasks.
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Geolocation permission warning / retry or settings */}
          {/* {geoErrorMessage && (
            <Box sx={{ mb: 3, display: "flex", gap: 1, alignItems: "center" }}>
              <Alert severity="warning" sx={{ flex: 1, borderRadius: 2 }}>
                {geoErrorMessage}
              </Alert>

              {showGeoSettingsDialog ? (
                <Button variant="outlined" onClick={() => openBrowserLocationSettings()}>
                  เปิดการตั้งค่าเบราว์เซอร์
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setGeoPrompted(false);
                    setGeoErrorMessage("");
                    requestGeolocationPermission();
                  }}
                >
                  ขอสิทธิ์อีกครั้ง
                </Button>
              )}
            </Box>
          )} */}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              disabled={loading}
              name="usersname"
              label={getResource(resourceData, "Username")}
              type="text"
              value={formData.usersname}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="text"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
                "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active": {
                  WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
                  WebkitTextFillColor: `${theme.palette.text.primary} !important`,
                  caretColor: `${theme.palette.text.primary}`,
                  borderColor: "transparent",
                },
              }}
            />

            <TextField
              fullWidth
              disabled={loading}
              name="password"
              label={getResource(resourceData, "Password")}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VpnKeyIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
                "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active": {
                  WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
                  WebkitTextFillColor: `${theme.palette.text.primary} !important`,
                  caretColor: `${theme.palette.text.primary}`,
                  borderColor: "transparent",
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: "1.1rem",
                fontWeight: 600,
                textTransform: "none",
                mb: 2,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                "&:hover": {
                  background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
              }}
            >
              {/* {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"} */}
              {loading ? getResource(resourceData, "Login in") : getResource(resourceData, "Login")}
            </Button>

            {/* <Box sx={{ textAlign: "center" }}>
              <Link
                href="#"
                variant="body2"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                ลืมรหัสผ่าน?
              </Link>
            </Box> */}
          </Box>

          {/* Dialog: Guide to re-enable Location permission */}
          {/* <Dialog open={showGeoSettingsDialog} onClose={() => setShowGeoSettingsDialog(false)}>
            <DialogTitle>การอนุญาตตำแหน่งถูกปฏิเสธ</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 1 }}>
                เบราว์เซอร์ของคุณปฏิเสธการเข้าถึงตำแหน่งสำหรับไซต์นี้ จึงไม่สามารถแสดง popup ขอสิทธิ์ได้อีกจนกว่าจะเปลี่ยนการตั้งค่าของไซต์
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                วิธีแก้ไข: ไปที่การตั้งค่าของเบราว์เซอร์ → การตั้งค่าไซต์ (Site settings) → ตำแหน่ง (Location) → ตั้งค่าสิทธิ์ให้เป็น "อนุญาต" สำหรับเว็บไซต์นี้ แล้วกลับมาหน้าแอปและรีเฟรช
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                หมายเหตุ: เบราว์เซอร์บางตัวไม่อนุญาตให้หน้าเว็บเปิดหน้าการตั้งค่า (เช่น chrome:// หรือ edge://) โดยตรงจากสคริปต์ — หากปุ่มด้านล่างไม่สามารถเปิดหน้าการตั้งค่าได้ ให้คลิกปุ่มเพื่อดูคำแนะนำการตั้งค่าแบบขั้นตอนหรือทำตามคำแนะนำด้วยตนเอง
              </Typography>
              <Typography variant="body2">
                ถ้าคุณกำลังพัฒนาในเครื่อง ให้เปิดผ่าน <strong>localhost</strong> หรือใช้ <em>HTTPS</em> (หรือใช้ ngrok) เพื่อให้เบราว์เซอร์อนุญาตใช้งาน Geolocation
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setShowGeoSettingsDialog(false); }}>
                ปิด
              </Button>
              <Button variant="contained" onClick={() => openBrowserLocationSettings()}>
                เปิดการตั้งค่าเบราว์เซอร์
              </Button>
            </DialogActions>
          </Dialog> */}

          {/* Demo Info */}
          <Box
            sx={{
              mt: 4,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {getResource(resourceData, "Version")}  : {secureStorage.get("version")}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  </>
  );
}
