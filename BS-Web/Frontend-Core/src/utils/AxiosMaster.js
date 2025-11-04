import axios from "axios";
import SecureStorage from "./SecureStorage";
import Config from "./Config";
import StorageRecovery from "./StorageRecovery";

const AxiosMaster = axios.create({
  baseURL: Config.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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

    // 🔒 Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn("🔒 401 Unauthorized - Token may be expired or invalid");

      const originalRequest = error.config;

      // ป้องกัน loop 401 ซ้ำ
      if (originalRequest._retry) {
        console.error("🚫 Token refresh retry already attempted, redirecting to login");
        clearCorruptedTokens();
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
        window.location.href = Config.BASE_URL + "/login";
        return Promise.reject(error);
      }

      try {
        console.log("🔄 Attempting to refresh token...");
        const refreshResponse = await axios.post(
          Config.API_URL.replace("/gateway/v1/api", "") + "/gateway/v1/api/refresh",
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        if (refreshResponse.data.message_code === "0") {
          console.log("✅ Token refreshed successfully");

          const newToken = refreshResponse.data.data.access_token;
          const newRefresh = refreshResponse.data.data.refresh_token;

          // เก็บ token ใหม่
          SecureStorage.set("token", newToken);
          SecureStorage.set("refresh_token", newRefresh);

          // อัปเดต header ของ request เดิม
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

          // 🔁 เรียก API เดิมใหม่อีกครั้ง
          return AxiosMaster(originalRequest);
        } else {
          throw new Error(refreshResponse.data.message || "Token refresh failed");
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        clearCorruptedTokens();
        window.location.href = Config.BASE_URL + "/login";
        return Promise.reject(refreshError);
      }
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
