import { Box, Typography, Button, CircularProgress } from "@mui/material";
import Config from "../utils/Config";
import secureStorage from "../utils/SecureStorage";
import { useAuth } from "../contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";

const NotFound = () => {
    const { logout, menu, resource, role } = useAuth();
    const handleLogout = useCallback(async () => {
        await logout();
        window.location.href = Config.BASE_URL + "/login";
    }, [logout]);
    const [isForbidden, setIsForbidden] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lang, setLang] = useState(secureStorage.get("lang") || "en");
    const fetchData = useCallback(async () => {
        setLang(secureStorage.get("lang") || "en");
        const token = secureStorage.get("token");
        const refreshToken = secureStorage.get("refresh_token");
        const menuData = secureStorage.get("menu");
        const hasMenuData = Array.isArray(menuData) && menuData.length > 0;
        const isForbidden = !hasMenuData && refreshToken !== null && token !== null;
        setIsForbidden(isForbidden);
        if (token && refreshToken) {
            setIsLoading(true);
            try {
                await role();
                await resource();
                await menu();
                const refreshedMenu = secureStorage.get("menu");
                const hasViewableMenu =
                    Array.isArray(refreshedMenu) && refreshedMenu.length > 0;
                if (hasViewableMenu) {
                    window.location.href = Config.BASE_URL;
                    return;
                }
                // No viewable menu even after a fresh fetch - stop here instead of
                // bouncing back to "/" and looping (PermissionRoute would just send
                // us back to /404 again).
                setIsForbidden(true);
            } finally {
                setTimeout(() => {
                    setIsLoading(false);
                }, 100);
            }
        } else {
            handleLogout();
        }
    }, [handleLogout, menu, resource, role]);
    useEffect(() => {
        // Fetch role and menu on component mount
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <Box
                sx={{
                    textAlign: "center",
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.background.default} 0%,${theme.palette.grey[50]}  100%)`
                }}
            >
                <CircularProgress size={40} />
                <Typography sx={{ color: (theme) => theme.palette.text.secondary }}>
                    {lang === "en" ? "Loading permission data..." : "กำลังโหลดข้อมูลสิทธิ์การใช้งาน..."}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                textAlign: "center",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: (theme) => `linear-gradient(135deg, ${theme.palette.background.default} 0%,${theme.palette.grey[50]}  100%)`
            }}
        >
            {isForbidden ? <Box>
                <Typography variant="h1" sx={{ fontSize: "6rem", color: (theme) => theme.palette.error.main, m: 0 }}>
                    403
                </Typography>
                <Typography variant="h5" sx={{ color: (theme) => theme.palette.error.main, mb: 2 }}>
                    Forbidden
                </Typography>
                <Typography sx={{ color: (theme) => theme.palette.text.secondary, mb: 4 }}>
                    {lang === "en" ? "Sorry, you do not have permission to access this page." : "ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้านี้"}
                </Typography>
                <Button
                    onClick={handleLogout}
                    variant="contained"
                    sx={{
                        background: (theme) => theme.palette.error.main,
                        borderRadius: "999px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 8px rgba(244,67,54,0.15)",
                        px: 4,
                        py: 1.5,
                        textTransform: "none"
                    }}
                >
                    {lang === "en" ? "Back to Home" : "กลับหน้าหลัก"}
                </Button>
            </Box> : <Box>
                <Typography variant="h1" sx={{ fontSize: "6rem", color: (theme) => theme.palette.primary.main, m: 0 }}>
                    404
                </Typography>
                <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.main, mb: 2 }}>
                    {lang === "en" ? "Page Not Found" : "ไม่พบหน้าที่คุณต้องการ"}
                </Typography>
                <Typography sx={{ color: (theme) => theme.palette.text.secondary, mb: 4 }}>
                    {lang === "en" ? "Sorry, the page you are looking for does not exist." : "ขออภัย ไม่พบหน้าที่คุณต้องการ"}
                </Typography>
                <Button
                    href={Config.BASE_URL + "/"}
                    variant="contained"
                    sx={{
                        background: (theme) => theme.palette.primary.main,
                        borderRadius: "999px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 8px rgba(99,102,241,0.15)",
                        px: 4,
                        py: 1.5,
                        textTransform: "none"
                    }}
                >
                    {lang === "en" ? "Back to Home" : "กลับหน้าหลัก"}
                </Button>
            </Box>}
        </Box>
    );
}
export default NotFound;