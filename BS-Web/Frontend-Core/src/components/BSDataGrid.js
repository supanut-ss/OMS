import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
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
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridRowModes,
  GridRowEditStopReasons,
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
  Save as SaveIcon,
  Close as CancelIcon,
} from "@mui/icons-material";
import { useDynamicCrud } from "../hooks/useDynamicCrud";
import { getSchemaFromPreObj } from "../utils/SchemaMapping";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { getLocaleText } from "./BSDataGrid/locales";
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
          sx={{
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            padding: "4px 8px",
            minHeight: "32px",
            color: "primary.main",
            borderColor: "primary.main",
            border: "1px solid",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
            },
          }}
        >
          Add Record
        </Button>
      )}

      {/* Header Filters Toggle */}
      <Button
        size="small"
        onClick={onToggleHeaderFilters}
        startIcon={
          headerFiltersEnabled ? <FilterListIcon /> : <FilterListOffIcon />
        }
        sx={{
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.8125rem",
          padding: "4px 8px",
          minHeight: "32px",
          color: headerFiltersEnabled ? "primary.main" : "text.primary",
          borderColor: headerFiltersEnabled ? "primary.main" : "transparent",
          border: headerFiltersEnabled ? "1px solid" : "none",
          backgroundColor: "transparent",
          "&:hover": {
            backgroundColor: headerFiltersEnabled
              ? "rgba(25, 118, 210, 0.04)"
              : "rgba(0, 0, 0, 0.04)",
          },
        }}
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
  bsBulkDelete = false,
  bsEnableBulkMode = false,
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
      {/* Custom BS Buttons */}
      {showAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onAdd || (() => Logger.warn("No onAdd handler provided"))}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            padding: "4px 8px",
            minHeight: "32px",
            color: "primary.main",
            borderColor: "primary.main",
            border: "1px solid",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
            },
          }}
        >
          Add
        </Button>
      )}

      {/* Bulk Add button */}
      {bsEnableBulkMode && bsBulkAdd && (
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onBulkAdd}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            padding: "4px 8px",
            minHeight: "32px",
            color: "primary.main",
            borderColor: "primary.main",
            border: "1px solid",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "rgba(25, 118, 210, 0.04)",
            },
          }}
        >
          Bulk Add
        </Button>
      )}

      {/* Bulk Edit/Delete Split Button - show only when rows are selected and checkbox is enabled */}
      {bsEnableBulkMode &&
        selectedRowCount > 0 &&
        (bsBulkEdit || bsBulkDelete) && (
          <BulkSplitButton
            selectedRowCount={selectedRowCount}
            onBulkEdit={onBulkEdit}
            onBulkDelete={onBulkDelete}
            bsBulkEdit={bsBulkEdit}
            showBulkDelete={showBulkDelete}
          />
        )}

      {/* Quick Filter - Right aligned */}
      <Box sx={{ flexGrow: 1 }} />

      <GridToolbarQuickFilter debounceMs={500} />
      {/* Header Filters Toggle */}
      <Button
        size="small"
        onClick={onToggleHeaderFilters}
        startIcon={
          headerFiltersEnabled ? <FilterListIcon /> : <FilterListOffIcon />
        }
        sx={{
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.8125rem",
          padding: "4px 8px",
          minHeight: "32px",
          mr: 1,
          color: headerFiltersEnabled ? "primary.main" : "text.primary",
          borderColor: headerFiltersEnabled ? "primary.main" : "transparent",
          border: headerFiltersEnabled ? "1px solid" : "none",
          backgroundColor: "transparent",
          "&:hover": {
            backgroundColor: headerFiltersEnabled
              ? "rgba(25, 118, 210, 0.04)"
              : "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        {headerFiltersEnabled ? "Hide Filters" : "Show Filters"}
      </Button>

      {/* Default MUI DataGrid Toolbar Components - Icon only */}
      <Box
        sx={{
          "& .MuiButton-root": {
            minWidth: "auto",
            padding: "4px 8px",
            fontSize: 0,
            color: "transparent",
            "& .MuiButton-startIcon": {
              margin: 0,
              fontSize: "1.5rem",
              color: "rgba(0, 0, 0, 0.54)",
            },
          },
        }}
      >
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />

        <GridToolbarExport />
      </Box>
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
          groupBy: config.ObjGrp || null, // GROUP BY clause to remove duplicates
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
 *   bsBulkDelete={true}
 *   bsBulkAddInline={true}
 *   bsShowCheckbox={true}
 *   bsShowDescColumn={false}
 *   bsShowRowNumber={true}
 *   bsVisibleEdit={true}
 *   bsVisibleDelete={true}
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
 *       ObjBy: "name asc",
 *       ObjGrp: "id, name"
 *     }
 *   ]}
 *   bsColumnDefs={[
 *     {
 *       field: "name",
 *       headerName: "ชื่อ-นามสกุล",
 *       width: 200,
 *       type: "string",
 *       editable: false,
 *       readOnly: true,
 *       required: true,
 *       description: "Full name of the customer",
 *       align: "left",
 *       headerAlign: "center"
 *     },
 *     {
 *       field: "salary",
 *       headerName: "เงินเดือน",
 *       width: 120,
 *       type: "number",
 *       format: "currency",
 *       currencySymbol: "฿",
 *       decimals: 2,
 *       align: "right"
 *     },
 *     {
 *       field: "joinDate",
 *       headerName: "วันที่เริ่มงาน",
 *       width: 150,
 *       type: "date",
 *       dateFormat: "dd/MM/yyyy",
 *       dateTimeFormat: "dd/MM/yyyy HH:mm:ss",
 *       timeFormat: "HH:mm"
 *     },
 *     {
 *       field: "isActive",
 *       headerName: "สถานะ",
 *       width: 100,
 *       type: "boolean",
 *       trueLabel: "Active",
 *       falseLabel: "Inactive",
 *       trueColor: "success",
 *       falseColor: "error"
 *     },
 *     {
 *       field: "status",
 *       headerName: "สถานะ",
 *       width: 120,
 *       type: "singleSelect",
 *       valueOptions: ["Active", "Inactive", "Pending"],
 *       hideable: false,
 *       sortable: true,
 *       filterable: true
 *     }
 *   ]}
 *   onCheckBoxSelected={(selectedRows) => console.log(selectedRows)}
 *   onEdit={(row) => console.log('Edit:', row)}
 *   onDelete={(id) => console.log('Delete:', id)}
 *   onAdd={() => console.log('Add new')}
 * />
 *
 * @bsColumnDefs Configuration:
 * Custom column definitions to override or extend metadata-driven columns.
 * Supports both dynamic metadata tables and Enhanced Stored Procedures.
 *
 * Available Properties:
 * - field: string (required) - Column field name
 * - headerName: string - Display name in header
 * - width: number - Column width in pixels
 * - type: "string" | "number" | "boolean" | "date" | "dateTime" | "singleSelect" | "currency"
 * - editable: boolean - Allow inline editing (default: true)
 * - readOnly: boolean - Disable editing in forms (default: false)
 * - required: boolean - Force required validation (overrides metadata)
 * - description: string - Helper text in forms
 * - align: "left" | "center" | "right" - Cell content alignment
 * - headerAlign: "left" | "center" | "right" - Header alignment
 * - sortable: boolean - Allow sorting (default: true)
 * - filterable: boolean - Allow filtering (default: true)
 * - hideable: boolean - Allow hiding column (default: true)
 * - hide: boolean - Initially hide column (default: false)
 *
 * Type-specific Properties:
 * Number/Currency:
 * - format: "number" | "currency" | "percent"
 * - currencySymbol: string (default: "$")
 * - decimals: number (default: 2)
 * - thousandSeparator: boolean (default: true)
 * - min: number - Minimum value
 * - max: number - Maximum value
 *
 * Date/DateTime:
 * - dateFormat: string (default: "dd/MM/yyyy")
 * - dateTimeFormat: string (default: "dd/MM/yyyy HH:mm:ss")
 * - timeFormat: string (default: "HH:mm")
 * - minDate: Date - Minimum date
 * - maxDate: Date - Maximum date
 *
 * Boolean:
 * - trueLabel: string (default: "Yes")
 * - falseLabel: string (default: "No")
 * - trueColor: "success" | "info" | "warning" | "error"
 * - falseColor: "success" | "info" | "warning" | "error"
 *
 * Select:
 * - valueOptions: string[] | {value: any, label: string}[]
 * - multiple: boolean - Allow multiple selection
 *
 * Rendering:
 * - renderCell: (params) => ReactNode - Custom cell renderer
 * - valueGetter: (params) => any - Custom value getter
 * - valueFormatter: (params) => string - Custom value formatter
 * - valueSetter: (params) => row - Custom value setter
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
 *
 * @bsShowCheckbox Configuration:
 * - bsShowCheckbox={false} (default): Checkbox selection is hidden
 * - bsShowCheckbox={true}: Force show checkbox selection column
 *   * Checkbox will also auto-show when bsBulkEdit, bsBulkDelete is true or onCheckBoxSelected is provided
 *   * Use this prop when you need checkbox selection without bulk operations
 *
 * @bsShowRowNumber Configuration:
 * - bsShowRowNumber={false}: Row number column is hidden
 * - bsShowRowNumber={true} (default): Shows row number column as the first column after action column
 *   * Displays sequential numbers starting from 1 for each page
 *   * Automatically adjusts for pagination (e.g., page 2 starts from 26)
 *   * Useful for data reference and user navigation
 *
 * @bsVisibleEdit Configuration:
 * - bsVisibleEdit={false}: Hide edit button in actions column
 * - bsVisibleEdit={true} (default): Show edit button in actions column
 *   * Only applies to regular mode (not bulk edit or inline bulk add mode)
 *   * Button will trigger onEdit callback or open built-in edit dialog
 *
 * @bsVisibleDelete Configuration:
 * - bsVisibleDelete={false}: Hide delete button in actions column
 * - bsVisibleDelete={true} (default): Show delete button in actions column
 *   * Only applies to regular mode (not bulk edit or inline bulk add mode)
 *   * Button will trigger onDelete callback or built-in delete confirmation
 *
 * @onDataBind Configuration:
 * - onDataBind={(data) => console.log(data)}: Callback function that receives the loaded data
 *   * Called whenever data is loaded from API (initial load, pagination, filtering, sorting)
 *   * Receives array of row objects from the current page or all data (client-side filtering)
 *   * Useful for calculating summaries, totals, or other derived values
 *   * Example: onDataBind={(data) => setTotalQty(data.reduce((sum, row) => sum + (row.qty || 0), 0))}
 *
 * @bsKeyId Configuration:
 * - bsKeyId="method_id": Manually specify the primary key field name
 *   * Used when API metadata is unavailable (Enhanced Stored Procedures returning metadata: null)
 *   * Overrides auto-detection and metadata-based primary key resolution
 *   * Essential for correct UPDATE/DELETE operations in Enhanced SP mode
 *   * Primary Key Resolution Priority:
 *     1. bsKeyId (manual specification) - HIGHEST PRIORITY
 *     2. metadata.primaryKeys[0] (from API metadata)
 *     3. Auto-detect from data (pattern matching: *_id > *Id > *ID > id)
 *     4. Fallback to "Id"
 *   * Example: <BSDataGrid bsKeyId="method_id" bsStoredProcedure="usp_tbm_method" />
 *   * Recommended when:
 *     - Working with Enhanced Stored Procedures without metadata
 *     - Primary key detection is unreliable or ambiguous
 *     - Need guaranteed correct primary key for data operations
 *
 * @bsCustomFilters Configuration:
 * - bsCustomFilters={filterValues}: Array of custom filter objects from BSFilterCustom component
 *   * Integrates with BSFilterCustom component for advanced filtering
 *   * Each filter object contains: { field, operator, value, value2? }
 *   * Supports both server-side and client-side filtering modes
 *   * Filter Modes:
 *     - Server-side (bsFilterMode="server"): Filters sent to API in customFilters parameter
 *     - Client-side (bsFilterMode="client"): Filters applied to loaded data in browser
 *   * Supported Operators:
 *     - String: equals, contains, startsWith, endsWith, isEmpty, isNotEmpty, isAnyOf, not
 *     - Number: equals, >, >=, <, <=, isBetween, not
 *     - Date: is, after, onOrAfter, before, onOrBefore, isBetween
 *   * Example Usage:
 *     ```jsx
 *     const [filterValues, setFilterValues] = useState([]);
 *
 *     <BSFilterCustom
 *       bsFilterField={filterFields}
 *       bsFilterValue={filterValues}
 *       bsFilterValueOnChanage={(values) => setFilterValues(values)}
 *       bsSearch={true}
 *       bsClear={true}
 *     />
 *
 *     <BSDataGrid
 *       bsObj="t_customers"
 *       bsCustomFilters={filterValues}
 *       bsFilterMode="client"
 *     />
 *     ```
 *   * Tips:
 *     - Use client-side mode for small datasets (<1000 rows) for instant filtering
 *     - Use server-side mode for large datasets to reduce data transfer
 *     - Combine with bsObjWh for static WHERE conditions
 */
