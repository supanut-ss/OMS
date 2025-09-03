import { Box, Typography, Button } from "@mui/material";

const NotFound = () => {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)"
            }}
        >
            <Typography variant="h1" sx={{ fontSize: "6rem", color: "#6366f1", m: 0 }}>
                404
            </Typography>
            <Typography variant="h5" sx={{ color: "#334155", mb: 2 }}>
                Page Not Found
            </Typography>
            <Typography sx={{ color: "#64748b", mb: 4 }}>
                ขออภัย ไม่พบหน้าที่คุณต้องการ
            </Typography>
            <Button
                href="/"
                variant="contained"
                sx={{
                    background: "#6366f1",
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