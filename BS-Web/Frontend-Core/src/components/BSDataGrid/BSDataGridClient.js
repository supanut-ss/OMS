import React, { useState, useCallback, useMemo } from "react";
import {
  DataGridPro,
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridActionsCellItem,
} from "@mui/x-data-grid-pro";
import { Paper, Box, Typography, Button, Alert, Chip } from "@mui/material";
import {
  Visibility,
  FilterList as FilterListIcon,
  FilterListOff as FilterListOffIcon,
} from "@mui/icons-material";
import Logger from "../../utils/logger";
import { logActivity } from "../../utils/ActivityLogger";

// Custom Toolbar for client-side DataGrid
const ClientGridToolbar = ({ headerFiltersEnabled, onToggleHeaderFilters }) => {
  return (
    <GridToolbarContainer>
      {/* Quick Filter */}
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarQuickFilter placeholder="ค้นหาข้อมูล..." debounceMs={500} />

      {/* Header Filters Toggle */}
      <Button
        size="small"
        onClick={onToggleHeaderFilters}
        variant={headerFiltersEnabled ? "outlined" : "text"}
        startIcon={
          headerFiltersEnabled ? <FilterListIcon /> : <FilterListOffIcon />
        }
        sx={{ mr: 1 }}
      >
        {headerFiltersEnabled ? "Hide Filters" : "Show Filters"}
      </Button>
    </GridToolbarContainer>
  );
};

/**
 * BSDataGridClient - Client-side only DataGrid component for displaying JSON data
 *
 * การใช้งานพื้นฐาน:
 * <BSDataGridClient
 *   data={jsonData}
 *   columns={columnDefs}
 * />
 *
 * การใช้งานแบบเต็ม:
 * <BSDataGridClient
 *   data={jsonData}
 *   columns={columnDefs}
 *   bsLocale="th"
 *   bsCols="name,email,phone"
 *   bsPinColsLeft="name,id"
 *   bsPinColsRight="actions"
 *   bsRowPerPage={25}
 *   bsShowCheckbox={false}
 *   bsShowRowNumber={true}
 *   bsShowCharacterCount={false}
 *   bsUserLookup={{
 *     table: "sec.t_com_user",
 *     idField: "user_id",
 *     displayFields: ["first_name", "last_name"],
 *     separator: " "
 *   }}
 *   height="600px"
 *   onRowClick={(row) => console.log('Row clicked:', row)}
 *   onView={(row) => console.log('View:', row)}
 * />
 *
 * @data: Array of JSON objects to display
 * @columns: Array of column definitions with structure:
 *   [
 *     {
 *       field: "columnName",
 *       headerName: "Display Name",
 *       type: "string|number|date|boolean",
 *       width: 150,
 *       format: "currency|percentage|date|datetime" // optional
 *     }
 *   ]
 *
 * Features:
 * - Client-side filtering and sorting
 * - View-only mode (no edit/delete)
 * - Quick search
 * - Header filters
 * - Row number column
 * - Column pinning
 * - Thai/English localization
 * - Responsive design
 */
