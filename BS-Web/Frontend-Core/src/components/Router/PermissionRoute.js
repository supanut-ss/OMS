import { Navigate, Outlet, useLocation } from "react-router-dom";
import secureStorage from "../../utils/SecureStorage";

export default function PermissionRoute() {
  const location = useLocation();
  const menus = secureStorage.get("menu") || [];

  const isMatch = (path, menuPath) =>
    path === menuPath || path.startsWith(menuPath + "/");

  // รวมทุก menu + submenu
  const allMenus = menus.flatMap(g => [
    ...(g.menu_group_path
      ? [{
          menu_path: g.menu_group_path,
          ...g
        }]
      : []),
    ...(g.submenu || [])
  ]);

  // เรียงจาก menu_sequence และ menu_group_sequence (match ให้แม่น)
  const sorted = allMenus
    .filter(m => m.menu_path)
    .sort((a, b) => a.menu_sequence - b.menu_sequence || (a.menu_group_sequence || 0) - (b.menu_group_sequence || 0));

  // หา menu ที่ match path ปัจจุบัน
  const current = sorted.find(m => isMatch(location.pathname, m.menu_path));
  // 🔹 CASE 1: path = "/" แต่ไม่มี permission
  if (location.pathname === "/") {
    if (current?.is_view) {
      return <Outlet context={{ permission: current }} />;
    }

    // หา menu แรกที่เปิดได้
    const firstAllowed = sorted.find(
      m => m.menu_path !== "/" && m.is_view
    );

    if (firstAllowed) {
      return <Navigate to={firstAllowed.menu_path} replace />;
    }

    // ไม่มีสิทธิ์อะไรเลย
    return <Navigate to="/404" replace />;
  }

  // 🔹 CASE 2: path อื่น ๆ
  if (!current?.is_view) {
    return <Navigate to="/404" replace />;
  }

  return <Outlet context={{ permission: current }} />;
}