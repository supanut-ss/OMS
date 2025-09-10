import { useEffect, useState } from "react";
import SecureStorage from "../utils/SecureStorage";

export default function useMenuItems() {
  const [menuItems, setMenuItems] = useState(null);

  useEffect(() => {
    if (menuItems === null) {
      const storedMenu = SecureStorage.get("menu");
      if (storedMenu) {
        let menu = Object.values(storedMenu)
          .sort((a, b) => a.menu_group_sequence - b.menu_group_sequence)
          .map((m) => ({
            text: m.menu_group_name,
            path: m.menu_group_path,
            submenu: m.submenu
              .sort((a, b) => a.menu_sequence - b.menu_sequence)
              .filter((f) => f.parent_menu_id > 0)
              .map((s) => ({
                text: s.menu_name,
                path: s.menu_path,
                is_view: s.is_view,
                is_delete: s.is_delete,
                is_add: s.is_add,
                is_edit: s.is_edit,
              })),
          }));
        setMenuItems(menu); // ✅ ต้องเซ็ต state
      }
    }
  }, [menuItems]);

  return menuItems;
}
