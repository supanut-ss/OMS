import { Navigate, useLocation } from "react-router-dom";
import secureStorage from "../../utils/SecureStorage";

const getPermissionByPath = (menus, path) => {
    if (!menus) return null;

    for (const group of menus) {
        const found = group.submenu?.find(
            m => m.menu_path && path.startsWith(m.menu_path)
        );
        if (found) {
            return {
                is_view: found.is_view,
                is_add: found.is_add,
                is_edit: found.is_edit,
                is_delete: found.is_delete,
            };
        }
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
