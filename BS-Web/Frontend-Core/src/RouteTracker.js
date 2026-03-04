import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { logActivity } from "./utils/ActivityLogger";

let lastTrackedPage = null;

const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPage = `${location.pathname}${location.search || ""}`;
    if (lastTrackedPage === currentPage) return;

    logActivity({
      action_type: "PAGE_VIEW",
      page: currentPage,
      entity_id: "-",
      description: "Page viewed",
    });

    lastTrackedPage = currentPage;
  }, [location.pathname, location.search]);

  return null;
};

export default RouteTracker;