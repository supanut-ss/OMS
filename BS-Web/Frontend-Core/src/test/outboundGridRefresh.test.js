import { refreshOutboundGridRef } from "../pages/Transaction/outboundGridRefresh";

describe("refreshOutboundGridRef", () => {
  test("queues refresh while the grid is unmounted", async () => {
    const gridRef = { current: null };
    const pendingRefreshRef = { current: false };

    const refreshed = await refreshOutboundGridRef(gridRef, pendingRefreshRef);

    expect(refreshed).toBe(false);
    expect(pendingRefreshRef.current).toBe(true);
  });

  test("force refreshes a mounted grid and clears the pending refresh", async () => {
    const forceRefresh = jest.fn().mockResolvedValue(undefined);
    const gridRef = { current: { forceRefresh } };
    const pendingRefreshRef = { current: true };

    const refreshed = await refreshOutboundGridRef(gridRef, pendingRefreshRef);

    expect(refreshed).toBe(true);
    expect(forceRefresh).toHaveBeenCalledTimes(1);
    expect(pendingRefreshRef.current).toBe(false);
  });
});
