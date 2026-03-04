import AxiosMaster from "./AxiosMaster";

export const logActivity = async ({
  action_type,
  page,
  entity,
  entity_id,
  method = "GET",
  url = window.location.pathname,
  description = ""
}) => {
  try {
    await AxiosMaster.post("/activity-log", {
      action_type: action_type,
      url: url,
      method: method,
      entity: entity || page || "unknown",
      entity_id: entity_id?.toString() || "-",
      description: description || "-",
      page: page || url || "unknown"
    });
  } catch (err) {
    console.warn("Activity log failed:", err.response?.data || err);
  }
};