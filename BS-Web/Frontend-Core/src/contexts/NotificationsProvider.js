import React, { createContext, useContext, useCallback, useState } from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  Box,
  Typography,
  Button,
} from "@mui/material";

const NotificationsContext = createContext(null);
export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children, maxSnack = 5 }) {
  const [snacks, setSnacks] = useState([]);
  const [alarm, setAlarm] = useState(null); // ⭐ FULLSCREEN ALARM

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

      // Windows Notification
      if (Notification.permission === "granted") {
        new Notification("แจ้งเตือนใหม่", { body: message });
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
    setAlarm({
      title: title || "SYSTEM ALARM",
      message,
    });

    if (Notification.permission === "granted") {
      new Notification("🚨 SYSTEM ALARM", {
        body: message,
        requireInteraction: true,
      });
    }
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
    <NotificationsContext.Provider value={{ enqueue, enqueueAlarm }}>
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
          <Alert severity={s.severity} variant="filled">
            {s.message}
          </Alert>
        </Snackbar>
      ))}

      {/* FULL SCREEN ALARM */}
      <Dialog fullScreen open={Boolean(alarm)}>
        <Box
          sx={{
            height: "100vh",
            bgcolor: "error.dark",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 4,
          }}
        >
          <Typography variant="h2" fontWeight="bold">
            🚨 SYSTEM ALARM
          </Typography>

          <Typography variant="h4" sx={{ mt: 3 }}>
            {alarm?.title}
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
            ACKNOWLEDGE
          </Button>
        </Box>
      </Dialog>
    </NotificationsContext.Provider>
  );
}
