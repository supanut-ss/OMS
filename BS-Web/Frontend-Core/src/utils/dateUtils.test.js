describe("dateUtils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("formatDate uses configured default date and datetime formats", async () => {
    process.env.REACT_APP_DATE_FORMAT = "YYYY-MM-DD";
    process.env.REACT_APP_DATETIME_FORMAT = "YYYY-MM-DD HH:mm";

    const { formatDate } = await import("./dateUtils");
    const value = new Date(2026, 0, 5, 9, 7, 3);

    expect(formatDate(value)).toBe("2026-01-05");
    expect(formatDate(value, { includeTime: true })).toBe("2026-01-05 09:07");
  });

  test("formatDate keeps Thai Buddhist year with configured default format", async () => {
    process.env.REACT_APP_DATE_FORMAT = "DD/MM/YYYY";

    const { formatDate } = await import("./dateUtils");
    const value = new Date(2026, 0, 5);

    expect(formatDate(value, { locale: "th" })).toBe("05/01/2569");
  });

  test("formatDate formats raw ISO date strings from grid rows", async () => {
    process.env.REACT_APP_DATE_FORMAT = "DD/MM/YYYY";

    const { formatDate } = await import("./dateUtils");

    expect(formatDate("2026-06-12T00:00:00")).toBe("12/06/2026");
  });
});
