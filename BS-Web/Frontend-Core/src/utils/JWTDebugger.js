import SecureStorage from "./SecureStorage";

/**
 * JWT Debug Utility สำหรับตรวจสอบปัญหา authentication
 */
class JWTDebugger {
  static checkTokens() {
    console.group("🔍 JWT Token Debug");

    // Check SecureStorage
    const secureToken = SecureStorage.get("token");
    const secureRefreshToken = SecureStorage.get("refresh_token");

    // Check localStorage
    const localToken = localStorage.getItem("token");
    const localRefreshToken = localStorage.getItem("refresh_token");

    // Check sessionStorage
    const sessionToken = sessionStorage.getItem("token");
    const sessionRefreshToken = sessionStorage.getItem("refresh_token");

    console.log("📦 SecureStorage:", {
      token: secureToken ? "✅ EXISTS" : "❌ NOT FOUND",
      refresh_token: secureRefreshToken ? "✅ EXISTS" : "❌ NOT FOUND",
    });

    console.log("💾 localStorage:", {
      token: localToken ? "✅ EXISTS" : "❌ NOT FOUND",
      refresh_token: localRefreshToken ? "✅ EXISTS" : "❌ NOT FOUND",
    });

    console.log("🔄 sessionStorage:", {
      token: sessionToken ? "✅ EXISTS" : "❌ NOT FOUND",
      refresh_token: sessionRefreshToken ? "✅ EXISTS" : "❌ NOT FOUND",
    });

    // Check token validity (basic check)
    const activeToken = secureToken || localToken || sessionToken;
    if (activeToken) {
      try {
        const payload = JSON.parse(atob(activeToken.split(".")[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        console.log("⏰ Token Info:", {
          expires: new Date(payload.exp * 1000).toLocaleString(),
          isExpired: isExpired ? "❌ EXPIRED" : "✅ VALID",
          user: payload.sub || payload.username || "Unknown",
        });
      } catch (e) {
        console.error("❌ Invalid token format:", e.message);
      }
    }

    console.groupEnd();

    return {
      hasToken: !!activeToken,
      sources: {
        secure: !!secureToken,
        local: !!localToken,
        session: !!sessionToken,
      },
    };
  }

  static setDummyToken() {
    console.log("🧪 Setting dummy JWT token for testing...");

    // Create a dummy JWT token (for development only)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: "test-user",
        username: "developer",
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      })
    );
    const signature = "dummy-signature-for-testing";

    const dummyToken = `${header}.${payload}.${signature}`;

    // Set in all storages
    SecureStorage.set("token", dummyToken);
    localStorage.setItem("token", dummyToken);

    console.log("✅ Dummy token set successfully");
    return dummyToken;
  }

  static clearAllTokens() {
    console.log("🧹 Clearing all tokens...");

    SecureStorage.clear();
    localStorage.clear();
    sessionStorage.clear();

    console.log("✅ All tokens cleared");
  }

  static testAPICall() {
    console.log("🧪 Testing API call with current token...");

    import("../utils/AxiosMaster")
      .then(({ default: AxiosMaster }) => {
        return AxiosMaster.get("/dynamic/metadata/test?schemaName=dbo");
      })
      .then((response) => {
        console.log("✅ API call successful:", response.status);
      })
      .catch((error) => {
        console.error("❌ API call failed:", {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
      });
  }
}

// Make available globally for debugging
window.JWTDebugger = JWTDebugger;

export default JWTDebugger;
