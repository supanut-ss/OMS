import React from "react";
import ReactDOM from "react-dom/client";

// Import Roboto font
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Initialize MUI X License Manager
import muiLicenseManager from "./utils/muiLicenseManager";
// 🔇 ปิด console log / info / warn / error (เฉพาะ production)
if (process.env.NODE_ENV === "production") {
  // Suppress installHook.js warnings from browser extensions
  if (typeof window !== "undefined") {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0]?.includes?.("installHook") || args[0]?.includes?.("__REDUX_DEVTOOLS_EXTENSION__")) {
        return;
      }
      originalWarn(...args);
    };
  }

  console.log = () => { };
  console.info = () => { };
  console.warn = () => { };
  console.error = () => { };
}
// Initialize license on app startup
muiLicenseManager.initialize();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
