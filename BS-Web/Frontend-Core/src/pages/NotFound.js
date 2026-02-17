import { Box, Typography, Button } from "@mui/material";
import Config from "../utils/Config";

const NotFound = () => {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: (theme) => `linear-gradient(135deg, ${theme.palette.background.default} 0%,${theme.palette.grey[50]}  100%)`
            }}
        >
            <Typography variant="h1" sx={{ fontSize: "6rem", color: (theme) => theme.palette.primary.main, m: 0 }}>
                404
            </Typography>
            <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.main, mb: 2 }}>
                Page Not Found
            </Typography>
            <Typography sx={{ color: (theme) => theme.palette.text.secondary, mb: 4 }}>
                ขออภัย ไม่พบหน้าที่คุณต้องการ
            </Typography>
            <Button
                href={Config.BASE_URL+"/"}
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
                กลับหน้าหลัก
            </Button>
        </Box>
    );
}
export default NotFound;