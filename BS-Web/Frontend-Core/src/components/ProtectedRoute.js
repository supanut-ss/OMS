import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Box, CircularProgress } from "@mui/material";
import SecureStorage from "../utils/SecureStorage";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check both React state and SecureStorage to avoid race condition
  // where setIsAuthenticated(true) hasn't committed yet when navigate() fires
  const storageAuth =
    SecureStorage.get("isAuthenticated") === "true" &&
    !!SecureStorage.get("token");
  if (!isAuthenticated && !storageAuth) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
