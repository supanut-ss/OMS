import axios from "axios";
import SecureStorage from "./SecureStorage";
import Config from "./Config";
import StorageRecovery from "./StorageRecovery";
import Logger from "./logger";

const AxiosMaster = axios.create({
  baseURL: Config.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "secret",
  "pin",
  "otp",
];

const isSensitiveKey = (key = "") =>
  SENSITIVE_KEYS.includes(String(key).toLowerCase());

const sanitizePayload = (value, depth = 0) => {
  if (depth > 4) return "[MaxDepth]";
  if (value == null) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    const formDataObj = {};
    for (const [key, formValue] of value.entries()) {
      if (isSensitiveKey(key)) {
        formDataObj[key] = "[REDACTED]";
      } else if (typeof File !== "undefined" && formValue instanceof File) {
        formDataObj[key] = `[File:${formValue.name}]`;
      } else {
        formDataObj[key] = formValue;
      }
    }
    return formDataObj;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, depth + 1));
  }

  if (typeof value === "object") {
    const output = {};
    Object.keys(value).forEach((key) => {
      if (isSensitiveKey(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = sanitizePayload(value[key], depth + 1);
      }
    });
    return output;
  }

  if (typeof value === "string" && value.length > 1000) {
    return `${value.slice(0, 1000)}...[TRUNCATED]`;
  }

  return value;
};

const safeJsonStringify = (value) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch (e) {
    return "[UnserializablePayload]";
  }
};

const shouldSkipActivityLog = (config = {}) => {
  const url = String(config.url || "");
  const skipHeader =
    config.headers?.["X-Skip-Activity-Log"] ||
    config.headers?.["x-skip-activity-log"];

  return Boolean(skipHeader) || url.includes("/activity-log");
};

const CLIENT_DEVICE_ID_KEY = "client_device_id";

const generateClientDeviceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Config.APP_ENV}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const getClientDeviceId = () => {
  try {
    const existing =
      SecureStorage.get(CLIENT_DEVICE_ID_KEY) ||
      localStorage.getItem(CLIENT_DEVICE_ID_KEY) ||
      sessionStorage.getItem(CLIENT_DEVICE_ID_KEY);

    if (existing && String(existing).trim()) {
      return String(existing).trim();
    }

    const created = generateClientDeviceId();
    try {
      SecureStorage.set(CLIENT_DEVICE_ID_KEY, created);
      localStorage.setItem(CLIENT_DEVICE_ID_KEY, created);
    } catch (_) {
      localStorage.setItem(CLIENT_DEVICE_ID_KEY, created);
    }

    return created;
  } catch (e) {
    console.warn("Failed to get persistent client device id:", e);
    return generateClientDeviceId();
  }
};

const sendApiRequestActivityLog = ({ config, token, clientIp, clientDeviceId }) => {
  if (shouldSkipActivityLog(config)) return;
  if (!token || typeof token !== "string" || !token.trim()) return;

  const method = String(config.method || "GET").toUpperCase();
  const requestData = sanitizePayload(config.data);
  const requestParams = sanitizePayload(config.params);

  const description = safeJsonStringify({
    requestData,
    requestParams,
  });

  const activityHeaders = {
    "Content-Type": "application/json",
    "X-Skip-Activity-Log": "true",
  };

  if (token) {
    activityHeaders.Authorization = `Bearer ${token}`;
  }
  if (clientIp) {
    activityHeaders["X-Client-IP"] = clientIp;
  }
  activityHeaders["X-Client-Device"] = clientDeviceId || "unknown";

  axios
    .post(
      `${Config.API_URL}/activity-log`,
      {
        action_type: "API_REQUEST",
        url: config.url || window.location.pathname,
        method,
        entity: config.url || "api",
        entity_id: "-",
        description: description || "-",
        page: window.location.pathname,
      },
      {
        headers: activityHeaders,
        timeout: 2000,
      },
    )
    .catch((err) => {
      console.warn("API request activity log failed:", err?.message || err);
    });
};

