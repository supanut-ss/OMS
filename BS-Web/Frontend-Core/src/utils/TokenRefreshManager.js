import SecureStorage from "./SecureStorage";
import Config from "./Config";
import axios from "axios";
import Logger from "./logger";

/**
 * Token Refresh Manager with Lock Mechanism
 * Prevents multiple simultaneous token refresh attempts
 * Queues failed requests and retries them after successful refresh
 */
class TokenRefreshManager {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  /**
   * Process failed API calls queue after successful token refresh
   * @param {Error|null} error - Error if refresh failed
   * @param {string|null} token - New token if refresh succeeded
   */
  processQueue(error = null, token = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Refresh token with lock mechanism
   * Prevents multiple simultaneous refresh attempts
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    // If already refreshing, queue this request
    if (this.isRefreshing) {
      Logger.log("🔒 Token refresh already in progress, queueing request...");
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      Logger.log("🔄 Starting token refresh (with lock)...");

      let refreshToken = SecureStorage.get("refresh_token");
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

      Logger.log("🗑️ Removing old access token...");
      SecureStorage.remove("token");

      const response = await axios.post(
        Config.API_URL.replace("/gateway/v1/api", "") +
          "/gateway/v1/api/refresh",
        { refresh_token: refreshToken },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.message_code === "0") {
        const newToken = response.data.data.access_token;
        const newRefreshToken = response.data.data.refresh_token;

        // Save new tokens
        SecureStorage.set("token", newToken);
        SecureStorage.set("refresh_token", newRefreshToken);

        Logger.log(
          "✅ Token refreshed successfully (processing queued requests)..."
        );
        Logger.log(`📦 Queued requests to process: ${this.failedQueue.length}`);

        // Process queued requests with new token
        this.processQueue(null, newToken);

        return newToken;
      } else {
        throw new Error(response.data.message || "Token refresh failed");
      }
    } catch (error) {
      Logger.error("❌ Token refresh failed:", error);

      // Process queued requests with error
      this.processQueue(error, null);

      // Clear tokens and redirect to login
      this.clearTokens();
      this.redirectToLogin();

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear all tokens from storage
   */
  clearTokens() {
    try {
      Logger.log("🧹 Clearing all tokens...");
      SecureStorage.remove("token");
      SecureStorage.remove("refresh_token");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("refresh_token");
    } catch (error) {
      Logger.error("❌ Error clearing tokens:", error);
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    Logger.log("🚪 Redirecting to login...");
    if (Config.BASE_URL && Config.BASE_URL !== "/") {
      window.location.href = Config.BASE_URL + "/login";
    } else {
      window.location.href = "/login";
    }
  }

  /**
   * Get current queue status (for debugging)
   */
  getQueueStatus() {
    return {
      isRefreshing: this.isRefreshing,
      queueLength: this.failedQueue.length,
    };
  }
}

// Create and export singleton instance
const tokenRefreshManager = new TokenRefreshManager();
export default tokenRefreshManager;
