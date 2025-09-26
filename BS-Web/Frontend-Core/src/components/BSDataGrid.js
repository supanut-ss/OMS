import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  DataGridPro,
  gridClasses,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid-pro";
import {
  Edit,
  Delete,
  Visibility,
  Add,
  FilterList as FilterListIcon,
  FilterListOff as FilterListOffIcon,
} from "@mui/icons-material";
import { useDynamicCrud } from "../hooks/useDynamicCrud";
import Logger from "../utils/logger";

// Fallback Toolbar - สำหรับใช้เมื่อไม่มี DataGrid context (offline mode)
const FallbackToolbar = ({
  onAdd,
  showAdd = true,
  headerFiltersEnabled,
  onToggleHeaderFilters,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      {/* Visual indicator */}
      <Typography
        variant="body2"
        sx={{
          mr: 2,
          backgroundColor: "warning.main",
          color: "warning.contrastText",
          px: 1,
          py: 0.5,
          borderRadius: 1,
        }}
      >
        🔧 OFFLINE TOOLBAR
      </Typography>

      {/* Add button */}
      {showAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onAdd || (() => console.log("No onAdd handler provided"))}
          variant="contained"
          color="primary"
        >
          Add Record
        </Button>
      )}

      {/* Header Filters Toggle */}
      <Button
        size="small"
        onClick={onToggleHeaderFilters}
        variant={headerFiltersEnabled ? "outlined" : "text"}
        startIcon={
          headerFiltersEnabled ? <FilterListIcon /> : <FilterListOffIcon />
        }
      >
        {headerFiltersEnabled ? "Hide Filters" : "Show Filters"}
      </Button>

      <Box sx={{ flexGrow: 1 }} />

      {headerFiltersEnabled && (
        <Chip
          label="Header Filters Enabled"
          size="small"
          color="primary"
          variant="filled"
        />
      )}
    </Box>
  );
};

// Custom Toolbar - ใช้ GridToolbarContainer (วิธีที่ถูกต้อง)
const DynamicGridToolbar = ({
  onAdd,
  showAdd = true,
  headerFiltersEnabled,
  onToggleHeaderFilters,
  bsBulkEdit = false,
  bsBulkAdd = false,
  selectedRowCount = 0,
  onBulkEdit,
  onBulkDelete,
}) => {
  console.log("🔧 DynamicGridToolbar rendering:", {
    onAdd: typeof onAdd,
    onAddExists: !!onAdd,
    showAdd,
    headerFiltersEnabled,
    bsBulkEdit,
    bsBulkAdd,
    selectedRowCount,
  });

  // Force render check
  console.log("🔍 DynamicGridToolbar DEFINITELY RENDERING");

  React.useEffect(() => {
    console.log("🚨 DynamicGridToolbar mounted!");
  }, []);

  return (
    <GridToolbarContainer>
      {/* Visual indicator */}
      <Typography
        variant="body2"
        sx={{
          mr: 2,
          backgroundColor: "warning.main",
          color: "warning.contrastText",
          px: 1,
          py: 0.5,
          borderRadius: 1,
        }}
      >
        🔧 BS-TOOLBAR
      </Typography>

      {/* Add button */}
      {showAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onAdd || (() => console.log("No onAdd handler provided"))}
          variant="contained"
          color="primary"
          sx={{ mr: 1 }}
        >
          Add Record
        </Button>
      )}

      {/* Bulk Add button */}
      {bsBulkAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={() => console.log("Bulk Add clicked")}
          variant="outlined"
          color="primary"
          sx={{ mr: 1 }}
        >
          Bulk Add
        </Button>
      )}

      {/* Bulk Edit/Delete buttons - show only when rows are selected */}
      {selectedRowCount > 0 && (
        <>
          {bsBulkEdit && (
            <Button
              size="small"
              startIcon={<Edit />}
              onClick={onBulkEdit}
              variant="outlined"
              color="info"
              sx={{ mr: 1 }}
            >
              Bulk Edit ({selectedRowCount})
            </Button>
          )}
          <Button
            size="small"
            startIcon={<Delete />}
            onClick={onBulkDelete}
            variant="outlined"
            color="error"
            sx={{ mr: 1 }}
          >
            Bulk Delete ({selectedRowCount})
          </Button>
        </>
      )}

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

      {/* Quick Filter */}
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarQuickFilter />

      {headerFiltersEnabled && (
        <Chip
          label="Header Filters Enabled"
          size="small"
          color="primary"
          variant="filled"
          sx={{ ml: 1 }}
        />
      )}
    </GridToolbarContainer>
  );
};