// ---------------------------
// Client IP header support
// - fetches public IP from https://api.ipify.org
// - caches result (SecureStorage/localStorage) for 24h to avoid repeated calls
// - attaches header 'X-Client-IP' to outbound requests when available
// ---------------------------
const IP_CACHE_KEY = "client_ip_info";
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const parseStoredIp = (raw) => {
  try {
    return raw && typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
};

const getCachedIp = () => {
  try {
    let infoRaw =
      SecureStorage.get(IP_CACHE_KEY) ||
      localStorage.getItem(IP_CACHE_KEY) ||
      sessionStorage.getItem(IP_CACHE_KEY);
    const info = parseStoredIp(infoRaw);
    if (info && info.ip && info.ts && Date.now() - info.ts < IP_CACHE_TTL_MS) {
      return info.ip;
    }
  } catch (e) {
    console.error("Error reading cached IP:", e);
  }
  return null;
};

const fetchAndCacheIp = async () => {
  try {
    const resp = await axios.get("https://api.ipify.org?format=json", {
      timeout: 2000,
    });
    const ip = resp?.data?.ip;
    if (ip) {
      const info = { ip, ts: Date.now() };
      try {
        SecureStorage.set(IP_CACHE_KEY, JSON.stringify(info));
        localStorage.setItem(IP_CACHE_KEY, JSON.stringify(info));
      } catch (_) {
        localStorage.setItem(IP_CACHE_KEY, JSON.stringify(info));
      }
      return ip;
    }
  } catch (e) {
    console.warn("Could not fetch public IP:", e);
  }
  return null;
};

const getClientIp = async () => {
  const cached = getCachedIp();
  if (cached) return cached;
  return await fetchAndCacheIp();
};

AxiosMaster.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};

      const existingAuthHeader =
        config.headers?.Authorization || config.headers?.authorization;

      const clientDeviceId = getClientDeviceId();
      config.headers["X-Client-Device"] = clientDeviceId;

      let token = SecureStorage.get("token");
      if (!token) {
        token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
      }

      if (token && typeof token === "string") {
        const validation =
          StorageRecovery.validateToken(token);

        if (validation.valid) {
          config.headers["Authorization"] =
            `Bearer ${token}`;
        } else {
          console.warn(
            "⚠️ Token validation failed:",
            validation.reason
          );
        }
      } else {
        console.warn("⚠️ No valid JWT token found in any storage");
      }

      // Attach client IP header if available (non-blocking but we await briefly)
      let clientIp = null;
      try {
        clientIp = await getClientIp();
        if (clientIp) {
          config.headers["X-Client-IP"] = clientIp;
        }
      } catch (e) {
        console.warn("Failed to attach client IP header:", e);
      }

      // Auto log outbound API request payload (sanitized)
      // Use plain axios to avoid interceptor recursion.
      const tokenForLog =
        (typeof existingAuthHeader === "string" &&
          existingAuthHeader.startsWith("Bearer ") &&
          existingAuthHeader.slice(7)) ||
        token;
      sendApiRequestActivityLog({
        config,
        token: tokenForLog,
        clientIp,
        clientDeviceId,
      });

      return config;
    } catch (error) {
      console.error("❌ Error in request interceptor:", error);
      try {
        await StorageRecovery.cleanCorruptedData(["token"]);
      } catch (fixError) {
        console.error("Failed to auto-fix storage:", fixError);
      }
      return config;
    }
  },
  (error) => Promise.reject(error)
);
const REFRESH_LOCK_KEY = "refresh_lock";
const REFRESH_RESULT_KEY = "refresh_result";
const acquireRefreshLock = () => {
  const existing =
    localStorage.getItem(
      REFRESH_LOCK_KEY
    );

  if (existing) {
    const lockTime =
      parseInt(existing, 10);

    if (
      Date.now() - lockTime <
      30000
    ) {
      return false;
    }
  }

  localStorage.setItem(
    REFRESH_LOCK_KEY,
    Date.now().toString()
  );

  return true;
};
const isRefreshInProgress = () => {
  const lock = localStorage.getItem(REFRESH_LOCK_KEY);

  if (!lock) return false;

  const lockTime = parseInt(lock, 10);

  // lock หมดอายุใน 30 วินาที
  if (Date.now() - lockTime > 30000) {
    localStorage.removeItem(
      REFRESH_LOCK_KEY
    );
    return false;
  }

  return true;
};

const waitForRefreshResult = () =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("storage", listener);
      window.location.href = Config.BASE_URL + "/login";
    }, 30000);

    const listener = (event) => {
      if (
        event.key === REFRESH_RESULT_KEY &&
        event.newValue
      ) {
        clearTimeout(timeout);

        window.removeEventListener(
          "storage",
          listener
        );

        const result = JSON.parse(
          event.newValue
        );

        if (result.success) {
          resolve(result.token);
        } else {
          reject(
            new Error("Refresh failed")
          );
        }
      }
    };

    window.addEventListener(
      "storage",
      listener
    );
  });

