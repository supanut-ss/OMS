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
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useNotifications } from "../../contexts/NotificationsProvider";
import { useEffect } from "react";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { FormatTimeToText } from "../../config/dateConfig";

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

const getColorByType = (type) => {
  switch (type) {
    case "error":
      return "error.main";
    case "warning":
      return "warning.main";
    default:
      return "primary.main";
  }
};

const NotifyDialog = ({ open, onClose }) => {
  const { notifications, getNotifications, markAsRead, total } =
    useNotifications();

  useEffect(() => {
    if (open) getNotifications(total);
  }, [open, getNotifications, total]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "primary.main",
          color: "white",
        }}
      >
        <NotificationsActiveIcon />
        Notifications
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {notifications.length === 0 ? (
          <Box p={3} textAlign="center">
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
                    px: 3,
                    py: 2,
                    bgcolor: n.is_read
                      ? "background.paper"
                      : "action.hover",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.selected",
                    },
                  }}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  {/* Icon */}
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
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <Typography
                          fontWeight={n.is_read ? 400 : 600}
                          noWrap
                          component="span" // ✅
                        >
                          {n.title}
                        </Typography>

                        {!n.is_read && (
                          <Chip
                            label="ใหม่"
                            size="small"
                            color="primary"
                            sx={{
                              fontSize: "0.65rem",
                              height: 18,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box mt={0.5}>
                        {n.description && (
                          <Typography
                            variant="body2"
                            component="div" // ✅
                            noWrap
                          >
                            {n.description}
                          </Typography>
                        )}

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div" // ✅
                        >
                          {FormatTimeToText(n.create_at)}
                        </Typography>
                      </Box>
                    }
                    secondaryTypographyProps={{
                      component: "div", // ✅ สำคัญมาก
                    }}
                  />
                </ListItem>

                {index < notifications.length - 1 && (
                  <Divider />
                )}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotifyDialog;
