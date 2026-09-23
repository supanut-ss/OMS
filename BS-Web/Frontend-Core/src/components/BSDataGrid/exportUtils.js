const getColumnRawValue = (row, col, apiRef) => {
  const rawValue = row?.[col.field];

  if (typeof col.valueGetter !== "function") {
    return rawValue;
  }

  try {
    return col.valueGetter(rawValue, row, col, apiRef);
  } catch {
    try {
      return col.valueGetter({
        value: rawValue,
        row,
        field: col.field,
        colDef: col,
        api: apiRef?.current,
      });
    } catch {
      return rawValue;
    }
  }
};

export const getExportCellValue = (row, col, rowIndex, apiRef) => {
  if (col.field === "__rowNumber") {
    return rowIndex + 1;
  }

  const rawValue = getColumnRawValue(row, col, apiRef);

  if (typeof col.valueFormatter === "function") {
    try {
      const formattedValue = col.valueFormatter(rawValue, row, col, apiRef);
      if (formattedValue !== null && formattedValue !== undefined) {
        return formattedValue;
      }
    } catch {
      try {
        const formattedValue = col.valueFormatter({
          value: rawValue,
          row,
          field: col.field,
          colDef: col,
          api: apiRef?.current,
        });
        if (formattedValue !== null && formattedValue !== undefined) {
          return formattedValue;
        }
      } catch {
        // Fall through to raw value.
      }
    }
  }

  if (typeof rawValue === "boolean") {
    return rawValue ? "Yes" : "No";
  }

  return rawValue ?? "";
};

export const buildExportData = (dataRows, visibleColumns, apiRef) => {
  return dataRows.map((row, index) => {
    const exportRow = {};
    visibleColumns.forEach((col) => {
      const header = col.headerName || col.field;
      exportRow[header] = getExportCellValue(row, col, index, apiRef);
    });
    return exportRow;
  });
};
