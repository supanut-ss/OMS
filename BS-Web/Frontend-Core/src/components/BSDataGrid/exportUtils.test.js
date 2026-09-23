import { buildExportData } from "./exportUtils";

describe("BSDataGrid exportUtils", () => {
  test("uses column valueFormatter so exported dates match the grid display", () => {
    const rows = [
      {
        document_date: "2026-07-07T09:42:27.327",
      },
    ];
    const columns = [
      {
        field: "document_date",
        headerName: "Document Date",
        valueFormatter: (value) => {
          const date = new Date(value);
          return [
            String(date.getDate()).padStart(2, "0"),
            String(date.getMonth() + 1).padStart(2, "0"),
            date.getFullYear(),
          ].join("/");
        },
      },
    ];

    expect(buildExportData(rows, columns)).toEqual([
      {
        "Document Date": "07/07/2026",
      },
    ]);
  });

  test("applies valueGetter before valueFormatter for client-grid date columns", () => {
    const rows = [
      {
        document_date: "2026-07-07T09:42:27.327",
      },
    ];
    const columns = [
      {
        field: "document_date",
        headerName: "Document Date",
        valueGetter: (value) => new Date(value),
        valueFormatter: (value) => {
          expect(value).toBeInstanceOf(Date);
          return value.toISOString().slice(0, 10);
        },
      },
    ];

    expect(buildExportData(rows, columns)).toEqual([
      {
        "Document Date": "2026-07-07",
      },
    ]);
  });
});