/**
 * BSDataGrid - DataGrid ที่สร้างจาก metadata ของตารางอัตโนมัติ พร้อมรองรับ properties ครบครัน
 *
 * การใช้งานพื้นฐาน:
 * <BSDataGrid bsObj="t_wms_customer" />
 *
 * การใช้งานแบบเต็ม:
 * <BSDataGrid
 *   bsLocale="th"
 *   bsPreObj="default"
 *   bsObj="t_wms_customer"
 *   bsCols="name,email,phone"
 *   bsObjBy="name asc, created_date desc"
 *   bsObjWh="status='active'"
 *   bsPinColsLeft="name,id"
 *   bsPinColsRight="actions"
 *   bsRowPerPage={25}
 *   bsBulkEdit={true}
 *   bsBulkAdd={true}
 *   bsShowDescColumn={false}
 *   bsComboBox={[
 *     {
 *       Column: "status",
 *       Display: "name",
 *       Value: "id",
 *       Default: "--- Select Status ---",
 *       PreObj: "default",
 *       Obj: "t_wms_status",
 *       ObjWh: "active=1",
 *       ObjBy: "name asc"
 *     }
 *   ]}
 *   onCheckBoxSelected={(selectedRows) => console.log(selectedRows)}
 *   onEdit={(row) => console.log('Edit:', row)}
 *   onDelete={(id) => console.log('Delete:', id)}
 *   onAdd={() => console.log('Add new')}
 * />
 */
