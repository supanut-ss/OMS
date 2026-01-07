import React, { createContext, useContext, useCallback, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const NotificationsContext = createContext(null);
export const useNotifications = () => useContext(NotificationsContext);

/**
 * NotificationsProvider
 * - แสดง notification ใหม่ทันที (new on top)
 * - แต่ละ notification มีเวลาเป็นของตัวเอง
 * - ปิดเมื่อ timeout หรือผู้ใช้กดปิด -> จะลบเฉพาะตัวนั้น
 * - `maxSnack` จำกัดจำนวนที่แสดงพร้อมกัน (default 5)
 */
export function NotificationsProvider({ children, maxSnack = 5 }) {
  const [snacks, setSnacks] = useState([]); // newest first - index 0 is top

  const enqueue = useCallback(({ message, severity = "info", duration = 5000 }) => {
    const item = { key: Date.now() + Math.random(), message, severity, duration, open: true };
    setSnacks(prev => {
      const next = [item, ...prev];
      return next.slice(0, maxSnack);
    });
  }, [maxSnack]);

  const handleClose = useCallback((key, event, reason) => {
    if (reason === "clickaway") return; // ignore clickaway if you want full duration
    setSnacks(prev => prev.map(s => (s.key === key ? { ...s, open: false } : s)));
  }, []);

  const handleExited = useCallback((key) => {
    setSnacks(prev => prev.filter(s => s.key !== key));
  }, []);

  return (
    <NotificationsContext.Provider value={{ enqueue }}>
      {children}
      {snacks.map((s, index) => (
        <Snackbar
          key={s.key}
          open={s.open}
          autoHideDuration={s.duration}
          onClose={(e, r) => handleClose(s.key, e, r)}
          onExited={() => handleExited(s.key)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{
            // เว้นระยะเพื่อไม่ให้ overlap (ปรับค่า 64px ตามความสูง/spacing ที่ต้องการ)
            mb: `${index * 64}px`,
            maxWidth: "90vw",
          }}
        >
          <Alert
            onClose={(e) => handleClose(s.key, e, "closeButton")}
            severity={s.severity}
            variant="filled"
            sx={{ minWidth: 300, textAlign: "center" }}
          >
            {s.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationsContext.Provider>
  );
}