import { useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";

const NotifyContext = () => {
    const deleteNotify = useCallback(async (notifyId) => {
        try {
            const res = await AxiosMaster.post(`/notify/delete/${notifyId}`);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const getNotify = useCallback(async (limit) => {
        try {
            const res = await AxiosMaster.get("/notify?limit=" + limit ?? 10);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const getBannerNotify = useCallback(async () => {
        try {
            const res = await AxiosMaster.get("/notify/banner");
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const markNotifyAsRead = useCallback(async (id) => {
        try {
            const res = await AxiosMaster.post(`/notify/read/${id}`);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const bannerManager = useCallback(async (data) => {
        try {
            const res = await AxiosMaster.post("/notify/banner/manage", data);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const bannerDelete = useCallback(async (id) => {
        try {
            const res = await AxiosMaster.post(`/notify/banner/delete`, { id });
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const bannerDetails = useCallback(async (id) => {
        try {
            const res = await AxiosMaster.get(`/notify/banner/${id}`);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []); 
    return {
        getNotify,
        markNotifyAsRead,
        deleteNotify,
        getBannerNotify,
        bannerManager,
        bannerDelete,
        bannerDetails,
    };
};
export default NotifyContext;