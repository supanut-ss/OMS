export const refreshOutboundGridRef = async (
  gridRef,
  pendingRefreshRef,
) => {
  const grid = gridRef.current;

  if (typeof grid?.forceRefresh === "function") {
    await grid.forceRefresh();
    pendingRefreshRef.current = false;
    return true;
  }

  if (typeof grid?.refreshData === "function") {
    await grid.refreshData(true);
    pendingRefreshRef.current = false;
    return true;
  }

  pendingRefreshRef.current = true;
  return false;
};
