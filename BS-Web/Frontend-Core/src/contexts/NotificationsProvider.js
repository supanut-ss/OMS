import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  Box,
  Typography,
  Button,
} from "@mui/material";
import cat from "../assets/images/nyan-cat.gif";
import NotifyContext from "./NotifyContext";
import useNotificationSound from "../hooks/useNotificationSound";
const NotificationsContext = createContext(null);
export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children, maxSnack = 5 }) {
  const { getNotify, markNotifyAsRead, deleteNotify,getBannerNotify } = NotifyContext();
  const [snacks, setSnacks] = useState([]);
  const [alarm, setAlarm] = useState(null); // ⭐ FULLSCREEN ALARM
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(-1);
  const [totalUnread, setTotalUnread] = useState(0);
  const [bannerNotify, setBannerNotify] = useState(null);
  const prevUnreadRef = useRef(0);
  useNotificationSound(
    totalUnread > prevUnreadRef.current
  );

  useEffect(() => {
    prevUnreadRef.current = totalUnread;
  }, [totalUnread]);
  //---------- Fetch Banner Notify ----------
  const fetchBannerNotify = useCallback(async () => {
    const response = await getBannerNotify();
    if (response?.message_code === 0) {
      setBannerNotify(response.data);
    } else {
      setBannerNotify(null);
    }
  }, [getBannerNotify]);

  //----------Notification ----------
  const getNotifications = useCallback(async (limit) => {
    const response = await getNotify(limit);
    if (response?.message_code === 0) {
      setNotifications([...response.data]);
      setTotal(response.total);
      setTotalUnread(response.unread_total);
    } else {
      setNotifications([]);
      setTotal(0);
      setTotalUnread(0);
    }
  }, [getNotify]);

  const markAsRead = useCallback(async (id) => {
    const response = await markNotifyAsRead(id);
    if (response?.message_code === 0) {
      setTotal(response.total);
      setTotalUnread(response.unread_total);
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    }
  }, [markNotifyAsRead]);
  const deleteNotification = useCallback(async (id) => {
    const response = await deleteNotify(id);
    if (response?.message_code === 0) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, [deleteNotify]);

  const clearAll = useCallback(async () => {
    console.log("delete all", notifications);
    notifications.forEach(async (notification) => {
      await deleteNotify(notification.id);
    })
    setNotifications([]);
  }, []);
  // ---------- Normal Notification ----------
  const enqueue = useCallback(
    ({ message, severity = "info", duration = 5000 }) => {
      const item = {
        key: Date.now() + Math.random(),
        message,
        severity,
        duration,
        open: true,
      };

      // Defer Windows Notification to prevent blocking (non-blocking)
      if (Notification.permission === "granted") {
        setTimeout(() => {
          new Notification("แจ้งเตือนใหม่", { body: message });
        }, 0);
      }

      setSnacks(prev => {
        const next = [item, ...prev];
        return next.slice(0, maxSnack);
      });
    },
    [maxSnack]
  );

  // ---------- FULLSCREEN ALARM ----------
  const enqueueAlarm = useCallback(({ title, message }) => {
    // Defer state update to prevent blocking
    setTimeout(() => {
      setAlarm({
        title: title || "SYSTEM ALARM",
        message,
      });

      // Defer Windows Notification to prevent blocking (non-blocking)
      if (Notification.permission === "granted") {
        setTimeout(() => {
          new Notification("🚨 SYSTEM ALARM", {
            body: message,
            requireInteraction: true,
          });
        }, 0);
      }
    }, 0);
  }, []);

  const closeAlarm = useCallback(() => {
    setAlarm(null);
  }, []);

  // ---------- Snackbar handlers ----------
  const handleClose = (key, _, reason) => {
    if (reason === "clickaway") return;
    setSnacks(prev =>
      prev.map(s => (s.key === key ? { ...s, open: false } : s))
    );
  };

  const handleExited = key => {
    setSnacks(prev => prev.filter(s => s.key !== key));
  };

  return (
    <NotificationsContext.Provider value={{
      bannerNotify,fetchBannerNotify,enqueue, enqueueAlarm, getNotifications, markAsRead, notifications, totalUnread, total, deleteNotification, clearAll
    }}>
      {children}

      {/* Snackbar */}
      {snacks.map((s, index) => (
        <Snackbar
          key={s.key}
          open={s.open}
          autoHideDuration={s.duration}
          onClose={(e, r) => handleClose(s.key, e, r)}
          onExited={() => handleExited(s.key)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ mb: `${index * 64}px` }}
        >
          <Alert severity={s.severity} >
            {s.message}
          </Alert>
        </Snackbar>
      ))}

      {/* FULL SCREEN ALARM */}
      <Dialog fullScreen open={Boolean(alarm)}>
        <Box
          sx={{
            height: "150vh",
            background: "linear-gradient(135deg, #1d2671, #c33764)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 4,
          }}
        >
          <img src={cat} alt="Alarm" width="500vw" />
          {/* <Typography variant="h2" fontWeight="bold">
            🚨 SYSTEM ALARM
          </Typography> */}

          <Typography variant="h2">
            🚨 {alarm?.title}
          </Typography>

          <Typography variant="h5" sx={{ mt: 2 }}>
            {alarm?.message}
          </Typography>

          <Button
            variant="contained"
            color="warning"
            size="large"
            sx={{ mt: 6, px: 6, py: 2, fontSize: 20 }}
            onClick={closeAlarm}
          >
            กดเพื่อปิดแจ้งเตือน
          </Button>
        </Box>
      </Dialog>
      {/* <BSFloatingChatButton
        users={users}
        unreadCounts={unreadCounts}
       // selectUser={selectUser}
        userId={userId}
      /> */}
    </NotificationsContext.Provider>
  );
}
