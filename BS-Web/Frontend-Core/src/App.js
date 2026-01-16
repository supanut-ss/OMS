import { BrowserRouter } from "react-router-dom";
import ThemeContextProvider from "./themes/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";
// import JWTDebugger from "./utils/JWTDebugger";
import Config from "./utils/Config";
import { NotificationsProvider } from "./contexts/NotificationsProvider";

// Import debugging tools for development
// if (process.env.NODE_ENV === "development") {
//   // Import APITester dynamically to avoid unused import warning
//   import("./utils/APITester").then(({ default: APITester }) => {
//     window.APITester = APITester;
//   });

//   console.log("🔧 Development mode: Debug tools available");
//   console.log("💡 Available tools:");
//   console.log("  - JWTDebugger.checkTokens() - Check JWT token status");
//   console.log("  - APITester.testAutocomplete() - Test autocomplete endpoint");
//   console.log("  - APITester.runFullDiagnostic() - Run full API diagnostic");

//   // Initial token check
//   JWTDebugger.checkTokens();
// }

export default function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
        <NotificationsProvider>
          <BrowserRouter basename={Config.BASE_URL} >
            <AppRoutes />
          </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeContextProvider>
  );
}