let refreshPromise = null;

const refreshAccessToken = async (originalRequest) => {
  try {
    const refreshToken =
      SecureStorage.get("refresh_token") ||
      localStorage.getItem("refresh_token") ||
      sessionStorage.getItem("refresh_token");

    if (!refreshToken) {
      clearCorruptedTokens();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = Config.BASE_URL + "/login";
      }
      throw new Error("No refresh token found");
    }
    const response = await axios.post(
      Config.API_URL + "/refresh",
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Client-IP":
            originalRequest?.headers?.["X-Client-IP"] || "",
          "X-Client-Device":
            originalRequest?.headers?.["X-Client-Device"] ||
            getClientDeviceId(),
        },
      }
    );

    if (response?.data?.message_code !== "0") {
      clearCorruptedTokens();

      window.location.href =
        Config.BASE_URL + "/login";

      throw new Error(
        response?.data?.message ||
        "Refresh token failed"
      );
    }

    const newToken = response.data.data.access_token;
    const newRefreshToken = response.data.data.refresh_token;

    SecureStorage.set("token", newToken);
    SecureStorage.set("refresh_token", newRefreshToken);

    localStorage.setItem(
      REFRESH_RESULT_KEY,
      JSON.stringify({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        ts: Date.now(),
      })
    );
    AxiosMaster.defaults.headers.common.Authorization =
      `Bearer ${newToken}`;

    return newToken;

  }
  catch (err) {
    localStorage.setItem(
      REFRESH_RESULT_KEY,
      JSON.stringify({
        success: false,
        ts: Date.now()
      })
    );

    throw err;
  }
  finally {
    localStorage.removeItem(
      REFRESH_LOCK_KEY
    );
  }
};

AxiosMaster.interceptors.response.use(
  (response) => response,
  async (error) => {
    Logger.error("API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      headers: error.response?.headers,
      fullError: error.response?.data,
    });

    // ตรวจจับ token เสีย
    if (
      error.message &&
      (error.message.includes("Malformed UTF-8") ||
        error.message.includes("non ISO-8859-1 code point") ||
        error.message.includes("Invalid character in header"))
    ) {
      console.error("🚨 Detected corrupted token data, auto-fixing...");
      try {
        await StorageRecovery.autoFixTokenIssues();
      } catch (fixError) {
        console.error("Failed to auto-fix token corruption:", fixError);
      }
      // ponytail: corrupted/expired token can't be recovered for THIS request
      // (header throws client-side, never reaches server -> no 401). Force re-login.
      clearCorruptedTokens();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = Config.BASE_URL + "/login";
      }
      return Promise.reject(error);
    }

    // 🔒 Handle 401 Unauthorized with single-refresh queue
    if (error.response?.status === 401) {
      const originalRequest = error.config;

      if (originalRequest._skipAuthOnError) {
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes("/refresh")) {
        clearCorruptedTokens();
        window.location.href = Config.BASE_URL + "/login";
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {

        let newToken;

        if (!acquireRefreshLock()) {
          newToken =
            await waitForRefreshResult();
          if (newToken) {
            SecureStorage.set(
              "token",
              newToken
            );
          }
        } else {
          if (!refreshPromise) {
            refreshPromise =
              refreshAccessToken(
                originalRequest
              ).finally(() => {
                refreshPromise = null;
              });
          }

          newToken =
            await refreshPromise;
        }
        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;
        return AxiosMaster(originalRequest);
      } catch (refreshError) {
        console.error(
          "Refresh token failed:",
          refreshError
        );

        const status =
          refreshError?.response?.status;
        const missingRefreshToken =
          refreshError?.message === "No refresh token found";

        if (status === 401 || status === 403 || missingRefreshToken) {
          clearCorruptedTokens();

          window.location.href =
            Config.BASE_URL + "/login";
        }

        return Promise.reject(refreshError);
      }
    }


    return Promise.reject(error);
  }
);

const clearCorruptedTokens = () => {
  try {
    SecureStorage.remove("token");
    SecureStorage.remove("refresh_token");
    SecureStorage.remove("isAuthenticated");

    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("isAuthenticated");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("isAuthenticated");
  } catch (error) {
    console.error(error);
  }
};
window.addEventListener(
  "storage",
  (event) => {
    if (
      event.key === "token" &&
      event.newValue
    ) {
      AxiosMaster.defaults.headers.common.Authorization =
        `Bearer ${event.newValue}`;
    }
  }
);
export default AxiosMaster;
