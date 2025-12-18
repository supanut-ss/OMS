/**
 * usePermission Hook
 * ดึงสิทธิ์การเข้าถึง (View, Add, Edit, Delete) ตาม menu path ปัจจุบัน
 *
 * โครงสร้างข้อมูล menu ใน SecureStorage:
 * [
 *   {
 *     menu_group_name: "Master",
 *     submenu: [
 *       {
 *         menu_path: "/master/customer",
 *         is_view: true,
 *         is_add: true,
 *         is_edit: true,
 *         is_delete: true
 *       }
 *     ]
 *   }
 * ]
 *
 * การใช้งาน:
 * @example
 * // ใช้กับ path ปัจจุบันอัตโนมัติ
 * const { canView, canAdd, canEdit, canDelete } = usePermission();
 *
 * @example
 * // ระบุ path เอง
 * const { canView, canAdd, canEdit, canDelete } = usePermission("/master/customer");
 *
 * @example
 * // ใช้ใน BSDataGrid
 * <BSDataGrid
 *   showAdd={canAdd}
 *   bsVisibleEdit={canEdit}
 *   bsVisibleDelete={canDelete}
 *   bsVisibleView={canView}
 * />
 */

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import SecureStorage from "../utils/SecureStorage";

/**
 * Hook สำหรับดึงสิทธิ์ permission ตาม menu path
 *
 * @param {string} [customPath] - Path ที่ต้องการเช็คสิทธิ์ (ถ้าไม่ระบุจะใช้ path ปัจจุบัน)
 * @returns {Object} Permission object
 * @returns {boolean} returns.canView - สิทธิ์ดูข้อมูล
 * @returns {boolean} returns.canAdd - สิทธิ์เพิ่มข้อมูล
 * @returns {boolean} returns.canEdit - สิทธิ์แก้ไขข้อมูล
 * @returns {boolean} returns.canDelete - สิทธิ์ลบข้อมูล
 * @returns {Object} returns.permissions - Object รวมสิทธิ์ทั้งหมด
 * @returns {string} returns.currentPath - Path ที่ใช้เช็คสิทธิ์
 */
export const usePermission = (customPath) => {
  const location = useLocation();

  const permissions = useMemo(() => {
    // ใช้ path ที่ส่งมา หรือ path ปัจจุบัน
    const targetPath = customPath || location.pathname;

    // Default permissions (ถ้าไม่เจอ menu หรือไม่มีสิทธิ์)
    const defaultPermissions = {
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      currentPath: targetPath,
      menuItem: null,
    };

    try {
      // ดึง menu จาก SecureStorage
      const storedMenu = SecureStorage.get("menu");

      if (!storedMenu || !Array.isArray(storedMenu)) {
        console.warn("usePermission: No menu data found in SecureStorage");
        return defaultPermissions;
      }

      // ค้นหา menu item ที่ตรงกับ path
      let foundMenuItem = null;

      for (const menuGroup of storedMenu) {
        if (menuGroup.submenu && Array.isArray(menuGroup.submenu)) {
          // เช็ค exact match ก่อน
          foundMenuItem = menuGroup.submenu.find(
            (item) => item.menu_path === targetPath
          );

          // ถ้าไม่เจอ exact match ลองเช็คแบบ starts with (สำหรับ nested routes)
          if (!foundMenuItem) {
            foundMenuItem = menuGroup.submenu.find(
              (item) =>
                targetPath.startsWith(item.menu_path) && item.menu_path !== "/"
            );
          }

          if (foundMenuItem) break;
        }
      }

      if (!foundMenuItem) {
        console.warn(
          `usePermission: No menu item found for path: ${targetPath}`
        );
        return defaultPermissions;
      }

      // Return permissions from found menu item
      return {
        canView: foundMenuItem.is_view === true,
        canAdd: foundMenuItem.is_add === true,
        canEdit: foundMenuItem.is_edit === true,
        canDelete: foundMenuItem.is_delete === true,
        currentPath: targetPath,
        menuItem: foundMenuItem,
      };
    } catch (error) {
      console.error("usePermission: Error getting permissions", error);
      return defaultPermissions;
    }
  }, [customPath, location.pathname]);

  return permissions;
};

/**
 * ฟังก์ชันสำหรับดึงสิทธิ์โดยตรง (ไม่ใช้ Hook)
 * ใช้ในกรณีที่ต้องการเช็คสิทธิ์นอก React Component
 *
 * @param {string} path - Path ที่ต้องการเช็คสิทธิ์
 * @returns {Object} Permission object
 */
export const getPermission = (path) => {
  const defaultPermissions = {
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
  };

  try {
    const storedMenu = SecureStorage.get("menu");

    if (!storedMenu || !Array.isArray(storedMenu)) {
      return defaultPermissions;
    }

    let foundMenuItem = null;

    for (const menuGroup of storedMenu) {
      if (menuGroup.submenu && Array.isArray(menuGroup.submenu)) {
        foundMenuItem = menuGroup.submenu.find(
          (item) => item.menu_path === path
        );

        if (!foundMenuItem) {
          foundMenuItem = menuGroup.submenu.find(
            (item) => path.startsWith(item.menu_path) && item.menu_path !== "/"
          );
        }

        if (foundMenuItem) break;
      }
    }

    if (!foundMenuItem) {
      return defaultPermissions;
    }

    return {
      canView: foundMenuItem.is_view === true,
      canAdd: foundMenuItem.is_add === true,
      canEdit: foundMenuItem.is_edit === true,
      canDelete: foundMenuItem.is_delete === true,
    };
  } catch (error) {
    console.error("getPermission: Error getting permissions", error);
    return defaultPermissions;
  }
};

export default usePermission;
