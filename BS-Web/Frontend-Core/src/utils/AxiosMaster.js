import axios from "axios";
import SecureStorage from "./SecureStorage"; // ถ้ามี secureStorage ที่คุณสร้างไว้
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
      // Debug: ตรวจสอบ token source
      let token = SecureStorage.get("token");
      if (!token) {
        // Fallback to localStorage/sessionStorage
        token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        //console.log("🔑 Using fallback token from localStorage/sessionStorage");
      }

      if (token && typeof token === "string") {
        // Validate token using StorageRecovery
        const validation = StorageRecovery.validateToken(token);

        if (validation.valid) {
          config.headers["Authorization"] = `Bearer ${token}`;
          // console.log(
          //   "🔑 Added Authorization header:",
          //   `Bearer ${token.substring(0, 20)}...`
          // );
        } else {
          console.warn("⚠️ Token validation failed:", validation.reason);
          // Auto-fix token issues
          await StorageRecovery.autoFixTokenIssues();
        }
      } else {
        console.warn("⚠️ No valid JWT token found in any storage");
      }

      // console.log("📡 API Request:", config.method?.toUpperCase(), config.url);
      return config;
    } catch (error) {
      console.error("❌ Error in request interceptor:", error);
      // Auto-fix storage issues
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
  (response) => {
    // console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error("❌ API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      headers: error.response?.headers,
      fullError: error.response?.data,
    });

    // Check for specific errors that indicate token corruption
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

    if (error.response && error.response.status === 401) {
      console.warn("🔒 401 Unauthorized - Token may be expired or invalid");

      // Try to refresh token
      let refreshToken = null;
      try {
        refreshToken = SecureStorage.get("refresh_token");
      } catch (storageError) {
        console.warn(
          "⚠️ Error getting refresh token from SecureStorage:",
          storageError
        );
      }

      if (!refreshToken) {
        refreshToken =
          localStorage.getItem("refresh_token") ||
          sessionStorage.getItem("refresh_token");
      }

      if (refreshToken) {
        console.log("🔄 Attempting to refresh token...");
        refresh();
      } else {
        console.error("❌ No refresh token found - redirecting to login");
        // Clear all tokens
        clearCorruptedTokens();
        // Redirect to login if needed
        if(Config.BASE_URL && Config.BASE_URL !== "/") {
          window.location.href = Config.BASE_URL ;
        } else {
          window.location.href = "/login";
        }
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

const refresh = async () => {
  try {
    console.log("🔄 Starting token refresh...");

    let refreshToken = null;

    // Try to get refresh token safely
    try {
      refreshToken = SecureStorage.get("refresh_token");
    } catch (error) {
      console.warn("⚠️ Error getting refresh token from SecureStorage:", error);
    }

    if (!refreshToken) {
      refreshToken =
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token");
    }

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Validate refresh token format
    if (typeof refreshToken !== "string" || refreshToken.trim() === "") {
      throw new Error("Invalid refresh token format");
    }

    SecureStorage.remove("token");

    const response = await axios.post(
      Config.API_URL.replace("/gateway/v1/api", "") + "/gateway/v1/api/refresh",
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.message_code === "0") {
      console.log("✅ Token refreshed successfully");
      SecureStorage.set("token", response.data.data.access_token);
      SecureStorage.set("refresh_token", response.data.data.refresh_token);
    } else {
      throw new Error(response.data.message || "Token refresh failed");
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    clearCorruptedTokens();
    // Redirect to login
    //window.location.href = "/login";
  }
};

export default AxiosMaster;
