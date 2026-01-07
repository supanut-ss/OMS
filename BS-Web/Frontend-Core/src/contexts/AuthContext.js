import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import SecureStorage from "../utils/SecureStorage";
import { jwtDecode } from "jwt-decode";
import AxiosMaster from "../utils/AxiosMaster";
import Config from "../utils/Config";
import { useAlive } from "./AliveContext";
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
  const [isConnectNoti, setIsConnectNoti] = useState(false);
  const { sendLocation, startLocationTracking, stopLocationTracking, resetLocationPermission } = useAlive(
    {
      endpoint: "/alive/status",
      intervalMs: 120000, // 2 นาที
      enabled: isAuthenticated,
    }
  );
  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      const authStatus = SecureStorage.get("isAuthenticated");
      const userInfo = SecureStorage.get("userInfo");

      if (authStatus === "true" && userInfo) {
        setIsAuthenticated(true);
        setUser(userInfo);
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
    }).then(async (res) => {
      if (res.data.message_code === "0") {
        let userinfo = JSON.stringify(jwtDecode(res.data.data.access_token ?? ""));
        setIsAuthenticated(true);
        SecureStorage.set("token", res.data.data.access_token ?? "")
        SecureStorage.set("refresh_token", res.data.data.refresh_token ?? "")
        SecureStorage.set("isAuthenticated", "true");
        SecureStorage.set("userInfo", JSON.parse(userinfo));
        SecureStorage.set("lang", JSON.parse(userinfo).LocaleId ?? "en")
        setUser(userinfo);
        try {
          // Start location tracking upon successful login
          startLocationTracking();
        } catch (e) {
          console.error("Error starting location tracking on login:", e);
        }
        json.status = true;
        json.message = res.data.message_text;
        json.lang = SecureStorage.get("lang");
      } else {
        json.status = false;
        json.message = res.data.message_text;
        json.lang = "en";
      }
    }).finally();
    return json;
  };

  const logout = async () => {
    let json = {
      status: false,
      message: "failed"
    };

    try {
      // Stop any active location tracking before logging out
      try {
        stopLocationTracking();
      } catch (e) {
        console.error("Error stopping location tracking during logout:", e);
      }

      await AxiosMaster.post("/logout", {
        refresh_token: SecureStorage.get("refresh_token") ?? ""
      }).then((res) => {
        if (res.data.message_code === "0") {
          SecureStorage.clearLogout();
          json.status = true;
          json.message = res.data.message_text;
        } else {
          json.status = false;
          json.message = res.data.message_text;
        }
      });
    } catch (err) {
      // ถ้าเจอ 401 จะเข้ามาที่นี่
      // Ensure tracking is stopped even on error
      try {
        stopLocationTracking();
      } catch (e) {
        console.error("Error stopping location tracking after logout failure:", e);
      }

      SecureStorage.clearLogout(); // อาจจะเคลียร์ token แล้วบังคับ logout
      json.status = false;
      json.message = err?.Message || "Unauthorized";
    }

    return json;
  };

  const resource = async () => {

    await AxiosMaster.post("/resource", {
      application_license: Config.LICENSE_KEY,
      platform: "web" // web,pda
    }).then((res) => {
      if (res.data.message_code === "0") {
        SecureStorage.set("resource", res.data.data)
      } else {
        SecureStorage.remove("resource")
      }
    }).finally();
    return true;
  }
  const menu = async () => {
    try {
      await AxiosMaster.get("/menu?platform=web").then((res) => {
        if (res.data.message_code === "0") {
          let menu_group = res.data.data
            // กรองเฉพาะที่ isView = YES
            .filter(item => item.is_view === "YES")
            // จัดกลุ่มตาม menuGroupSequence + menuGroups
            .reduce((acc, item) => {
              const key = `${item.menu_group_sequence}_${item.menu_group}`;
              if (!acc[key]) {
                acc[key] = {
                  menu_group_sequence: item.menu_group_sequence,
                  menu_group_name: item.menu_group,
                  menu_group_path: item.menu_path,
                  submenu: [],
                  is_view: item.is_view === "YES",
                  is_delete: item.is_delete_view === "YES",
                  is_add: item.is_add_view === "YES",
                  is_edit: item.is_edit_view === "YES"
                };
              }
              acc[key].submenu.push({
                menu_id: item.menu_id,
                favorite: item.menu_favorite_id !== 0,
                parent_menu_id: item.parent_menu_id,
                menu_sequence: item.menu_sequence,
                menu_name: item.menu_name,
                menu_path: item.menu_path,
                is_view: item.is_view === "YES",
                is_delete: item.is_delete_view === "YES",
                is_add: item.is_add_view === "YES",
                is_edit: item.is_edit_view === "YES"
              });

              return acc;
            }, {});

          // แปลง object → array และ sort ตามลำดับ group
          menu_group = Object.values(menu_group)
            .sort((a, b) => a.menu_group_sequence - b.menu_group_sequence)
            .map(group => ({
              ...group,
              submenu: group.submenu.sort((a, b) => a.menu_sequence - b.menu_sequence)
            }));
          SecureStorage.set("menu", menu_group);
        }
      }).finally();
    } catch (err) {
      // ถ้าเจอ 401 จะเข้ามาที่นี่
      SecureStorage.clearLogout();
      // อาจจะเคลียร์ token แล้วบังคับ logout
      return false;
    }

    return true;
  }
  const role = async () => {
    await AxiosMaster.get("/role").then((res) => {
      if (res.data.message_code === "0") {
        SecureStorage.set("role", res.data.role)
      } else {
        SecureStorage.remove("role")
      }
    }).finally();
  }
  const switchLang = async (lang) => {
    try {
      await AxiosMaster.post("/users/switch/lang", { lang: lang }).then(
        (res) => {
          if (res.data.message_code !== "0") {
            return false;
          }
        }
      ).finally();
      return true;
    } catch (err) {
      return false;
    }
  }
  const version = async (data) => {

    let res = await AxiosMaster.post('/version', data);
    if (res.status === 200) {
      return res.data.version || ""
    } else {
      return "";
    }
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    resource,
    menu,
    role,
    switchLang,
    loading,
    version,
    // Location controls
    startLocationTracking,
    stopLocationTracking,
    resetLocationPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};
