// Test MUI X License Configuration
import React from "react";
import { LicenseInfo } from "@mui/x-data-grid-pro";

// Environment check
console.log("🔍 Environment Variables Check:");
console.log(
  "REACT_APP_MUI_X_LICENSE_KEY:",
  process.env.REACT_APP_MUI_X_LICENSE_KEY ? "✅ Found" : "❌ Missing"
);

// License info check
const license = process.env.REACT_APP_MUI_X_LICENSE_KEY;
if (license) {
  try {
    LicenseInfo.setLicenseKey(license);
    console.log("✅ MUI X Pro license key set successfully");
    console.log(
      "License Key (first 20 chars):",
      license.substring(0, 20) + "..."
    );
  } catch (error) {
    console.error("❌ Error setting license key:", error);
  }
} else {
  console.warn("⚠️ No license key found in environment variables");
  console.warn("Available environment variables starting with REACT_APP_:");
  Object.keys(process.env)
    .filter((key) => key.startsWith("REACT_APP_"))
    .forEach((key) =>
      console.log(`  ${key}: ${process.env[key] ? "Set" : "Not set"}`)
    );
}

export default function LicenseTest() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>MUI X License Test</h2>
      <p>Check the console for license configuration results.</p>
      <pre>License Status: {license ? "✅ Configured" : "❌ Missing"}</pre>
    </div>
  );
}