const BSDataGridClient = ({
  // Data props
  data = [],
  columns: columnDefs = [],

  // Configuration props
  bsLocale = "en",
  bsCols,
  bsPinColsLeft,
  bsPinColsRight,
  bsRowPerPage = 25,
  bsShowCheckbox = false,
  bsShowRowNumber = true,
  bsShowCharacterCount = false,

  // User lookup configuration for audit fields
  bsUserLookup, // { table: "sec.t_com_user", idField: "user_id", displayFields: ["first_name", "last_name"], separator: " " }

  // UI props
  height = "auto",
  showToolbar = true,

  // Event handlers
  onRowClick,
  onView,
  onCheckBoxSelected,

  ...props
}) => {
  // Debug: Log received props
  Logger.log("🎯 BSDataGridClient Props:", {
    dataCount: data?.length || 0,
    columnsCount: columnDefs?.length || 0,
    bsCols,
    bsShowRowNumber,
    height,
  });

  const logGridClientActivity = useCallback((actionType, row, description) => {
    const entityId = row?.id || row?.Id || row?.ID || row?.uuid || "-";

    logActivity({
      action_type: actionType,
      page: window.location.pathname,
      entity: "BSDataGridClient",
      entity_id: entityId,
      description,
    });
  }, []);

  // Parse BS-specific configurations
  const parsedCols = useMemo(() => {
    if (!bsCols) return null;

    const cols = bsCols
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);

    Logger.log("📋 Parsed bsCols:", {
      original: bsCols,
      parsed: cols,
      count: cols.length,
    });

    return cols;
  }, [bsCols]);

  const parsedPinColsLeft = useMemo(() => {
    if (!bsPinColsLeft) return [];
    return bsPinColsLeft
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);
  }, [bsPinColsLeft]);

  const parsedPinColsRight = useMemo(() => {
    if (!bsPinColsRight) return [];
    return bsPinColsRight
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);
  }, [bsPinColsRight]);

  // State management
  const [headerFiltersEnabled, setHeaderFiltersEnabled] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: bsRowPerPage,
  });
  const [sortModel, setSortModel] = useState([]);
  const [filterModel, setFilterModel] = useState({ items: [] });

  // Column pinning state
  const [pinnedColumns, setPinnedColumns] = useState({
    left: parsedPinColsLeft,
    right: parsedPinColsRight,
  });

  // Process and validate data
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) {
      Logger.warn("⚠️ Data is not an array:", data);
      return [];
    }

    // Add row IDs if not present
    return data.map((row, index) => {
      const processedRow = {
        ...row,
        id: row.id || row.Id || `row-${index}`,
      };

      // If bsUserLookup is configured, check for display fields
      if (bsUserLookup) {
        // Check for create_by_display field (from backend user lookup)
        if (row.create_by_display) {
          processedRow.create_by = row.create_by_display;
        }
        // Check for update_by_display field (from backend user lookup)
        if (row.update_by_display) {
          processedRow.update_by = row.update_by_display;
        }
      }

      return processedRow;
    });
  }, [data, bsUserLookup]);

  // Helper: Format column name for display
  const formatColumnName = useCallback((columnName) => {
    if (!columnName) return "";

    return columnName
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )
      .replace(/\bId\b/g, "ID")
      .replace(/\bApi\b/g, "API")
      .replace(/\bUrl\b/g, "URL");
  }, []);

  // Helper: Get column width based on data type
  const getColumnWidth = useCallback((type, field) => {
    switch (type?.toLowerCase()) {
      case "boolean":
      case "bit":
        return 100;
      case "number":
      case "int":
      case "float":
      case "decimal":
        return 120;
      case "date":
        return 120;
      case "datetime":
      case "timestamp":
        return 160;
      case "currency":
      case "money":
        return 140;
      default:
        // Auto-detect based on field name
        if (field?.toLowerCase().includes("email")) return 200;
        if (field?.toLowerCase().includes("phone")) return 140;
        if (field?.toLowerCase().includes("url")) return 200;
        if (field?.toLowerCase().includes("description")) return 250;
        return 150;
    }
  }, []);

  // Helper: Format cell values based on type
  const formatCellValue = useCallback((value, type, format) => {
    if (value === null || value === undefined) return "";

    switch (type?.toLowerCase()) {
      case "boolean":
      case "bit":
        return value ? "Yes" : "No";
      case "date":
        if (value instanceof Date) {
          return isNaN(value.getTime())
            ? String(value)
            : value.toLocaleDateString();
        }
        if (typeof value === "string") {
          try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date.toLocaleDateString();
          } catch (e) {
            return value;
          }
        }
        return value;
      case "datetime":
      case "timestamp":
        if (value instanceof Date) {
          return isNaN(value.getTime())
            ? String(value)
            : value.toLocaleString();
        }
        if (typeof value === "string") {
          try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date.toLocaleString();
          } catch (e) {
            return value;
          }
        }
        return value;
      case "number":
      case "int":
      case "float":
      case "decimal":
        if (format === "currency") {
          return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
          }).format(value);
        }
        if (format === "percentage") {
          return `${(value * 100).toFixed(2)}%`;
        }
        return typeof value === "number" ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  }, []);

  // Build columns from column definitions and data
  const columns = useMemo(() => {
    Logger.log("🏗️ Building columns - START", {
      hasData: processedData.length > 0,
      hasColumnDefs: columnDefs.length > 0,
      parsedCols,
    });

    if (!processedData.length && !columnDefs.length) {
      Logger.warn("⚠️ No data or column definitions available");
      return [];
    }

    let dataColumns = [];

    // If column definitions provided, use them
    if (columnDefs.length > 0) {
      dataColumns = columnDefs.map((colDef) => {
        const baseColumn = {
          field: colDef.field,
          headerName: colDef.headerName || formatColumnName(colDef.field),
          width: colDef.width || getColumnWidth(colDef.type, colDef.field),
          type:
            colDef.type === "boolean"
              ? "boolean"
              : colDef.type === "number"
              ? "number"
              : colDef.type === "date"
              ? "date"
              : "string",
          sortable: true,
          filterable: true,
          resizable: true,
        };

        // Custom cell rendering based on type and format
        if (colDef.type === "boolean" || colDef.type === "bit") {
          baseColumn.renderCell = (params) => (
            <Chip
              label={params.value ? "Yes" : "No"}
              size="small"
              color={params.value ? "success" : "default"}
              variant="outlined"
            />
          );
        } else if (colDef.type === "currency" || colDef.format === "currency") {
          baseColumn.renderCell = (params) => (
            <Box sx={{ color: "success.main", fontWeight: "medium" }}>
              {formatCellValue(params.value, "number", "currency")}
            </Box>
          );
        } else {
          baseColumn.renderCell = (params) =>
            formatCellValue(params.value, colDef.type, colDef.format);
        }

        // Value getter for proper sorting
        if (colDef.type === "date" || colDef.type === "datetime") {
          baseColumn.valueGetter = (value) => {
            if (!value) return null;
            try {
              const date = new Date(value);
              return isNaN(date.getTime()) ? null : date;
            } catch (e) {
              return null;
            }
          };
        }

        return baseColumn;
      });
    } else if (processedData.length > 0) {
      // Auto-generate columns from data
      const sampleRow = processedData[0];
      dataColumns = Object.keys(sampleRow)
        .filter((key) => key !== "id") // Skip id field
        .map((key) => {
          const sampleValue = sampleRow[key];
          let detectedType = "string";

          // Auto-detect type based on value
          if (typeof sampleValue === "boolean") {
            detectedType = "boolean";
          } else if (typeof sampleValue === "number") {
            detectedType = "number";
          } else if (sampleValue instanceof Date) {
            detectedType = "date";
          } else if (typeof sampleValue === "string") {
            // Better date detection - check for actual date patterns
            const isDateLike =
              /^\d{4}-\d{2}-\d{2}/.test(sampleValue) || // ISO date format
              /^\d{1,2}\/\d{1,2}\/\d{4}/.test(sampleValue) || // MM/DD/YYYY
              /^\d{4}\/\d{1,2}\/\d{1,2}/.test(sampleValue); // YYYY/MM/DD

            if (isDateLike && !isNaN(Date.parse(sampleValue))) {
              detectedType = "date";
            }
          }

          const columnConfig = {
            field: key,
            headerName: formatColumnName(key),
            width: getColumnWidth(detectedType, key),
            type:
              detectedType === "boolean"
                ? "boolean"
                : detectedType === "number"
                ? "number"
                : detectedType === "date"
                ? "date"
                : "string",
            sortable: true,
            filterable: true,
            resizable: true,
            renderCell: (params) => formatCellValue(params.value, detectedType),
          };

          // Add value getter for date columns to handle invalid dates
          if (detectedType === "date") {
            columnConfig.valueGetter = (value) => {
              if (!value) return null;
              try {
                const date = new Date(value);
                return isNaN(date.getTime()) ? null : date;
              } catch (e) {
                return null;
              }
            };
          }

          return columnConfig;
        });
    }

    // Add view action column if onView handler provided
    if (onView) {
      const actionsColumn = {
        field: "actions",
        headerName: "Actions",
        type: "actions",
        width: 100,
        getActions: (params) => [
          <GridActionsCellItem
            key="view"
            icon={<Visibility />}
            label="View"
            onClick={() => {
              logGridClientActivity(
                "GRID_VIEW_CLICK",
                params.row,
                "View action clicked in BSDataGridClient",
              );
              onView(params.row);
            }}
          />,
        ],
      };
      dataColumns.unshift(actionsColumn);
    }

    // Add row number column if enabled
    if (bsShowRowNumber) {
      const rowNumberCol = {
        field: "__rowNumber",
        headerName: "No.",
        width: 70,
        sortable: false,
        filterable: false,
        resizable: false,
        headerAlign: "center",
        renderCell: (params) => {
          const rowNumber =
            paginationModel.page * paginationModel.pageSize +
            (params.api.getRowIndexRelativeToVisibleRows(params.id) + 1);
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "text.secondary",
                fontSize: "0.875rem",
                fontWeight: "medium",
              }}
            >
              {rowNumber}
            </Box>
          );
        },
      };

      // Insert row number column after actions column (or at the beginning if no actions)
      const actionsIndex = dataColumns.findIndex(
        (col) => col.field === "actions"
      );
      if (actionsIndex >= 0) {
        dataColumns.splice(actionsIndex + 1, 0, rowNumberCol);
      } else {
        dataColumns.unshift(rowNumberCol);
      }
    }

    // Apply column filtering if bsCols is specified
    if (parsedCols && parsedCols.length > 0) {
      // Separate special columns that should always be included
      const actionsCol = dataColumns.find((c) => c.field === "actions");
      const rowNumberCol = dataColumns.find((c) => c.field === "__rowNumber");
      const otherColumns = dataColumns.filter(
        (c) => c.field !== "actions" && c.field !== "__rowNumber"
      );

      // Filter to only show specified columns
      let filteredColumns = [];

      // Add actions column first if it exists
      if (actionsCol) {
        filteredColumns.push(actionsCol);
      }

      // Add row number column if it exists
      if (rowNumberCol) {
        filteredColumns.push(rowNumberCol);
      }

      // Add other specified columns
      parsedCols.forEach((colName) => {
        const column = otherColumns.find((c) => c.field === colName);
        if (column) {
          filteredColumns.push(column);
        } else {
          Logger.warn(`❌ Column '${colName}' not found`);
        }
      });

      dataColumns = filteredColumns;
    }

    Logger.log("✅ Columns built successfully:", {
      totalColumns: dataColumns.length,
      columnFields: dataColumns.map((c) => c.field),
    });

    return dataColumns;
  }, [
    processedData,
    columnDefs,
    parsedCols,
    bsShowRowNumber,
    paginationModel,
    formatColumnName,
    getColumnWidth,
    formatCellValue,
    onView,
    logGridClientActivity,
  ]);

  // Handle row selection changes
  const handleRowSelectionChange = useCallback(
    (newRowSelectionModel) => {
      setRowSelectionModel(newRowSelectionModel);

      if (onCheckBoxSelected && processedData.length > 0) {
        const selectedRows = processedData.filter((row) =>
          newRowSelectionModel.includes(row.id)
        );
        onCheckBoxSelected(selectedRows);
      }
    },
    [processedData, onCheckBoxSelected]
  );

  // Get localization object for DataGrid
  const getLocalization = useCallback(() => {
    const thaiLocaleText = {
      toolbarQuickFilterPlaceholder: "ค้นหา...",
      toolbarColumns: "คอลัมน์",
      toolbarFilters: "ตัวกรอง",
      toolbarDensity: "ความหนาแน่น",
      toolbarExport: "ส่งออก",
      columnMenuLabel: "เมนู",
      columnMenuShowColumns: "แสดงคอลัมน์",
      columnMenuFilter: "ตัวกรอง",
      columnMenuHideColumn: "ซ่อน",
      columnMenuUnsort: "ยกเลิกการเรียง",
      columnMenuSortAsc: "เรียงจากน้อยไปมาก",
      columnMenuSortDesc: "เรียงจากมากไปน้อย",
      filterPanelColumns: "คอลัมน์",
      filterPanelOperator: "ตัวดำเนินการ",
      filterPanelInputLabel: "ค่า",
      filterPanelInputPlaceholder: "ค่าตัวกรอง",
      MuiTablePagination: {
        labelRowsPerPage: "แถวต่อหน้า:",
        labelDisplayedRows: ({ from, to, count }) =>
          `${from}–${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`,
      },
      checkboxSelectionHeaderName: "เลือก",
      checkboxSelectionSelectAllRows: "เลือกทั้งหมด",
      checkboxSelectionUnselectAllRows: "ยกเลิกการเลือกทั้งหมด",
      noRowsLabel: "ไม่มีข้อมูล",
      noResultsOverlayLabel: "ไม่พบผลลัพธ์",
      errorOverlayDefaultLabel: "เกิดข้อผิดพลาด",
    };

    return bsLocale === "th" ? thaiLocaleText : {};
  }, [bsLocale]);

  const handleToggleHeaderFilters = useCallback(() => {
    setHeaderFiltersEnabled((prev) => !prev);
  }, []);

  // Handle row click
  const handleRowClick = useCallback(
    (params) => {
      logGridClientActivity(
        "GRID_ROW_CLICK",
        params.row,
        "Row clicked in BSDataGridClient",
      );

      if (onRowClick) {
        onRowClick(params.row);
      }
    },
    [logGridClientActivity, onRowClick]
  );

  // Validate data
  if (!Array.isArray(data)) {
    return (
      <Paper sx={{ height, width: "100%", p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Invalid Data Format</Typography>
          <Typography variant="body2">
            Data must be an array of objects. Received: {typeof data}
          </Typography>
        </Alert>
      </Paper>
    );
  }

  // No data
  if (processedData.length === 0) {
    return (
      <Paper sx={{ height, width: "100%", p: 3, textAlign: "center" }}>
        <Alert severity="info">
          <Typography variant="h6">No Data Available</Typography>
          <Typography variant="body2">
            Please provide data array with at least one record.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  Logger.log("✅ BSDataGridClient: rendering", {
    dataCount: processedData.length,
    columnsCount: columns.length,
    showToolbar,
  });

  return (
    <Paper
      sx={{
        height: height === "auto" ? "100%" : height,
        width: "100%",
        display: height === "auto" ? "flex" : "block",
        flexDirection: height === "auto" ? "column" : "initial",
      }}
    >
      {/* DataGrid */}
      <DataGridPro
        rows={processedData}
        columns={columns}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        // Selection
        checkboxSelection={bsShowCheckbox}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={handleRowSelectionChange}
        // Column pinning
        pinnedColumns={pinnedColumns}
        onPinnedColumnsChange={setPinnedColumns}
        // Features
        pagination
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        // Header filters
        headerFilters={headerFiltersEnabled}
        // Toolbar
        slots={{
          toolbar: showToolbar ? ClientGridToolbar : null,
        }}
        slotProps={{
          toolbar: {
            headerFiltersEnabled,
            onToggleHeaderFilters: handleToggleHeaderFilters,
          },
        }}
        // Localization
        localeText={getLocalization()}
        // Events
        onRowClick={handleRowClick}
        // Styling
        sx={{
          height: height === "auto" ? "100%" : height,
          width: "100%",
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #f0f0f0",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#fafafa",
            borderBottom: "2px solid #e0e0e0",
          },
          "& .required-field": {
            color: "error.main",
            fontWeight: "bold",
          },
          flex: height === "auto" ? 1 : undefined,
        }}
        {...props}
      />
    </Paper>
  );
};

export default BSDataGridClient;