const BSDataGrid = forwardRef(
  (
    {
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
      bsBulkAddInline = false, // Inline bulk add mode
      bsEnableBulkMode = false, // Enable all bulk operations (default: disabled)
      bsShowCheckbox = false, // Show checkbox selection
      bsShowDescColumn = true,
      bsShowRowNumber = true, // Show row number column
      bsVisibleEdit = true, // Show edit button
      bsVisibleDelete = true, // Show delete button
      bsPinColsLeft,
      bsPinColsRight,
      bsRowPerPage = 25,
      bsComboBox = [],
      bsFilterMode = "server", // "server" | "client"
      bsShowCharacterCount = false, // Show character count in helper text
      bsColumnDefs = [], // Custom column definitions (overrides metadata)
      bsKeyId, // Manual primary key specification (fallback if metadata unavailable)
      bsCustomFilters = [], // Custom filters from BSFilterCustom component

      // Enhanced Stored Procedure support
      bsStoredProcedure, // Enhanced stored procedure name
      bsStoredProcedureSchema = "dbo", // Schema for stored procedure
      bsStoredProcedureParams = {}, // Additional parameters for stored procedure

      onCheckBoxSelected,

      // Data binding callback
      onDataBind, // Callback to receive loaded data for external processing

      ...props
    },
    ref
  ) => {
    // Debug: Log received props
    Logger.log("🎯 BSDataGrid Props:", {
      bsPreObj,
      bsObj,
      tableName,
      bsPreObjType: typeof bsPreObj,
      bsPreObjValue: bsPreObj,
      bsKeyId,
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

    // Parse bsColumnDefs into a lookup object
    const columnDefsConfig = useMemo(() => {
      const config = {};
      if (Array.isArray(bsColumnDefs) && bsColumnDefs.length > 0) {
        bsColumnDefs.forEach((colDef) => {
          if (colDef.field) {
            config[colDef.field] = colDef;
          }
        });
        Logger.log("📊 Parsed bsColumnDefs:", {
          count: Object.keys(config).length,
          fields: Object.keys(config),
          definitions: config,
        });
      }
      return config;
    }, [bsColumnDefs]);

    // Get current user for locale information
    const { user } = useAuth();

    // Get resource hook for multi-language support
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState(null);

    // Helper: Get effective locale for date formatting
    const getEffectiveLocale = useCallback(() => {
      // Priority: bsLocale prop > user.locale_id > default 'en'
      if (bsLocale && bsLocale !== "default") {
        return bsLocale;
      }

      if (user) {
        try {
          const userObj = typeof user === "string" ? JSON.parse(user) : user;
          const userLocale =
            userObj?.locale_id || userObj?.localeId || userObj?.locale;
          if (userLocale) {
            return userLocale;
          }
        } catch (e) {
          Logger.warn("Failed to parse user locale:", e);
        }
      }

      return "en"; // Default fallback
    }, [bsLocale, user]);

    // Helper: Custom date formatter for consistent dd/MM/yyyy format
    const formatDateCustom = useCallback(
      (date, includeTime = false, effectiveLocale) => {
        const isThai = effectiveLocale === "th";

        // Get year with locale-specific calendar
        let year = date.getFullYear();
        if (isThai) {
          year += 543; // Convert to Buddhist Era
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const formattedDate = `${day}/${month}/${year}`;

        if (includeTime) {
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${formattedDate} ${hours}:${minutes}`;
        }

        return formattedDate;
      },
      []
    );

    // Helper: Get locale-specific date/time formatting options
    const getLocaleFormatOptions = useCallback((effectiveLocale) => {
      const isThai = effectiveLocale === "th";

      return {
        // Date formatting - always dd/MM/yyyy format
        dateOptions: {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          calendar: isThai ? "buddhist" : "gregory",
        },
        // DateTime formatting - always dd/MM/yyyy HH:mm format
        dateTimeOptions: {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          calendar: isThai ? "buddhist" : "gregory",
        },
        // Time formatting
        timeOptions: {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        },
        // Number formatting
        numberOptions: {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        // Locale string for toLocaleString()
        localeString: isThai ? "th-TH" : "en-US",
      };
    }, []);

    const {
      metadata: originalMetadata,
      loading: metadataLoading,
      error: metadataError,
      loadMetadata,
      getTableData,
      deleteRecord,
      createRecord,
      updateRecord,
      executeEnhancedStoredProcedure,
    } = useDynamicCrud(effectiveTableName);

    // Enhanced SP metadata override
    const [enhancedMetadata, setEnhancedMetadata] = useState(null);

    // Use Enhanced SP metadata if available, otherwise use original metadata
    const metadata = enhancedMetadata || originalMetadata;

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
    const [isLoadMetadata, setIsLoadMetadata] = useState(false);
    // Bulk Add specific states
    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [bulkAddRows, setBulkAddRows] = useState([]);
    const [bulkRowCount, setBulkRowCount] = useState(5);

    // Bulk Edit states
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const unsavedChangesRef = React.useRef({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Inline Bulk Add states
    const [rowModesModel, setRowModesModel] = useState({});
    const newRowIdCounter = useRef(0);

    // Load resources for multi-language support when table or locale changes
    useEffect(() => {
      const loadResourceData = async () => {
        if (effectiveTableName || bsStoredProcedure) {
          const resourceGroup = bsStoredProcedure || effectiveTableName;
          Logger.log("🌐 Loading resources for:", resourceGroup);
          const res = await getResources(resourceGroup);
          setResourceData(res);
          Logger.log("✅ Resources loaded:", res);
        }
      };
      loadResourceData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveTableName, bsStoredProcedure, bsLocale]);

    // Load metadata when table name changes or for Enhanced Stored Procedure
    useEffect(() => {
      if (autoLoad) {
        if (bsStoredProcedure) {
          // For Enhanced Stored Procedure, create mock metadata to enable data loading
          // The actual columns will be determined from the stored procedure response
          Logger.log(
            "🚀 Using Enhanced Stored Procedure mode - creating mock metadata"
          );
          // Skip metadata loading for Enhanced SP since it will handle everything
        } else if (effectiveTableName && isLoadMetadata === false) {
          // For regular table mode, load metadata as usual
          setIsLoadMetadata(true);
        }
      }
    }, [autoLoad, bsStoredProcedure, effectiveTableName, isLoadMetadata]);

    useEffect(() => {
      if (isLoadMetadata) {
        loadMetadata(bsPreObj);
      }
    }, [bsPreObj, isLoadMetadata, loadMetadata]);

    // Use refs to store current state values to avoid dependency issues
    const paginationModelRef = useRef(paginationModel);
    const sortModelRef = useRef(sortModel);
    const filterModelRef = useRef(filterModel);

    // Keep refs up to date
    paginationModelRef.current = paginationModel;
    sortModelRef.current = sortModel;
    filterModelRef.current = filterModel;

    // Watch for changes in bsCustomFilters and apply them
    useEffect(() => {
      if (!bsCustomFilters || bsCustomFilters.length === 0) {
        Logger.log("🔍 No custom filters applied");
        return;
      }

      Logger.log("🔍 Custom filters changed:", bsCustomFilters);

      // For client-side filtering, reload data to apply filters
      if (bsFilterMode === "client" && hasLoadedRef.current) {
        Logger.log("🔄 Reloading data with custom filters (client-side)");
        loadDataRef.current();
      }
      // For server-side filtering, reload data with custom filters
      else if (bsFilterMode === "server" && hasLoadedRef.current) {
        Logger.log("🔄 Reloading data with custom filters (server-side)");
        loadDataRef.current();
      }
    }, [bsCustomFilters, bsFilterMode]);

    // Helper function to apply custom filters to rows (client-side)
    const applyCustomFilters = useCallback((data, customFilters) => {
      if (!customFilters || customFilters.length === 0) {
        return data;
      }

      Logger.log("🔍 Applying custom filters to data:", {
        rowCount: data.length,
        filters: customFilters,
      });

      return data.filter((row) => {
        // All filters must match (AND logic)
        return customFilters.every((filter) => {
          const { field, operator, value, value2 } = filter;
          const rowValue = row[field];

          // Skip if no value provided
          if (value === null || value === undefined || value === "") {
            return true;
          }

          // Apply operator
          switch (operator) {
            case "equals":
            case "is":
              return (
                String(rowValue).toLowerCase() === String(value).toLowerCase()
              );

            case "contains":
              return String(rowValue)
                .toLowerCase()
                .includes(String(value).toLowerCase());

            case "startsWith":
              return String(rowValue)
                .toLowerCase()
                .startsWith(String(value).toLowerCase());

            case "endsWith":
              return String(rowValue)
                .toLowerCase()
                .endsWith(String(value).toLowerCase());

            case "isEmpty":
              return !rowValue || rowValue === "";

            case "isNotEmpty":
              return rowValue && rowValue !== "";

            case "isAnyOf":
              // value should be an array
              const values = Array.isArray(value) ? value : [value];
              return values.some(
                (v) =>
                  String(rowValue).toLowerCase() === String(v).toLowerCase()
              );

            case ">":
            case "after":
              if (rowValue instanceof Date || typeof rowValue === "string") {
                const rowDate = new Date(rowValue);
                const filterDate = new Date(value);
                return rowDate > filterDate;
              }
              return Number(rowValue) > Number(value);

            case ">=":
            case "onOrAfter":
              if (rowValue instanceof Date || typeof rowValue === "string") {
                const rowDate = new Date(rowValue);
                const filterDate = new Date(value);
                return rowDate >= filterDate;
              }
              return Number(rowValue) >= Number(value);

            case "<":
            case "before":
              if (rowValue instanceof Date || typeof rowValue === "string") {
                const rowDate = new Date(rowValue);
                const filterDate = new Date(value);
                return rowDate < filterDate;
              }
              return Number(rowValue) < Number(value);

            case "<=":
            case "onOrBefore":
              if (rowValue instanceof Date || typeof rowValue === "string") {
                const rowDate = new Date(rowValue);
                const filterDate = new Date(value);
                return rowDate <= filterDate;
              }
              return Number(rowValue) <= Number(value);

            case "isBetween":
              if (!value2) return true;

              if (rowValue instanceof Date || typeof rowValue === "string") {
                const rowDate = new Date(rowValue);
                const filterDate1 = new Date(value);
                const filterDate2 = new Date(value2);
                return rowDate >= filterDate1 && rowDate <= filterDate2;
              }
              return (
                Number(rowValue) >= Number(value) &&
                Number(rowValue) <= Number(value2)
              );

            case "not":
            case "!=":
              return (
                String(rowValue).toLowerCase() !== String(value).toLowerCase()
              );

            default:
              Logger.warn(`Unknown operator: ${operator}`);
              return true;
          }
        });
      });
    }, []);

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

          Logger.log(
            "🟡 [BSDataGrid] sortModelForApi to API:",
            sortModelForApi
          );

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
            // Add custom filters for server-side processing
            customFilters:
              bsFilterMode === "server" &&
              bsCustomFilters &&
              bsCustomFilters.length > 0
                ? bsCustomFilters
                : undefined,
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
          let processedRows = (result.rows || [])
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

          // Apply custom filters if in client-side mode
          if (
            bsFilterMode === "client" &&
            bsCustomFilters &&
            bsCustomFilters.length > 0
          ) {
            Logger.log("🔍 Applying custom filters (client-side):", {
              beforeCount: processedRows.length,
              filters: bsCustomFilters,
            });
            processedRows = applyCustomFilters(processedRows, bsCustomFilters);
            Logger.log("✅ Custom filters applied:", {
              afterCount: processedRows.length,
            });
          }

          setRows(processedRows);
          setRowCount(result.rowCount || 0);

          // Call onDataBind callback with the loaded data
          if (onDataBind && typeof onDataBind === "function") {
            try {
              onDataBind(processedRows);
              Logger.log("📊 onDataBind callback called with data:", {
                rowCount: processedRows.length,
                sampleData: processedRows.slice(0, 2),
              });
            } catch (err) {
              Logger.error("❌ Error in onDataBind callback:", err);
            }
          }

          // Reset row selection when data changes to prevent stale references
          setRowSelectionModel([]);

          // Force component update if this is a refresh
          if (forceRefresh) {
            Logger.log(
              "🔄 Force refresh completed, triggering component update"
            );
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
        onDataBind,
        applyCustomFilters,
        bsCustomFilters,
      ]
    );

    // Load data from Enhanced Stored Procedure
    const loadStoredProcedureData = useCallback(
      async (
        currentPaginationModel = paginationModel,
        currentSortModel = sortModel,
        currentFilterModel = filterModel,
        forceRefresh = false
      ) => {
        if (!bsStoredProcedure || !executeEnhancedStoredProcedure) {
          Logger.warn(
            "⚠️ No stored procedure specified or function not available"
          );
          return;
        }

        setLoading(true);
        setError(null);

        try {
          Logger.log("🚀 Loading data from Enhanced Stored Procedure:", {
            procedureName: bsStoredProcedure,
            schema: bsStoredProcedureSchema,
            params: bsStoredProcedureParams,
            page: currentPaginationModel.page + 1,
            pageSize: currentPaginationModel.pageSize,
            forceRefresh,
          });

          // Prepare request for Enhanced Stored Procedure
          const request = {
            procedureName: bsStoredProcedure,
            schemaName: bsStoredProcedureSchema,
            operation: "SELECT", // Default operation for data loading
            page:
              bsFilterMode === "client" ? 1 : currentPaginationModel.page + 1, // For client-side filtering, load all data (page 1)
            pageSize:
              bsFilterMode === "client"
                ? 10000
                : currentPaginationModel.pageSize, // For client-side filtering, load large page
            sortModel:
              bsFilterMode === "server"
                ? currentSortModel.map((sort) => ({
                    field: sort.field,
                    sort: sort.sort,
                  }))
                : [], // Only send sort for server-side mode
            filterModel:
              bsFilterMode === "server" ? currentFilterModel : { items: [] }, // Only send filters for server-side mode
            parameters: {
              ...bsStoredProcedureParams,
              // Add any additional parameters here
            },
            // Add custom filters for server-side processing
            customFilters:
              bsFilterMode === "server" &&
              bsCustomFilters &&
              bsCustomFilters.length > 0
                ? bsCustomFilters
                : undefined,
            userId:
              user?.UserId ||
              user?.UserId ||
              user?.id ||
              user?.userId ||
              user?.user_id ||
              "system",
          };

          const result = await executeEnhancedStoredProcedure(request);

          if (result.success) {
            let processedRows = (result.data || []).map((row, index) => ({
              ...row,
              id: row.id || row.ID || `sp_row_${index}`, // Ensure unique ID
            }));

            // Apply custom filters if in client-side mode
            if (
              bsFilterMode === "client" &&
              bsCustomFilters &&
              bsCustomFilters.length > 0
            ) {
              Logger.log(
                "🔍 Applying custom filters to Enhanced SP (client-side):",
                {
                  beforeCount: processedRows.length,
                  filters: bsCustomFilters,
                }
              );
              processedRows = applyCustomFilters(
                processedRows,
                bsCustomFilters
              );
              Logger.log("✅ Custom filters applied to Enhanced SP:", {
                afterCount: processedRows.length,
              });
            }

            setRows(processedRows);
            setRowCount(result.rowCount || processedRows.length);

            // Check if no data returned
            if (processedRows.length === 0) {
              Logger.log("ℹ️ Enhanced SP returned no data:", {
                rowCount: result.rowCount,
                message: result.message,
              });
            }

            // Call onDataBind callback with the loaded data
            if (onDataBind && typeof onDataBind === "function") {
              try {
                onDataBind(processedRows);
                Logger.log(
                  "📊 Enhanced SP onDataBind callback called with data:",
                  {
                    rowCount: processedRows.length,
                    sampleData: processedRows.slice(0, 2),
                  }
                );
              } catch (err) {
                Logger.error(
                  "❌ Error in Enhanced SP onDataBind callback:",
                  err
                );
              }
            }

            // 🔍 Extract metadata from Enhanced SP result (API returns as 'metadata' property)
            if (result.metadata) {
              Logger.log("📋 Enhanced SP returned metadata:", result.metadata);

              // Create metadata structure compatible with BSDataGrid
              const enhancedMetadataStructure = {
                tableName: result.metadata.tableName || bsStoredProcedure,
                schemaName:
                  result.metadata.schemaName ||
                  bsStoredProcedureSchema ||
                  "dbo",
                primaryKeys: result.metadata.primaryKeys || [],
                columns: result.metadata.columns || [],
                tableType: "Enhanced SP",
                totalRows:
                  result.metadata.totalRows ||
                  result.rowCount ||
                  processedRows.length,
              };

              // Set metadata for use in form operations and primary key detection
              setEnhancedMetadata(enhancedMetadataStructure);

              Logger.log("✅ Enhanced SP metadata applied:", {
                primaryKeys: enhancedMetadataStructure.primaryKeys,
                columnsCount: enhancedMetadataStructure.columns.length,
                totalRows: enhancedMetadataStructure.totalRows,
                columns: enhancedMetadataStructure.columns.map((c) => ({
                  name: c.columnName,
                  type: c.dataType,
                  isPrimaryKey: c.isPrimaryKey,
                  isIdentity: c.isIdentity,
                })),
              });
            } else {
              Logger.warn(
                "⚠️ Enhanced SP did not return metadata - generating fallback from data"
              );

              // Generate fallback metadata from data structure
              if (processedRows.length > 0) {
                const firstRow = processedRows[0];

                // Priority 1: Use bsKeyId if specified
                let detectedPrimaryKey = bsKeyId;

                // Priority 2: Auto-detect from data if bsKeyId not specified
                if (!detectedPrimaryKey) {
                  const keys = Object.keys(firstRow);
                  const primaryKeyPatterns = [
                    /^.*_id$/i, // part_id, user_id, method_id (PRIORITY)
                    /^.*Id$/, // partId, userId, methodId
                    /^.*ID$/, // partID, userID, methodID
                    /^id$/i, // Generic id (fallback)
                  ];

                  for (const pattern of primaryKeyPatterns) {
                    const foundKey = keys.find((key) => pattern.test(key));
                    if (foundKey) {
                      detectedPrimaryKey = foundKey;
                      break;
                    }
                  }
                }

                const fallbackColumns = Object.keys(firstRow).map((key) => {
                  const value = firstRow[key];
                  let dataType = "nvarchar";

                  // Detect data type
                  if (value === null || value === undefined) {
                    dataType = "nvarchar";
                  } else if (typeof value === "number") {
                    dataType = "int";
                  } else if (value instanceof Date) {
                    dataType = "datetime";
                  } else if (typeof value === "string") {
                    // Check if string is datetime format (ISO 8601)
                    // Pattern: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss
                    const isoDatePattern =
                      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
                    const simpleDatePattern = /^\d{4}-\d{2}-\d{2}$/;

                    if (isoDatePattern.test(value)) {
                      dataType = "datetime";
                    } else if (simpleDatePattern.test(value)) {
                      dataType = "date";
                    }
                  }

                  return {
                    columnName: key,
                    dataType: dataType,
                    isNullable: value === null,
                    isPrimaryKey: key === detectedPrimaryKey,
                    isIdentity: key === detectedPrimaryKey,
                    maxLength: typeof value === "string" ? 255 : null,
                  };
                });

                const fallbackMetadata = {
                  tableName: bsStoredProcedure,
                  schemaName: bsStoredProcedureSchema || "dbo",
                  primaryKeys: detectedPrimaryKey ? [detectedPrimaryKey] : [],
                  columns: fallbackColumns,
                  tableType: "Enhanced SP (Auto-detected)",
                  totalRows: result.rowCount || processedRows.length,
                };

                setEnhancedMetadata(fallbackMetadata);

                Logger.log("✅ Fallback metadata generated from data:", {
                  primaryKey: detectedPrimaryKey,
                  primaryKeySource: bsKeyId
                    ? "bsKeyId (manual)"
                    : "auto-detected",
                  columnsCount: fallbackColumns.length,
                  columns: fallbackColumns.map((c) => c.columnName),
                });
              } else {
                Logger.warn(
                  "⚠️ No data available to generate fallback metadata"
                );
              }
            }

            Logger.log(
              "✅ Enhanced Stored Procedure data loaded successfully:",
              {
                rowsCount: processedRows.length,
                totalCount: result.rowCount,
                operation: result.operation,
                message: result.message,
                hasMetadata: !!result.metadata,
                metadataPrimaryKeys: result.metadata?.primaryKeys,
                metadataColumns: result.metadata?.columns?.length,
              }
            );
          } else {
            throw new Error(
              result.message || "Stored procedure execution failed"
            );
          }
        } catch (err) {
          Logger.error(
            "❌ Failed to load Enhanced Stored Procedure data:",
            err
          );
          setError(err.message || "Failed to load stored procedure data");
          setRows([]);
          setRowCount(0);
        } finally {
          setLoading(false);
        }
      },
      [
        bsStoredProcedure,
        bsStoredProcedureSchema,
        bsStoredProcedureParams,
        executeEnhancedStoredProcedure,
        paginationModel,
        sortModel,
        filterModel,
        user,
        setEnhancedMetadata,
        bsFilterMode,
        onDataBind,
        bsKeyId,
        applyCustomFilters,
        bsCustomFilters,
      ]
    );

    // Store loadData reference to use in useEffect without dependency
    const loadDataRef = useRef(
      bsStoredProcedure ? loadStoredProcedureData : loadData
    );
    loadDataRef.current = bsStoredProcedure
      ? loadStoredProcedureData
      : loadData;

    // Manual refresh data function
    const refreshData = useCallback(
      async (forceRefresh = false) => {
        Logger.log("🔄 Manual refresh triggered", { forceRefresh });

        if (bsStoredProcedure) {
          await loadStoredProcedureData(
            paginationModel,
            sortModel,
            filterModel,
            forceRefresh
          );
        } else {
          await loadData(forceRefresh);
        }
      },
      [
        bsStoredProcedure,
        loadStoredProcedureData,
        loadData,
        paginationModel,
        sortModel,
        filterModel,
      ]
    );

    // Expose refresh methods via ref
    useImperativeHandle(
      ref,
      () => ({
        refreshData,
        forceRefresh: () => refreshData(true),
      }),
      [refreshData]
    );

    // Track if initial load has been done
    const hasLoadedRef = useRef(false);
    const isEnhancedSPRef = useRef(!!bsStoredProcedure);

    // Auto-reload data when dependencies change
    useEffect(() => {
      if (!autoLoad) return;

      // For Enhanced SP, load immediately without waiting for metadata
      if (bsStoredProcedure && !hasLoadedRef.current) {
        Logger.log("🔄 Initial load for Enhanced SP");
        hasLoadedRef.current = true;
        loadDataRef.current();
        return;
      }

      // For regular tables, wait for metadata before loading
      if (!bsStoredProcedure && metadata && !hasLoadedRef.current) {
        Logger.log("🔄 Initial load for regular table");
        hasLoadedRef.current = true;
        loadDataRef.current();
        return;
      }

      // Reset hasLoaded flag if table/SP changes
      if (isEnhancedSPRef.current !== !!bsStoredProcedure) {
        Logger.log("🔄 Table/SP type changed, resetting load flag");
        isEnhancedSPRef.current = !!bsStoredProcedure;
        hasLoadedRef.current = false;
      }
    }, [autoLoad, bsStoredProcedure, metadata]);

    // Reload data when pagination, sort, or filter changes (server-side mode only)
    useEffect(() => {
      // Only reload for server-side filtering
      if (bsFilterMode !== "server") return;

      // Skip if initial load hasn't happened yet
      if (!hasLoadedRef.current) return;

      Logger.log("🔄 Reloading data due to pagination/sort/filter change");
      loadDataRef.current();
    }, [paginationModel, sortModel, filterModel, bsFilterMode]);

    // Handler for sort model changes with debugging
    const handleSortModelChange = useCallback(
      (newSortModel) => {
        Logger.log("🔀 Sort model changed:", {
          oldModel: sortModel,
          newModel: newSortModel,
          sortCount: newSortModel?.length || 0,
          sortFields:
            newSortModel?.map((s) => `${s.field} ${s.sort}`).join(", ") ||
            "none",
          filterMode: bsFilterMode,
        });

        setSortModel(newSortModel);
      },
      [sortModel, bsFilterMode]
    );

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

    // Helper: Format column name for display with multi-language support
    const formatColumnName = useCallback(
      (columnName) => {
        if (!columnName) return "";

        // Try to get resource first
        if (resourceData) {
          const resourceText = getResource(resourceData, columnName);
          // If resource found and different from original, use it
          if (resourceText && resourceText !== columnName) {
            return resourceText;
          }
        }

        // Fallback: Format column name (underscore to space + title case)
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
      },
      [resourceData, getResource]
    );

    // Helper: Get column width based on data type
    // NOTE: Currently not used - columns are auto-sized by DataGrid
    // Kept for reference in case manual width control is needed
    // const getColumnWidth = useCallback((dataType, maxLength = 0) => {
    //   switch (dataType?.toLowerCase()) {
    //     case "bit":
    //       return 80;
    //     case "int":
    //     case "smallint":
    //     case "tinyint":
    //       return 100;
    //     case "bigint":
    //       return 120;
    //     case "decimal":
    //     case "float":
    //     case "real":
    //     case "money":
    //       return 120;
    //     case "datetime":
    //     case "datetime2":
    //     case "date":
    //     case "time":
    //       return 180;
    //     case "varchar":
    //     case "nvarchar":
    //       if (maxLength > 0) {
    //         return maxLength > 100 ? 300 : maxLength > 50 ? 200 : 150;
    //       }
    //       return 200;
    //     case "text":
    //     case "ntext":
    //       return 300;
    //     case "uniqueidentifier":
    //       return 250;
    //     default:
    //       return 150;
    //   }
    // }, []);

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

    // Helper: Format cell values with locale-aware formatting
    const formatCellValue = useCallback(
      (value, dataType) => {
        if (value === null || value === undefined) return "";

        const effectiveLocale = getEffectiveLocale();
        const formatOptions = getLocaleFormatOptions(effectiveLocale);

        // Logger.log("🌐 Format cell value with locale:", {
        //   value,
        //   dataType,
        //   effectiveLocale,
        //   bsLocale,
        //   userLocale: user
        //     ? (typeof user === "string" ? JSON.parse(user) : user)?.locale_id
        //     : "no-user",
        // });

        try {
          switch (dataType?.toLowerCase()) {
            case "int":
              return Number(value).toLocaleString(formatOptions.localeString);
            case "bit":
              return value ? "Yes" : "No";
            case "datetime":
            case "datetime2": {
              // Use custom formatter for consistent dd/MM/yyyy HH:mm format (no comma)
              const date = new Date(value);
              return formatDateCustom(date, true, effectiveLocale);
            }
            case "date": {
              // Use custom formatter for consistent dd/MM/yyyy format
              const date = new Date(value);
              return formatDateCustom(date, false, effectiveLocale);
            }
            case "time":
              return new Date(`1970-01-01T${value}`).toLocaleTimeString(
                formatOptions.localeString,
                formatOptions.timeOptions
              );
            case "money":
            case "decimal":
              return Number(value).toLocaleString(
                formatOptions.localeString,
                formatOptions.numberOptions
              );
            default:
              return String(value);
          }
        } catch (error) {
          Logger.warn(
            "Failed to format cell value with locale, using fallback:",
            {
              value,
              dataType,
              effectiveLocale,
              error: error.message,
            }
          );
          // Fallback to simple string conversion
          return String(value);
        }
      },
      [getEffectiveLocale, getLocaleFormatOptions, formatDateCustom]
    );

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
          // Check if this field is in the primaryKeys array from metadata (case-insensitive)
          const isPrimaryKey = metadata?.primaryKeys?.some(
            (pk) => pk.toLowerCase() === columnName.toLowerCase()
          );

          if (isPrimaryKey) {
            Logger.log(
              `❌ Skipping ${columnName} - is primary key from metadata (primaryKeys: ${JSON.stringify(
                metadata?.primaryKeys
              )})`
            );
            return false;
          }

          // Skip generic ID field (case-insensitive) - common auto-generated field
          if (columnName.toLowerCase() === "id") {
            Logger.log(
              `❌ Skipping ${columnName} - is generic ID field (auto-generated)`
            );
            return false;
          }

          // Skip bsKeyId field if specified
          if (bsKeyId && columnName.toLowerCase() === bsKeyId.toLowerCase()) {
            Logger.log(
              `❌ Skipping ${columnName} - matches bsKeyId (${bsKeyId})`
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
          // Check if this field is in the primaryKeys array from metadata (case-insensitive)
          const isPrimaryKey = metadata?.primaryKeys?.some(
            (pk) => pk.toLowerCase() === columnName.toLowerCase()
          );

          if (isPrimaryKey) {
            Logger.log(
              `❌ Skipping ${columnName} - is primary key from metadata (primaryKeys: ${JSON.stringify(
                metadata?.primaryKeys
              )})`
            );
            return false;
          }

          // Skip generic ID field (case-insensitive) - common auto-generated field
          if (columnName.toLowerCase() === "id") {
            Logger.log(
              `❌ Skipping ${columnName} - is generic ID field (auto-generated)`
            );
            return false;
          }

          // Skip bsKeyId field if specified
          if (bsKeyId && columnName.toLowerCase() === bsKeyId.toLowerCase()) {
            Logger.log(
              `❌ Skipping ${columnName} - matches bsKeyId (${bsKeyId})`
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
      [dialogMode, metadata?.primaryKeys, bsKeyId]
    );

    // Helper: Check if field is is_active
    const isActiveField = useCallback((columnName) => {
      return columnName?.toLowerCase() === "is_active";
    }, []);

    // Helper: Check if field is audit field (should be read-only in inline editing)
    const isAuditField = useCallback((columnName) => {
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

      return auditFields.includes(columnName?.toLowerCase());
    }, []);

    // Helper: Detect primary key from Enhanced SP data
    const detectPrimaryKeyFromData = useCallback((rowData) => {
      if (!rowData || typeof rowData !== "object") return null;

      const keys = Object.keys(rowData);

      // Enhanced debugging to see all data - DEVICE COMPATIBILITY DEBUG
      Logger.log("🔍 PRIMARY KEY DETECTION - Device compatibility debug:", {
        allKeys: keys,
        hasId: keys.includes("id"),
        hasID: keys.includes("ID"),
        hasId_caps: keys.includes("Id"),
        hasPartId: keys.includes("part_id"),
        hasPartID: keys.includes("part_ID"),
        hasPartId_pascal: keys.includes("PartId"),
        hasAtId: keys.includes("@id"),
        hasAtPartId: keys.includes("@part_id"),
        deviceSpecificKeys: keys.filter(
          (key) =>
            key.includes("id") ||
            key.includes("Id") ||
            key.includes("ID") ||
            key.startsWith("@")
        ),
        sampleData: keys.reduce((sample, key, index) => {
          if (index < 10) {
            // Show first 10 fields
            sample[key] = rowData[key];
          }
          return sample;
        }, {}),
      });

      // Device-specific parameter detection (handle @id vs @part_id scenarios)
      const deviceParams = keys.filter((key) => key.startsWith("@"));
      if (deviceParams.length > 0) {
        Logger.log("🔍 DEVICE PARAMETERS DETECTED:", {
          deviceParams,
          hasAtId: deviceParams.includes("@id"),
          hasAtPartId: deviceParams.includes("@part_id"),
          message:
            "Some devices send @id instead of @part_id for update/delete operations",
        });
      }

      // Common primary key patterns (in order of priority) - enhanced for device compatibility
      const primaryKeyPatterns = [
        // Device-specific patterns (highest priority for compatibility)
        ///^@part_id$/i, // @part_id parameter from some devices (prioritize specific over generic)
        /^@.*_id$/i, // @table_id, @user_id, etc.
        /^@id$/i, // @id parameter (fallback for device params)

        // Table-specific patterns (HIGH PRIORITY - before generic "id")
        /^.*_id$/i, // part_id, user_id, order_id, etc. (PRIORITIZED)
        /^.*Id$/, // partId, userId, orderId, etc. (PRIORITIZED)
        /^.*ID$/, // partID, userID, orderID, etc. (PRIORITIZED)

        // Generic patterns (LOWER PRIORITY - after table-specific)
        /^id$/i, // Generic "id" (MOVED DOWN to avoid DataGrid internal IDs)
        /^ID$/,
        /^Id$/,

        // Other patterns
        /^pk_/i, // pk_something
        /^primary_/i, // primary_key
        /^key$/i, // key
      ];

      // Try to find primary key by pattern matching
      for (const pattern of primaryKeyPatterns) {
        const foundKey = keys.find((key) => pattern.test(key));
        if (foundKey) {
          Logger.log(
            `🔍 Detected primary key from Enhanced SP data: ${foundKey}`,
            {
              pattern: pattern.toString(),
              allKeys: keys,
              isDeviceParam: foundKey.startsWith("@"),
              compatibilityNote: foundKey.startsWith("@")
                ? "Device-specific parameter detected"
                : "Standard parameter",
              rowData: Object.keys(rowData).slice(0, 5), // Show first 5 keys for debugging
            }
          );
          return foundKey;
        }
      }

      // If no pattern matches, check for fields that look like IDs by data type
      const possibleIdFields = keys.filter((key) => {
        const value = rowData[key];
        // Look for numeric fields that could be IDs
        return (
          (typeof value === "number" && Number.isInteger(value) && value > 0) ||
          (typeof value === "string" && /^\d+$/.test(value))
        );
      });

      if (possibleIdFields.length > 0) {
        const primaryKey = possibleIdFields[0]; // Take the first numeric field
        Logger.log(
          `🔍 Detected primary key by data type from Enhanced SP: ${primaryKey}`,
          {
            possibleIdFields,
            allKeys: keys,
          }
        );
        return primaryKey;
      }

      Logger.warn("⚠️ Could not detect primary key from Enhanced SP data", {
        keys,
        sampleData: Object.keys(rowData)
          .slice(0, 3)
          .reduce((sample, key) => {
            sample[key] = typeof rowData[key];
            return sample;
          }, {}),
      });

      return null;
    }, []);

    // Helper: Get effective primary key (from metadata or detected from data)
    const getEffectivePrimaryKey = useCallback(
      (rowData = null) => {
        // Priority 1: Manual bsKeyId specification (highest priority)
        if (bsKeyId) {
          Logger.log(
            "🔑 Using manually specified primary key (bsKeyId):",
            bsKeyId
          );
          return bsKeyId;
        }

        // Priority 2: Metadata primary key
        if (metadata?.primaryKeys?.[0]) {
          Logger.log(
            "🔑 Using primary key from metadata:",
            metadata.primaryKeys[0]
          );
          return metadata.primaryKeys[0];
        }

        // Priority 3: Auto-detect from data (for Enhanced SP)
        if (bsStoredProcedure && rowData) {
          const detected = detectPrimaryKeyFromData(rowData);
          Logger.log("🔑 Detected primary key from data:", detected);
          return detected;
        }

        // Priority 4: Fallback to common name
        Logger.log("🔑 Using fallback primary key: Id");
        return "Id";
      },
      [
        bsKeyId,
        metadata?.primaryKeys,
        bsStoredProcedure,
        detectPrimaryKeyFromData,
      ]
    );

    // Initialize form data based on metadata
    const initializeFormData = useCallback(
      (existing = null) => {
        // For Enhanced Stored Procedure, use metadata and row data
        if (bsStoredProcedure) {
          if (!existing) return {};

          // Get primary keys from metadata or detect from data
          const metadataPrimaryKeys = metadata?.primaryKeys || [];
          const detectedPrimaryKey = detectPrimaryKeyFromData(existing);

          // Combine primary keys from both sources
          const allPrimaryKeys = [
            ...metadataPrimaryKeys,
            ...(detectedPrimaryKey &&
            !metadataPrimaryKeys.includes(detectedPrimaryKey)
              ? [detectedPrimaryKey]
              : []),
          ];

          // Define fields that should be excluded from Enhanced SP forms
          const excludedFields = [
            "__rowNumber", // Special row number field
            // Primary key fields (from metadata and detection)
            ...allPrimaryKeys,
            // Common primary key variants (fallback)
            "id",
            "Id",
            "ID",
            "part_id",
            "app_id",
            "user_id",
            "customer_id",
            "product_id",
            "order_id",
            // Audit fields - Created by
            "create_by",
            "created_by",
            "createby",
            // Audit fields - Created date
            "create_date",
            "created_date",
            "createdate",
            "created_at",
            // Audit fields - Updated by
            "update_by",
            "updated_by",
            "updateby",
            "modified_by",
            // Audit fields - Updated date
            "update_date",
            "updated_date",
            "updatedate",
            "updated_at",
            "modified_date",
            // Version fields
            "rowversion",
            "timestamp",
          ];

          const init = {};
          Object.keys(existing)
            .filter((key) => {
              // Check if field should be excluded (case-insensitive)
              return !excludedFields.some(
                (excludedField) =>
                  key.toLowerCase() === excludedField.toLowerCase()
              );
            })
            .forEach((key) => {
              init[key] = existing[key];
            });

          Logger.log("🔧 Enhanced SP form data initialized:", {
            existing,
            init,
            keys: Object.keys(init),
            metadataPrimaryKeys,
            detectedPrimaryKey,
            allPrimaryKeys,
            excludedFields: Object.keys(existing).filter((key) =>
              excludedFields.some(
                (excludedField) =>
                  key.toLowerCase() === excludedField.toLowerCase()
              )
            ),
          });

          return init;
        }

        // Regular metadata-based initialization
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
      [
        metadata,
        isFieldInForm,
        isActiveField,
        comboBoxConfig,
        dialogMode,
        bsStoredProcedure,
        detectPrimaryKeyFromData,
      ]
    );

    // Open Add dialog or delegate to external handler
    const handleAddClick = useCallback(() => {
      if (onAdd) {
        onAdd();
        return;
      }

      // For offline mode without metadata AND no Enhanced SP data, show alert
      if (!metadata && !bsStoredProcedure) {
        alert(
          `Add Record for ${tableName}\n\nOffline mode: Cannot create form without metadata.\nPlease connect to backend server.`
        );
        return;
      }

      // For Enhanced SP without metadata but with data, allow form creation
      if (!metadata && bsStoredProcedure && rows.length === 0) {
        alert(
          `Add Record\n\nNo data available to generate form fields.\nPlease load data first or define bsColumnDefs.`
        );
        return;
      }

      // Inline bulk add mode
      if (bsBulkAddInline) {
        const id = `new-${newRowIdCounter.current++}`;
        const newRow = {
          id,
          ...initializeFormData(),
          isNew: true,
        };

        setRows((oldRows) => [...oldRows, newRow]);
        setRowModesModel((oldModel) => ({
          ...oldModel,
          [id]: {
            mode: GridRowModes.Edit,
            fieldToFocus: Object.keys(newRow)[1],
          }, // Focus first editable field
        }));
        return;
      }

      // Default dialog mode
      setDialogMode("add");
      setSelectedRow(null);
      setFormData(initializeFormData());
      setDialogOpen(true);
    }, [
      onAdd,
      initializeFormData,
      metadata,
      tableName,
      bsBulkAddInline,
      bsStoredProcedure,
      rows.length,
    ]);

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
        const primaryKey = getEffectivePrimaryKey(row);
        const id = row?.[primaryKey];
        if (!id) {
          Logger.error("❌ No primary key found for deletion", {
            primaryKey,
            rowKeys: Object.keys(row || {}),
            row: row,
          });
          return;
        }

        if (onDelete) {
          // Delegate to external handler
          await Promise.resolve(onDelete(id));
          // Try refresh after external handler
          if (bsStoredProcedure) {
            loadStoredProcedureData();
          } else {
            loadData();
          }
          return;
        }

        if (window.confirm("Are you sure you want to delete this record?")) {
          try {
            if (bsStoredProcedure) {
              // Helper function to convert snake_case to PascalCase for SP parameters
              const toPascalCase = (str) => {
                return str
                  .split("_")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join("");
              };

              // Convert primary key to PascalCase
              const pascalPrimaryKey = toPascalCase(primaryKey);

              // DEVICE COMPATIBILITY: Handle @id vs @part_id scenarios
              const deviceCompatParams = {};

              // If primary key is device-specific parameter (@id, @part_id), handle both scenarios
              if (primaryKey.startsWith("@")) {
                Logger.log(
                  "� DEVICE COMPATIBILITY - Handling device-specific parameter for DELETE:",
                  {
                    originalPrimaryKey: primaryKey,
                    pascalPrimaryKey: pascalPrimaryKey,
                    id: id,
                    deviceType: primaryKey.includes("part")
                      ? "part_id device"
                      : "id device",
                    compatibilityNote:
                      "Some devices send @id instead of @part_id",
                  }
                );

                // Add both variations for maximum compatibility
                if (primaryKey === "@id") {
                  deviceCompatParams["Id"] = id;
                  deviceCompatParams["PartId"] = id; // Fallback for part_id devices
                } else if (primaryKey === "@part_id") {
                  deviceCompatParams["PartId"] = id;
                  deviceCompatParams["Id"] = id; // Fallback for id devices
                }
              }

              Logger.log("�🔄 Converting parameters for Enhanced SP DELETE:", {
                originalPrimaryKey: primaryKey,
                pascalPrimaryKey: pascalPrimaryKey,
                id: id,
                deviceCompatParams: deviceCompatParams,
                finalPrimaryKeyParam: pascalPrimaryKey,
              });

              // Use Enhanced Stored Procedure for DELETE operation
              const deleteRequest = {
                procedureName: bsStoredProcedure,
                schemaName: bsStoredProcedureSchema,
                operation: "DELETE",
                parameters: {
                  [pascalPrimaryKey]: id,
                  ...deviceCompatParams, // Add device compatibility parameters
                  ...bsStoredProcedureParams,
                },
                userId:
                  user?.UserId ||
                  user?.id ||
                  user?.userId ||
                  user?.user_id ||
                  "system",
              };

              const result = await executeEnhancedStoredProcedure(
                deleteRequest
              );

              if (result.success) {
                await loadStoredProcedureData();
                Logger.log(
                  "✅ Record deleted via Enhanced Stored Procedure:",
                  result.message
                );
              } else {
                throw new Error(result.message || "Delete operation failed");
              }
            } else {
              // Use standard delete record
              await deleteRecord(id, null, bsPreObj);
              await loadData();
              Logger.log("✅ Record deleted and data reloaded");
            }
          } catch (err) {
            Logger.error("❌ Failed to delete record:", err);
            setError(err.message || "Failed to delete record");
          }
        }
      },
      [
        onDelete,
        deleteRecord,
        loadData,
        bsPreObj,
        bsStoredProcedure,
        bsStoredProcedureSchema,
        bsStoredProcedureParams,
        executeEnhancedStoredProcedure,
        loadStoredProcedureData,
        user,
        getEffectivePrimaryKey,
      ]
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
            bsPreObj,
            preObjPassed: !!bsPreObj,
          });

          if (bsStoredProcedure) {
            // Helper function to convert snake_case to PascalCase for SP parameters
            const toPascalCase = (str) => {
              return str
                .split("_")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join("");
            };

            // Convert saveData keys from snake_case to PascalCase for SP parameters
            const spSaveData = {};
            Object.keys(saveData).forEach((key) => {
              const pascalKey = toPascalCase(key);
              spSaveData[pascalKey] = saveData[key];
            });

            Logger.log("🔄 Converting parameters for Enhanced SP INSERT:", {
              originalSaveData: saveData,
              convertedSaveData: spSaveData,
            });

            Logger.log("🔄 USER INSERT:", {
              user: user,
            });

            // Use Enhanced Stored Procedure for INSERT operation
            const insertRequest = {
              procedureName: bsStoredProcedure,
              schemaName: bsStoredProcedureSchema,
              operation: "INSERT",
              parameters: {
                ...spSaveData,
                ...bsStoredProcedureParams,
              },
              userId:
                user?.UserId ||
                user?.id ||
                user?.userId ||
                user?.user_id ||
                "system",
            };

            Logger.log("🔄Data  USER INSERT:", {
              userId: user?.userId,
            });

            const result = await executeEnhancedStoredProcedure(insertRequest);

            if (!result.success) {
              throw new Error(result.message || "Insert operation failed");
            }

            Logger.log(
              "✅ Record inserted via Enhanced Stored Procedure:",
              result.message
            );
          } else {
            await createRecord(saveData, bsPreObj);
          }
        } else {
          // For edit mode, use formData as is
          const primaryKey = getEffectivePrimaryKey(selectedRow);
          const id = selectedRow?.[primaryKey];
          if (!id) throw new Error("No primary key for update");

          Logger.log("🔧 About to call updateRecord with:", {
            id,
            formDataKeys: Object.keys(formData),
            bsPreObj,
            bsPreObjType: typeof bsPreObj,
          });
          ///
          if (bsStoredProcedure) {
            // Helper function to convert snake_case to PascalCase for SP parameters
            const toPascalCase = (str) => {
              return str
                .split("_")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join("");
            };

            // Convert formData keys from snake_case to PascalCase for SP parameters
            const spFormData = {};
            Object.keys(formData).forEach((key) => {
              const pascalKey = toPascalCase(key);
              spFormData[pascalKey] = formData[key];
            });

            // Convert primary key to PascalCase
            const pascalPrimaryKey = toPascalCase(primaryKey);

            // DEVICE COMPATIBILITY: Handle @id vs @part_id scenarios
            const deviceCompatParams = {};

            // If primary key is device-specific parameter (@id, @part_id), handle both scenarios
            if (primaryKey.startsWith("@")) {
              Logger.log(
                "🔧 DEVICE COMPATIBILITY - Handling device-specific parameter:",
                {
                  originalPrimaryKey: primaryKey,
                  pascalPrimaryKey: pascalPrimaryKey,
                  id: id,
                  deviceType: primaryKey.includes("part")
                    ? "part_id device"
                    : "id device",
                  compatibilityNote:
                    "Some devices send @id instead of @part_id",
                }
              );

              // Add both variations for maximum compatibility
              if (primaryKey === "@id") {
                deviceCompatParams["Id"] = id;
                deviceCompatParams["PartId"] = id; // Fallback for part_id devices
              } else if (primaryKey === "@part_id") {
                deviceCompatParams["PartId"] = id;
                deviceCompatParams["Id"] = id; // Fallback for id devices
              }
            }

            Logger.log("🔄 Converting parameters for Enhanced SP:", {
              originalPrimaryKey: primaryKey,
              pascalPrimaryKey: pascalPrimaryKey,
              originalFormData: formData,
              convertedFormData: spFormData,
              deviceCompatParams: deviceCompatParams,
              finalPrimaryKeyParam: pascalPrimaryKey,
            });

            // Use Enhanced Stored Procedure for UPDATE operation
            const updateRequest = {
              procedureName: bsStoredProcedure,
              schemaName: bsStoredProcedureSchema,
              operation: "UPDATE",
              parameters: {
                [pascalPrimaryKey]: id,
                ...deviceCompatParams, // Add device compatibility parameters
                ...spFormData,
                ...bsStoredProcedureParams,
              },
              userId:
                user?.UserId ||
                user?.id ||
                user?.userId ||
                user?.user_id ||
                "system",
            };

            const result = await executeEnhancedStoredProcedure(updateRequest);

            if (!result.success) {
              throw new Error(result.message || "Update operation failed");
            }

            Logger.log(
              "✅ Record updated via Enhanced Stored Procedure:",
              result.message
            );
          } else {
            await updateRecord(id, formData, bsPreObj);
          }
        }

        setDialogOpen(false);
        setFormData({});
        setSelectedRow(null);

        if (bsStoredProcedure) {
          await loadStoredProcedureData();
        } else {
          await loadData();
        }
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
      bsStoredProcedure,
      bsStoredProcedureSchema,
      bsStoredProcedureParams,
      executeEnhancedStoredProcedure,
      loadStoredProcedureData,
      user,
      getEffectivePrimaryKey,
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
    // const isFieldRequired = useCallback((columnName, metadata) => {
    //   const column = metadata?.columns?.find(
    //     (c) => c.columnName === columnName
    //   );
    //   return column && !column.isNullable;
    // }, []);

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

        // Hide audit fields (including update_by and update_date unless explicitly specified in bsCols)
        const auditFields = [
          // "create_by",
          // "created_by",
          // "createby",
          // "create_date",
          // "created_date",
          // "createdate",
          // "created_at",
          "update_by", // Hide by default unless in bsCols
          "updated_by",
          "updateby",
          "modified_by",
          "update_date", // Hide by default unless in bsCols
          "updated_date",
          "updatedate",
          "updated_at",
          "modified_date",
          "rowversion",
        ];

        // If bsCols is specified, allow update_by and update_date to show if they're in the list
        if (parsedCols && parsedCols.length > 0) {
          if (
            (columnName.toLowerCase() === "update_by" ||
              columnName.toLowerCase() === "update_date") &&
            parsedCols.includes(columnName)
          ) {
            return false; // Don't hide if explicitly included in bsCols
          }
        }

        if (auditFields.includes(columnName.toLowerCase())) {
          return true;
        }

        return false;
      },
      [metadata?.primaryKeys, parsedCols]
    );

    // Render form fields from metadata
    const renderFormFields = useCallback(() => {
      // For Enhanced Stored Procedure without metadata, create form fields from row data
      if (
        bsStoredProcedure &&
        (!metadata?.columns || metadata.columns.length === 0)
      ) {
        // Use selectedRow for Edit mode, or first row as template for Add mode
        const templateRow = selectedRow || rows[0];

        if (!templateRow || !Object.keys(templateRow).length) {
          return (
            <Typography color="warning.main" sx={{ p: 2 }}>
              ⚠️ No data available to create form fields for Enhanced Stored
              Procedure
            </Typography>
          );
        }

        // Detect primary key from bsKeyId or auto-detect from template row data
        const detectedPrimaryKey =
          bsKeyId || detectPrimaryKeyFromData(templateRow);

        Logger.log("🔍 Enhanced SP Form - Primary Key Detection:", {
          dialogMode,
          isAddMode: !selectedRow,
          bsKeyId,
          detectedPrimaryKey,
          primaryKeySource: bsKeyId ? "bsKeyId (manual)" : "auto-detected",
          templateRowKeys: Object.keys(templateRow),
          templateRow, // Show full template row data
        });

        // Define fields that should be excluded from Enhanced SP forms
        const excludedFields = [
          "__rowNumber", // Special row number field
          // Primary key field (detected dynamically)
          ...(detectedPrimaryKey ? [detectedPrimaryKey] : []),
          // DataGrid internal ID patterns (case-insensitive)
          "id",
          "Id",
          "ID",
          // Common table-specific primary keys
          "part_id",
          "method_id",
          "app_id",
          "user_id",
          "customer_id",
          "product_id",
          "order_id",
          "area_id",
          "location_id",
          // Audit fields - Created by
          "create_by",
          "created_by",
          "createby",
          // Audit fields - Created date
          "create_date",
          "created_date",
          "createdate",
          "created_at",
          // Audit fields - Updated by
          "update_by",
          "updated_by",
          "updateby",
          "modified_by",
          // Audit fields - Updated date
          "update_date",
          "updated_date",
          "updatedate",
          "updated_at",
          "modified_date",
          // Version fields
          "rowversion",
          "timestamp",
        ];

        Logger.log("🔍 Enhanced SP Form - Field Exclusion Setup:", {
          excludedFields,
          excludedFieldsCount: excludedFields.length,
          templateRowFieldsCount: Object.keys(templateRow).length,
        });

        const fields = Object.keys(templateRow)
          .filter((key) => {
            // Exclude DataGrid internal IDs (sp_row_*, generated-*, etc.)
            if (key.startsWith("sp_row_") || key.startsWith("generated-")) {
              Logger.log(`🚫 Excluding DataGrid internal ID: ${key}`);
              return false;
            }

            // Check if field should be excluded (case-insensitive)
            const isExcluded = excludedFields.some(
              (excludedField) =>
                key.toLowerCase() === excludedField.toLowerCase()
            );

            if (isExcluded) {
              Logger.log(
                `🚫 Excluding field from form (${dialogMode} mode): ${key} (matched: ${excludedFields.find(
                  (f) => f.toLowerCase() === key.toLowerCase()
                )})`
              );
            } else {
              Logger.log(
                `✅ Including field in form (${dialogMode} mode): ${key}`
              );
            }

            return !isExcluded;
          })
          .map((fieldName) => {
            // For Add mode, use empty string; for Edit mode, use actual data
            const value =
              formData[fieldName] ??
              (selectedRow ? selectedRow[fieldName] : "") ??
              "";

            // Get custom column definition if exists
            const customDef = columnDefsConfig[fieldName];

            // Determine if field is read-only
            const isReadOnly = customDef?.readOnly === true || readOnly;

            // Determine if field is required
            const isRequired = customDef?.required === true;

            return (
              <Grid item xs={12} sm={6} key={fieldName}>
                <TextField
                  fullWidth
                  size="small"
                  label={formatColumnName(fieldName)}
                  value={value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [fieldName]: e.target.value,
                    }))
                  }
                  variant="outlined"
                  // helperText={
                  //   customDef?.description ||
                  //   `Enhanced SP field (${typeof value})`
                  // }
                  disabled={isReadOnly}
                  required={isRequired}
                />
              </Grid>
            );
          });

        return (
          <Grid container spacing={2} sx={{ p: 2 }}>
            {fields}
          </Grid>
        );
      }

      // Regular metadata-based form fields
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
                Logger.log(
                  `✅ Added ComboBox field to form: ${comboFieldName}`,
                  {
                    column: comboColumn,
                    comboConfig: comboBoxConfig[comboFieldName],
                  }
                );
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

        // Get custom column definition if exists
        const customDef = columnDefsConfig[columnName];

        // Determine if field is read-only (from customDef or component-level readOnly)
        const isReadOnly = customDef?.readOnly === true || readOnly;

        // Determine if field is required (customDef overrides metadata)
        const isRequired =
          customDef?.required !== undefined ? customDef.required : !isNullable;

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
                required={isRequired}
                dataType={dataType}
                isNullable={isNullable}
                description={customDef?.description || description}
                disabled={isReadOnly}
              />
            </Grid>
          );
        }

        // Special handling for is_active field
        if (isActiveField(columnName)) {
          return (
            <Grid item xs={12} sm={6} md={4} key={columnName}>
              <FormControl
                fullWidth
                size="small"
                required={isRequired}
                disabled={isReadOnly}
              >
                <InputLabel>{formatColumnName(columnName)}</InputLabel>
                <Select
                  value={val || "YES"}
                  label={formatColumnName(columnName)}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [columnName]: e.target.value }))
                  }
                  disabled={isReadOnly}
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
                    disabled={isReadOnly}
                  />
                }
                label={formatColumnName(columnName)}
                disabled={isReadOnly}
              />
            </Grid>
          );
        }

        // For text/ntext fields, use full width
        const gridSize = multiline ? { xs: 12 } : { xs: 12, sm: 6, md: 4 };

        // Build helper text with length information
        let helperText = customDef?.description || description || "";
        if (
          bsShowCharacterCount &&
          maxLength > 0 &&
          (inputType === "text" || multiline)
        ) {
          const currentLength = String(val).length;
          const lengthInfo = `${currentLength}/${maxLength} characters`;
          helperText = helperText
            ? `${helperText} (${lengthInfo})`
            : lengthInfo;
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
              required={isRequired}
              disabled={isReadOnly}
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
      bsStoredProcedure,
      detectPrimaryKeyFromData,
      columnDefsConfig,
      readOnly,
      bsKeyId,
      rows,
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
            const primaryKey = getEffectivePrimaryKey(row);
            const currentRowId = row[primaryKey];

            if (String(currentRowId) === String(rowId)) {
              Logger.log("🔄 Restoring row to original state:", {
                rowId,
                primaryKey,
                originalData: change.originalData,
              });
              return change.originalData;
            }
            return row;
          })
        );

        Logger.log("✅ Row restored successfully:", {
          rowId,
          remainingChanges,
        });
      },
      [getEffectivePrimaryKey]
    );

    // Inline editing handlers for bsBulkAddInline functionality
    const handleInlineRowEditStop = useCallback((params, event) => {
      if (params.reason === GridRowEditStopReasons.rowFocusOut) {
        event.defaultMuiPrevented = true;
      }
    }, []);

    const handleInlineEditClick = useCallback(
      (id) => () => {
        if (bsBulkAddInline) {
          setRowModesModel((oldModel) => ({
            ...oldModel,
            [id]: { mode: GridRowModes.Edit },
          }));
        }
      },
      [bsBulkAddInline]
    );

    const handleInlineSaveClick = useCallback(
      (id) => () => {
        setRowModesModel((oldModel) => ({
          ...oldModel,
          [id]: { mode: GridRowModes.View },
        }));
      },
      []
    );

    const handleInlineDeleteClick = useCallback(
      (id) => () => {
        setRows((oldRows) => oldRows.filter((row) => row.id !== id));
        setRowModesModel((oldModel) => {
          const newModel = { ...oldModel };
          delete newModel[id];
          return newModel;
        });
      },
      []
    );

    const handleInlineCancelClick = useCallback(
      (id) => () => {
        setRowModesModel((oldModel) => ({
          ...oldModel,
          [id]: { mode: GridRowModes.View, ignoreModifications: true },
        }));

        const editedRow = rows.find((row) => row.id === id);
        if (editedRow?.isNew) {
          setRows((oldRows) => oldRows.filter((row) => row.id !== id));
        }
      },
      [rows]
    );

    const processRowUpdate = useCallback(
      async (newRow) => {
        try {
          // Validate the row data
          const validation = validateFormData(newRow);
          if (!validation.isValid) {
            alert(`Validation errors:\n${validation.errors.join("\n")}`);
            return newRow; // Return unchanged to keep edit mode
          }

          // If it's a new row, create it
          if (newRow.isNew) {
            const { isNew, id, ...dataToSave } = newRow;
            const savedRecord = await createRecord(dataToSave, bsPreObj);

            // Replace the temporary row with the saved one
            const updatedRow = {
              ...savedRecord,
              isNew: false,
            };

            setRows((oldRows) =>
              oldRows.map((row) => (row.id === newRow.id ? updatedRow : row))
            );

            // Refresh data to get the latest from server
            await loadData(true);

            Logger.log("✅ New record created successfully:", savedRecord);
            return updatedRow;
          }

          // If it's an existing row, update it
          const primaryKey = getEffectivePrimaryKey(newRow);
          const id = newRow[primaryKey];

          // Remove invalid id fields from data before sending to backend
          const cleanData = { ...newRow };
          if (primaryKey !== "id") delete cleanData.id;
          if (primaryKey !== "Id") delete cleanData.Id;
          if (primaryKey !== "ID") delete cleanData.ID;

          const savedRecord = await updateRecord(id, cleanData, bsPreObj);

          // Merge saved record with original id for DataGrid row tracking
          const updatedRow = {
            ...savedRecord,
            id: newRow.id, // Preserve original id for DataGrid
          };

          setRows((oldRows) =>
            oldRows.map((row) => (row.id === newRow.id ? updatedRow : row))
          );

          Logger.log("✅ Record updated successfully:", {
            savedRecord,
            updatedRow,
            preservedId: newRow.id,
          });
          return updatedRow;
        } catch (error) {
          Logger.error("❌ Failed to save record:", error);
          alert(`Failed to save record: ${error.message}`);
          return newRow; // Return unchanged to keep edit mode
        }
      },
      [
        validateFormData,
        createRecord,
        updateRecord,
        bsPreObj,
        loadData,
        getEffectivePrimaryKey,
      ]
    );

    const handleRowModesModelChange = useCallback((newRowModesModel) => {
      setRowModesModel(newRowModesModel);
    }, []);

    /**
     * Helper: Apply custom column definitions from bsColumnDefs
     * Merges custom properties with metadata-derived or data-derived column config
     */
    const applyColumnDefs = useCallback(
      (column, fieldName) => {
        const customDef = columnDefsConfig[fieldName];
        if (!customDef) return column;

        Logger.log(`🎨 Applying custom column def for: ${fieldName}`, {
          original: column,
          custom: customDef,
        });

        // Merge custom properties with original column
        const mergedColumn = { ...column };

        // Basic properties
        if (customDef.headerName !== undefined)
          mergedColumn.headerName = customDef.headerName;
        if (customDef.width !== undefined) mergedColumn.width = customDef.width;
        if (customDef.type !== undefined) mergedColumn.type = customDef.type;
        if (customDef.editable !== undefined)
          mergedColumn.editable = customDef.editable;
        if (customDef.sortable !== undefined)
          mergedColumn.sortable = customDef.sortable;
        if (customDef.filterable !== undefined)
          mergedColumn.filterable = customDef.filterable;
        if (customDef.hideable !== undefined)
          mergedColumn.hideable = customDef.hideable;
        if (customDef.hide !== undefined) mergedColumn.hide = customDef.hide;
        if (customDef.align !== undefined) mergedColumn.align = customDef.align;
        if (customDef.headerAlign !== undefined)
          mergedColumn.headerAlign = customDef.headerAlign;
        if (customDef.description !== undefined)
          mergedColumn.description = customDef.description;

        // Number/Currency formatting
        if (customDef.format === "currency" || customDef.type === "currency") {
          const currencySymbol = customDef.currencySymbol || "$";
          const decimals = customDef.decimals ?? 2;
          const thousandSeparator = customDef.thousandSeparator !== false;

          mergedColumn.valueFormatter = (params) => {
            if (params.value == null) return "";
            const num = Number(params.value);
            if (isNaN(num)) return params.value;
            const formatted = num.toFixed(decimals);
            const parts = formatted.split(".");
            if (thousandSeparator) {
              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            return `${currencySymbol}${parts.join(".")}`;
          };
          mergedColumn.align = mergedColumn.align || "right";
        } else if (
          customDef.format === "number" ||
          customDef.type === "number"
        ) {
          const decimals = customDef.decimals ?? 2;
          const thousandSeparator = customDef.thousandSeparator !== false;

          mergedColumn.valueFormatter = (params) => {
            if (params.value == null) return "";
            const num = Number(params.value);
            if (isNaN(num)) return params.value;
            const formatted = num.toFixed(decimals);
            const parts = formatted.split(".");
            if (thousandSeparator) {
              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            return parts.join(".");
          };
          mergedColumn.align = mergedColumn.align || "right";
        } else if (customDef.format === "percent") {
          const decimals = customDef.decimals ?? 0;
          mergedColumn.valueFormatter = (params) => {
            if (params.value == null) return "";
            const num = Number(params.value);
            if (isNaN(num)) return params.value;
            return `${(num * 100).toFixed(decimals)}%`;
          };
          mergedColumn.align = mergedColumn.align || "right";
        }

        // Date/DateTime formatting
        if (
          customDef.type === "date" ||
          customDef.type === "dateTime" ||
          customDef.dateFormat ||
          customDef.dateTimeFormat
        ) {
          const dateFormat =
            customDef.dateFormat || customDef.dateTimeFormat || "dd/MM/yyyy";
          const includeTime = customDef.type === "dateTime";

          mergedColumn.valueFormatter = (params) => {
            if (!params.value) return "";
            try {
              const date = new Date(params.value);
              if (isNaN(date.getTime())) return params.value;

              // Simple date formatting based on format string
              const day = String(date.getDate()).padStart(2, "0");
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const year = date.getFullYear();
              const hours = String(date.getHours()).padStart(2, "0");
              const minutes = String(date.getMinutes()).padStart(2, "0");
              const seconds = String(date.getSeconds()).padStart(2, "0");

              let formatted = dateFormat
                .replace("yyyy", year)
                .replace("MM", month)
                .replace("dd", day);

              if (includeTime && customDef.timeFormat) {
                const timeStr = customDef.timeFormat
                  .replace("HH", hours)
                  .replace("mm", minutes)
                  .replace("ss", seconds);
                formatted += ` ${timeStr}`;
              } else if (includeTime) {
                formatted += ` ${hours}:${minutes}:${seconds}`;
              }

              return formatted;
            } catch (e) {
              return params.value;
            }
          };
        }

        // Boolean formatting
        if (customDef.type === "boolean") {
          const trueLabel = customDef.trueLabel || "Yes";
          const falseLabel = customDef.falseLabel || "No";
          const trueColor = customDef.trueColor || "success";
          const falseColor = customDef.falseColor || "default";

          mergedColumn.renderCell = (params) => {
            const isTrue = params.value === true || params.value === "true";
            return (
              <Chip
                label={isTrue ? trueLabel : falseLabel}
                color={isTrue ? trueColor : falseColor}
                size="small"
              />
            );
          };
        }

        // Select type
        if (customDef.type === "singleSelect" && customDef.valueOptions) {
          mergedColumn.type = "singleSelect";
          mergedColumn.valueOptions = customDef.valueOptions;
        }

        // Custom renderers (highest priority)
        if (customDef.renderCell)
          mergedColumn.renderCell = customDef.renderCell;
        if (customDef.valueGetter)
          mergedColumn.valueGetter = customDef.valueGetter;
        if (customDef.valueFormatter)
          mergedColumn.valueFormatter = customDef.valueFormatter;
        if (customDef.valueSetter)
          mergedColumn.valueSetter = customDef.valueSetter;

        return mergedColumn;
      },
      [columnDefsConfig]
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
        isEnhancedStoredProcedure: !!bsStoredProcedure,
        rowsCount: rows?.length || 0,
      });

      // For Enhanced Stored Procedure, try to create columns from data if no metadata
      if (
        bsStoredProcedure &&
        (!metadata?.columns || !Array.isArray(metadata.columns))
      ) {
        if (rows && rows.length > 0) {
          Logger.log(
            "🚀 Creating columns from Enhanced Stored Procedure data:",
            {
              firstRow: rows[0],
              keys: Object.keys(rows[0] || {}),
            }
          );

          // Detect primary key to exclude it from visible columns
          const detectedPrimaryKey = detectPrimaryKeyFromData(rows[0]);

          // Also check metadata for primary keys if available
          const metadataPrimaryKeys = metadata?.primaryKeys || [];

          const dataColumns = Object.keys(rows[0] || {})
            .filter((key) => {
              // Skip special fields
              if (key === "__rowNumber") {
                Logger.log(`🔍 Skipping special field: ${key}`);
                return false;
              }

              // Skip primary keys from metadata (Enhanced SP returned metadata)
              if (metadataPrimaryKeys.includes(key)) {
                Logger.log(
                  `🔍 Hiding primary key column from metadata: ${key}`
                );
                return false;
              }

              // Skip detected primary key (fallback detection)
              if (detectedPrimaryKey && key === detectedPrimaryKey) {
                Logger.log(`🔍 Hiding detected primary key column: ${key}`);
                return false;
              }

              // Use the comprehensive primary key detection instead of hardcoded values
              const isPrimaryKey = detectPrimaryKeyFromData({
                [key]: rows[0][key],
                ...rows[0],
              });
              if (isPrimaryKey === key) {
                Logger.log(
                  `🔍 Hiding primary key column (by detection): ${key}`
                );
                return false;
              }

              // Skip common primary key patterns as additional fallback
              if (
                /^(id|Id|ID)$/.test(key) ||
                /.*_id$/i.test(key) ||
                /.*Id$/.test(key) ||
                /.*ID$/.test(key)
              ) {
                Logger.log(`🔍 Hiding primary key column (by pattern): ${key}`);
                return false;
              }

              Logger.log(`✅ Including column: ${key}`);
              return true;
            })
            .map((key) => {
              // Detect data type from the first row value
              const firstValue = rows[0][key];
              let columnType = "string";
              let width = 150;

              // Detect data type and set appropriate column configuration
              if (firstValue !== null && firstValue !== undefined) {
                // Date/DateTime detection - check various formats
                if (
                  firstValue instanceof Date ||
                  (typeof firstValue === "string" &&
                    (/^\d{4}-\d{2}-\d{2}/.test(firstValue) ||
                      /^\d{2}\/\d{2}\/\d{4}/.test(firstValue) ||
                      /^\d{4}\/\d{2}\/\d{2}/.test(firstValue)))
                ) {
                  // Check if it includes time
                  const hasTime =
                    typeof firstValue === "string" &&
                    /\d{2}:\d{2}/.test(firstValue);
                  columnType = hasTime ? "dateTime" : "date";
                  width = hasTime ? 180 : 140;
                }
                // Number detection - integers and decimals
                else if (
                  typeof firstValue === "number" ||
                  (typeof firstValue === "string" &&
                    /^-?\d+\.?\d*$/.test(firstValue.toString().trim()))
                ) {
                  // Check if it's a decimal
                  const isDecimal =
                    typeof firstValue === "number"
                      ? firstValue % 1 !== 0
                      : firstValue.toString().includes(".");
                  columnType = isDecimal ? "number" : "number";
                  width = 120;
                }
                // Boolean detection
                else if (
                  typeof firstValue === "boolean" ||
                  (typeof firstValue === "string" &&
                    /^(true|false|yes|no|1|0)$/i.test(
                      firstValue.toString().trim()
                    ))
                ) {
                  columnType = "boolean";
                  width = 100;
                }
                // Text fields - adjust width based on content length and field name
                else if (typeof firstValue === "string") {
                  const avgLength = firstValue.length;
                  const fieldName = key.toLowerCase();

                  // Special handling for common field types
                  if (
                    fieldName.includes("name") ||
                    fieldName.includes("description")
                  ) {
                    width = Math.max(200, Math.min(300, avgLength * 8));
                  } else if (
                    fieldName.includes("code") ||
                    fieldName.includes("no")
                  ) {
                    width = Math.max(120, Math.min(180, avgLength * 10));
                  } else if (
                    fieldName.includes("email") ||
                    fieldName.includes("url")
                  ) {
                    width = 200;
                  } else {
                    // General text width calculation
                    if (avgLength > 50) {
                      width = 280;
                    } else if (avgLength > 30) {
                      width = 220;
                    } else if (avgLength > 15) {
                      width = 180;
                    } else {
                      width = 150;
                    }
                  }
                }
              }

              // Create column configuration with proper formatting
              // Use 'string' type for all columns to avoid MUI X Date object requirements
              const columnConfig = {
                field: key,
                headerName: formatColumnName(key),
                // Removed width - let DataGrid auto-calculate from content
                type: "string", // Use string type to avoid MUI X Date object requirements
                editable: false, // Enhanced SP handles editing through operations
              };

              // Add custom formatters based on detected data type
              if (columnType === "dateTime") {
                columnConfig.renderCell = (params) => {
                  if (!params.value) return "";
                  try {
                    const date = new Date(params.value);
                    if (isNaN(date.getTime())) return params.value;
                    return formatCellValue(date, "datetime");
                  } catch (error) {
                    Logger.warn(`Failed to format datetime for ${key}:`, error);
                    return params.value;
                  }
                };
                columnConfig.headerAlign = "center";
                columnConfig.align = "center";
              } else if (columnType === "date") {
                columnConfig.renderCell = (params) => {
                  if (!params.value) return "";
                  try {
                    const date = new Date(params.value);
                    if (isNaN(date.getTime())) return params.value;
                    return formatCellValue(date, "date");
                  } catch (error) {
                    Logger.warn(`Failed to format date for ${key}:`, error);
                    return params.value;
                  }
                };
                columnConfig.headerAlign = "center";
                columnConfig.align = "center";
              } else if (columnType === "number") {
                columnConfig.renderCell = (params) => {
                  if (
                    params.value === null ||
                    params.value === undefined ||
                    params.value === ""
                  )
                    return "";
                  try {
                    const num = parseFloat(params.value);
                    if (isNaN(num)) return params.value;

                    // Check if it's a decimal number
                    const isDecimal = num % 1 !== 0;
                    return formatCellValue(num, isDecimal ? "decimal" : "int");
                  } catch (error) {
                    Logger.warn(`Failed to format number for ${key}:`, error);
                    return params.value;
                  }
                };
                columnConfig.headerAlign = "right";
                columnConfig.align = "right";
              } else if (columnType === "boolean") {
                columnConfig.renderCell = (params) => {
                  if (params.value === null || params.value === undefined)
                    return "";
                  const value = params.value;

                  // Handle various boolean representations
                  if (typeof value === "boolean") {
                    return value ? "Yes" : "No";
                  } else if (typeof value === "string") {
                    const lowerValue = value.toLowerCase();
                    if (
                      lowerValue === "true" ||
                      lowerValue === "yes" ||
                      lowerValue === "1"
                    ) {
                      return "Yes";
                    } else if (
                      lowerValue === "false" ||
                      lowerValue === "no" ||
                      lowerValue === "0"
                    ) {
                      return "No";
                    }
                  } else if (typeof value === "number") {
                    return value === 1 ? "Yes" : "No";
                  }
                  return value;
                };
                columnConfig.headerAlign = "center";
                columnConfig.align = "center";
              }

              Logger.log(`🔧 Column config for ${key}:`, {
                field: key,
                type: columnType,
                width: width,
                firstValue: firstValue,
                valueType: typeof firstValue,
              });

              // Apply custom column definitions if provided
              return applyColumnDefs(columnConfig, key);
            });

          // Add actions column if not read-only (for Enhanced Stored Procedure)
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

            if (bsVisibleEdit) {
              actions.push((params) => (
                <GridActionsCellItem
                  icon={<Edit />}
                  label="Edit"
                  onClick={() => handleEditClick(params.row)}
                />
              ));
            }

            if (bsVisibleDelete) {
              actions.push((params) => (
                <GridActionsCellItem
                  icon={<Delete />}
                  label="Delete"
                  onClick={() => handleDeleteClick(params.row)}
                />
              ));
            }

            // Insert actions column at the beginning
            dataColumns.unshift({
              field: "actions",
              type: "actions",
              headerName: "", // Hide column header
              // Removed width - let DataGrid auto-calculate
              sortable: false,
              filterable: false,
              hideable: false,
              disableColumnMenu: true,
              getActions: (params) =>
                actions.map((a) => a(params)).filter(Boolean),
            });
          }

          // Add row number column if enabled (for Enhanced Stored Procedure)
          if (bsShowRowNumber) {
            const rowNumberCol = {
              field: "__rowNumber",
              headerName: "No.",
              // Removed width - let DataGrid auto-calculate
              sortable: false,
              filterable: false,
              hideable: false,
              disableColumnMenu: true,
              headerAlign: "center",
              renderCell: (params) => {
                // Calculate row number based on pagination
                const currentPage = paginationModel?.page || 0;
                const pageSize = paginationModel?.pageSize || bsRowPerPage;
                const rowNumber =
                  currentPage * pageSize +
                  params.api.getAllRowIds().indexOf(params.id) +
                  1;

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

          Logger.log("✅ Generated columns from data:", dataColumns);
          return dataColumns;
        } else {
          Logger.warn(
            "⚠️ Enhanced Stored Procedure: No data available to generate columns"
          );
          return [];
        }
      }

      // Early validation - must return empty array if no metadata for regular tables
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
            //const isRequired = isFieldRequired(columnName, metadata);
            const comboConfig = comboBoxConfig[columnName];

            const baseColumn = {
              field: col.columnName,
              headerName: col.displayName || formatColumnName(col.columnName),
              // Removed width - let DataGrid auto-calculate from content
              type:
                comboConfig || isActiveField(columnName)
                  ? "singleSelect"
                  : getGridColumnType(col.dataType),
              editable:
                (!col.isIdentity &&
                  !col.isReadOnly &&
                  !readOnly &&
                  !isAuditField(columnName)) ||
                (bulkEditMode && !isAuditField(columnName)),
              sortable: true,
              filterable: true,
              resizable: true,
              // Add red styling for required fields
              //headerClassName: isRequired ? "required-field" : undefined,
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

            // Apply custom column definitions if provided
            return applyColumnDefs(baseColumn, columnName);
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
          } else if (bsBulkAddInline) {
            // Inline bulk add actions
            actions.push((params) => {
              const isInEditMode =
                rowModesModel[params.id]?.mode === GridRowModes.Edit;

              if (isInEditMode) {
                return (
                  <>
                    <GridActionsCellItem
                      icon={<SaveIcon />}
                      label="Save"
                      onClick={handleInlineSaveClick(params.id)}
                      sx={{ color: "primary.main" }}
                    />
                    <GridActionsCellItem
                      icon={<CancelIcon />}
                      label="Cancel"
                      onClick={handleInlineCancelClick(params.id)}
                      color="inherit"
                    />
                  </>
                );
              } else {
                return (
                  <>
                    <GridActionsCellItem
                      icon={<Edit />}
                      label="Edit"
                      onClick={handleInlineEditClick(params.id)}
                      color="inherit"
                    />
                    <GridActionsCellItem
                      icon={<Delete />}
                      label="Delete"
                      onClick={handleInlineDeleteClick(params.id)}
                      color="inherit"
                    />
                  </>
                );
              }
            });
          } else {
            // Regular edit/delete actions (only in normal mode)
            if (bsVisibleEdit) {
              actions.push((params) => (
                <GridActionsCellItem
                  icon={<Edit />}
                  label="Edit"
                  onClick={() => handleEditClick(params.row)}
                />
              ));
            }

            if (bsVisibleDelete) {
              actions.push((params) => (
                <GridActionsCellItem
                  icon={<Delete />}
                  label="Delete"
                  onClick={() => handleDeleteClick(params.row)}
                />
              ));
            }
          }

          // Insert actions column at the beginning (after checkbox if present)
          dataColumns.unshift({
            field: "actions",
            type: "actions",
            headerName: "", // Hide column header
            // Removed width - let DataGrid auto-calculate
            sortable: false,
            filterable: false,
            hideable: false,
            disableColumnMenu: true,
            getActions: (params) =>
              actions.map((a) => a(params)).filter(Boolean),
          });
        }

        // Add row number column if enabled
        if (bsShowRowNumber) {
          const rowNumberCol = {
            field: "__rowNumber",
            headerName: "No.",
            // Removed width - let DataGrid auto-calculate
            sortable: false,
            filterable: false,
            hideable: false,
            disableColumnMenu: true,
            headerAlign: "center",
            renderCell: (params) => {
              // Calculate row number based on pagination
              const currentPage = paginationModel?.page || 0;
              const pageSize = paginationModel?.pageSize || bsRowPerPage;
              const rowNumber =
                currentPage * pageSize +
                params.api.getAllRowIds().indexOf(params.id) +
                1;

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
        Logger.log("🔍 Column filtering in useMemo:", {
          parsedCols,
          totalColumns: dataColumns.length,
          columnFields: dataColumns.map((c) => c.field),
        });

        let filteredDataColumns = [...dataColumns]; // Ensure we have an array copy

        if (parsedCols && parsedCols.length > 0) {
          // Separate special columns that should always be included
          const actionsCol = dataColumns.find((c) => c.field === "actions");
          const rowNumberCol = dataColumns.find(
            (c) => c.field === "__rowNumber"
          );
          const otherColumns = dataColumns.filter(
            (c) => c.field !== "actions" && c.field !== "__rowNumber"
          );

          // Filter to only show specified columns, maintaining order
          filteredDataColumns = [];

          // Add actions column first if it exists
          if (actionsCol) {
            filteredDataColumns.push(actionsCol);
          }

          // Add row number column if it exists (should always show regardless of bsCols)
          if (rowNumberCol) {
            filteredDataColumns.push(rowNumberCol);
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
          // Removed default width - let DataGrid auto-calculate
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
              c &&
              typeof c.field === "string" &&
              typeof c.headerName === "string"
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
      bsBulkAddInline,
      bsShowRowNumber,
      bsRowPerPage,
      paginationModel,
      bsVisibleEdit,
      bsVisibleDelete,
      parsedCols,
      comboBoxConfig,
      onView,
      handleEditClick,
      handleDeleteClick,
      bsStoredProcedure,
      rows,
      handleRestoreRow,
      formatColumnName,
      getGridColumnType,
      formatCellValue,
      isColumnHidden,
      renderComboBoxCell,
      getComboBoxOptions,
      isActiveField,
      isAuditField,
      getIsActiveOptions,
      rowModesModel,
      handleInlineEditClick,
      handleInlineSaveClick,
      handleInlineCancelClick,
      handleInlineDeleteClick,
      detectPrimaryKeyFromData,
      applyColumnDefs,
    ]);

    // Handle row selection changes for checkbox selection
    const handleRowSelectionChange = useCallback(
      (newRowSelectionModel) => {
        Logger.log("🔍 ROW SELECTION DEBUG - Start:", {
          newRowSelectionModel,
          rowsCount: rows.length,
          firstRowSample: rows.length > 0 ? Object.keys(rows[0]) : "NO ROWS",
          firstRowData: rows.length > 0 ? rows[0] : "NO ROWS",
        });

        setRowSelectionModel(newRowSelectionModel);

        if (onCheckBoxSelected) {
          // Debug metadata information
          Logger.log("🔑 PRIMARY KEY DETECTION - Start:", {
            hasMetadata: !!metadata,
            metadataPrimaryKeys: metadata?.primaryKeys,
            hasEnhancedMetadata: !!enhancedMetadata,
            enhancedMetadataPrimaryKeys: enhancedMetadata?.primaryKeys,
            bsStoredProcedure: !!bsStoredProcedure,
            hasRowData: rows.length > 0,
            rowDataKeys: rows.length > 0 ? Object.keys(rows[0]) : [],
          });

          // Get primary key for debugging
          const primaryKey =
            rows.length > 0 ? getEffectivePrimaryKey(rows[0]) : null;

          Logger.log("🔑 Using primary key from metadata:", primaryKey);

          Logger.log("🔑 PRIMARY KEY for selection:", {
            primaryKey,
            firstRowId: rows.length > 0 ? rows[0][primaryKey] : "NO ROWS",
            firstRowAllIds:
              rows.length > 0
                ? {
                    id: rows[0].id,
                    Id: rows[0].Id,
                    [primaryKey]: rows[0][primaryKey],
                  }
                : "NO ROWS",
          });

          // Get selected row data
          const selectedRows = rows.filter((row) => {
            // Use the same logic as getRowId to determine row identifier
            let rowId;

            const primaryKeyValue = row[primaryKey];
            if (primaryKey && primaryKeyValue != null) {
              rowId = String(primaryKeyValue);
            } else {
              // Fallback to common ID fields - same as getRowId
              const idFields = ["id", "Id", "ID", "_id"];
              let foundId = null;
              for (const field of idFields) {
                if (row[field] != null) {
                  foundId = String(row[field]);
                  break;
                }
              }
              rowId = foundId;
            }

            const isSelected = newRowSelectionModel.includes(rowId);

            Logger.log("🔍 Checking row:", {
              rowPrimaryKey: primaryKeyValue,
              rowIdString: rowId,
              isInSelection: isSelected,
              selectionModel: newRowSelectionModel,
              allRowIdentifiers: {
                id: row.id,
                Id: row.Id,
                [primaryKey]: row[primaryKey],
              },
            });

            return isSelected;
          });

          Logger.log("✅ FINAL SELECTED ROWS:", {
            count: selectedRows.length,
            selectedData: selectedRows.map((row) => ({
              [primaryKey]: row[primaryKey],
              tag_no: row.tag_no,
              area_name: row.area_name,
            })),
          });

          onCheckBoxSelected(selectedRows);
        }
      },
      [
        rows,
        onCheckBoxSelected,
        getEffectivePrimaryKey,
        metadata,
        enhancedMetadata,
        bsStoredProcedure,
      ]
    );

    // Get localization object for DataGrid
    const getLocalization = useCallback(() => {
      const effectiveLocale = getEffectiveLocale();
      return getLocaleText(effectiveLocale);
    }, [getEffectiveLocale]);

    // Bulk operations handlers
    const handleBulkAdd = useCallback(() => {
      if (!bsEnableBulkMode) {
        Logger.warn("⚠️ Bulk mode is disabled");
        return;
      }

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
    }, [bsEnableBulkMode, metadata, bulkRowCount, initializeFormData]);

    const handleBulkEdit = useCallback(() => {
      if (!bsEnableBulkMode) {
        Logger.warn("⚠️ Bulk mode is disabled");
        return;
      }

      const selectedRows = rows.filter((row) => {
        const primaryKey = getEffectivePrimaryKey(row);
        const rowId = row[primaryKey];
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
    }, [bsEnableBulkMode, rows, rowSelectionModel, getEffectivePrimaryKey]);

    const handleBulkDelete = useCallback(async () => {
      if (!bsEnableBulkMode) {
        Logger.warn("⚠️ Bulk mode is disabled");
        return;
      }

      const selectedRows = rows.filter((row) => {
        const primaryKey = getEffectivePrimaryKey(row);
        const rowId = row[primaryKey];
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
            const primaryKey = getEffectivePrimaryKey(row);
            const id = row[primaryKey];
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
    }, [
      bsEnableBulkMode,
      rows,
      rowSelectionModel,
      deleteRecord,
      loadData,
      bsPreObj,
      getEffectivePrimaryKey,
    ]);

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

          Logger.log("📝 Clean data for update (normal mode):", {
            primaryKey,
            beforeClean: { ...newRow },
            afterClean: cleanData,
            removedId: primaryKey !== "id",
            whereConditions: { [primaryKey]: rowId },
            bsPreObj,
            preObjPassed: !!bsPreObj,
          });

          // Perform update and refresh data
          return updateRecord(rowId, cleanData, bsPreObj)
            .then(async (result) => {
              Logger.log("✅ Normal mode update successful:", {
                result,
                originalId: newRow.id,
                primaryKey,
              });

              // Return updated data with original 'id' for DataGrid row tracking
              // Backend returns data with primary key (e.g., method_id) but not the 'id' field
              // DataGrid needs 'id' field to track rows
              const updatedRow = {
                ...result,
                id: newRow.id, // Preserve original id for DataGrid
              };

              // Check metadata BEFORE scheduling background refresh
              // This prevents metadata from becoming null during re-render
              if (!metadata || !metadata.columns) {
                Logger.warn(
                  "⚠️ Metadata missing before background refresh, reloading now..."
                );
                try {
                  await loadMetadata(bsPreObj);
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  Logger.log(
                    "✅ Metadata reloaded successfully before background refresh"
                  );
                } catch (metadataError) {
                  Logger.error("❌ Failed to reload metadata:", metadataError);
                  // Even if metadata reload fails, continue with the update
                  // Don't schedule background refresh if metadata is still missing
                }
              }

              // Only schedule background refresh if metadata is available
              if (metadata && metadata.columns) {
                setTimeout(() => {
                  loadData(true); // Force refresh with cache buster
                }, 100);
              } else {
                Logger.warn(
                  "⚠️ Skipping background refresh due to missing metadata"
                );
              }

              return updatedRow;
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
        loadMetadata,
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
            bsPreObj,
            preObjPassed: !!bsPreObj,
          });

          await updateRecord(id, cleanData, bsPreObj);
        }

        // Reset bulk edit state
        setBulkEditMode(false);
        unsavedChangesRef.current = {};
        setHasUnsavedChanges(false);
        setRowSelectionModel([]);

        // Small delay to ensure database transactions are committed
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Ensure metadata is available before reloading data
        if (!metadata || !metadata.columns) {
          Logger.warn(
            "⚠️ Metadata not available after bulk save, reloading metadata..."
          );
          await loadMetadata(bsPreObj);
          // Wait a bit for metadata to be set in state
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

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
    }, [
      metadata,
      updateRecord,
      loadData,
      bsPreObj,
      validateFormData,
      loadMetadata,
    ]);

    const handleBulkDiscardChanges = useCallback(async () => {
      setLoading(true); // Set loading state
      setBulkEditMode(false);
      unsavedChangesRef.current = {};
      setHasUnsavedChanges(false);
      setRowSelectionModel([]);

      try {
        // Ensure metadata is available before reloading data
        if (!metadata || !metadata.columns) {
          Logger.warn(
            "⚠️ Metadata not available after discard, reloading metadata..."
          );
          await loadMetadata(bsPreObj);
          // Wait a bit for metadata to be set in state
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Force reload to discard changes with loading state
        await loadData(true);
        Logger.log("🗑️ Bulk changes discarded");
      } catch (err) {
        Logger.error("❌ Failed to discard bulk changes:", err);
        setError(err.message || "Failed to discard changes");
      } finally {
        setLoading(false); // Clear loading state
      }
    }, [loadData, metadata, loadMetadata, bsPreObj]);

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

        // If bulk mode is disabled, prevent any editing
        if (!bsEnableBulkMode) {
          Logger.warn("⚠️ Bulk edit mode is disabled - preventing edit");
          // Prevent entering edit mode
          if (params.event) {
            params.event.defaultMuiPrevented = true;
          }
          return; // Stop execution here
        }

        // Only enable bulk edit mode if bsEnableBulkMode is true
        if (!bulkEditMode) {
          setBulkEditMode(true);
          unsavedChangesRef.current = {};
          setHasUnsavedChanges(false);
          Logger.log("📝 Bulk Edit mode enabled via row double-click");
        }
      },
      [bulkEditMode, bsEnableBulkMode]
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
            <Typography variant="body1">Loading data...</Typography>
            {/* <Typography variant="body2" color="text.secondary">
              {effectiveTableName}
            </Typography> */}
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

    // No metadata - but Enhanced Stored Procedure doesn't need metadata
    if (!metadata && !bsStoredProcedure) {
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

            // If no valid columns, show appropriate message
            if (validColumns.length === 0) {
              // Check if we're still loading data
              const isStillLoading = loading || metadataLoading;

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
                    {isStillLoading ? (
                      <>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body1">
                          {metadataLoading
                            ? "Loading columns..."
                            : "Loading data..."}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="h6"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {bsLocale === "th"
                            ? "ไม่มีข้อมูล"
                            : "No data available"}
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                          {bsStoredProcedure
                            ? bsLocale === "th"
                              ? "ไม่พบข้อมูลในฐานข้อมูล"
                              : "The database returned no data"
                            : bsLocale === "th"
                            ? "ไม่พบข้อมูลในตาราง"
                            : "No records found in the table"}
                        </Typography>
                      </>
                    )}
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
                    (!Array.isArray(columns) && loading) ||
                    (columns.length === 0 && loading)
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
                  processRowUpdate={
                    bsBulkAddInline ? processRowUpdate : processBulkRowUpdate
                  }
                  onRowEditStart={handleRowEditStart}
                  onRowEditStop={
                    bsBulkAddInline
                      ? handleInlineRowEditStop
                      : handleRowEditStop
                  }
                  // Inline editing for bsBulkAddInline
                  {...(bsBulkAddInline && {
                    rowModesModel,
                    onRowModesModelChange: handleRowModesModelChange,
                  })}
                  // Pagination
                  pagination={true}
                  paginationMode={
                    bsFilterMode === "client" ? "client" : "server"
                  }
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={[10, 25, 50, 100]}
                  // Sorting
                  sortingMode={bsFilterMode === "client" ? "client" : "server"}
                  sortModel={sortModel}
                  onSortModelChange={handleSortModelChange}
                  // Filtering
                  filterMode={bsFilterMode}
                  filterModel={filterModel}
                  onFilterModelChange={handleFilterModelChange}
                  // Quick Filter Settings
                  filterDebounceMs={500}
                  // Header Filters (Pro feature)
                  headerFilters={headerFiltersEnabled}
                  headerFilterHeight={52}
                  // Auto-sizing columns
                  autosizeOnMount
                  autosizeOptions={{
                    columns: columns.map((col) => col.field),
                    includeHeaders: true,
                    includeOutliers: false,
                    expand: true,
                  }}
                  // Row Heights
                  rowHeight={40} //{() => "auto"}
                  // showToolbar={showToolbar && !bulkEditMode}
                  //showToolbar
                  // Row Selection (checkbox selection when enabled)
                  checkboxSelection={
                    bsShowCheckbox ||
                    (bsEnableBulkMode && (bsBulkEdit || bsBulkDelete)) ||
                    !!onCheckBoxSelected
                  }
                  rowSelectionModel={rowSelectionModel}
                  onRowSelectionModelChange={handleRowSelectionChange}
                  // Enable multi-row selection by clicking on rows directly (no checkbox required)
                  disableRowSelectionOnClick={false}
                  // disableRowSelectionOnClick={
                  //   !bsShowCheckbox &&
                  //   !bsBulkEdit &&
                  //   !bsBulkDelete &&
                  //   !onCheckBoxSelected
                  // }
                  // Column Pinning (Pro feature)
                  pinnedColumns={pinnedColumns}
                  onPinnedColumnsChange={setPinnedColumns}
                  // UI Settings
                  getRowId={(row) => {
                    // Use the same primary key detection logic as handleRowSelectionChange
                    const primaryKey = getEffectivePrimaryKey(row);

                    // Logger.log("🆔 getRowId called:", {
                    //   primaryKey,
                    //   rowPrimaryValue: row[primaryKey],
                    //   rowKeys: Object.keys(row),
                    //   hasValue: row[primaryKey] != null,
                    //   actualRowData: row,
                    //   idField: row.id,
                    //   IdField: row.Id,
                    //   countTagIdField: row.count_tag_id,
                    // });

                    if (primaryKey && row[primaryKey] != null) {
                      return String(row[primaryKey]);
                    }

                    // Fallback to common ID fields - prioritize 'id' field
                    const idFields = ["id", "Id", "ID", "_id"];
                    for (const field of idFields) {
                      if (row[field] != null) {
                        Logger.log("🆔 Using fallback ID field:", {
                          field,
                          value: row[field],
                          stringValue: String(row[field]),
                        });
                        return String(row[field]);
                      }
                    }

                    // Last resort: generate a stable ID based on row content hash
                    const rowString = JSON.stringify(row);
                    const hash = rowString.split("").reduce((a, b) => {
                      a = (a << 5) - a + b.charCodeAt(0);
                      return a & a;
                    }, 0);
                    const generatedId = `generated-${Math.abs(hash)}`;

                    Logger.log("🚨 Using generated ID:", {
                      generatedId,
                      rowData: row,
                      reason: "No valid primary key or ID field found",
                    });

                    return generatedId;
                  }}
                  // Localization
                  localeText={getLocalization()}
                  // Row styling for unsaved changes and striped rows
                  getRowClassName={(params) => {
                    const primaryKey =
                      metadata?.primaryKeys?.[0] || "Id" || "id";
                    const rowId =
                      params.row[primaryKey] || params.row.id || params.row.Id;

                    const classes = [];

                    // Add striped styling
                    if (params.indexRelativeToCurrentPage % 2 === 0) {
                      classes.push("even");
                    }

                    // Add unsaved changes styling
                    if (unsavedChangesRef.current[rowId]) {
                      classes.push("unsaved-changes");
                    }

                    return classes.join(" ");
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
                            bsBulkDelete,
                            bsEnableBulkMode,
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
                      // Striped rows styling
                      "&.even": {
                        backgroundColor: "#fafafa",
                      },
                      // Highlight rows with unsaved changes
                      "&.unsaved-changes": {
                        backgroundColor: "#fff3cd",
                        "&:hover": {
                          backgroundColor: "#ffeaa7",
                        },
                      },
                      // Selected row styling - darker background
                      "&.Mui-selected": {
                        backgroundColor: "#bbdefb !important",
                        "&:hover": {
                          backgroundColor: "#90caf9 !important",
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
            {metadata?.columns || bsStoredProcedure ? (
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
                      setBulkRowCount(
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
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
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={columnName}
                                >
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
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={columnName}
                                >
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
  }
);

BSDataGrid.displayName = "BSDataGrid";

export default BSDataGrid;
