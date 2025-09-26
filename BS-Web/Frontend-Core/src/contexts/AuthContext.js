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
    };

    try {
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
      });
    } catch (err) {
      // ถ้าเจอ 401 จะเข้ามาที่นี่
      SecureStorage.clear(); // อาจจะเคลียร์ token แล้วบังคับ logout
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
        SecureStorage.set("resouce", res.data.data)
      } else {
        SecureStorage.remove("resouce")
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
      SecureStorage.clear(); // อาจจะเคลียร์ token แล้วบังคับ logout
      return false;
    }

    return true;
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    resource,
    menu,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
