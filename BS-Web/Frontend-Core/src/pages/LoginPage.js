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
  const { login, resource, menu, role, version } = useAuth();

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
