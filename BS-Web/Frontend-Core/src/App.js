import { BrowserRouter } from "react-router-dom";
import ThemeContextProvider from "./themes/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";

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
