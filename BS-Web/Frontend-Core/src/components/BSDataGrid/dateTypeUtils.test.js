import {
  getDateFieldDataType,
  resolveDateDisplayDataType,
} from "./dateTypeUtils";

describe("dateTypeUtils", () => {
  test("keeps metadata datetime for create_date audit fields", () => {
    expect(
      resolveDateDisplayDataType(
        "create_date",
        "2026-06-23T09:45:30",
        "datetime",
      ),
    ).toBe("datetime");
  });

  test("falls back to value and field-name inference only when metadata is missing", () => {
    expect(getDateFieldDataType("create_date")).toBe("date");
    expect(resolveDateDisplayDataType("create_date", "2026-06-23")).toBe("date");
    expect(resolveDateDisplayDataType("create_date", "2026-06-23T09:45:30")).toBe(
      "datetime",
    );
    expect(resolveDateDisplayDataType("event_datetime", "2026-06-23T09:45:30")).toBe(
      "datetime",
    );
  });
});
