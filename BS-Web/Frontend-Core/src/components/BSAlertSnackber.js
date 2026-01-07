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
    horizontal = "center"
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
                sx={{ width: "100%", minWidth: 300, textAlign: "center" }}
                variant="filled"
            >
                {message}
            </Alert>
        </Snackbar>
    );
}
export default BSAlertSnackbar;