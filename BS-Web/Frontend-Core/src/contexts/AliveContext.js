import { useEffect, useState, useCallback, useRef } from "react";
import AxiosMaster from "../utils/AxiosMaster";
import SecureStorage from "../utils/SecureStorage";
const DEFAULT_INTERVAL_MS = 12000;

export function useAlive({
  endpoint = "/api/alive",
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
}) {
  const [lastPingAt, setLastPingAt] = useState(null);

  // Cache for last known location to avoid calling geolocation every ping
  const lastLocationRef = useRef(null);
  const lastGetPositionAttemptRef = useRef(0);
  // If the user denies geolocation permission, we set this flag to avoid further attempts
  const permissionDeniedRef = useRef(false);
  //const MIN_GET_POSITION_INTERVAL_MS = 30 * 1000; // only try getCurrentPosition once every 30s at most

  // Helper: get current position once (promise). Returns Position or null
  const getCurrentPositionOnce = (opts = { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 }) =>
    new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);
      // If the user already denied permission, skip trying
      if (permissionDeniedRef.current) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          // If permission denied, mark it so we don't keep prompting
          try {
            if (err && err.code === 1) {
              permissionDeniedRef.current = true;
            }
          } catch (e) {
            // ignore
          }
          resolve(null);
        },
        opts
      );
    });

  // ฟังก์ชันยิง API (ส่ง location เป็น parameter เมื่อมี)
  const sendPing = useCallback(async () => {
    if (!enabled) return;

    let location = null;

    // Prefer cached last location from watchPosition if available
    if (lastLocationRef.current) {
      location = lastLocationRef.current;
    } else {
      // Rate limit getCurrentPosition attempts to avoid frequent blocking calls
      const now = Date.now();
      if (now - (lastGetPositionAttemptRef.current || 0) > DEFAULT_INTERVAL_MS) {
        lastGetPositionAttemptRef.current = now;
        try {
          const pos = await getCurrentPositionOnce();
          if (pos) {
            location = {
              latitude: pos.coords.latitude.toString(),
              longitude: pos.coords.longitude.toString(),
              accuracy: pos.coords.accuracy.toString(),
              timestamp: pos.timestamp,
            };
            lastLocationRef.current = location; // cache for subsequent pings
          }
        } catch (e) {
          // ignore geolocation errors for ping
        }
      }
    }

    try {
      const payload = {
        refresh_token: SecureStorage.get("refresh_token"),
        ...(location ? { location } : {}),
      };
      await AxiosMaster.post(endpoint, payload);
      setLastPingAt(new Date()); // stamp เวลา ping ล่าสุด
    } catch (err) {
      console.error("alive error", err);
    }
  }, [enabled, endpoint]);

  // --- GPS / Location helpers -------------------------------------------------
  // These helpers use the browser Geolocation API and send payloads to the
  // server using AxiosMaster. Adjust the server endpoint ('/location') as needed.
  const locationWatchIdRef = useRef(null);

  // Stop ongoing tracking
  const stopLocationTracking = () => {
    if (locationWatchIdRef.current != null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
      return { status: true };
    }
    return { status: false, message: "No active tracking" };
  };

  // Get current location once and send to alive endpoint
  const sendLocation = async (opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
    if (!navigator?.geolocation) {
      return { status: false, message: "Geolocation not supported" };
    }

    if (permissionDeniedRef.current) {
      return { status: false, message: "Permission denied" };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const payload = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy.toString(),
          altitude: position.coords.altitude?.toString() ?? null,
          heading: position.coords.heading?.toString() ?? null,
          speed: position.coords.speed?.toString() ?? null,
          timestamp: position.timestamp,
        };

        try {
          // Cache last location for pings
          lastLocationRef.current = { ...payload };

          // Send using the alive endpoint
          const res = await AxiosMaster.post(endpoint, {
            refresh_token: SecureStorage.get("refresh_token"),
            location: payload,
          });
          resolve({ status: true, data: res.data });
        } catch (err) {
          console.error("Failed to send location:", err);
          resolve({ status: false, error: err?.message || err });
        }
      },
        (err) => {
          resolve({ status: false, message: err.message, code: err.code });
        },
        { enableHighAccuracy: opts.enableHighAccuracy, timeout: opts.timeout, maximumAge: opts.maximumAge });
    });
  };

  // Start continuous tracking (watchPosition). onUpdate is an optional callback
  // called for each position update. Returns {status, watchId} or error.
  const startLocationTracking = (onUpdate, opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
    if (!navigator?.geolocation) {
      return { status: false, message: "Geolocation not supported" };
    }

    if (permissionDeniedRef.current) {
      return { status: false, message: "Permission denied" };
    }

    if (locationWatchIdRef.current != null) {
      return { status: false, message: "Tracking already started" };
    }

    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const payload = {
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: position.coords.accuracy.toString(),
        timestamp: position.timestamp,
      };

      // Cache last location for ping loop
      lastLocationRef.current = { ...payload };

      // Fire-and-forget send to alive endpoint (include refresh_token); errors logged but don't interrupt tracking
      await AxiosMaster.post(endpoint, {
        refresh_token: SecureStorage.get("refresh_token"),
        location: payload,
      }).catch((err) => {
        console.error("Failed to send tracked location:", err);
      });

      if (typeof onUpdate === "function") {
        try {
          onUpdate(position);
        } catch (err) {
          console.error("onUpdate callback error:", err);
        }
      }
    },
      (err) => {
        console.error("Location watch error:", err);
        // If permission denied, mark and do not restart
        if (err && err.code === 1) {
          permissionDeniedRef.current = true;
          stopLocationTracking();
          return;
        }
        stopLocationTracking();
        if (SecureStorage.get("refresh_token") != null) {
          // Restart tracking for transient errors only
          startLocationTracking();
        }
      },
      { enableHighAccuracy: opts.enableHighAccuracy, timeout: opts.timeout, maximumAge: opts.maximumAge });

    locationWatchIdRef.current = watchId;
    return { status: true, watchId };
  };

  // ---------------------------------------------------------------------------

  // loop ส่ง API
  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      sendPing();
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs, sendPing]);

  const getLastLocation = () => lastLocationRef.current || null;

  // Reset the internal permission-denied flag so the context will try again
  // (call this after you re-request permission successfully)
  const resetLocationPermission = () => {
    permissionDeniedRef.current = false;
    return { status: true };
  };

  return {
    lastPingAt,
    sendPing,
    // Expose location helpers
    sendLocation,
    startLocationTracking,
    stopLocationTracking,
    getLastLocation,
    resetLocationPermission,
  };
}
