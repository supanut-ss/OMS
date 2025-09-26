import axios from "axios";
import SecureStorage from "./SecureStorage"; // ถ้ามี secureStorage ที่คุณสร้างไว้
import Config from "./Config";
const AxiosMaster = axios.create({
  baseURL: Config.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosMaster.interceptors.request.use(
  (config) => {
    // Debug: ตรวจสอบ token source
    let token = SecureStorage.get("token");
    if (!token) {
      // Fallback to localStorage/sessionStorage
      token = localStorage.getItem("token") || sessionStorage.getItem("token");
      console.log("🔑 Using fallback token from localStorage/sessionStorage");
    }

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log(
        "🔑 Added Authorization header:",
        `Bearer ${token.substring(0, 20)}...`
      );
    } else {
      console.warn("⚠️ No JWT token found in any storage");
    }

    console.log("📡 API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

AxiosMaster.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
    });

    if (error.response && error.response.status === 401) {
      console.warn("🔒 401 Unauthorized - Token may be expired or invalid");

      // Try to refresh token
      const refreshToken =
        SecureStorage.get("refresh_token") ||
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token");

      if (refreshToken) {
        console.log("🔄 Attempting to refresh token...");
        refresh();
      } else {
        console.error("❌ No refresh token found - redirecting to login");
        // Clear all tokens
        SecureStorage.clear();
        localStorage.clear();
        sessionStorage.clear();
        // Redirect to login if needed
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

const refresh = async () => {
  try {
    console.log("🔄 Starting token refresh...");

    const refreshToken =
      SecureStorage.get("refresh_token") ||
      localStorage.getItem("refresh_token") ||
      sessionStorage.getItem("refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    SecureStorage.remove("token");

    const response = await AxiosMaster.post("/auth/refresh", {
      refresh_token: refreshToken,
    });

    if (response.data.message_code === "0") {
      console.log("✅ Token refreshed successfully");
      SecureStorage.set("token", response.data.data.access_token);
      SecureStorage.set("refresh_token", response.data.data.refresh_token);
    } else {
      throw new Error(response.data.message || "Token refresh failed");
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    SecureStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login
    window.location.href = "/login";
  }
};

export default AxiosMaster;
