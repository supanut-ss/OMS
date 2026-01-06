import axios from "axios";
import SecureStorage from "./SecureStorage";
import Config from "./Config";
import StorageRecovery from "./StorageRecovery";
import signalrService from "../services/signalrService";

const AxiosMaster = axios.create({
  baseURL: Config.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      let token = SecureStorage.get("token");
      if (!token) {
        token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
      }

      if (token && typeof token === "string") {
        const validation = StorageRecovery.validateToken(token);
        if (validation.valid) {
          config.headers["Authorization"] = `Bearer ${token}`;
        } else {
          console.warn("⚠️ Token validation failed:", validation.reason);
          await StorageRecovery.autoFixTokenIssues();
        }
      } else {
        console.warn("⚠️ No valid JWT token found in any storage");
      }

      // Attach client IP header if available (non-blocking but we await briefly)
      try {
        const clientIp = await getClientIp();
        if (clientIp) {
          config.headers["X-Client-IP"] = clientIp;
        }
      } catch (e) {
        console.warn("Failed to attach client IP header:", e);
      }

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

let isRefreshing = false;
let refreshSubscribers = [];



const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};
const onRefreshFailed = (err) => {
  refreshSubscribers.forEach((cb) => cb(null, err));
  refreshSubscribers = [];
};



AxiosMaster.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error("❌ API Error:", {
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
        clearCorruptedTokens();
      }
    }

    // 🔒 Handle 401 Unauthorized with single-refresh queue
    if (error.response && error.response.status === 401) {
      console.warn("🔒 401 Unauthorized - Token may be expired or invalid");

      const originalRequest = error.config;


      // ป้องกัน loop 401 ซ้ำ
      if (originalRequest._retry) {
        console.error("🚫 Token refresh retry already attempted, redirecting to login");
        clearCorruptedTokens();
        await signalrService.stop();
        window.location.href = Config.BASE_URL + "/login";
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // ดึง refresh token
      let refreshToken =
        SecureStorage.get("refresh_token") ||
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token");

      if (!refreshToken) {
        console.error("❌ No refresh token found - redirecting to login");
        clearCorruptedTokens();
        await signalrService.stop();
        window.location.href = Config.BASE_URL + "/login";
        return Promise.reject(error);
      }

      // ถ้ามีการ refresh อยู่แล้ว ให้รอผล (subscribe)
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token, err) => {
            const storedToken = SecureStorage.get("token") ||
              localStorage.getItem("token") ||
              sessionStorage.getItem("token") || token;
            if (err || !token) {
              reject(err || new Error("Token refresh failed"));
              return;
            }
            try {
              AxiosMaster.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
            } catch (e) {
              console.warn("Failed to update Axios default header:", e);
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers["Authorization"] = `Bearer ${storedToken}`;
            const retryRequest = { ...originalRequest, headers: { ...originalRequest.headers } };
            resolve(AxiosMaster(retryRequest));
          });
        });
      }

      isRefreshing = true;

      // เริ่ม refresh และแจ้ง subscribers เมื่อเสร็จ
      return new Promise(async (resolve, reject) => {
        try {
          console.log("🔄 Attempting to refresh token...");
          const refreshResponse = await axios.post(
            Config.API_URL + "/refresh",
            { refresh_token: refreshToken },
            { headers: { "Content-Type": "application/json", "X-Client-IP": originalRequest.headers["X-Client-IP"] || "" } }
          );

          if (refreshResponse.data.message_code === "0") {
            console.log("✅ Token refreshed successfully");

            const newToken = refreshResponse.data.data.access_token;
            const newRefresh = refreshResponse.data.data.refresh_token;

            // เก็บ token ใหม่
            SecureStorage.set("token", newToken);
            SecureStorage.set("refresh_token", newRefresh);

            // แจ้ง subscribers
            onRefreshed(newToken);

            // อัปเดต header ของ request เดิม
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

            // 🔁 เรียก API เดิมใหม่อีกครั้ง
            // note: do NOT finalize the queue here; the retried request will finalize when it completes
            resolve(AxiosMaster(originalRequest));
          } else {
            throw new Error(refreshResponse.data.message || "Token refresh failed");
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          onRefreshFailed(refreshError);
          clearCorruptedTokens();
          await signalrService.stop();
          window.location.href = Config.BASE_URL + "/login";
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }


    return Promise.reject(error);
  }
);

const clearCorruptedTokens = () => {
  try {
    console.log("🧹 Clearing potentially corrupted tokens...");
    SecureStorage.remove("token");
    SecureStorage.remove("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refresh_token");
  } catch (error) {
    console.error("❌ Error clearing tokens:", error);
  }
};

export default AxiosMaster;
