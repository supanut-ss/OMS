import { useCallback } from "react";
import AxiosMaster from "../utils/AxiosMaster";

const OutboundContext = () => {
    const GetOutbound = useCallback(async (outbound_master_id) => {
        try {
            const res = await AxiosMaster.get(`/outbound/${outbound_master_id}`);
            return res.data;
        } catch (err) {
            console.error("error ", err);
            return null;
        }
    }, []);
    const InsertOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post("/outbound", request);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);
    const UpdateOutbound = useCallback(async (outbound_master_id, request) => {
        try {
            const res = await AxiosMaster.post(`/outbound/update/${outbound_master_id}`, request);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);

    const DeleteOutbound = useCallback(async (outbound_master_id) => {
        try {
            const res = await AxiosMaster.post(`/outbound/delete/${outbound_master_id}`);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);

    const ReleaseUserOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post('/outbound/release-user', request);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);

    const ReleaseOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post('/outbound/release', request);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);

    const UnreleaseUserOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post('/outbound/unrelease-user', request);
            return res.data;
        }
        catch (err) {
            console.error('error ', err);
            throw err;
        }
    }, []);

    const UnreleaseOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post('/outbound/unrelease', request);
            return res.data;
        }
        catch (err) {
            console.error('error ', err);
            throw err;
        }
    }, []);

    const CancelOrderOutbound = useCallback(async (request) => {
        try {
            const res = await AxiosMaster.post('/outbound/cancel-order', request);
            return res.data;
        }
        catch (err) {
            console.error('error ', err);
            throw err;
        }
    }, []);

    const ConfirmShipOutbound = useCallback(async (outbound_master_id) => {
        try {
            const res = await AxiosMaster.post(`/outbound/confirm-ship/${outbound_master_id}`);
            return res.data;
        }
        catch (err) {
            console.error("error ", err);
            throw err;
        }
    }, []);

    return {
        GetOutbound,
        InsertOutbound,
        UpdateOutbound,
        DeleteOutbound,
        ReleaseUserOutbound,
        ReleaseOutbound,
        UnreleaseUserOutbound,
        UnreleaseOutbound,
        CancelOrderOutbound,
        ConfirmShipOutbound,
    };
}
export default OutboundContext;