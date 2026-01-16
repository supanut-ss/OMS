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
      // แปลง null ทั้ง object
      const cleanUser = Object.fromEntries(
        Object.entries(user).map(([key, value]) => [
          key,
          value === null ? "" : value,
        ])
      );

      const res = await AxiosMaster.post(`/users/update`, cleanUser);
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

  const resetPassword = async (user_id) => {
    try {
      const res = await AxiosMaster.post(`/users/reset`, {
        userId: user_id,
      });
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  };
  const newPassword = async (passwordData) => {
    try {
      const res = await AxiosMaster.post("/reset_password", passwordData);
      return res.data;
    } catch (err) {
      console.error("error ", err);
      return null;
    }
  }
  return {
    registerUser,
    updateUser,
    deleteUser,
    resetPassword,
    newPassword
  };
}
