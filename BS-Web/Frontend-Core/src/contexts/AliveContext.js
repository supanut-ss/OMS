import { useEffect, useState, useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";
import SecureStorage from "../utils/SecureStorage";
const DEFAULT_INTERVAL_MS = 30_000;

export function useAlive({
  endpoint = "/api/alive",
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
}) {
    const [lastPingAt, setLastPingAt] = useState(null);
  // ฟังก์ชันยิง API
  const sendPing = useCallback(async () => {
    if (!enabled) return;

    try {
     await AxiosMaster.post(endpoint, {
        refresh_token: SecureStorage.get("refresh_token"),
      }).then(async(res)=>{
        if(res.data.message_code !== "0"){
           SecureStorage.clear();
        }
      });
      setLastPingAt(new Date()); // stamp เวลา ping ล่าสุด
    } catch (err) {
      console.error("alive error", err);
    }
  }, [enabled, endpoint]);

  // loop ส่ง API
  useEffect(() => {
  if (!enabled) return;

  const id = setInterval(() => {
    sendPing();
  }, intervalMs);

  return () => clearInterval(id);
}, [enabled, intervalMs, sendPing]);

  return {lastPingAt, sendPing };
}
