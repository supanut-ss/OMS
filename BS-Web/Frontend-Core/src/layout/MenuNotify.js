import {
    MenuItem,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    Chip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { FormatTimeToText } from "../config/dateConfig";
import { useNotifications } from "../contexts/NotificationsProvider";
import { useNavigate } from "react-router-dom";
const MenuNoti = ({ notifications, handleNotificationClose }) => {
    const navigate = useNavigate();
    const { markAsRead } = useNotifications();
    const getIconByType = (type) => {
        switch (type) {
            case "error":
                return <ErrorIcon fontSize="small" />;
            case "warning":
                return <WarningIcon fontSize="small" />;
            case "info":
            default:
                return <InfoIcon fontSize="small" />;
        }
    };

    const getColorByType = (type) => {
        switch (type) {
            case "error":
                return "error.main";
            case "warning":
                return "warning.main";
            case "info":
            default:
                return "primary.main";
        }
    };
    return (

        <Box>{notifications &&
            notifications.filter((f)=>!f.is_read).map((n, key) => (
                <MenuItem
                    key={key}
                    onClick={() => {
                        handleNotificationClose();
                        if (!n.is_read) markAsRead(n.id);
                        if (n.link)   navigate(n.link);
                    }}
                    sx={{
                        alignItems: "flex-start",
                        gap: 1.5,
                        py: 2,
                        px: 2,
                        bgcolor: n.is_read ? "background.paper" : "action.hover",
                        "&:hover": {
                            bgcolor: "action.selected",
                        },
                    }}
                >
                    {/* Avatar */}
                    <ListItemAvatar>
                        <Avatar
                            sx={{
                                bgcolor: getColorByType(n.type),
                                width: 40,
                                height: 40,
                            }}
                        >
                            {getIconByType(n.type)}
                        </Avatar>
                    </ListItemAvatar>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: n.is_read ? 400 : 600,
                                    flex: 1,
                                }}
                                noWrap
                            >
                                {n.title}
                            </Typography>

                            {!n.is_read && (
                                <Chip
                                    label="ใหม่"
                                    size="small"
                                    color="primary"
                                    sx={{ fontSize: "0.65rem", height: 18 }}
                                />
                            )}
                        </Box>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            sx={{ mt: 0.5, maxWidth: "200px" }}
                        >
                            {n.description}
                        </Typography>


                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ mt: 0.5, display: "block" }}
                        >
                            {FormatTimeToText(n.create_at)}
                        </Typography>
                    </Box>
                </MenuItem>
            ))
        }</Box>);
}
export default MenuNoti;