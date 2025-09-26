import { BrowserRouter } from "react-router-dom";
import ThemeContextProvider from "./themes/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";
import JWTDebugger from "./utils/JWTDebugger";

// Import JWTDebugger for development debugging
if (process.env.NODE_ENV === "development") {
  console.log("🔧 Development mode: JWTDebugger available");
  console.log("Use JWTDebugger.checkTokens() to debug JWT issues");
  JWTDebugger.checkTokens();
}

export default function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeContextProvider>
  );
}
