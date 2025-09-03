import React, { useState } from "react";
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

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login,resource } = useAuth();

  const [formData, setFormData] = useState({
    usersname: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if(data.status){
        await resource();
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }else{
        setError(data.message)
      }
      setLoading(false);

      // For demo purposes, accept any username/password
      // In real app, validate credentials with backend
      // if (formData.username && formData.password) {
        

      //   // Use login function from AuthContext
      //   login(formData);

      //   // Navigate to intended page or dashboard
      //   const from = location.state?.from?.pathname || "/";
      //   navigate(from, { replace: true });
      // } else {
      //   setError("ผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
      // }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
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
                width: 80,
                height: 80,
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
                style={{ width: "100%", height: "100%" }}
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
              Timesheet System
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: "1.1rem" }}
            >
              เข้าสู่ระบบเพื่อจัดการงานของคุณ
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
              name="usersname"
              label="ผู้ใช้งาน"
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
              }}
            />

            <TextField
              fullWidth
              name="password"
              label="รหัสผ่าน"
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
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
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
            </Box>
          </Box>

          {/* Demo Info */}
          <Box
            sx={{
              mt: 4,
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              📌 สำหรับการทดสอบ: ใส่อีเมลและรหัสผ่านอะไรก็ได้เพื่อเข้าสู่ระบบ
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
