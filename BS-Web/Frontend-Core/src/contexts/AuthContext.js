import React, { createContext, useContext, useState, useEffect } from "react";
import SecureStorage from "../utils/SecureStorage";
import { jwtDecode } from "jwt-decode";
import AxiosMaster from "../utils/AxiosMaster";
import Config from "../utils/Config";
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      const authStatus = SecureStorage.get("isAuthenticated");
      const userInfo = SecureStorage.get("userInfo");

      if (authStatus === "true" && userInfo) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userInfo));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (userData) => {
    let json = {
      status: false,
      message: "failed"
    }
    await AxiosMaster.post("/login", {
      application_license: Config.LICENSE_KEY,
      ...userData
    }).then((res) => {
      if (res.data.message_code === "0") {
        let userinfo = JSON.stringify(jwtDecode(res.data.data.access_token ?? ""));
        setIsAuthenticated(true);
        SecureStorage.set("token", res.data.data.access_token ?? "")
        SecureStorage.set("refresh_token", res.data.data.refresh_token ?? "")
        SecureStorage.set("isAuthenticated", "true");
        SecureStorage.set("userInfo", userinfo);
        setUser(userinfo);
        json.status = true;
        json.message = res.data.message_text;
      } else {
        json.status = false;
        json.message = res.data.message_text;
      }
    }).finally();
    return json;
  };

  const logout = async () => {
    let json = {
      status: false,
      message: "failed"
    }
    await AxiosMaster.post("/logout", {
      refresh_token: SecureStorage.get("refresh_token") ?? ""
    }).then((res) => {
      if (res.data.message_code === "0") {
        SecureStorage.clear();
        json.status = true;
        json.message = res.data.message_text;
      } else {
        json.status = false;
        json.message = res.data.message_text;
      }
    }).finally();
    return json;
  };
  const resource = async ()=>{
  
    await AxiosMaster.post("/resource", {
      application_license: Config.LICENSE_KEY,
      platform : "web" // web,pda
    }).then((res) => {
      if (res.data.message_code === "0") {
        SecureStorage.set("resouce",res.data.data)
      } else {
        SecureStorage.remove("resouce")
      }
    }).finally();
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    resource,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
