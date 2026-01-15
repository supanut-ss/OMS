import { Navigate, Outlet, useLocation } from "react-router-dom";
import secureStorage from "../../utils/SecureStorage";

const isMatch = (path, menuPath) =>
  path === menuPath || path.startsWith(menuPath + "/");

const collectMenus = (menus) => {
  const list = [];

  for (const g of menus || []) {
    // 🔹 menu group ที่มี path
    if (g.menu_group_path) {
      list.push({
        menu_path: g.menu_group_path,
        is_view: g.is_view,
        is_add: g.is_add,
        is_edit: g.is_edit,
        is_delete: g.is_delete,
      });
    }

    // 🔹 submenu
    for (const m of g.submenu || []) {
      if (m.menu_path) {
        list.push({
          menu_path: m.menu_path,
          is_view: m.is_view,
          is_add: m.is_add,
          is_edit: m.is_edit,
          is_delete: m.is_delete,
        });
      }
    }
  }
  return list;
};

export default function PermissionRoute({ children }) {
  const location = useLocation();
  const menus = secureStorage.get("menu") || [];

  const allMenus = collectMenus(menus);
  const found =
    allMenus
      .filter(m => m.menu_path && m.menu_path !== "/")
      .sort((a, b) => b.menu_path.length - a.menu_path.length)
      .find(m => isMatch(location.pathname, m.menu_path))
    || allMenus.find(m => m.menu_path === "/");

  if (!found?.is_view) {
    return <Navigate to="/404" replace />;
  }

  return <Outlet context={{ permission: found }} />;
}