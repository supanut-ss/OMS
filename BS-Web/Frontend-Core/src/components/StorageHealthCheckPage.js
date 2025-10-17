import React, { useState, useEffect, useCallback } from "react";
import StorageRecovery from "../utils/StorageRecovery";
import SecureStorage from "../utils/SecureStorage";

const StorageHealthCheckPage = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    addLog("🔍 Starting storage health check...", "info");

    try {
      const diagnosis = await StorageRecovery.diagnoseAndCleanStorage();
      setHealthStatus(diagnosis);

      if (diagnosis.hasIssues) {
        addLog(`🚨 Found ${diagnosis.issues.length} storage issues`, "error");
        diagnosis.issues.forEach((issue) => {
          addLog(`   - ${issue.key}: ${issue.issue}`, "warn");
        });
      } else {
        addLog("✅ No storage issues detected", "success");
      }
    } catch (error) {
      addLog(`❌ Health check failed: ${error.message}`, "error");
      setHealthStatus({
        hasIssues: true,
        issues: [{ key: "system", issue: error.message }],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Auto-run health check on component mount
    runHealthCheck();
  }, [runHealthCheck]);

  const autoFixIssues = async () => {
    setLoading(true);
    addLog("🔧 Starting auto-fix...", "info");

    try {
      const result = await StorageRecovery.autoFixTokenIssues();

      if (result.issues.length > 0) {
        addLog(`🔧 Fixed ${result.issues.length} issues:`, "success");
        result.fixes.forEach((fix) => {
          addLog(`   - ${fix}`, "success");
        });
      } else {
        addLog("✅ No issues found to fix", "success");
      }

      // Re-run health check
      await runHealthCheck();
    } catch (error) {
      addLog(`❌ Auto-fix failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetAllStorage = async () => {
    if (
      window.confirm(
        "⚠️ This will clear ALL stored data including login tokens. Continue?"
      )
    ) {
      setLoading(true);
      addLog("🔄 Resetting all storage...", "warn");

      try {
        const success = await StorageRecovery.resetAllStorage();
        if (success) {
          addLog("✅ All storage reset successfully", "success");
          addLog("🔄 Page will reload in 2 seconds...", "info");
          setTimeout(() => window.location.reload(), 2000);
        } else {
          addLog("❌ Failed to reset storage", "error");
        }
      } catch (error) {
        addLog(`❌ Storage reset failed: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const testTokenValidation = () => {
    addLog("🧪 Testing token validation...", "info");

    const testTokens = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", // Valid JWT
      "invalid-token", // Invalid format
      "token-with-\x00-null-char", // Invalid characters
      "", // Empty
      null, // Null
    ];

    testTokens.forEach((token, index) => {
      const result = StorageRecovery.validateToken(token);
      const tokenDisplay =
        token === null
          ? "null"
          : token === ""
          ? "empty string"
          : `${String(token).substring(0, 20)}...`;

      if (result.valid) {
        addLog(`   ✅ Token ${index + 1} (${tokenDisplay}): Valid`, "success");
      } else {
        addLog(
          `   ❌ Token ${index + 1} (${tokenDisplay}): ${result.reason}`,
          "error"
        );
      }
    });
  };

  const getCurrentTokenInfo = () => {
    addLog("📊 Checking current tokens...", "info");

    try {
      const token = SecureStorage.get("token");
      const refreshToken = SecureStorage.get("refresh_token");

      if (token) {
        const validation = StorageRecovery.validateToken(token);
        addLog(
          `🔑 Access Token: ${
            validation.valid ? "✅ Valid" : `❌ ${validation.reason}`
          }`,
          validation.valid ? "success" : "error"
        );
      } else {
        addLog("🔑 Access Token: Not found", "warn");
      }

      if (refreshToken) {
        const validation = StorageRecovery.validateToken(refreshToken);
        addLog(
          `🔄 Refresh Token: ${
            validation.valid ? "✅ Valid" : `❌ ${validation.reason}`
          }`,
          validation.valid ? "success" : "error"
        );
      } else {
        addLog("🔄 Refresh Token: Not found", "warn");
      }
    } catch (error) {
      addLog(`❌ Error checking tokens: ${error.message}`, "error");
    }
  };

  const logLevelColors = {
    info: "#2196F3",
    success: "#4CAF50",
    warn: "#FF9800",
    error: "#F44336",
  };

  return (
    <div
      style={{ padding: "20px", fontFamily: "monospace", maxWidth: "1200px" }}
    >
      <h1>🏥 Storage Health Check & Recovery</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "🔍 Checking..." : "🔍 Run Health Check"}
        </button>

        <button
          onClick={autoFixIssues}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "🔧 Fixing..." : "🔧 Auto-Fix Issues"}
        </button>

        <button
          onClick={getCurrentTokenInfo}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          📊 Check Current Tokens
        </button>

        <button
          onClick={testTokenValidation}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          🧪 Test Validation
        </button>

        <button
          onClick={resetAllStorage}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "🔄 Resetting..." : "🔄 Reset All Storage"}
        </button>
      </div>

      {healthStatus && (
        <div
          style={{
            backgroundColor: healthStatus.hasIssues ? "#ffebee" : "#e8f5e8",
            border: `1px solid ${
              healthStatus.hasIssues ? "#f44336" : "#4caf50"
            }`,
            borderRadius: "4px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>
            {healthStatus.hasIssues
              ? "🚨 Issues Detected"
              : "✅ Storage Healthy"}
          </h3>
          {healthStatus.hasIssues && (
            <ul style={{ margin: 0 }}>
              {healthStatus.issues.map((issue, index) => (
                <li key={index}>
                  {issue.key}: {issue.issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          padding: "15px",
          minHeight: "400px",
          maxHeight: "600px",
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0 }}>📋 Diagnostic Logs</h3>
        {logs.length === 0 ? (
          <p style={{ color: "#666" }}>
            No logs yet. Click a button above to start diagnosis.
          </p>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: "5px",
                color: logLevelColors[log.type],
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#666" }}>[{log.timestamp}]</span>{" "}
              {log.message}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <h3>💡 What this tool does:</h3>
        <ul>
          <li>
            🔍 <strong>Health Check:</strong> Scans storage for corrupted tokens
            and data
          </li>
          <li>
            🔧 <strong>Auto-Fix:</strong> Automatically removes invalid or
            corrupted tokens
          </li>
          <li>
            📊 <strong>Token Info:</strong> Shows current token status and
            validation
          </li>
          <li>
            🧪 <strong>Test Validation:</strong> Tests token validation logic
            with sample data
          </li>
          <li>
            🔄 <strong>Reset Storage:</strong> Emergency option to clear all
            stored data
          </li>
        </ul>

        <div
          style={{
            backgroundColor: "#d1ecf1",
            padding: "10px",
            borderRadius: "4px",
            marginTop: "10px",
          }}
        >
          <strong>🚨 Common Issues Fixed:</strong>
          <br />• Malformed UTF-8 data in SecureStorage
          <br />• Invalid characters in JWT tokens
          <br />• Corrupted token formats causing XMLHttpRequest errors
          <br />• Expired or malformed refresh tokens
        </div>
      </div>
    </div>
  );
};

export default StorageHealthCheckPage;
