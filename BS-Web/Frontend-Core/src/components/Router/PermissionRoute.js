import { Navigate, useLocation } from "react-router-dom";
import secureStorage from "../../utils/SecureStorage";

const getPermissionByPath = (menus, path) => {
    if (!menus) return null;

    const allMenus = menus.flatMap(g => g.submenu || []);

    const found = allMenus
        .filter(m => m.menu_path && m.menu_path !== "/")
        .sort((a, b) => b.menu_path.length - a.menu_path.length)
        .find(m => path === m.menu_path || path.startsWith(m.menu_path + "/"))
        || allMenus.find(m => m.menu_path === "/");

    if (found) {
        return {
            is_view: found.is_view ?? false,
            is_add: found.is_add ?? false,
            is_edit: found.is_edit ?? false,
            is_delete: found.is_delete ?? false,
        };
    }

    return null;
};

export default function PermissionRoute({ children }) {
    const location = useLocation();
    const menus = secureStorage.get("menu"); // menu จาก backend

    const permission = getPermissionByPath(menus, location.pathname);
    if (!permission || !permission.is_view) {
        return <Navigate to="/404" replace />;
    }

    return children(permission);
}
