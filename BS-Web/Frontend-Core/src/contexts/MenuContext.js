import { useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";

export function useMenuContext() {
  // ฟังก์ชันเรียกเมนู AssignMenu
  const getMenuAssign = useCallback(async (selectedGroup, selectedPlatform) => {
    try {
      let response = null;
      await AxiosMaster.get(
        `/menu/menuAssign?user_group_id=${selectedGroup}&platform=${selectedPlatform}`
      ).then((res) => {
        response = res?.data ?? null;
      })
      return response;
    } catch (err) {
      console.error("getMenuAssign error", err);
      return null;
    }
  }, []);

  const saveMenuAssign = useCallback(async (checkedMenus) => {
    try {
      const res = await AxiosMaster.post(`/menu/saveAssign`, checkedMenus);
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  }, []);

  const getComboboxPlatform = useCallback(async () => {
    try {
      const res = await AxiosMaster.get(`/combobox/platform`);
      return res.data;
    } catch (err) {
      console.error("getComboboxPlatform error", err);
      return null;
    }
  }, []);

  const getGroupCombobox = useCallback(async () => {
    try {
      const res = await AxiosMaster.get(`/combobox/userGroup`);
      return res.data;
    } catch (err) {
      console.error("getGroupCombobox error", err);
      return null;
    }
  }, []);
  const favorite = useCallback(async (menuId) => {
    try {
      const res = await AxiosMaster.post(`/menu/favorite`, {
        menu_id: menuId
      });
      return res.data;
    } catch (err) {
      return null;
    }
  })
  return {
    getMenuAssign,
    saveMenuAssign,
    getComboboxPlatform,
    getGroupCombobox,
    favorite
  };
}
