describe("Logger file error queue", () => {
  const storageKey = "bs_file_error_log_queue";

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    process.env.REACT_APP_API_URL = "/gateway/v1/api";
    global.fetch = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("keeps error log queued when the log endpoint cannot be reached", async () => {
    global.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { default: Logger, flushPendingErrorLogs } = require("./logger");

    Logger.error("API connection failed", new Error("Network Error"));
    await flushPendingErrorLogs();

    const queued = JSON.parse(localStorage.getItem(storageKey));
    expect(queued).toHaveLength(1);
    expect(queued[0].message).toContain("API connection failed");
    expect(queued[0].message).toContain("Network Error");
    expect(global.fetch).toHaveBeenCalledWith(
      "/gateway/v1/api/logging/log",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("flushes queued error logs after the log endpoint is reachable again", async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          id: "queued-1",
          level: "error",
          message: "previous connection failure",
          timestamp: "2026-06-27T10:00:00.000Z",
          url: "http://localhost/my-inventory",
          userAgent: "jest",
          online: false,
          details: []
        }
      ])
    );
    global.fetch.mockResolvedValueOnce({ ok: true });
    const { flushPendingErrorLogs } = require("./logger");

    await flushPendingErrorLogs();

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      "/gateway/v1/api/logging/log",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("previous connection failure")
      })
    );
  });
});