const BSDataGrid = ({
  // Legacy props (เก่า)
  tableName,
  onEdit,
  onDelete,
  onAdd,
  onView,
  readOnly = false,
  showToolbar = true,
  showAdd = true,
  height = 600,
  autoLoad = true,

  // New BS properties (ใหม่)
  bsLocale = "en",
  bsPreObj = "default",
  bsObj,
  bsSaveObj,
  bsCols,
  bsObjBy,
  bsObjWh,
  bsBulkEdit = false,
  bsBulkAdd = false,
  bsShowDescColumn = true,
  bsPinColsLeft,
  bsPinColsRight,
  bsRowPerPage = 25,
  bsComboBox = [],
  onCheckBoxSelected,

  ...props
}) => {
  // Determine effective table name (bsObj takes priority over tableName)
  const effectiveTableName = bsObj || tableName;

  // Parse BS-specific configurations
  const parsedCols = useMemo(() => {
    if (!bsCols) return null;
    return bsCols
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);
  }, [bsCols]);

  const parsedObjBy = useMemo(() => {
    if (!bsObjBy) return [];
    return bsObjBy.split(",").map((item) => {
      const [field, direction = "asc"] = item.trim().split(/\s+/);
      return {
        field,
        sort: direction.toLowerCase() === "desc" ? "desc" : "asc",
      };
    });
  }, [bsObjBy]);

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

  const comboBoxConfig = useMemo(() => {
    const config = {};
    if (Array.isArray(bsComboBox)) {
      bsComboBox.forEach((combo) => {
        if (combo.Column) {
          config[combo.Column] = combo;
        }
      });
    }
    return config;
  }, [bsComboBox]);

  const {
    metadata,
    loading: metadataLoading,
    error: metadataError,
    loadMetadata,
    getTableData,
    deleteRecord,
    createRecord,
    updateRecord,
  } = useDynamicCrud(effectiveTableName);

  // DataGrid state
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [headerFiltersEnabled, setHeaderFiltersEnabled] = useState(false);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: bsRowPerPage,
  });
  const [sortModel, setSortModel] = useState(parsedObjBy);
  const [filterModel, setFilterModel] = useState({
    items: bsObjWh
      ? [
          {
            field: "custom_where",
            operator: "custom",
            value: bsObjWh,
          },
        ]
      : [],
  });

  // Row selection state for checkbox selection
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

  // Column pinning state
  const [pinnedColumns, setPinnedColumns] = useState({
    left: parsedPinColsLeft,
    right: parsedPinColsRight,
  });

  // Dialog & form states for built-in CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // 'add' | 'edit'
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  // Load metadata when table name changes
  useEffect(() => {
    if (effectiveTableName && autoLoad) {
      loadMetadata();
    }
  }, [effectiveTableName, autoLoad, loadMetadata]);

  // Build API request from DataGrid state
  const buildRequest = useCallback(() => {
    // Build filter model for backend
    const filterItems = filterModel.items
      .filter((item) => item.value !== undefined && item.value !== "")
      .map((item) => ({
        field: item.field,
        operator: item.operator || "contains",
        value: item.value,
      }));

    // Build sort model for backend
    const sortModelForApi = sortModel.map((sort) => ({
      field: sort.field,
      sort: sort.sort,
    }));

    return {
      tableName: effectiveTableName,
      page: paginationModel.page + 1, // API uses 1-based pagination
      pageSize: paginationModel.pageSize,
      sortModel: sortModelForApi,
      filterModel: {
        items: filterItems,
        logicOperator: filterModel.logicOperator || "and",
      },
      // Additional BS properties
      preObj: bsPreObj,
      columns: parsedCols ? parsedCols.join(",") : undefined,
      customWhere: bsObjWh,
      customOrderBy: bsObjBy,
    };
  }, [
    effectiveTableName,
    paginationModel,
    sortModel,
    filterModel,
    bsPreObj,
    bsObjBy,
    bsObjWh,
    parsedCols,
  ]);

  // Load data from API
  const loadData = useCallback(async () => {
    if (!effectiveTableName || !metadata) return;

    setLoading(true);
    setError(null);

    try {
      const request = buildRequest();
      Logger.log("📡 Loading BS dynamic data with request:", request);

      const result = await getTableData(request);

      // Extract actual row data from nested structure
      const processedRows = (result.rows || []).map((row) => {
        // If row has nested data structure, extract the data
        if (row.data && typeof row.data === "object") {
          return row.data;
        }
        // If row is already flat, use as is
        return row;
      });

      setRows(processedRows);
      setRowCount(result.rowCount || 0);

      Logger.log("📊 BS dynamic data loaded successfully:", {
        rows: processedRows?.length || 0,
        total: result.rowCount || 0,
      });
    } catch (err) {
      Logger.error("❌ Failed to load BS dynamic data:", err);
      setError(err.message || "Failed to load data");
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [effectiveTableName, metadata, buildRequest, getTableData]);

  // Auto-reload data when dependencies change
  useEffect(() => {
    if (metadata && autoLoad) {
      loadData();
    }
  }, [metadata, autoLoad, paginationModel, sortModel, filterModel, loadData]);

  // Helper: Format column name for display (underscore to space + title case)
  const formatColumnName = useCallback((columnName) => {
    if (!columnName) return "";

    return (
      columnName
        // Replace underscores with spaces
        .replace(/_/g, " ")
        // Convert to title case (first letter of each word capitalized)
        .replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        )
        // Handle special cases for common abbreviations
        .replace(/\bId\b/g, "ID")
        .replace(/\bApi\b/g, "API")
        .replace(/\bUrl\b/g, "URL")
        .replace(/\bHtml\b/g, "HTML")
        .replace(/\bJson\b/g, "JSON")
        .replace(/\bXml\b/g, "XML")
    );
  }, []);

  // Helper: Get column width based on data type
  const getColumnWidth = useCallback((dataType, maxLength = 0) => {
    switch (dataType?.toLowerCase()) {
      case "bit":
        return 80;
      case "int":
      case "smallint":
      case "tinyint":
        return 100;
      case "bigint":
        return 120;
      case "decimal":
      case "float":
      case "real":
      case "money":
        return 120;
      case "datetime":
      case "datetime2":
      case "date":
      case "time":
        return 180;
      case "varchar":
      case "nvarchar":
        if (maxLength > 0) {
          return maxLength > 100 ? 300 : maxLength > 50 ? 200 : 150;
        }
        return 200;
      case "text":
      case "ntext":
        return 300;
      case "uniqueidentifier":
        return 250;
      default:
        return 150;
    }
  }, []);

  // Helper: Get DataGrid column type
  const getGridColumnType = useCallback((dataType) => {
    switch (dataType?.toLowerCase()) {
      case "int":
      case "smallint":
      case "tinyint":
      case "bigint":
      case "decimal":
      case "float":
      case "real":
      case "money":
        return "number";
      case "bit":
        return "boolean";
      case "datetime":
      case "datetime2":
      case "date":
        return "dateTime";
      case "time":
        return "time";
      default:
        return "string";
    }
  }, []);

  // Helper: Format cell values
  const formatCellValue = useCallback((value, dataType) => {
    if (value === null || value === undefined) return "";

    switch (dataType?.toLowerCase()) {
      case "bit":
        return value ? "Yes" : "No";
      case "datetime":
      case "datetime2":
        return new Date(value).toLocaleString();
      case "date":
        return new Date(value).toLocaleDateString();
      case "time":
        return new Date(`1970-01-01T${value}`).toLocaleTimeString();
      case "money":
      case "decimal":
        return `₿${Number(value).toLocaleString()}`;
      default:
        return String(value);
    }
  }, []);

  // Helper: Check if field should be shown in form
  const isFieldInForm = useCallback((columnName, dataType, isIdentity) => {
    // Skip identity columns
    if (isIdentity) return false;

    // Skip GUID columns
    if (dataType?.toLowerCase() === "uniqueidentifier") {
      return false;
    }

    // Skip audit fields
    const auditFields = [
      "create_by",
      "created_by",
      "createby",
      "create_date",
      "created_date",
      "createdate",
      "created_at",
      "update_by",
      "updated_by",
      "updateby",
      "modified_by",
      "update_date",
      "updated_date",
      "updatedate",
      "updated_at",
      "modified_date",
      "rowversion",
    ];

    if (auditFields.includes(columnName.toLowerCase())) {
      return false;
    }

    return true;
  }, []);

  // Initialize form data based on metadata
  const initializeFormData = useCallback(
    (existing = null) => {
      if (!metadata?.columns) return {};
      const init = {};
      metadata.columns
        .filter((c) => isFieldInForm(c.columnName, c.dataType, c.isIdentity))
        .forEach((c) => {
          if (existing && existing[c.columnName] !== undefined) {
            init[c.columnName] = existing[c.columnName];
          } else {
            const dt = c.dataType?.toLowerCase();
            switch (dt) {
              case "int":
              case "smallint":
              case "tinyint":
              case "bigint":
              case "decimal":
              case "float":
              case "real":
              case "money":
                init[c.columnName] = 0;
                break;
              case "bit":
                init[c.columnName] = false;
                break;
              case "datetime":
              case "datetime2":
              case "date":
                init[c.columnName] = new Date().toISOString().slice(0, 19);
                break;
              default:
                init[c.columnName] = "";
            }
          }
        });
      return init;
    },
    [metadata, isFieldInForm]
  );

  // Open Add dialog or delegate to external handler
  const handleAddClick = useCallback(() => {
    if (onAdd) {
      onAdd();
      return;
    }

    // For offline mode without metadata, show simple alert
    if (!metadata) {
      alert(
        `Add Record for ${tableName}\n\nOffline mode: Cannot create form without metadata.\nPlease connect to backend server.`
      );
      return;
    }

    setDialogMode("add");
    setSelectedRow(null);
    setFormData(initializeFormData());
    setDialogOpen(true);
  }, [onAdd, initializeFormData, metadata, tableName]);

  // Open Edit dialog or delegate
  const handleEditClick = useCallback(
    (row) => {
      if (onEdit) {
        onEdit(row);
        return;
      }
      setDialogMode("edit");
      setSelectedRow(row);
      setFormData(initializeFormData(row));
      setDialogOpen(true);
    },
    [onEdit, initializeFormData]
  );

  // Handle Delete (external or built-in)
  const handleDeleteClick = useCallback(
    async (row) => {
      const primaryKey = metadata?.primaryKeys?.[0] || "Id";
      const id = row?.[primaryKey] ?? row?.id ?? row?.Id;
      if (!id) {
        Logger.error("❌ No primary key found for deletion");
        return;
      }

      if (onDelete) {
        // Delegate to external handler
        await Promise.resolve(onDelete(id));
        // Try refresh after external handler
        loadData();
        return;
      }

      if (window.confirm("Are you sure you want to delete this record?")) {
        try {
          await deleteRecord(id);
          await loadData();
          Logger.log("✅ Record deleted and data reloaded");
        } catch (err) {
          Logger.error("❌ Failed to delete record:", err);
          setError(err.message || "Failed to delete record");
        }
      }
    },
    [metadata, onDelete, deleteRecord, loadData]
  );

  // Save (create/update) from dialog
  const handleSave = useCallback(async () => {
    try {
      setFormLoading(true);
      if (dialogMode === "add") {
        await createRecord(formData);
      } else {
        const primaryKey = metadata?.primaryKeys?.[0] || "Id";
        const id =
          selectedRow?.[primaryKey] ?? selectedRow?.id ?? selectedRow?.Id;
        if (!id) throw new Error("No primary key for update");
        await updateRecord({ id, data: formData });
      }
      setDialogOpen(false);
      setFormData({});
      setSelectedRow(null);
      await loadData();
    } catch (err) {
      Logger.error("❌ Save failed:", err);
      setError(err.message || "Failed to save record");
    } finally {
      setFormLoading(false);
    }
  }, [
    dialogMode,
    formData,
    selectedRow,
    metadata,
    createRecord,
    updateRecord,
    loadData,
  ]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setSelectedRow(null);
  }, []);

  // Helper: Render combobox for columns with ComboBox configuration
  const renderComboBoxCell = useCallback((params, comboConfig) => {
    const { value } = params;
    const displayText =
      comboConfig.valueOptions?.find((opt) => opt.value === value)?.label ||
      value ||
      comboConfig.Default ||
      "";

    return (
      <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
        {displayText}
      </Box>
    );
  }, []);

  // Helper: Get ComboBox value options for editing
  const getComboBoxOptions = useCallback((comboConfig) => {
    // TODO: In real implementation, this should fetch from API based on comboConfig
    // For now, return empty array
    return comboConfig.valueOptions || [];
  }, []);

  // Helper: Check if field is required (not null)
  const isFieldRequired = useCallback((columnName, metadata) => {
    const column = metadata?.columns?.find((c) => c.columnName === columnName);
    return column && !column.isNullable;
  }, []);

  // Helper: Apply BS column filtering
  const applyColumnFiltering = useCallback(
    (columns) => {
      if (!parsedCols || parsedCols.length === 0) return columns;

      // Filter to only show specified columns, maintaining order
      const filteredColumns = [];
      parsedCols.forEach((colName) => {
        const column = columns.find((c) => c.field === colName);
        if (column) {
          filteredColumns.push(column);
        }
      });

      // Add actions column if it exists and not in parsedCols
      const actionsCol = columns.find((c) => c.field === "actions");
      if (actionsCol && !parsedCols.includes("actions")) {
        filteredColumns.push(actionsCol);
      }

      return filteredColumns;
    },
    [parsedCols]
  );
  const isColumnHidden = useCallback((columnName, dataType) => {
    // Hide GUID columns
    if (dataType?.toLowerCase() === "uniqueidentifier") {
      return true;
    }

    // Hide audit fields
    const auditFields = [
      "create_by",
      "created_by",
      "createby",
      "create_date",
      "created_date",
      "createdate",
      "created_at",
      "update_by",
      "updated_by",
      "updateby",
      "modified_by",
      "update_date",
      "updated_date",
      "updatedate",
      "updated_at",
      "modified_date",
      "rowversion",
    ];

    if (auditFields.includes(columnName.toLowerCase())) {
      return true;
    }

    return false;
  }, []);

  // Render form fields from metadata
  const renderFormFields = useCallback(() => {
    if (!metadata?.columns) return null;

    const formFields = metadata.columns
      .filter((c) => isFieldInForm(c.columnName, c.dataType, c.isIdentity))
      .map((c) => {
        const { columnName, dataType, isNullable } = c;
        const val = formData[columnName] ?? "";
        let inputType = "text";
        let multiline = false;

        switch (dataType?.toLowerCase()) {
          case "int":
          case "smallint":
          case "tinyint":
          case "bigint":
          case "decimal":
          case "float":
          case "real":
          case "money":
            inputType = "number";
            break;
          case "datetime":
          case "datetime2":
          case "date":
            inputType = "datetime-local";
            break;
          case "text":
          case "ntext":
            multiline = true;
            break;
          case "bit":
            inputType = "checkbox";
            break;
          default:
            inputType = "text";
        }

        if (inputType === "checkbox") {
          return (
            <Grid item xs={12} sm={6} md={4} key={columnName}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(val)}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        [columnName]: e.target.checked,
                      }))
                    }
                  />
                }
                label={`${formatColumnName(columnName)} ${
                  !isNullable ? "*" : ""
                }`}
              />
            </Grid>
          );
        }

        // For text/ntext fields, use full width
        const gridSize = multiline ? { xs: 12 } : { xs: 12, sm: 6, md: 4 };

        return (
          <Grid item {...gridSize} key={columnName}>
            <TextField
              fullWidth
              size="small"
              label={`${formatColumnName(columnName)} ${
                !isNullable ? "*" : ""
              }`}
              type={inputType}
              value={val}
              onChange={(e) =>
                setFormData((p) => ({ ...p, [columnName]: e.target.value }))
              }
              required={!isNullable}
              multiline={multiline}
              rows={multiline ? 3 : 1}
              helperText={`${dataType} ${
                isNullable ? "(nullable)" : "(required)"
              }`}
            />
          </Grid>
        );
      });

    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {formFields}
      </Grid>
    );
  }, [metadata, formData, isFieldInForm, formatColumnName]);

  // Build columns from metadata
  const columns = useMemo(() => {
    if (!metadata?.columns) return [];

    const dataColumns = metadata.columns
      .filter(
        (col) => !col.isHidden && !isColumnHidden(col.columnName, col.dataType)
      ) // Skip hidden and GUID/audit columns
      .map((col) => {
        const columnName = col.columnName;
        const isRequired = isFieldRequired(columnName, metadata);
        const comboConfig = comboBoxConfig[columnName];

        const baseColumn = {
          field: col.columnName,
          headerName: col.displayName || formatColumnName(col.columnName),
          width: getColumnWidth(col.dataType, col.maxLength),
          type: comboConfig ? "singleSelect" : getGridColumnType(col.dataType),
          editable: !col.isIdentity && !col.isReadOnly && !readOnly,
          sortable: true,
          filterable: true,
          resizable: true,
          // Add red styling for required fields
          headerClassName: isRequired ? "required-field" : undefined,
        };

        // ComboBox configuration
        if (comboConfig) {
          baseColumn.valueOptions = getComboBoxOptions(comboConfig);
          baseColumn.renderCell = (params) =>
            renderComboBoxCell(params, comboConfig);
        } else {
          // Standard cell rendering
          baseColumn.renderCell = (params) => {
            const value = params.value;
            const formattedValue = formatCellValue(value, col.dataType);

            // Special rendering for different data types
            if (col.dataType?.toLowerCase() === "bit") {
              return (
                <Chip
                  label={value ? "Yes" : "No"}
                  size="small"
                  color={value ? "success" : "default"}
                  variant="outlined"
                />
              );
            }

            if (col.dataType?.toLowerCase() === "money") {
              return (
                <Box sx={{ color: "success.main", fontWeight: "medium" }}>
                  {formattedValue}
                </Box>
              );
            }

            return formattedValue;
          };
        }

        baseColumn.valueGetter = (value) => {
          if (
            col.dataType?.toLowerCase() === "datetime" ||
            col.dataType?.toLowerCase() === "datetime2" ||
            col.dataType?.toLowerCase() === "date"
          ) {
            return value ? new Date(value) : null;
          }
          return value;
        };

        return baseColumn;
      });

    // Actions: always show when not read-only
    if (!readOnly) {
      const actions = [];

      if (onView) {
        actions.push((params) => (
          <GridActionsCellItem
            icon={<Visibility />}
            label="View"
            onClick={() => onView(params.row)}
          />
        ));
      }

      actions.push((params) => (
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEditClick(params.row)}
        />
      ));

      actions.push((params) => (
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDeleteClick(params.row)}
          showInMenu
        />
      ));

      dataColumns.push({
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 120,
        getActions: (params) => actions.map((a) => a(params)),
      });
    }

    // Apply column filtering if bsCols is specified
    const filteredDataColumns = applyColumnFiltering(dataColumns);

    return filteredDataColumns;
  }, [
    metadata,
    readOnly,
    onView,
    handleEditClick,
    handleDeleteClick,
    getColumnWidth,
    getGridColumnType,
    formatCellValue,
    formatColumnName,
    isColumnHidden,
    comboBoxConfig,
    isFieldRequired,
    renderComboBoxCell,
    getComboBoxOptions,
    applyColumnFiltering,
  ]);

  // Handle row selection changes for checkbox selection
  const handleRowSelectionChange = useCallback(
    (newRowSelectionModel) => {
      setRowSelectionModel(newRowSelectionModel);

      if (onCheckBoxSelected) {
        // Get selected row data
        const selectedRows = rows.filter((row) => {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          const rowId = row[primaryKey] || row.id || row.Id;
          return newRowSelectionModel.includes(rowId);
        });
        onCheckBoxSelected(selectedRows);
      }
    },
    [rows, metadata, onCheckBoxSelected]
  );

  // Get localization object for DataGrid
  const getLocalization = useCallback(() => {
    // Basic Thai translations - can be extended
    const thaiLocaleText = {
      // Toolbar
      toolbarQuickFilterPlaceholder: "ค้นหา...",
      toolbarColumns: "คอลัมน์",
      toolbarFilters: "ตัวกรอง",
      toolbarDensity: "ความหนาแน่น",
      toolbarExport: "ส่งออก",

      // Column menu
      columnMenuLabel: "เมนู",
      columnMenuShowColumns: "แสดงคอลัมน์",
      columnMenuFilter: "ตัวกรอง",
      columnMenuHideColumn: "ซ่อน",
      columnMenuUnsort: "ยกเลิกการเรียง",
      columnMenuSortAsc: "เรียงจากน้อยไปมาก",
      columnMenuSortDesc: "เรียงจากมากไปน้อย",

      // Filter
      filterPanelColumns: "คอลัมน์",
      filterPanelOperator: "ตัวดำเนินการ",
      filterPanelInputLabel: "ค่า",
      filterPanelInputPlaceholder: "ค่าตัวกรอง",

      // Pagination
      MuiTablePagination: {
        labelRowsPerPage: "แถวต่อหน้า:",
        labelDisplayedRows: ({ from, to, count }) =>
          `${from}–${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`,
      },

      // Selection
      checkboxSelectionHeaderName: "เลือก",
      checkboxSelectionSelectAllRows: "เลือกทั้งหมด",
      checkboxSelectionUnselectAllRows: "ยกเลิกการเลือกทั้งหมด",

      // Other common texts
      noRowsLabel: "ไม่มีข้อมูล",
      noResultsOverlayLabel: "ไม่พบผลลัพธ์",
      errorOverlayDefaultLabel: "เกิดข้อผิดพลาด",
    };

    return bsLocale === "th" ? thaiLocaleText : {};
  }, [bsLocale]);

  // Bulk operations handlers
  const handleBulkEdit = useCallback(() => {
    const selectedRows = rows.filter((row) => {
      const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
      const rowId = row[primaryKey] || row.id || row.Id;
      return rowSelectionModel.includes(rowId);
    });

    console.log("Bulk Edit:", selectedRows);
    // TODO: Implement bulk edit functionality
    alert(`Bulk edit ${selectedRows.length} rows`);
  }, [rows, rowSelectionModel, metadata]);

  const handleBulkDelete = useCallback(async () => {
    const selectedRows = rows.filter((row) => {
      const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
      const rowId = row[primaryKey] || row.id || row.Id;
      return rowSelectionModel.includes(rowId);
    });

    if (selectedRows.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRows.length} records?`
      )
    ) {
      try {
        // TODO: Implement bulk delete API call
        for (const row of selectedRows) {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          const id = row[primaryKey] || row.id || row.Id;
          if (id) {
            await deleteRecord(id);
          }
        }

        setRowSelectionModel([]);
        await loadData();
        Logger.log("✅ Bulk delete completed");
      } catch (err) {
        Logger.error("❌ Bulk delete failed:", err);
        setError(err.message || "Failed to delete records");
      }
    }
  }, [rows, rowSelectionModel, metadata, deleteRecord, loadData]);

  const handleToggleHeaderFilters = useCallback(() => {
    setHeaderFiltersEnabled((prev) => {
      const newValue = !prev;
      Logger.log(`🔧 Header filters ${newValue ? "enabled" : "disabled"}`);
      return newValue;
    });
  }, []);

  // Loading state
  if (metadataLoading) {
    console.log("🔄 BSDataGrid: metadata is loading...", effectiveTableName);
    return (
      <Paper
        sx={{
          height,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">Loading table metadata...</Typography>
          <Typography variant="body2" color="text.secondary">
            {effectiveTableName}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (metadataError) {
    // Detect 404 error (invalid table/view) from AxiosError object
    let isNotFound = false;
    if (metadataError?.response?.status === 404) {
      isNotFound = true;
    } else if (metadataError?.toString().includes("404")) {
      isNotFound = true;
    } else if (metadataError?.message?.toLowerCase().includes("not found")) {
      isNotFound = true;
    }
    return (
      <Paper sx={{ height, width: "100%", p: 3 }}>
        <Alert
          severity={isNotFound ? "warning" : "error"}
          action={
            <Button onClick={() => loadMetadata()} size="small">
              Retry
            </Button>
          }
        >
          <Typography variant="h6">
            {isNotFound
              ? "ไม่พบ Table หรือ View ที่ระบุ"
              : "Failed to load table metadata"}
          </Typography>
          <Typography variant="body2">Table: {effectiveTableName}</Typography>
          <Typography variant="body2">
            {isNotFound
              ? "กรุณาตรวจสอบชื่อ Table หรือ View ว่าถูกต้องหรือไม่"
              : `Error: ${metadataError?.message || metadataError}`}
          </Typography>
        </Alert>
      </Paper>
    );
  }

  // No metadata
  if (!metadata) {
    console.log("⚠️ BSDataGrid: no metadata available", {
      effectiveTableName,
      metadata,
      showToolbar,
      showAdd,
    });

    // Show offline mode with basic toolbar
    return (
      <Paper sx={{ height, width: "100%" }}>
        <Alert severity="warning" sx={{ m: 2 }}>
          <Typography variant="h6">Backend API ไม่พร้อมใช้งาน</Typography>
          <Typography variant="body2">Table: {effectiveTableName}</Typography>
          <Typography variant="body2">
            กรุณาตรวจสอบการเชื่อมต่อ backend server
          </Typography>
        </Alert>

        {/* Show toolbar even without metadata for testing */}
        {showToolbar && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" component="div">
              {effectiveTableName} (Offline Mode)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ไม่สามารถโหลด metadata ได้
            </Typography>
          </Box>
        )}

        {/* Show basic toolbar for testing */}
        {showToolbar && (
          <FallbackToolbar
            onAdd={handleAddClick}
            showAdd={showAdd}
            headerFiltersEnabled={headerFiltersEnabled}
            onToggleHeaderFilters={handleToggleHeaderFilters}
          />
        )}

        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            ไม่สามารถแสดงข้อมูลได้เนื่องจาก backend API ไม่พร้อมใช้งาน
          </Typography>
          <Button
            onClick={() => loadMetadata()}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            ลองใหม่
          </Button>
        </Box>
      </Paper>
    );
  }

  console.log("✅ BSDataGrid: rendering with metadata", {
    effectiveTableName,
    metadataLoaded: !!metadata,
    showToolbar,
    columns: metadata?.columns?.length,
  });

  return (
    <Paper sx={{ height, width: "100%" }}>
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ m: 1 }}
          action={
            <Button onClick={() => loadData()} size="small">
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Table Info */}
      {showToolbar && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" component="div">
            {metadata.displayName || effectiveTableName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {rowCount.toLocaleString()} records • {metadata.columns?.length}{" "}
            columns
          </Typography>
        </Box>
      )}

      {/* DataGrid */}
      <DataGridPro
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        loading={loading}
        // Pagination
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50, 100]}
        // Sorting
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        // Filtering
        filterMode="server"
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        // Header Filters (Pro feature)
        headerFilters={headerFiltersEnabled}
        // Row Selection (checkbox selection when enabled)
        checkboxSelection={bsBulkEdit || bsBulkAdd || !!onCheckBoxSelected}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={handleRowSelectionChange}
        disableRowSelectionOnClick={false}
        // Column Pinning (Pro feature)
        pinnedColumns={pinnedColumns}
        onPinnedColumnsChange={setPinnedColumns}
        // UI Settings
        getRowId={(row) => {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          return row[primaryKey] || row.id || row.Id;
        }}
        // Localization
        localeText={getLocalization()}
        // Custom Toolbar (use slots + slotProps for better compatibility)
        slots={showToolbar ? { toolbar: DynamicGridToolbar } : undefined}
        slotProps={
          showToolbar
            ? {
                toolbar: {
                  onAdd: handleAddClick,
                  showAdd,
                  headerFiltersEnabled,
                  onToggleHeaderFilters: handleToggleHeaderFilters,
                  bsBulkEdit,
                  bsBulkAdd,
                  selectedRowCount: rowSelectionModel.length,
                  onBulkEdit: handleBulkEdit,
                  onBulkDelete: handleBulkDelete,
                },
              }
            : undefined
        }
        // Styling with required field indicator
        sx={{
          border: 0,
          [`& .${gridClasses.cell}`]: {
            borderBottom: "1px solid #f0f0f0",
            fontSize: "0.875rem",
          },
          [`& .${gridClasses.columnHeaders}`]: {
            backgroundColor: "#f5f5f5",
            borderBottom: "2px solid #e0e0e0",
            fontSize: "0.875rem",
          },
          // Force header text bold
          "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderTitle": {
            fontWeight: "bold",
          },
          // Required field styling
          "& .required-field .MuiDataGrid-columnHeaderTitle": {
            color: "error.main",
            fontWeight: "bold",
          },
          [`& .${gridClasses.row}`]: {
            "&:hover": {
              backgroundColor: "#f9f9f9",
            },
          },
          // Header filter styling
          [`& .MuiDataGrid-headerFilterRow`]: {
            backgroundColor: "#f9f9f9",
            borderBottom: "1px solid #e0e0e0",
          },
        }}
        {...props}
      />

      {/* Built-in CRUD Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "add" ? "Add New Record" : "Edit Record"}
        </DialogTitle>
        <DialogContent>
          {metadata?.columns ? (
            renderFormFields()
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading metadata...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BSDataGrid;
