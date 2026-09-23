import AxiosMaster from "../utils/AxiosMaster";

const RfidContext = () => {
    const UpdateItemToggleActive = async (body) => {
        try {
            const res = await AxiosMaster.post("/rfi/item_master/toggle_active", body);
            return res.data;
        } catch (err) {
            return null;
        }
    }
    const GetItemMasterByUid = async (uid) => {
        try {
            const res = await AxiosMaster.get("/rfi/item_master/get_by_uid/" + uid);
            return res.data;
        } catch (err) {
            return null;
        }
    }
    const UpdateReplaceTag = async (data) => {
        try {
            const res = await AxiosMaster.post("/rfi/item_master/replace_tag", data);
            return res.data;
        } catch (err) {
            return null;
        }
    }
    return {
        UpdateItemToggleActive,
        GetItemMasterByUid,
        UpdateReplaceTag
    }
}
export default RfidContext;