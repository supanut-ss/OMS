import SecureStorage from "../utils/SecureStorage";
export const useMenuItems = () => {
  const menuItems = () => {
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
              menu_id: s.menu_id,
              favorite: s.favorite,
              text: s.menu_name,
              path: s.menu_path,
              is_view: s.is_view,
              is_delete: s.is_delete,
              is_add: s.is_add,
              is_edit: s.is_edit,
            })),
        }));
      return menu;
    }
    return [];
  }
  return { menuItems };
}


