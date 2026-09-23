import AxiosMaster from "./AxiosMaster";
import SecureStorage from "./SecureStorage";

const getAccessToken = () => {
  return (
    SecureStorage.get("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};

export const logActivity = async ({
  action_type,
  page,
  entity,
  entity_id,
  method = "GET",
  url = window.location.pathname,
  description = ""
}) => {
  const accessToken = getAccessToken();
  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
    return;
  }

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