import AxiosMaster from "./AxiosMaster";

/**
 * API Endpoint Tester สำหรับทดสอบ Gateway endpoints
 */
class APITester {
  static async testGatewayHealth() {
    console.group("🏥 Gateway Health Check");

    try {
      // Test basic connectivity without auth
      const response = await fetch(
        `${process.env.REACT_APP_API_URL?.replace(
          "/gateway/v1/api",
          ""
        )}/health`
      );
      console.log("✅ Gateway Health:", response.status, response.statusText);
    } catch (error) {
      console.error("❌ Gateway Health Failed:", error.message);
    }

    console.groupEnd();
  }

  static async testAuthenticatedEndpoints() {
    console.group("🔒 Testing Authenticated Endpoints");

    const endpoints = [
      {
        path: "/autocomplete",
        method: "POST",
        data: {
          table: "t_customer",
          schema: "dbo",
          where: "name LIKE '%test%'",
        },
      },
      {
        path: "/dynamic/metadata/test",
        method: "GET",
        params: { schemaName: "dbo" },
      },
      { path: "/menu", method: "GET" },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🧪 Testing ${endpoint.method} ${endpoint.path}...`);

        let response;
        if (endpoint.method === "GET") {
          response = await AxiosMaster.get(endpoint.path, {
            params: endpoint.params,
          });
        } else {
          response = await AxiosMaster.post(endpoint.path, endpoint.data);
        }

        console.log(`✅ ${endpoint.path}:`, response.status, "Success");
      } catch (error) {
        console.error(`❌ ${endpoint.path}:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          details: error.response?.data,
        });

        // If 401, try to decode the error details
        if (error.response?.status === 401) {
          this.analyzeAuthError(error, endpoint.path);
        }
      }
    }

    console.groupEnd();
  }

  static analyzeAuthError(error, endpoint) {
    console.group(`🔍 401 Analysis for ${endpoint}`);

    const authHeader = error.config?.headers?.Authorization;
    console.log(
      "📤 Sent Authorization Header:",
      authHeader ? "Present" : "Missing"
    );

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const parts = token.split(".");

        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const isExpired = payload.exp * 1000 < Date.now();

          console.log("🔍 Token Analysis:", {
            format: "✅ Valid JWT format",
            expires: new Date(payload.exp * 1000).toLocaleString(),
            isExpired: isExpired ? "❌ EXPIRED" : "✅ VALID",
            user: payload.sub || payload.username || "Unknown",
            issuer: payload.iss || "Unknown",
            audience: payload.aud || "Unknown",
          });

          if (isExpired) {
            console.warn("⚠️ Token is expired - this is likely the cause");
          }
        } else {
          console.error("❌ Invalid JWT format - token should have 3 parts");
        }
      } catch (e) {
        console.error("❌ Cannot decode token:", e.message);
      }
    }

    // Check response for specific error messages
    const responseData = error.response?.data;
    if (responseData) {
      console.log("📥 Server Response:", responseData);

      if (
        typeof responseData === "string" &&
        responseData.includes("Unauthorized")
      ) {
        console.warn("🔒 Server explicitly rejected authentication");
      }
    }

    console.groupEnd();
  }

  static async testTokenRefresh() {
    console.group("🔄 Token Refresh Test");

    try {
      // Get current refresh token
      const refreshToken =
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token");

      if (!refreshToken) {
        console.error("❌ No refresh token found");
        console.groupEnd();
        return;
      }

      console.log("🔑 Refresh token found, attempting refresh...");

      const response = await AxiosMaster.post("/auth/refresh", {
        refresh_token: refreshToken,
      });

      console.log("✅ Token refresh successful:", response.status);
      console.log("📊 New token info:", {
        access_token: response.data.data?.access_token
          ? "✅ Received"
          : "❌ Missing",
        refresh_token: response.data.data?.refresh_token
          ? "✅ Received"
          : "❌ Missing",
        message_code: response.data.message_code,
      });
    } catch (error) {
      console.error("❌ Token refresh failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        details: error.response?.data,
      });
    }

    console.groupEnd();
  }

  static async runFullDiagnostic() {
    console.group("🏥 Full API Diagnostic");
    console.log("Starting comprehensive API diagnostic...");

    // 1. Test Gateway Health
    await this.testGatewayHealth();

    // 2. Test Token Refresh (if needed)
    await this.testTokenRefresh();

    // 3. Test Authenticated Endpoints
    await this.testAuthenticatedEndpoints();

    console.log("✅ Diagnostic complete");
    console.groupEnd();
  }

  // Quick test for the specific autocomplete issue
  static async testAutocomplete() {
    console.group("🔍 Autocomplete Specific Test");

    try {
      console.log("🧪 Testing autocomplete endpoint...");

      const testData = {
        table: "t_customer",
        schema: "dbo",
        where: "name LIKE '%test%'",
        order_by: "name",
        columns: [
          { field: "name", display: true, filter: true, key: false },
          { field: "email", display: true, filter: false, key: false },
        ],
        include_blank: false,
      };

      const response = await AxiosMaster.post("/autocomplete", testData);
      console.log("✅ Autocomplete Success:", response.status, response.data);
    } catch (error) {
      console.error("❌ Autocomplete Failed:");
      this.analyzeAuthError(error, "/autocomplete");

      // Additional suggestions
      console.group("💡 Troubleshooting Suggestions");
      console.log("1. Check if bs_core_api service is running");
      console.log("2. Verify JWT token is not expired");
      console.log("3. Check Gateway logs for authentication errors");
      console.log("4. Ensure CORS is properly configured");
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Make available globally
window.APITester = APITester;

export default APITester;
