const getPermissionByPath = (menus, path) => {
  if (!menus || !path) return null;

  for (const group of menus) {
    const found = group.submenu?.find(
      m => m.menu_path && path.startsWith(m.menu_path)
    );
    if (found) {
      return {
        is_view: found.is_view,
        is_add: found.is_add,
        is_edit: found.is_edit,
        is_delete: found.is_delete
      };
    }
  }
  return null;
};
export { getPermissionByPath };