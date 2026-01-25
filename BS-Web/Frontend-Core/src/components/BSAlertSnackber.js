import { Snackbar, Alert } from "@mui/material";

/**
 * Props:
 *  - open: boolean
 *  - message: string
 *  - autoHideDuration: number (ms)
 *  - severity: "success" | "error" | "warning" | "info"
 *  - onClose: function
 */
const BSAlertSnackbar = ({
    open,
    message = "",
    autoHideDuration = 5000,
    severity = "info",
    onClose,
    vertical = "center",
    horizontal = "center",
    variant = "filled",
    sx={}
}) => {
    const handleClose = (_, reason) => {
        if (reason === "clickaway") return;
        onClose?.();
    };

    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={handleClose}
            anchorOrigin={{ vertical: vertical, horizontal: horizontal }}
        >
            <Alert
                onClose={handleClose}
                severity={severity}
                sx={sx}
                variant={variant}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}
export default BSAlertSnackbar;