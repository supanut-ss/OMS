import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
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
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  ButtonGroup,
  ClickAwayListener,
  Grow,
  Paper as MenuPaper,
  Popper,
  MenuList,
  MenuItem as MenuListItem,
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
  Restore,
  ArrowDropDown,
} from "@mui/icons-material";
import { useDynamicCrud } from "../hooks/useDynamicCrud";
import { getSchemaFromPreObj } from "../utils/SchemaMapping";
import Logger from "../utils/logger";
import muiLicenseManager from "../utils/muiLicenseManager";

// Initialize MUI X License
muiLicenseManager.initialize();

// Log license status for debugging
const licenseStatus = muiLicenseManager.getLicenseStatus();
Logger.log("🔐 MUI X License Status:", licenseStatus);

if (licenseStatus.hasLicenseKey) {
  Logger.log("✅ MUI X Pro features are available");
} else {
  Logger.warn("⚠️ MUI X Pro license not found - some features may be limited");
}

// Split Button Component for Bulk Operations
const BulkSplitButton = ({
  selectedRowCount,
  onBulkEdit,
  onBulkDelete,
  bsBulkEdit = false,
  showBulkDelete = true,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const anchorRef = React.useRef(null);

  const options = [
    {
      label: `Bulk Edit (${selectedRowCount})`,
      icon: <Edit />,
      action: onBulkEdit,
      color: "info",
      show: bsBulkEdit,
    },
    {
      label: `Bulk Delete (${selectedRowCount})`,
      icon: <Delete />,
      action: onBulkDelete,
      color: "error",
      show: showBulkDelete,
    },
  ].filter((option) => option.show);

  const handleClick = () => {
    if (options[selectedIndex]?.action) {
      options[selectedIndex].action();
    }
  };

  const handleMenuItemClick = (event, index) => {
    setSelectedIndex(index);
    setOpen(false);
    if (options[index]?.action) {
      options[index].action();
    }
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  if (options.length === 0 || selectedRowCount === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <ButtonGroup
        variant="outlined"
        color={options[selectedIndex]?.color || "primary"}
        ref={anchorRef}
        aria-label="split button"
        sx={{ mr: 1 }}
      >
        <Button
          onClick={handleClick}
          startIcon={options[selectedIndex]?.icon}
          size="small"
        >
          {options[selectedIndex]?.label}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="select bulk operation"
          aria-haspopup="menu"
          onClick={handleToggle}
        >
          <ArrowDropDown />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{
          zIndex: 1,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <MenuPaper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {options.map((option, index) => (
                    <MenuListItem
                      key={option.label}
                      selected={index === selectedIndex}
                      onClick={(event) => handleMenuItemClick(event, index)}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {option.icon}
                        {option.label}
                      </Box>
                    </MenuListItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </MenuPaper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
};

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
          onClick={onAdd || (() => Logger.warn("No onAdd handler provided"))}
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

// Bulk Edit Toolbar - แสดงเมื่อเปิด bulk edit mode
const BulkEditToolbar = ({
  onSave,
  onDiscard,
  hasUnsavedChanges,
  formLoading,
  changesCount,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        backgroundColor: "warning.light",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" sx={{ color: "warning.contrastText" }}>
        🔄 Bulk Edit Mode
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "warning.contrastText", flexGrow: 1 }}
      >
        Edit cells directly in the grid. Changes are tracked but not saved until
        you click Save.
        {changesCount > 0 && ` (${changesCount} unsaved changes)`}
      </Typography>

      <Button
        variant="outlined"
        onClick={onDiscard}
        disabled={formLoading}
        sx={{
          color: "warning.contrastText",
          borderColor: "warning.contrastText",
        }}
      >
        DISCARD ALL CHANGES
      </Button>

      <Button
        variant="contained"
        onClick={onSave}
        disabled={formLoading || !hasUnsavedChanges}
        startIcon={formLoading ? <CircularProgress size={16} /> : undefined}
        sx={{ bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
      >
        {formLoading ? "SAVING..." : "SAVE"}
      </Button>
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
  onBulkAdd,
  showBulkDelete = true,
}) => {
  Logger.log("🔧 DynamicGridToolbar rendering:", {
    onAdd: typeof onAdd,
    onAddExists: !!onAdd,
    showAdd,
    headerFiltersEnabled,
    bsBulkEdit,
    bsBulkAdd,
    selectedRowCount,
  });

  // Force render check
  Logger.log("🔍 DynamicGridToolbar DEFINITELY RENDERING");

  React.useEffect(() => {
    Logger.log("🚨 DynamicGridToolbar mounted!");
  }, []);

  return (
    <GridToolbarContainer>
      {/* Visual indicator */}
      {/* <Typography
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
      </Typography> */}

      {/* Add button */}
      {showAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onAdd || (() => Logger.warn("No onAdd handler provided"))}
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
          onClick={onBulkAdd}
          variant="outlined"
          color="primary"
          sx={{ mr: 1 }}
        >
          Bulk Add
        </Button>
      )}

      {/* Bulk Edit/Delete Split Button - show only when rows are selected */}
      {selectedRowCount > 0 && (
        <BulkSplitButton
          selectedRowCount={selectedRowCount}
          onBulkEdit={onBulkEdit}
          onBulkDelete={onBulkDelete}
          bsBulkEdit={bsBulkEdit}
          showBulkDelete={showBulkDelete}
        />
      )}

      {/* Quick Filter */}
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarQuickFilter placeholder="ค้นหาข้อมูล..." debounceMs={500} />

      {/* {headerFiltersEnabled && (
        <Chip
          label="Header Filters Enabled"
          size="small"
          color="primary"
          variant="filled"
          sx={{ ml: 1 }}
        />
      )} */}

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
 * ComboBox Field Component for Form
 * Renders a dropdown with options from API
 */
const ComboBoxField = ({
  columnName,
  config,
  value,
  onChange,
  required,
  dataType,
  isNullable,
  description,
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getComboBoxData } = useDynamicCrud(config.Obj || "dummy");

  const formatColumnName = (name) => {
    return name
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => {
    const loadOptions = async () => {
      if (!config.Obj) return;

      setLoading(true);
      try {
        const comboConfig = {
          tableName: config.Obj,
          schemaName: config.PreObj
            ? getSchemaFromPreObj(config.PreObj)
            : "tmt",
          valueField: config.Value, // ✅ Fixed: valueColumn → valueField
          displayField: config.Display, // ✅ Fixed: displayColumn → displayField
          customWhere: config.ObjWh || null, // ✅ Fixed: whereClause → customWhere
          customOrderBy: config.ObjBy || null, // ✅ Fixed: orderBy → customOrderBy
        };

        Logger.log("🔍 Loading combobox options:", comboConfig);
        const result = await getComboBoxData(comboConfig);
        setOptions(result || []);

        // Auto-select if only one option available and current value is empty
        if (
          result &&
          result.length === 1 &&
          (!value || value === "" || value === 0)
        ) {
          const singleOption = result[0];
          const valueData = singleOption.data || singleOption;
          const autoSelectValue = valueData[config.Value] || singleOption.value;

          Logger.log("🎯 Auto-selecting single ComboBox option:", {
            columnName,
            currentValue: value,
            autoSelectValue,
            optionDisplay: valueData[config.Display] || singleOption.display,
            reason: "only_one_option_available_and_value_empty",
          });

          // Call onChange to update the form
          onChange(autoSelectValue);
        }

        Logger.log("✅ Combobox options loaded:", {
          count: result?.length || 0,
          data: result,
          valueField: config.Value,
          displayField: config.Display,
          sampleOption: result?.[0],
          sampleKeys: result?.[0] ? Object.keys(result[0]) : [],
          fullFirstOption: JSON.stringify(result?.[0], null, 2),
          autoSelectedSingle:
            result?.length === 1 && (!value || value === "" || value === 0),
        });
      } catch (error) {
        Logger.error("❌ Failed to load combobox options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [config, getComboBoxData, columnName, value, onChange]);

  // Debug logging
  Logger.log("🎯 ComboBoxField render:", {
    columnName,
    value,
    valueType: typeof value,
    optionsCount: options.length,
    options: options,
    valueField: config.Value,
    displayField: config.Display,
    loading,
  });

  // Debug value matching
  const matchingOption = options.find((option) => {
    const valueData = option.data || option;
    const itemValue = valueData[config.Value] || option.value;
    return itemValue === value || String(itemValue) === String(value);
  });

  Logger.log("🔍 Value matching debug:", {
    value,
    valueType: typeof value,
    matchingOption,
    optionValues: options.map((opt) => {
      const valueData = opt.data || opt;
      return {
        itemValue: valueData[config.Value] || opt.value,
        itemType: typeof (valueData[config.Value] || opt.value),
        raw: opt,
      };
    }),
  });

  return (
    <FormControl fullWidth size="small" required={required}>
      <InputLabel>{formatColumnName(columnName)}</InputLabel>
      <Select
        value={value || ""}
        label={formatColumnName(columnName)}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {config.Default && (
          <MenuItem value="">
            <em>{config.Default}</em>
          </MenuItem>
        )}
        {options.map((option) => {
          // Handle both direct field access and nested data structure
          const valueData = option.data || option;
          const displayData = option.data || option;

          const itemValue = valueData[config.Value] || option.value;
          const itemDisplay = displayData[config.Display] || option.display;

          Logger.log("🔹 Rendering MenuItem:", {
            key: itemValue,
            value: itemValue,
            display: itemDisplay,
            option,
            configValue: config.Value,
            configDisplay: config.Display,
            optionKeys: Object.keys(option || {}),
            rawOption: JSON.stringify(option),
            extractedValue: itemValue,
            extractedDisplay: itemDisplay,
          });

          return (
            <MenuItem key={itemValue} value={itemValue}>
              {itemDisplay}
            </MenuItem>
          );
        })}
      </Select>
      <FormHelperText>
        {loading
          ? "Loading options..."
          : description ||
            `${dataType} ${isNullable ? "(nullable)" : "(required)"}`}
      </FormHelperText>
    </FormControl>
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
 *   bsShowCharacterCount={true}
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
 *
 * @filterMode Configuration:
 * - bsFilterMode="server" (default): Filters are processed on the server side
 *   * Filters and Quick Filter values are sent to the API
 *   * Best for large datasets where client-side filtering would be slow
 *   * Requires backend support for filter processing
 *
 * - bsFilterMode="client": Filters are processed on the client side
 *   * All data is loaded and filtering happens in the browser
 *   * Best for smaller datasets that can be loaded entirely
 *   * No filter parameters are sent to the API
 *
 * @bsShowCharacterCount Configuration:
 * - bsShowCharacterCount={false} (default): Character count is not shown in helper text
 * - bsShowCharacterCount={true}: Shows current/max character count for text fields
 *   * Format: "15/50 characters" or "Description text (15/50 characters)"
 *   * Only applies to text and textarea fields with maxLength defined in metadata
 *   * Helps users stay within column length limits to prevent truncation errors
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
  height = "auto",
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
  bsBulkDelete = false,
  bsShowDescColumn = true,
  bsPinColsLeft,
  bsPinColsRight,
  bsRowPerPage = 25,
  bsComboBox = [],
  bsFilterMode = "server", // "server" | "client"
  bsShowCharacterCount = false, // Show character count in helper text
  onCheckBoxSelected,

  ...props
}) => {
  // Debug: Log received props
  Logger.log("🎯 BSDataGrid Props:", {
    bsPreObj,
    bsObj,
    tableName,
    bsPreObjType: typeof bsPreObj,
    bsPreObjValue: bsPreObj,
  });

  // Determine effective table name (bsObj takes priority over tableName)
  const effectiveTableName = bsObj || tableName;

  // Parse BS-specific configurations
  const parsedCols = useMemo(() => {
    if (!bsCols) {
      Logger.log("📋 No bsCols specified - will show all columns");
      return null;
    }

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

  const [paginationModel, setPaginationModel] = useState(() => ({
    page: 0,
    pageSize: bsRowPerPage,
  }));
  const [sortModel, setSortModel] = useState(() => parsedObjBy);
  const [filterModel, setFilterModel] = useState(() => ({
    items: bsObjWh
      ? [
          {
            field: "custom_where",
            operator: "custom",
            value: bsObjWh,
          },
        ]
      : [],
  }));

  // Row selection state for checkbox selection
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

  // Column pinning state
  const [pinnedColumns, setPinnedColumns] = useState({
    left: parsedPinColsLeft,
    right: parsedPinColsRight,
  });

  // Dialog & form states for built-in CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // 'add' | 'edit' | 'bulkAdd'
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Add specific states
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
  const [bulkAddRows, setBulkAddRows] = useState([]);
  const [bulkRowCount, setBulkRowCount] = useState(5);

  // Bulk Edit states
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const unsavedChangesRef = React.useRef({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load metadata when table name changes
  useEffect(() => {
    if (effectiveTableName && autoLoad) {
      loadMetadata(bsPreObj);
    }
  }, [effectiveTableName, autoLoad, loadMetadata, bsPreObj]);

  // Use refs to store current state values to avoid dependency issues
  const paginationModelRef = useRef(paginationModel);
  const sortModelRef = useRef(sortModel);
  const filterModelRef = useRef(filterModel);

  // Keep refs up to date
  paginationModelRef.current = paginationModel;
  sortModelRef.current = sortModel;
  filterModelRef.current = filterModel;

  // Load data from API
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!effectiveTableName || !metadata) return;

      setLoading(true);
      setError(null);

      try {
        // Get current values from refs to avoid stale closures
        const currentPaginationModel = paginationModelRef.current;
        const currentSortModel = sortModelRef.current;
        const currentFilterModel = filterModelRef.current;

        // Build request inline to avoid dependency issues
        let filterItems = [];
        let quickFilterValue = null;

        if (bsFilterMode === "server") {
          // Build filter model for backend
          filterItems = currentFilterModel.items
            .filter((item) => item.value !== undefined && item.value !== "")
            .map((item) => ({
              field: item.field,
              operator: item.operator || "contains",
              value: item.value,
            }));

          // Handle Quick Filter (search box)
          if (
            currentFilterModel.quickFilterValues &&
            currentFilterModel.quickFilterValues.length > 0
          ) {
            quickFilterValue = currentFilterModel.quickFilterValues.join(" ");
          }
        }

        // Build sort model for backend
        const sortModelForApi = currentSortModel.map((sort) => ({
          field: sort.field,
          sort: sort.sort,
        }));

        // Include ComboBox fields in the query even if they're not in bsCols for display
        let columnsForQuery = parsedCols ? [...parsedCols] : undefined;
        if (columnsForQuery && comboBoxConfig) {
          const comboBoxFields = Object.keys(comboBoxConfig);
          comboBoxFields.forEach((field) => {
            if (!columnsForQuery.includes(field)) {
              columnsForQuery.push(field);
            }
          });
        }

        const request = {
          tableName: effectiveTableName,
          page: currentPaginationModel.page + 1, // API uses 1-based pagination
          pageSize: currentPaginationModel.pageSize,
          sortModel: sortModelForApi,
          filterModel: {
            items: filterItems,
            logicOperator: currentFilterModel.logicOperator || "and",
            quickFilter: quickFilterValue, // Add quick filter to the request
          },
          // Additional BS properties
          preObj: bsPreObj,
          columns: columnsForQuery ? columnsForQuery.join(",") : undefined,
          customWhere: bsObjWh,
          customOrderBy: bsObjBy,
        };

        // Add cache buster for force refresh (like after bulk edit)
        if (forceRefresh) {
          request.cacheBuster = Date.now();
          request._forceRefresh = true; // Additional flag for backend
          Logger.log(
            "🔄 Force refresh requested with cache buster:",
            request.cacheBuster
          );
        }

        Logger.log("📡 Loading BS dynamic data with request:", {
          ...request,
          forceRefresh,
        });

        const result = await getTableData(request);

        // Extract actual row data from nested structure
        const processedRows = (result.rows || [])
          .map((row, index) => {
            // If row has nested data structure, extract the data
            let rowData = row;
            if (row.data && typeof row.data === "object") {
              rowData = row.data;
            }

            // Skip null, undefined, or empty rows
            if (
              !rowData ||
              typeof rowData !== "object" ||
              Object.keys(rowData).length === 0
            ) {
              return null;
            }

            // Ensure each row has a valid ID - use consistent ID generation
            if (!rowData.id && !rowData.Id && !rowData.ID) {
              // Try to find primary key from metadata
              const primaryKey = metadata?.primaryKeys?.[0];
              if (primaryKey && rowData[primaryKey] != null) {
                rowData.id = rowData[primaryKey];
              } else {
                // Generate a stable fallback ID based on row content hash
                const rowString = JSON.stringify(rowData);
                const hash = rowString.split("").reduce((a, b) => {
                  a = (a << 5) - a + b.charCodeAt(0);
                  return a & a;
                }, 0);
                rowData.id = `generated-${Math.abs(hash)}-${index}`;
              }
            }

            return rowData;
          })
          .filter((row) => row !== null); // Remove null rows

        setRows(processedRows);
        setRowCount(result.rowCount || 0);

        // Reset row selection when data changes to prevent stale references
        setRowSelectionModel([]);

        // Force component update if this is a refresh
        if (forceRefresh) {
          Logger.log("🔄 Force refresh completed, triggering component update");
          // Small delay to ensure state is properly updated
          setTimeout(() => {
            Logger.log("� DataGrid should now show updated data");
          }, 100);
        }

        Logger.log("�📊 BS dynamic data loaded successfully:", {
          originalRowsCount: result.rows?.length || 0,
          processedRowsCount: processedRows?.length || 0,
          filteredOutCount:
            (result.rows?.length || 0) - (processedRows?.length || 0),
          total: result.rowCount || 0,
          forceRefresh,
          timestamp: new Date().toISOString(),
          sampleData: processedRows.slice(0, 2), // Show first 2 rows for debugging
          // Pagination debug info
          currentPage: currentPaginationModel.page,
          pageSize: currentPaginationModel.pageSize,
          shouldShowPagination:
            (result.rowCount || 0) > currentPaginationModel.pageSize,
          paginationModel: currentPaginationModel,
          totalPages: Math.ceil(
            (result.rowCount || 0) / currentPaginationModel.pageSize
          ),
        });

        // Extra debug for pagination issues
        if ((result.rowCount || 0) > currentPaginationModel.pageSize) {
          Logger.log("🔢 Pagination should be visible:", {
            rowCount: result.rowCount,
            pageSize: currentPaginationModel.pageSize,
            totalPages: Math.ceil(
              (result.rowCount || 0) / currentPaginationModel.pageSize
            ),
            currentPageIndex: currentPaginationModel.page,
            message:
              "Pagination controls should be displayed at bottom of DataGrid",
          });
        } else {
          Logger.log("⚠️ Pagination hidden (not enough data):", {
            rowCount: result.rowCount,
            pageSize: currentPaginationModel.pageSize,
            message: "Need more data than pageSize to show pagination",
          });
        }
      } catch (err) {
        Logger.error("❌ Failed to load BS dynamic data:", err);
        setError(err.message || "Failed to load data");
        setRows([]);
        setRowCount(0);
      } finally {
        setLoading(false);
      }
    },
    [
      effectiveTableName,
      metadata,
      getTableData,
      bsFilterMode,
      bsPreObj,
      bsObjBy,
      bsObjWh,
      parsedCols,
      comboBoxConfig,
    ]
  );

  // Store loadData reference to use in useEffect without dependency
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // Auto-reload data when dependencies change
  useEffect(() => {
    if (metadata && autoLoad) {
      loadDataRef.current();
    }
  }, [metadata, autoLoad]);

  // Handler for filter model changes with debugging
  const handleFilterModelChange = useCallback(
    (newFilterModel) => {
      Logger.log("🔍 Filter model changed:", {
        oldModel: filterModel,
        newModel: newFilterModel,
        hasQuickFilter: !!newFilterModel.quickFilterValues?.length,
        quickFilterValues: newFilterModel.quickFilterValues,
        itemsCount: newFilterModel.items?.length || 0,
        filterMode: bsFilterMode,
      });

      setFilterModel(newFilterModel);
    },
    [filterModel, bsFilterMode]
  );

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
      case "int":
        return Number(value).toLocaleString();
      case "bit":
        return value ? "Yes" : "No";
      case "datetime":
      case "datetime2":
        return new Date(value).toLocaleString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false, // ถ้าอยากได้แบบ 24 ชั่วโมง
        });
      case "date":
        return new Date(value).toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      case "time":
        return new Date(`1970-01-01T${value}`).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      case "money":
      case "decimal":
        return Number(value).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      default:
        return String(value);
    }
  }, []);

  // Helper: Check if field should be shown in form
  const isFieldInForm = useCallback(
    (columnName, dataType, isIdentity, hasDefault, defaultValue) => {
      // Skip identity columns (auto increment)
      if (isIdentity) {
        return false;
      }

      // Skip GUID columns (auto generate with NEWID())
      if (dataType?.toLowerCase() === "uniqueidentifier") {
        return false;
      }

      // Skip fields that have default values (will be auto-generated) - check both hasDefault and defaultValue
      if ((hasDefault || !!defaultValue) && dialogMode === "add") {
        return false;
      }

      // Additional check: Skip primary key fields that use sequences (like SQL Server NEXT VALUE FOR)
      // This is a fallback for when metadata doesn't properly indicate hasDefault or isIdentity
      if (dialogMode === "add") {
        // Check if this field is in the primaryKeys array from metadata
        const isPrimaryKey = metadata?.primaryKeys?.includes(columnName);

        if (isPrimaryKey) {
          Logger.log(
            `❌ Skipping ${columnName} - is primary key from metadata`
          );
          return false;
        }

        // Fallback: Check if this is likely a sequence-generated primary key by naming pattern
        // const isSequencePrimaryKey =
        //   columnName.toLowerCase().endsWith("_id") &&
        //   dataType?.toLowerCase() === "int" &&
        //   (columnName.toLowerCase().includes("group") ||
        //     columnName.toLowerCase().includes("user") ||
        //     columnName.toLowerCase().includes("app"));

        // if (isSequencePrimaryKey) {
        //   Logger.log(
        //     `❌ Skipping ${columnName} - detected as sequence-generated primary key by pattern`
        //   );
        //   return false;
        // }
      } else if (dialogMode === "edit") {
        // Check if this field is in the primaryKeys array from metadata
        const isPrimaryKey = metadata?.primaryKeys?.includes(columnName);

        if (isPrimaryKey) {
          Logger.log(
            `❌ Skipping ${columnName} - is primary key from metadata`
          );
          return false;
        }
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
    },
    [dialogMode, metadata?.primaryKeys]
  );

  // Helper: Check if field is is_active
  const isActiveField = useCallback((columnName) => {
    return columnName?.toLowerCase() === "is_active";
  }, []);

  // Initialize form data based on metadata
  const initializeFormData = useCallback(
    (existing = null) => {
      if (!metadata?.columns) return {};
      const init = {};

      Logger.log("🔧 Initializing form data:", {
        existing,
        existingKeys: existing ? Object.keys(existing) : [],
        hasMetadata: !!metadata?.columns,
        dialogMode,
      });

      metadata.columns
        .filter((c) =>
          isFieldInForm(
            c.columnName,
            c.dataType,
            c.isIdentity,
            c.hasDefault,
            c.defaultValue
          )
        )
        .forEach((c) => {
          if (existing && existing[c.columnName] !== undefined) {
            init[c.columnName] = existing[c.columnName];
            Logger.log(`🔧 Setting ${c.columnName} from existing:`, {
              value: existing[c.columnName],
              type: typeof existing[c.columnName],
            });
          } else {
            // For edit mode, if field is missing from row data, check if we should skip defaulting
            // This happens when the field exists in metadata but wasn't included in the grid columns
            if (existing !== null) {
              // Edit mode - check if this field might have a value that wasn't loaded in the grid
              Logger.log(
                `⚠️ Field ${c.columnName} missing from row data in edit mode`,
                {
                  columnName: c.columnName,
                  existingKeys: Object.keys(existing || {}),
                  dataType: c.dataType,
                }
              );

              // For ComboBox fields in edit mode, don't default to 0 - leave empty until we can determine the real value
              const comboConfig = comboBoxConfig[c.columnName];
              if (comboConfig) {
                init[c.columnName] = ""; // Leave empty for ComboBox fields
                Logger.log(
                  `🔧 Setting ${c.columnName} empty for ComboBox (missing from row):`,
                  {
                    value: "",
                    type: "string",
                    reason: "missing_from_row_data",
                  }
                );
                return; // Skip default value assignment
              }
            }

            // Special handling for is_active field - default to YES for new records
            if (isActiveField(c.columnName)) {
              init[c.columnName] = "YES";
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
            Logger.log(`🔧 Setting ${c.columnName} default:`, {
              value: init[c.columnName],
              type: typeof init[c.columnName],
              dataType: c.dataType,
            });
          }
        });

      Logger.log("🔧 Final initialized form data:", init);
      return init;
    },
    [metadata, isFieldInForm, isActiveField, comboBoxConfig, dialogMode]
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
      const initialFormData = initializeFormData(row);

      Logger.log("🎯 Edit form data initialized:", {
        initialFormData,
        app_id: initialFormData?.app_id,
        appIdType: typeof initialFormData?.app_id,
      });

      setFormData(initialFormData);
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
          await deleteRecord(id, null, bsPreObj);
          await loadData();
          Logger.log("✅ Record deleted and data reloaded");
        } catch (err) {
          Logger.error("❌ Failed to delete record:", err);
          setError(err.message || "Failed to delete record");
        }
      }
    },
    [metadata, onDelete, deleteRecord, loadData, bsPreObj]
  );

  // Validate form data against metadata constraints
  const validateFormData = useCallback(
    (data) => {
      if (!metadata?.columns) return { isValid: true, errors: [] };

      const errors = [];

      metadata.columns.forEach((column) => {
        const { columnName, maxLength, dataType, isNullable } = column;
        const value = data[columnName];

        // Skip validation for fields not in form
        if (
          !isFieldInForm(
            columnName,
            dataType,
            column.isIdentity,
            column.hasDefault,
            column.defaultValue
          )
        ) {
          return;
        }

        // Check maxLength for text fields
        if (maxLength > 0 && value != null) {
          const stringValue = String(value);
          if (stringValue.length > maxLength) {
            errors.push(
              `${formatColumnName(
                columnName
              )}: Maximum ${maxLength} characters allowed (current: ${
                stringValue.length
              })`
            );
          }
        }

        // Check required fields
        if (!isNullable && (value == null || value === "")) {
          errors.push(
            `${formatColumnName(columnName)}: This field is required`
          );
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [metadata, isFieldInForm, formatColumnName]
  );

  // Save (create/update) from dialog
  const handleSave = useCallback(async () => {
    try {
      setFormLoading(true);

      // Validate form data before saving
      const validation = validateFormData(formData);
      if (!validation.isValid) {
        alert(`Validation Errors:\n${validation.errors.join("\n")}`);
        return;
      }

      if (dialogMode === "add") {
        // For add mode, prepare form data with auto-generated values
        const saveData = { ...formData };

        // Add auto-generated values for fields not shown in form
        if (metadata?.columns) {
          metadata.columns.forEach((c) => {
            const { columnName, dataType, isIdentity, hasDefault } = c;

            // Skip if field is already in formData
            if (saveData[columnName] !== undefined) return;

            // Handle GUID fields - let SQL Server generate with NEWID()
            if (dataType?.toLowerCase() === "uniqueidentifier") {
              saveData[columnName] = "NEWID()"; // Special value to trigger server-side generation
              Logger.log(`🔧 Adding GUID generation for ${columnName}:`, {
                value: "NEWID()",
                dataType,
              });
            }

            // Handle fields with defaults - let SQL Server use default value
            else if (hasDefault && !isIdentity) {
              saveData[columnName] = "DEFAULT"; // Special value to trigger server-side default
              Logger.log(`🔧 Adding default value for ${columnName}:`, {
                value: "DEFAULT",
                dataType,
                hasDefault,
              });
            }

            // Identity fields are handled automatically by SQL Server, no need to send
          });
        }

        Logger.log("🔧 Saving with auto-generated values:", {
          originalFormData: formData,
          finalSaveData: saveData,
        });

        await createRecord(saveData, bsPreObj);
      } else {
        // For edit mode, use formData as is
        const primaryKey = metadata?.primaryKeys?.[0] || "Id";
        const id =
          selectedRow?.[primaryKey] ?? selectedRow?.id ?? selectedRow?.Id;
        if (!id) throw new Error("No primary key for update");
        await updateRecord({ id, data: formData, preObj: bsPreObj });
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
    bsPreObj,
    validateFormData,
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

  // Helper: Get is_active dropdown options
  const getIsActiveOptions = useCallback(() => {
    return [
      { value: "YES", label: "YES" },
      { value: "NO", label: "NO" },
    ];
  }, []);

  // Helper: Check if field is required (not null)
  const isFieldRequired = useCallback((columnName, metadata) => {
    const column = metadata?.columns?.find((c) => c.columnName === columnName);
    return column && !column.isNullable;
  }, []);

  const isColumnHidden = useCallback(
    (columnName, dataType) => {
      // Hide GUID columns
      if (dataType?.toLowerCase() === "uniqueidentifier") {
        return true;
      }

      // Hide primary key columns
      if (metadata?.primaryKeys?.includes(columnName)) {
        return true;
      }

      // Hide audit fields
      const auditFields = [
        // "create_by",
        // "created_by",
        // "createby",
        // "create_date",
        // "created_date",
        // "createdate",
        // "created_at",
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
    },
    [metadata?.primaryKeys]
  );

  // Render form fields from metadata
  const renderFormFields = useCallback(() => {
    if (!metadata?.columns) return null;

    // Get all columns that should be in the form
    let formColumns = metadata.columns.filter((c) => {
      // Filter out is_active field in add mode
      if (dialogMode === "add" && isActiveField(c.columnName)) {
        return false;
      }
      return isFieldInForm(
        c.columnName,
        c.dataType,
        c.isIdentity,
        c.hasDefault,
        c.defaultValue
      );
    });

    // Add ComboBox fields that might not be in the filtered columns
    // This ensures ComboBox fields are available in forms even if not in bsCols
    if (comboBoxConfig && Object.keys(comboBoxConfig).length > 0) {
      Object.keys(comboBoxConfig).forEach((comboFieldName) => {
        const alreadyIncluded = formColumns.some(
          (c) => c.columnName === comboFieldName
        );
        if (!alreadyIncluded) {
          // Find the column in metadata
          const comboColumn = metadata.columns.find(
            (c) => c.columnName === comboFieldName
          );
          if (comboColumn) {
            // Check if it should be in form (excluding bsCols logic)
            const shouldInclude = isFieldInForm(
              comboColumn.columnName,
              comboColumn.dataType,
              comboColumn.isIdentity,
              comboColumn.hasDefault,
              comboColumn.defaultValue
            );
            if (shouldInclude) {
              formColumns.push(comboColumn);
              Logger.log(`✅ Added ComboBox field to form: ${comboFieldName}`, {
                column: comboColumn,
                comboConfig: comboBoxConfig[comboFieldName],
              });
            }
          }
        }
      });
    }

    const formFields = formColumns.map((c) => {
      const { columnName, dataType, isNullable, description, maxLength } = c;
      const val = formData[columnName] ?? "";
      let inputType = "text";
      let multiline = false;

      // Check if this column has a combobox configuration
      const comboConfig = comboBoxConfig[columnName];
      if (comboConfig) {
        Logger.log("🎨 Rendering ComboBox for column:", {
          columnName,
          value: val,
          config: comboConfig,
          formData: formData[columnName],
          originalRowData: dialogMode === "edit" ? selectedRow : null,
          dialogMode,
        });
        return (
          <Grid item xs={12} sm={6} md={4} key={columnName}>
            <ComboBoxField
              columnName={columnName}
              config={comboConfig}
              value={val}
              onChange={(value) =>
                setFormData((p) => ({ ...p, [columnName]: value }))
              }
              required={!isNullable}
              dataType={dataType}
              isNullable={isNullable}
              description={description}
            />
          </Grid>
        );
      }

      // Special handling for is_active field
      if (isActiveField(columnName)) {
        return (
          <Grid item xs={12} sm={6} md={4} key={columnName}>
            <FormControl fullWidth size="small" required={!isNullable}>
              <InputLabel>{formatColumnName(columnName)}</InputLabel>
              <Select
                value={val || "YES"}
                label={formatColumnName(columnName)}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, [columnName]: e.target.value }))
                }
              >
                {getIsActiveOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        width: "100%",
                      }}
                    >
                      <Chip
                        label={option.label}
                        size="small"
                        color={option.value === "YES" ? "success" : "error"}
                        variant="outlined"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {description ||
                  `${dataType} ${isNullable ? "(nullable)" : "(required)"}`}
              </FormHelperText>
            </FormControl>
          </Grid>
        );
      }

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
              label={formatColumnName(columnName)}
            />
          </Grid>
        );
      }

      // For text/ntext fields, use full width
      const gridSize = multiline ? { xs: 12 } : { xs: 12, sm: 6, md: 4 };

      // Build helper text with length information
      let helperText = description || "";
      if (
        bsShowCharacterCount &&
        maxLength > 0 &&
        (inputType === "text" || multiline)
      ) {
        const currentLength = String(val).length;
        const lengthInfo = `${currentLength}/${maxLength} characters`;
        helperText = helperText ? `${helperText} (${lengthInfo})` : lengthInfo;
      }

      return (
        <Grid item {...gridSize} key={columnName}>
          <TextField
            fullWidth
            size="small"
            label={formatColumnName(columnName)}
            type={inputType}
            value={val}
            onChange={(e) =>
              setFormData((p) => ({ ...p, [columnName]: e.target.value }))
            }
            required={!isNullable}
            multiline={multiline}
            rows={multiline ? 3 : 1}
            helperText={helperText}
            inputProps={{
              ...(maxLength > 0 &&
                (inputType === "text" || multiline) && {
                  maxLength: maxLength,
                }),
            }}
            error={maxLength > 0 && String(val).length > maxLength}
          />
        </Grid>
      );
    });

    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {formFields}
      </Grid>
    );
  }, [
    metadata,
    formData,
    isFieldInForm,
    formatColumnName,
    dialogMode,
    isActiveField,
    getIsActiveOptions,
    comboBoxConfig,
    selectedRow,
    bsShowCharacterCount,
  ]);

  // Function to restore a single row to its original state
  const handleRestoreRow = useCallback(
    (rowId) => {
      const change = unsavedChangesRef.current[rowId];
      if (!change) return;

      // Remove from unsaved changes
      delete unsavedChangesRef.current[rowId];

      // Check if there are any remaining unsaved changes
      const remainingChanges = Object.keys(unsavedChangesRef.current).length;
      setHasUnsavedChanges(remainingChanges > 0);

      // Update the row in the grid to show original data
      setRows((prevRows) =>
        prevRows.map((row) => {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          const currentRowId = row[primaryKey] || row.id || row.Id;

          if (String(currentRowId) === String(rowId)) {
            Logger.log("🔄 Restoring row to original state:", {
              rowId,
              originalData: change.originalData,
            });
            return change.originalData;
          }
          return row;
        })
      );

      Logger.log("✅ Row restored successfully:", { rowId, remainingChanges });
    },
    [metadata]
  );

  // Build columns from metadata
  const columns = useMemo(() => {
    Logger.log("🏗️ Building columns - START", {
      hasMetadata: !!metadata,
      hasColumns: !!metadata?.columns,
      columnsCount: metadata?.columns?.length,
      parsedCols,
      readOnly,
      bulkEditMode,
    });

    // Early validation - must return empty array if no metadata
    if (!metadata?.columns || !Array.isArray(metadata.columns)) {
      Logger.warn(
        "⚠️ No valid metadata columns available, returning empty array",
        {
          metadata: !!metadata,
          columns: metadata?.columns,
          isArray: Array.isArray(metadata?.columns),
        }
      );
      return [];
    }

    try {
      const dataColumns = metadata.columns
        .filter(
          (col) =>
            !col.isHidden && !isColumnHidden(col.columnName, col.dataType)
        ) // Skip hidden and GUID/audit columns
        .map((col) => {
          const columnName = col.columnName;
          const isRequired = isFieldRequired(columnName, metadata);
          const comboConfig = comboBoxConfig[columnName];

          const baseColumn = {
            field: col.columnName,
            headerName: col.displayName || formatColumnName(col.columnName),
            width: getColumnWidth(col.dataType, col.maxLength),
            type:
              comboConfig || isActiveField(columnName)
                ? "singleSelect"
                : getGridColumnType(col.dataType),
            editable:
              (!col.isIdentity && !col.isReadOnly && !readOnly) || bulkEditMode,
            sortable: true,
            filterable: true,
            resizable: true,
            // Add red styling for required fields
            headerClassName: isRequired ? "required-field" : undefined,
          };

          // is_active field configuration
          if (isActiveField(columnName)) {
            baseColumn.valueOptions = getIsActiveOptions();
            baseColumn.renderCell = (params) => {
              const { value } = params;
              const displayText = value || "YES"; // Default to YES if empty

              return (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Chip
                    label={displayText}
                    size="small"
                    color={displayText === "YES" ? "success" : "error"}
                    variant="outlined"
                  />
                </Box>
              );
            };
          }
          // ComboBox configuration
          else if (comboConfig) {
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

        // In bulk edit mode, show restore button for changed rows
        if (bulkEditMode) {
          actions.push((params) => {
            const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
            const rowId =
              params.row[primaryKey] || params.row.id || params.row.Id;
            const hasChanges = !!unsavedChangesRef.current[rowId];

            if (!hasChanges) return null;

            return (
              <GridActionsCellItem
                icon={<Restore />}
                label="Restore"
                onClick={() => handleRestoreRow(rowId)}
                sx={{
                  color: "warning.main",
                  "&:hover": {
                    backgroundColor: "warning.light",
                    color: "warning.dark",
                  },
                }}
              />
            );
          });
        } else {
          // Regular edit/delete actions (only in normal mode)
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
        }

        // Insert actions column at the beginning (after checkbox if present)
        dataColumns.unshift({
          field: "actions",
          type: "actions",
          headerName: "", // Hide column header
          width: bulkEditMode ? 80 : 120, // Smaller width in bulk edit mode
          sortable: false,
          filterable: false,
          hideable: false,
          disableColumnMenu: true,
          getActions: (params) => actions.map((a) => a(params)).filter(Boolean),
        });
      }

      // Apply column filtering if bsCols is specified
      Logger.log("🔍 Column filtering in useMemo:", {
        parsedCols,
        totalColumns: dataColumns.length,
        columnFields: dataColumns.map((c) => c.field),
      });

      let filteredDataColumns = [...dataColumns]; // Ensure we have an array copy

      if (parsedCols && parsedCols.length > 0) {
        // Separate actions column if it exists
        const actionsCol = dataColumns.find((c) => c.field === "actions");
        const otherColumns = dataColumns.filter((c) => c.field !== "actions");

        // Filter to only show specified columns, maintaining order
        filteredDataColumns = [];

        // Add actions column first if it exists
        if (actionsCol) {
          filteredDataColumns.push(actionsCol);
        }

        // Add other specified columns
        parsedCols.forEach((colName) => {
          const column = otherColumns.find((c) => c.field === colName);
          if (column) {
            filteredDataColumns.push(column);
          } else {
            Logger.warn(`❌ Column '${colName}' not found in metadata`);
          }
        });

        Logger.log("✅ Column filtering applied:", {
          originalCount: dataColumns.length,
          filteredCount: filteredDataColumns.length,
          filteredFields: filteredDataColumns.map((c) => c.field),
        });
      } else {
        Logger.log("⚠️ No column filtering - showing all columns");
      }

      // Final safety check to ensure we always return an array
      let finalColumns = Array.isArray(filteredDataColumns)
        ? filteredDataColumns
        : [];

      // Deep validation for MUI DataGrid compatibility
      finalColumns = finalColumns.filter((col) => {
        // Ensure each column is a proper object with required properties
        return (
          col &&
          typeof col === "object" &&
          typeof col.field === "string" &&
          col.field.length > 0 &&
          typeof col.headerName === "string"
        );
      });

      // Create a deep clone to avoid any reference issues
      finalColumns = finalColumns.map((col) => ({
        field: col.field,
        headerName: col.headerName,
        type: col.type || "string",
        width: col.width || 150,
        editable: Boolean(col.editable),
        sortable: col.sortable !== false,
        filterable: col.filterable !== false,
        hideable: col.hideable !== false,
        ...col, // Include any other properties
      }));

      Logger.log("🔍 Final columns check:", {
        isArray: Array.isArray(finalColumns),
        count: finalColumns.length,
        type: typeof finalColumns,
        allValid: finalColumns.every(
          (c) =>
            c && typeof c.field === "string" && typeof c.headerName === "string"
        ),
        sample: finalColumns.slice(0, 2).map((c) => ({
          field: c.field,
          headerName: c.headerName,
          type: c.type,
        })),
      });

      return finalColumns;
    } catch (error) {
      Logger.error("❌ Error building columns:", error);
      return []; // Always return empty array on error
    }
  }, [
    metadata,
    readOnly,
    bulkEditMode,
    parsedCols,
    comboBoxConfig,
    onView,
    handleEditClick,
    handleDeleteClick,
    handleRestoreRow,
    formatColumnName,
    getColumnWidth,
    getGridColumnType,
    formatCellValue,
    isColumnHidden,
    isFieldRequired,
    renderComboBoxCell,
    getComboBoxOptions,
    isActiveField,
    getIsActiveOptions,
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
  const handleBulkAdd = useCallback(() => {
    if (!metadata?.columns) {
      Logger.warn("⚠️ Cannot open bulk add dialog without metadata");
      return;
    }

    // Initialize empty rows for bulk add
    const emptyRows = Array.from({ length: bulkRowCount }, (_, index) => ({
      _id: `bulk-add-${index}`,
      ...initializeFormData(),
    }));

    setBulkAddRows(emptyRows);
    setBulkAddDialogOpen(true);
    Logger.log("📝 Bulk Add dialog opened with", bulkRowCount, "empty rows");
  }, [metadata, bulkRowCount, initializeFormData]);

  const handleBulkEdit = useCallback(() => {
    const selectedRows = rows.filter((row) => {
      const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
      const rowId = row[primaryKey] || row.id || row.Id;
      return rowSelectionModel.includes(rowId);
    });

    if (selectedRows.length === 0) {
      Logger.warn("⚠️ No rows selected for bulk edit");
      return;
    }

    setBulkEditMode(true);
    unsavedChangesRef.current = {};
    setHasUnsavedChanges(false);
    Logger.log("📝 Bulk Edit mode enabled for", selectedRows.length, "rows");
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
            await deleteRecord(id, null, bsPreObj);
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
  }, [rows, rowSelectionModel, metadata, deleteRecord, loadData, bsPreObj]);

  // Bulk Add specific functions
  const handleBulkSave = useCallback(async () => {
    try {
      setFormLoading(true);

      // Filter out empty rows (rows with all empty values)
      const validRows = bulkAddRows.filter((row) => {
        const { _id, ...data } = row;
        return Object.values(data).some(
          (value) => value !== null && value !== undefined && value !== ""
        );
      });

      if (validRows.length === 0) {
        Logger.warn("⚠️ No valid data to save");
        return;
      }

      // Validate all rows before saving
      const validationErrors = [];
      validRows.forEach((row, index) => {
        const { _id, ...data } = row;
        const validation = validateFormData(data);
        if (!validation.isValid) {
          validationErrors.push(
            `Row ${index + 1}: ${validation.errors.join(", ")}`
          );
        }
      });

      if (validationErrors.length > 0) {
        alert(`Validation Errors:\n${validationErrors.join("\n")}`);
        return;
      }

      Logger.log("💾 Saving", validRows.length, "bulk records");

      // Save each row individually
      for (const row of validRows) {
        const { _id, ...data } = row;
        await createRecord(data, bsPreObj);
      }

      setBulkAddDialogOpen(false);
      setBulkAddRows([]);
      await loadData();
      Logger.log("✅ Bulk add completed successfully");
    } catch (err) {
      Logger.error("❌ Bulk save failed:", err);
      setError(err.message || "Failed to save bulk records");
    } finally {
      setFormLoading(false);
    }
  }, [bulkAddRows, createRecord, loadData, bsPreObj, validateFormData]);

  const handleBulkDialogClose = useCallback(() => {
    setBulkAddDialogOpen(false);
    setBulkAddRows([]);
  }, []);

  const updateBulkRow = useCallback((rowIndex, field, value) => {
    setBulkAddRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row
      )
    );
  }, []);

  const addMoreBulkRows = useCallback(() => {
    const newRows = Array.from({ length: 3 }, (_, index) => ({
      _id: `bulk-add-${bulkAddRows.length + index}`,
      ...initializeFormData(),
    }));
    setBulkAddRows((prev) => [...prev, ...newRows]);
  }, [bulkAddRows.length, initializeFormData]);

  const removeBulkRow = useCallback((rowIndex) => {
    setBulkAddRows((prev) => prev.filter((_, index) => index !== rowIndex));
  }, []);

  // Bulk Edit functions
  const processBulkRowUpdate = useCallback(
    (newRow, oldRow) => {
      if (!bulkEditMode) {
        // Normal mode - save immediately and refresh data
        const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
        const rowId = newRow[primaryKey] || newRow.id || newRow.Id;

        Logger.log("📝 Normal mode update:", {
          primaryKey,
          rowId,
          newRow,
          bsPreObj,
          effectiveTableName,
          bsPreObjType: typeof bsPreObj,
          hasBsPreObj: !!bsPreObj,
        });

        // Remove invalid id fields from data before sending to backend
        const cleanData = { ...newRow };

        // Remove generic id fields that don't match the actual primary key
        if (primaryKey !== "id") delete cleanData.id;
        if (primaryKey !== "Id") delete cleanData.Id;
        if (primaryKey !== "ID") delete cleanData.ID;

        Logger.log("📝 Clean data for update:", {
          cleanData,
          whereConditions: { [primaryKey]: rowId },
        });

        // Perform update and refresh data
        return updateRecord({
          id: rowId,
          data: cleanData,
          whereConditions: { [primaryKey]: rowId },
          preObj: bsPreObj, // Pass preObj for correct schema mapping
        })
          .then((result) => {
            // Refresh data after successful update
            Logger.log("✅ Normal mode update successful, refreshing data");
            // Use setTimeout to ensure the update is completed before refresh
            setTimeout(() => {
              loadData(true); // Force refresh with cache buster
            }, 100);
            return result;
          })
          .catch((error) => {
            Logger.error("❌ Normal mode update failed:", error);
            // Set error state to show user
            setError(`Failed to update record: ${error.message || error}`);
            throw error;
          });
      }

      // Bulk edit mode - store changes WITHOUT saving to backend
      const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
      const rowId = newRow[primaryKey] || newRow.id || newRow.Id;

      // Store both new row data and original row data for restore functionality
      unsavedChangesRef.current[rowId] = {
        newData: newRow,
        originalData: oldRow,
      };
      setHasUnsavedChanges(true);

      Logger.log("📝 Bulk edit - row change stored (not saved):", {
        rowId,
        newData: newRow,
        originalData: oldRow,
      });

      // Return newRow to update the grid display but don't save to backend
      return newRow;
    },
    [
      bulkEditMode,
      metadata,
      updateRecord,
      loadData,
      bsPreObj,
      effectiveTableName,
    ]
  );

  const handleBulkSaveChanges = useCallback(async () => {
    try {
      setFormLoading(true);
      setLoading(true); // Set loading to prevent rendering issues

      // Get only the new data from changes (not the original data)
      const changes = Object.values(unsavedChangesRef.current).map(
        (change) => change.newData
      );

      // Validate all changed rows before saving
      const validationErrors = [];
      changes.forEach((row, index) => {
        const validation = validateFormData(row);
        if (!validation.isValid) {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          const rowId = row[primaryKey] || row.id || row.Id;
          validationErrors.push(
            `Row ID ${rowId}: ${validation.errors.join(", ")}`
          );
        }
      });

      if (validationErrors.length > 0) {
        alert(`Validation Errors:\n${validationErrors.join("\n")}`);
        return;
      }

      Logger.log("💾 Saving bulk changes:", changes.length, "rows");

      // Save each changed row
      for (const row of changes) {
        const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
        const id = row[primaryKey] || row.id || row.Id;

        // Remove invalid id fields from data before sending to backend
        const cleanData = { ...row };

        // Remove generic id fields that don't match the actual primary key
        if (primaryKey !== "id") delete cleanData.id;
        if (primaryKey !== "Id") delete cleanData.Id;
        if (primaryKey !== "ID") delete cleanData.ID;

        Logger.log("📝 Bulk save row:", {
          primaryKey,
          id,
          cleanData,
          whereConditions: { [primaryKey]: id },
          bsPreObj,
          preObjPassed: !!bsPreObj,
        });

        await updateRecord({
          id,
          data: cleanData,
          whereConditions: { [primaryKey]: id },
          preObj: bsPreObj,
        });
      }

      // Reset bulk edit state
      setBulkEditMode(false);
      unsavedChangesRef.current = {};
      setHasUnsavedChanges(false);
      setRowSelectionModel([]);

      // Small delay to ensure database transactions are committed
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Force reload data from server with cache buster
      await loadData(true);
      Logger.log("✅ Bulk changes saved successfully and data refreshed");
    } catch (err) {
      Logger.error("❌ Bulk save failed:", err);
      setError(err.message || "Failed to save bulk changes");
    } finally {
      setFormLoading(false);
      setLoading(false); // Clear loading state
    }
  }, [metadata, updateRecord, loadData, bsPreObj, validateFormData]);

  const handleBulkDiscardChanges = useCallback(() => {
    setLoading(true); // Set loading state
    setBulkEditMode(false);
    unsavedChangesRef.current = {};
    setHasUnsavedChanges(false);
    setRowSelectionModel([]);

    // Force reload to discard changes with loading state
    loadData(true).finally(() => {
      setLoading(false); // Clear loading state after reload
    });

    Logger.log("🗑️ Bulk changes discarded");
  }, [loadData]);

  const handleToggleHeaderFilters = useCallback(() => {
    setHeaderFiltersEnabled((prev) => {
      const newValue = !prev;
      Logger.log(`🔧 Header filters ${newValue ? "enabled" : "disabled"}`);
      return newValue;
    });
  }, []);

  // Handle row editing events
  const handleRowEditStart = useCallback(
    (params) => {
      Logger.log("📝 Row edit started:", params.id);
      if (!bulkEditMode) {
        setBulkEditMode(true);
        unsavedChangesRef.current = {};
        setHasUnsavedChanges(false);
        Logger.log("📝 Bulk Edit mode enabled via row double-click");
      }
    },
    [bulkEditMode]
  );

  const handleRowEditStop = useCallback(
    (params) => {
      Logger.log("📝 Row edit stopped:", params.id, "reason:", params.reason);

      // If user cancels editing (Escape key) and there are no unsaved changes,
      // automatically exit bulk edit mode
      if (params.reason === "escapeKeyDown" && !hasUnsavedChanges) {
        setBulkEditMode(false);
        Logger.log(
          "📝 Bulk Edit mode disabled - user cancelled with no changes"
        );
      }
      // For other reasons (like clicking away), keep bulk edit mode active
      // Let user manually save/discard changes via toolbar
    },
    [hasUnsavedChanges]
  );

  // Loading state
  if (metadataLoading) {
    Logger.log("🔄 BSDataGrid: metadata is loading...", effectiveTableName);
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
            <Button onClick={() => loadMetadata(bsPreObj)} size="small">
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
    Logger.warn("⚠️ BSDataGrid: no metadata available", {
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
            onClick={() => loadMetadata(bsPreObj)}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            ลองใหม่
          </Button>
        </Box>
      </Paper>
    );
  }

  Logger.log("✅ BSDataGrid: rendering with metadata", {
    effectiveTableName,
    metadataLoaded: !!metadata,
    showToolbar,
    columns: metadata?.columns?.length,
    rowsCount: rows.length,
    hasValidRows: rows.length > 0 && rows.every((row) => row != null),
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

      {/* Bulk Edit Toolbar */}
      {bulkEditMode && (
        <BulkEditToolbar
          onSave={handleBulkSaveChanges}
          onDiscard={handleBulkDiscardChanges}
          hasUnsavedChanges={hasUnsavedChanges}
          formLoading={formLoading}
          changesCount={Object.keys(unsavedChangesRef.current).length}
        />
      )}

      {/* Table Info */}
      {
        showToolbar && !bulkEditMode
        // && (
        //   <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        //     <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        //       <Typography variant="h6" component="div">
        //         {metadata.displayName || effectiveTableName}
        //       </Typography>
        //       {/* License status indicator */}
        //       <Chip
        //         label={
        //           licenseStatus.hasLicenseKey ? "MUI X Pro" : "MUI X Community"
        //         }
        //         size="small"
        //         color={licenseStatus.hasLicenseKey ? "success" : "default"}
        //         variant="outlined"
        //       />
        //     </Box>
        //     <Typography variant="body2" color="text.secondary">
        //       {rowCount.toLocaleString()} records • {metadata.columns?.length}{" "}
        //       columns
        //       {!licenseStatus.hasLicenseKey &&
        //         " • Limited features (Community version)"}
        //     </Typography>
        //   </Box>
        // )
      }

      {/* DataGrid */}
      {(() => {
        try {
          // Debug columns before passing to DataGridPro
          Logger.log("🔧 About to render DataGridPro with:", {
            columnsType: typeof columns,
            columnsIsArray: Array.isArray(columns),
            columnsLength: Array.isArray(columns) ? columns.length : "N/A",
            columnsValid: Array.isArray(columns) && columns.length > 0,
            sampleColumns: Array.isArray(columns)
              ? columns
                  .slice(0, 2)
                  .map((c) => ({ field: c.field, type: c.type }))
              : "N/A",
            metadataExists: !!metadata,
            metadataColumnsCount: metadata?.columns?.length,
            effectiveTableName,
          });

          // Final validation before render
          const safeColumns = Array.isArray(columns) ? columns : [];
          const validColumns = safeColumns.filter(
            (col) =>
              col &&
              typeof col === "object" &&
              typeof col.field === "string" &&
              col.field.length > 0
          );

          Logger.log("🎯 DataGridPro render decision:", {
            originalLength: safeColumns.length,
            validLength: validColumns.length,
            filtered: safeColumns.length - validColumns.length,
            isDataReady: validColumns.length > 0 && !metadataLoading,
            loading: loading || metadataLoading || validColumns.length === 0,
            // Pagination debug info
            rowCount,
            paginationModel,
            rowsLength: rows.length,
            hasValidRows: rows.length > 0,
          });

          // If no valid columns, show loading state
          if (validColumns.length === 0) {
            return (
              <Box
                sx={{
                  height: height - 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body1">
                    {metadataLoading
                      ? "Loading columns..."
                      : "No valid columns available"}
                  </Typography>
                </Box>
              </Box>
            );
          }

          return (
            <Box
              sx={{
                flex: height === "auto" ? 1 : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <DataGridPro
                rows={rows.filter(
                  (row) =>
                    row &&
                    typeof row === "object" &&
                    Object.keys(row).length > 0
                )}
                columns={(() => {
                  // Final validation and cleaning of columns before passing to MUI
                  const safeColumns = Array.isArray(columns) ? columns : [];
                  const validColumns = safeColumns.filter(
                    (col) =>
                      col &&
                      typeof col === "object" &&
                      typeof col.field === "string" &&
                      col.field.length > 0 &&
                      typeof col.headerName === "string"
                  );

                  // Return empty array if no valid columns to prevent MUI errors
                  return validColumns.length > 0 ? validColumns : [];
                })()}
                rowCount={rowCount}
                loading={
                  loading ||
                  metadataLoading ||
                  !Array.isArray(columns) ||
                  columns.length === 0
                }
                // Ensure we don't render until we have valid data structure
                // Include rowCount and content hash in key to force re-render when data changes
                key={`datagrid-${effectiveTableName}-${rowCount}-${
                  rows.length
                }-${JSON.stringify(rows.slice(0, 1))?.length || 0}-${
                  Array.isArray(columns) ? columns.length : 0
                }`}
                // Editing
                editMode="row"
                processRowUpdate={processBulkRowUpdate}
                onRowEditStart={handleRowEditStart}
                onRowEditStop={handleRowEditStop}
                // Pagination
                pagination={true}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50, 100]}
                // Sorting
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                // Filtering
                filterMode={bsFilterMode}
                filterModel={filterModel}
                onFilterModelChange={handleFilterModelChange}
                // Quick Filter Settings
                filterDebounceMs={500}
                // Header Filters (Pro feature)
                headerFilters={headerFiltersEnabled}
                headerFilterHeight={52}
                // Row Selection (checkbox selection when enabled)
                checkboxSelection={
                  bsBulkEdit || bsBulkAdd || !!onCheckBoxSelected
                }
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={handleRowSelectionChange}
                disableRowSelectionOnClick={
                  !bsBulkEdit && !bsBulkAdd && !onCheckBoxSelected
                }
                // Column Pinning (Pro feature)
                pinnedColumns={pinnedColumns}
                onPinnedColumnsChange={setPinnedColumns}
                // UI Settings
                getRowId={(row) => {
                  // First try to find primary key from metadata
                  const primaryKey = metadata?.primaryKeys?.[0];
                  if (primaryKey && row[primaryKey] != null) {
                    return String(row[primaryKey]);
                  }

                  // Fallback to common ID fields
                  const idFields = ["id", "Id", "ID", "_id"];
                  for (const field of idFields) {
                    if (row[field] != null) {
                      return String(row[field]);
                    }
                  }

                  // Last resort: generate a stable ID based on row content hash
                  const rowString = JSON.stringify(row);
                  const hash = rowString.split("").reduce((a, b) => {
                    a = (a << 5) - a + b.charCodeAt(0);
                    return a & a;
                  }, 0);
                  return `generated-${Math.abs(hash)}`;
                }}
                // Localization
                localeText={getLocalization()}
                // Row styling for unsaved changes
                getRowClassName={(params) => {
                  const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
                  const rowId =
                    params.row[primaryKey] || params.row.id || params.row.Id;
                  return unsavedChangesRef.current[rowId]
                    ? "unsaved-changes"
                    : "";
                }}
                // Custom Toolbar (use slots + slotProps for better compatibility)
                slots={
                  showToolbar && !bulkEditMode
                    ? { toolbar: DynamicGridToolbar }
                    : undefined
                }
                slotProps={
                  showToolbar && !bulkEditMode
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
                          onBulkAdd: handleBulkAdd,
                          showBulkDelete: bsBulkDelete,
                        },
                        // Header filter cell props to show inline clear button
                        headerFilterCell: {
                          showClearIcon: true,
                        },
                      }
                    : headerFiltersEnabled
                    ? {
                        // Header filter cell props when toolbar is disabled but header filters are enabled
                        headerFilterCell: {
                          showClearIcon: true,
                        },
                      }
                    : undefined
                }
                // Styling with required field indicator
                sx={{
                  height:
                    height === "auto"
                      ? "100%" // Use full height of flex container
                      : height - (showToolbar && !bulkEditMode ? 60 : 0), // Fixed height: account for toolbar height
                  flex: height === "auto" ? 1 : "none", // Flex grow when auto height
                  minHeight: height === "auto" ? 300 : undefined, // Minimum height for auto mode
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
                  "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderTitle":
                    {
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
                    // Highlight rows with unsaved changes
                    "&.unsaved-changes": {
                      backgroundColor: "#fff3cd",
                      "&:hover": {
                        backgroundColor: "#ffeaa7",
                      },
                    },
                  },
                  // Header filter styling
                  [`& .MuiDataGrid-headerFilterRow`]: {
                    backgroundColor: "#f9f9f9",
                    borderBottom: "1px solid #e0e0e0",
                    "& .MuiInputBase-root": {
                      fontSize: "0.875rem",
                    },
                    "& .MuiInputBase-input": {
                      padding: "8px 12px",
                    },
                  },
                  // Header filter cells
                  "& .MuiDataGrid-headerFilterCell": {
                    padding: "4px",
                  },
                }}
                {...props}
              />
            </Box>
          );
        } catch (error) {
          Logger.error("❌ DataGridPro render error:", error);
          return (
            <Alert severity="error" sx={{ m: 2 }}>
              <Typography variant="h6">DataGrid Error</Typography>
              <Typography variant="body2">
                Failed to render data grid: {error.message}
              </Typography>
            </Alert>
          );
        }
      })()}

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

      {/* Bulk Add Dialog */}
      <Dialog
        open={bulkAddDialogOpen}
        onClose={handleBulkDialogClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Bulk Add Records
          <Typography variant="body2" color="text.secondary">
            Add multiple records at once. Empty rows will be ignored.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {metadata?.columns ? (
            <Box sx={{ mt: 2 }}>
              {/* Bulk Row Count Control */}
              <Box
                sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}
              >
                <TextField
                  size="small"
                  type="number"
                  label="Number of rows"
                  value={bulkRowCount}
                  onChange={(e) =>
                    setBulkRowCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  sx={{ width: 150 }}
                />
                <Button
                  onClick={addMoreBulkRows}
                  startIcon={<Add />}
                  variant="outlined"
                  size="small"
                >
                  Add 3 More Rows
                </Button>
              </Box>

              {/* Bulk Rows Grid */}
              <Box sx={{ maxHeight: 600, overflow: "auto" }}>
                {bulkAddRows.map((row, rowIndex) => (
                  <Paper
                    key={row._id}
                    sx={{ p: 2, mb: 2, position: "relative" }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Row #{rowIndex + 1}
                      <Button
                        size="small"
                        onClick={() => removeBulkRow(rowIndex)}
                        sx={{ ml: 2 }}
                        color="error"
                      >
                        Remove
                      </Button>
                    </Typography>
                    <Grid container spacing={2}>
                      {metadata.columns
                        .filter((c) =>
                          isFieldInForm(
                            c.columnName,
                            c.dataType,
                            c.isIdentity,
                            c.hasDefault,
                            c.defaultValue
                          )
                        )
                        .map((c) => {
                          const {
                            columnName,
                            dataType,
                            isNullable,
                            maxLength,
                          } = c;
                          const val = row[columnName] ?? "";
                          let inputType = "text";
                          let multiline = false;

                          // Special handling for is_active field
                          if (isActiveField(columnName)) {
                            return (
                              <Grid item xs={12} sm={6} md={4} key={columnName}>
                                <FormControl
                                  fullWidth
                                  size="small"
                                  required={!isNullable}
                                >
                                  <InputLabel>
                                    {formatColumnName(columnName)}{" "}
                                    {!isNullable ? "*" : ""}
                                  </InputLabel>
                                  <Select
                                    value={val || "YES"}
                                    label={`${formatColumnName(columnName)} ${
                                      !isNullable ? "*" : ""
                                    }`}
                                    onChange={(e) =>
                                      updateBulkRow(
                                        rowIndex,
                                        columnName,
                                        e.target.value
                                      )
                                    }
                                  >
                                    {getIsActiveOptions().map((option) => (
                                      <MenuItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "flex-start",
                                            width: "100%",
                                          }}
                                        >
                                          <Chip
                                            label={option.label}
                                            size="small"
                                            color={
                                              option.value === "YES"
                                                ? "success"
                                                : "error"
                                            }
                                            variant="outlined"
                                          />
                                        </Box>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            );
                          }

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
                                        updateBulkRow(
                                          rowIndex,
                                          columnName,
                                          e.target.checked
                                        )
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

                          const gridSize = multiline
                            ? { xs: 12 }
                            : { xs: 12, sm: 6, md: 4 };

                          // Build helper text with length information for bulk add
                          let helperText = "";
                          if (
                            bsShowCharacterCount &&
                            maxLength > 0 &&
                            (inputType === "text" || multiline)
                          ) {
                            const currentLength = String(val).length;
                            helperText = `${currentLength}/${maxLength} characters`;
                          }

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
                                  updateBulkRow(
                                    rowIndex,
                                    columnName,
                                    e.target.value
                                  )
                                }
                                required={!isNullable}
                                multiline={multiline}
                                rows={multiline ? 2 : 1}
                                helperText={helperText}
                                inputProps={{
                                  ...(maxLength > 0 &&
                                    (inputType === "text" || multiline) && {
                                      maxLength: maxLength,
                                    }),
                                }}
                                error={
                                  maxLength > 0 &&
                                  String(val).length > maxLength
                                }
                              />
                            </Grid>
                          );
                        })}
                    </Grid>
                  </Paper>
                ))}
              </Box>
            </Box>
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
          <Button onClick={handleBulkDialogClose} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkSave}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? "Saving..." : `Save ${bulkAddRows.length} Records`}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BSDataGrid;
