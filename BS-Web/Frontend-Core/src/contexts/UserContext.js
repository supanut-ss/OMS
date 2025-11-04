import { useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";

export function UserContext() {
  const registerUser = useCallback(async (user) => {
    try {
      const res = await AxiosMaster.post(`/users/register`, user);
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  }, []);

  const updateUser = useCallback(async (user) => {
    try {
      const res = await AxiosMaster.post(`/users/update`, user);
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  }, []);

  const deleteUser = async (user) => {
    try {
      const res = await AxiosMaster.post(`/users/delete?userIdDel=${user}`);
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  };

  return {
    registerUser,
    updateUser,
    deleteUser,
  };
}
