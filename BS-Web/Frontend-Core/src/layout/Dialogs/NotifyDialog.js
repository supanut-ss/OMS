import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Button,
  useTheme,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { useNotifications } from "../../contexts/NotificationsProvider";
import { useEffect } from "react";
import { FormatTimeToText } from "../../config/dateConfig";
import { useNavigate } from "react-router-dom";

const getIconByType = (type) => {
  switch (type) {
    case "error":
      return <ErrorIcon fontSize="small" />;
    case "warning":
      return <WarningIcon fontSize="small" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
};

const getColorByType = (type, theme) => {
  switch (type) {
    case "error":
      return theme.palette.error.main;
    case "warning":
      return theme.palette.warning.main;
    default:
      return theme.palette.primary.main;
  }
};

const NotifyDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const {
    notifications,
    getNotifications,
    markAsRead,
    deleteNotification,
    clearAll,
    total,
  } = useNotifications();

  useEffect(() => {
    if (open) getNotifications(total);
  }, [open, getNotifications, total]);
  const navigate = useNavigate();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* ===== Header ===== */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsActiveIcon />
          <Typography variant="h6">Notifications</Typography>
        </Box>

        {notifications.length > 0 && (
          <Button
            size="small"
            color="inherit"
            onClick={clearAll}
            sx={{ textTransform: "none" }}
          >
            ลบทั้งหมด
          </Button>
        )}
      </DialogTitle>

      {/* ===== Content ===== */}
      <DialogContent sx={{ p: 0 }}>
        {notifications.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              ไม่มีการแจ้งเตือน
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((n, index) => (
              <Box key={n.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    cursor:"pointer",
                    px: 3,
                    py: 2,
                    bgcolor: n.is_read
                      ? theme.palette.background.paper
                      : theme.palette.action.hover,
                    transition: "background-color .2s",
                    "&:hover": {
                      bgcolor: theme.palette.action.selected,
                    },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // ❗ กัน click parent
                        deleteNotification(n.id);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  }
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.link) {
                      onClose();
                      navigate(n.link);
                    }
                  }}
                >
                  {/* Avatar */}
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getColorByType(n.type, theme),
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getIconByType(n.type)}
                    </Avatar>
                  </ListItemAvatar>

                  {/* Text */}
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          fontWeight={n.is_read ? 400 : 600}
                          noWrap
                          component="span"
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
                    }
                    secondary={
                      <Box mt={0.5}>
                        {n.description && (
                          <Typography
                            variant="body2"
                            component="div"
                            noWrap
                            color="text.secondary"
                          >
                            {n.description}
                          </Typography>
                        )}

                        <Typography
                          variant="caption"
                          component="div"
                          color="text.disabled"
                        >
                          {FormatTimeToText(n.create_at)}
                        </Typography>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                </ListItem>

                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotifyDialog;
