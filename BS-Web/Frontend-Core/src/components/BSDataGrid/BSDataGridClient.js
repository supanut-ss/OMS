import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useLayoutEffect,
} from "react";
import {
  DataGridPro,
  gridClasses,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  useGridApiRef,
  gridFilteredSortedRowIdsSelector,
} from "@mui/x-data-grid-pro";
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Chip,
  Checkbox,
  ButtonGroup,
  ClickAwayListener,
  Grow,
  Paper as MenuPaper,
  Popper,
  MenuList,
  MenuItem as MenuListItem,
  InputAdornment,
  TextField,
  Tooltip,
  alpha,
} from "@mui/material";
import {
  Visibility,
  Edit,
  Delete,
  Add,
  FilterList as FilterListIcon,
  FilterListOff as FilterListOffIcon,
  ArrowDropDown,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  RadioButtonUnchecked,
  RadioButtonChecked,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import Logger from "../../utils/logger";
import { logActivity } from "../../utils/ActivityLogger";
import BSAlertSwal2 from "../BSAlertSwal2";
import { getLocaleText } from "./locales";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "../../utils/dateUtils";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../config/dateConfig";
import secureStorage from "../../utils/SecureStorage";
import { getDateFieldDataType, isDateLikeFieldName } from "./dateTypeUtils";
import {
  buildExportData,
  getExportCellValue,
} from "./exportUtils";

const GLOBAL_FILTER_EXCLUDED_FIELDS = new Set(["create_by", "update_by"]);

const excludesGlobalFilter = (field) =>
  GLOBAL_FILTER_EXCLUDED_FIELDS.has(String(field || "").toLowerCase());

// Canvas text measurement, deterministic and font-aware (handles Thai). Falls
// back to a char estimate if canvas is unavailable.
let __bsMeasureCanvas = null;
const measureTextWidth = (text, bold) => {
  const str = String(text ?? "");
  try {
    __bsMeasureCanvas = __bsMeasureCanvas || document.createElement("canvas");
    const ctx = __bsMeasureCanvas.getContext("2d");
    // Must match the grid's actual font (Prompt) or measurements under-shoot.
    ctx.font = `${bold ? 700 : 400} 14px Prompt, Roboto, Inter, Helvetica, Arial, sans-serif`;
    return ctx.measureText(str).width;
  } catch {
    return str.length * (bold ? 9 : 8);
  }
};

// minWidth floor that fits the header text + room for sort/menu icons + padding.
const headerMinWidthFloor = (headerName) =>
  Math.min(
    320,
    Math.max(80, Math.round(measureTextWidth(headerName, true) + 64)),
  );

// Deterministically size "auto" columns (the given fields) to fit their header
// and the content of the loaded rows. MUI's autosizeColumns only measures the
// cells currently rendered in the DOM, so it gives wrong/unstable widths for
// columns scrolled off-screen or values in non-rendered rows. Measuring the
// data strings directly avoids that entirely.
const AUTOFIT_MAX_WIDTH = 420;
const autoFitColumnsToContent = (api, fields) => {
  if (!api?.getAllColumns || !api?.setColumnWidth || !fields?.length) return;
  const skip = new Set(["actions", "__rowNumber", "__check__"]);
  const fieldSet = new Set(fields.filter((f) => !skip.has(f)));
  if (!fieldSet.size) return;
  const rowIds = api.getAllRowIds ? api.getAllRowIds().slice(0, 300) : [];
  api.getAllColumns().forEach((col) => {
    if (!fieldSet.has(col.field)) return;
    let max = measureTextWidth(col.headerName, true) + 64; // header + icons/padding
    for (let i = 0; i < rowIds.length; i++) {
      let raw;
      try {
        const p = api.getCellParams(rowIds[i], col.field);
        raw = p?.formattedValue ?? p?.value;
      } catch {
        raw = undefined;
      }
      // Only measure plain text/number; skip objects (e.g. Date) and elements.
      if (typeof raw !== "string" && typeof raw !== "number") continue;
      if (raw === "") continue;
      const w = measureTextWidth(raw, false) + 28; // cell horizontal padding
      if (w > max) max = w;
    }
    const width = Math.min(AUTOFIT_MAX_WIDTH, Math.max(80, Math.round(max)));
    // setColumnWidth only changes width; updateColumns would replace the whole
    // colDef and wipe headerName/renderCell/type.
    if (Math.round(col.computedWidth || col.width || 0) !== width) {
      api.setColumnWidth(col.field, width);
    }
  });
};

// Decimal places configuration from environment
const getEnvDecimalPlaces = () => {
  const envVal = process.env.REACT_APP_DECIMAL_PLACES;
  if (envVal !== undefined && envVal !== null && envVal !== "") {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 3; // Default fallback
};
const DEFAULT_DECIMAL_PLACES = getEnvDecimalPlaces();

// Use radio icons in the selection column for single-select mode.
const RadioSelectionCheckbox = React.forwardRef(
  function RadioSelectionCheckbox(props, ref) {
    const { indeterminate, ...rest } = props;
    void indeterminate;

    return (
      <Checkbox
        ref={ref}
        {...rest}
        indeterminate={false}
        icon={<RadioButtonUnchecked fontSize="small" />}
        checkedIcon={<RadioButtonChecked fontSize="small" />}
      />
    );
  },
);

// Split Button Component for Bulk Operations
const BulkSplitButton = ({
  selectedRowCount,
  onBulkEdit,
  onBulkDelete,
  bsBulkEdit = false,
  showBulkDelete = true,
  localeText,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const anchorRef = React.useRef(null);

  const options = [
    {
      label: `${localeText.bsBulkEdit || "Bulk Edit"} (${selectedRowCount})`,
      icon: <Edit />,
      action: onBulkEdit,
      color: "info",
      show: bsBulkEdit,
    },
    {
      label: `${localeText.bsBulkDelete || "Bulk Delete"} (${selectedRowCount})`,
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
        size="small"
        variant="outlined"
        color={options[selectedIndex]?.color || "primary"}
        ref={anchorRef}
        aria-label="split button"
        sx={{
          mr: 1,
          "& .MuiButton-root": {
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            minHeight: "32px",
            padding: "4px 10px",
          },
        }}
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

// Split Button Component for Add Record (Inline Add vs Dialog Add)
const AddRecordSplitButton = ({ onAdd, onInlineAdd, localeText }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = React.useRef(null);

  const handleMainClick = () => {
    if (onInlineAdd) {
      onInlineAdd();
    }
  };

  const handleMenuItemClick = (action) => {
    setOpen(false);
    if (action) {
      action();
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

  return (
    <React.Fragment>
      <ButtonGroup
        variant="outlined"
        color="primary"
        ref={anchorRef}
        aria-label="add record split button"
        size="small"
        sx={{
          mr: 1,
          "& .MuiButton-root": {
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            minHeight: "32px",
            padding: "4px 10px",
          },
        }}
      >
        <Button
          size="small"
          onClick={handleMainClick}
          startIcon={<Add />}
          sx={{
            borderColor: "primary.main",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
            },
          }}
        >
          {localeText.bsAddRecord || "Add Record"}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "add-record-split-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="select add method"
          aria-haspopup="menu"
          onClick={handleToggle}
          sx={{
            borderColor: "primary.main",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
            },
          }}
        >
          <ArrowDropDown />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{ zIndex: 1300 }}
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
            <MenuPaper elevation={3}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="add-record-split-menu" autoFocusItem>
                  <MenuListItem onClick={() => handleMenuItemClick(onAdd)}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Add fontSize="small" />
                      {localeText.bsAddByDialog || "Add by Dialog"}
                    </Box>
                  </MenuListItem>
                </MenuList>
              </ClickAwayListener>
            </MenuPaper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
};

// Custom Quick Filter - ค้นหาเมื่อกด Enter เท่านั้น
const CustomQuickFilter = ({ apiRef, localeText, value = "", onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSearch = useCallback(() => {
    onChange?.(localValue);
    if (apiRef?.current) {
      apiRef.current.setQuickFilterValues(
        localValue ? localValue.split(" ").filter((word) => word) : [],
      );
    }
  }, [apiRef, localValue, onChange]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange?.("");
    if (apiRef?.current) {
      apiRef.current.setQuickFilterValues([]);
    }
  }, [apiRef, onChange]);

  return (
    <TextField
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={localeText?.toolbarQuickFilterPlaceholder || "Search..."}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: "action.active", fontSize: "1.25rem" }} />
          </InputAdornment>
        ),
        endAdornment: localValue ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={handleClear}
              sx={{ padding: "2px" }}
            >
              <ClearIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{
        mr: 1,
        minWidth: 200,
        "& .MuiInputBase-root": {
          fontSize: "0.875rem",
          minHeight: "32px",
          paddingTop: "2px",
          paddingBottom: "2px",
        },
        "& .MuiInputBase-input": {
          padding: "5px 8px",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(0, 0, 0, 0.23)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "primary.main",
        },
      }}
    />
  );
};

// Client-side Custom Toolbar
const ClientGridToolbar = ({
  onAdd,
  onInlineAdd,
  showAdd = false,
  bsCustomActions = [],
  headerFiltersEnabled,
  onToggleHeaderFilters,
  bsBulkEdit = false,
  bsBulkAdd = false,
  bsBulkDelete = false,
  bsEnableBulkMode = false,
  bsShowBulkSplitButton = false,
  selectedRowCount = 0,
  onBulkEdit,
  onBulkDelete,
  onBulkAdd,
  showBulkDelete = false,
  onRefresh,
  onExportExcel,
  onExportCsv,
  onPrint,
  localeText,
  apiRef,
  quickFilterValue = "",
  onQuickFilterChange,
  showQuickFilter = true,
  showExport = true,
  bulkEditMode = false,
  onBulkSave,
  onBulkDiscard,
  hasUnsavedChanges = false,
  formLoading = false,
  changesCount = 0,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportAnchorRef = React.useRef(null);

  const handleExportMenuToggle = () => {
    setExportMenuOpen((prev) => !prev);
  };

  const handleExportMenuClose = (event) => {
    if (
      exportAnchorRef.current &&
      exportAnchorRef.current.contains(event.target)
    ) {
      return;
    }
    setExportMenuOpen(false);
  };

  const handleExcelExport = () => {
    setExportMenuOpen(false);
    if (onExportExcel) onExportExcel();
  };

  const handleCsvExport = () => {
    setExportMenuOpen(false);
    if (onExportCsv) onExportCsv();
  };

  const handlePrint = () => {
    setExportMenuOpen(false);
    if (onPrint) onPrint();
  };

  return (
    <GridToolbarContainer sx={{ pb: "4px" }}>
      {/* Add Record Button */}
      {showAdd && (bsEnableBulkMode || bsBulkAdd) ? (
        <AddRecordSplitButton
          onAdd={onAdd}
          onInlineAdd={onInlineAdd}
          localeText={localeText}
        />
      ) : showAdd ? (
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
          {localeText.bsAddRecord || "Add Record"}
        </Button>
      ) : null}

      {/* Custom action buttons - rendered right after Add Record */}
      {(bsCustomActions || [])
        .filter((a) => a && !a.hidden)
        .map((action, idx) => (
          <Button
            key={action.key || action.label || idx}
            size="small"
            variant={action.variant || "outlined"}
            color={action.color || "primary"}
            startIcon={action.icon}
            disabled={action.disabled}
            onClick={() => action.onClick && action.onClick(apiRef)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8125rem",
              padding: "4px 8px",
              minHeight: "32px",
              mr: 1,
              ...action.sx,
            }}
          >
            {action.label}
          </Button>
        ))}

      {/* Bulk Split Button */}
      {bsShowBulkSplitButton &&
        bsEnableBulkMode &&
        selectedRowCount > 0 &&
        (bsBulkEdit || bsBulkDelete) && (
          <BulkSplitButton
            selectedRowCount={selectedRowCount}
            onBulkEdit={onBulkEdit}
            onBulkDelete={onBulkDelete}
            bsBulkEdit={bsBulkEdit}
            showBulkDelete={showBulkDelete}
            localeText={localeText}
          />
        )}

      <Box sx={{ flexGrow: 1 }} />

      {/* Bulk Edit Controls */}
      {bulkEditMode ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.5,
            backgroundColor: "warning.light",
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "warning.contrastText", fontWeight: 500 }}
          >
            {localeText.bsBulkEditMode || "Bulk Edit Mode"}
            {changesCount > 0 &&
              ` (${changesCount} ${localeText.bsUnsavedChanges || "unsaved"})`}
          </Typography>

          <Button
            size="small"
            variant="outlined"
            onClick={onBulkDiscard}
            disabled={formLoading}
            sx={{
              color: "warning.contrastText",
              borderColor: "warning.contrastText",
              fontSize: "0.75rem",
              py: 0.25,
              px: 1,
              minHeight: 28,
            }}
          >
            {localeText.bsDiscardAllChanges || "Discard"}
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={onBulkSave}
            disabled={formLoading || !hasUnsavedChanges}
            startIcon={<SaveIcon fontSize="small" />}
            sx={{
              bgcolor: "success.main",
              "&:hover": { bgcolor: "success.dark" },
              fontSize: "0.75rem",
              py: 0.25,
              px: 1,
              minHeight: 28,
            }}
          >
            {formLoading
              ? localeText.bsSaving || "Saving..."
              : localeText.bsSave || "Save"}
          </Button>
        </Box>
      ) : showQuickFilter ? (
        <CustomQuickFilter
          apiRef={apiRef}
          localeText={localeText}
          value={quickFilterValue}
          onChange={onQuickFilterChange}
        />
      ) : null}

      {/* Header Filters Toggle (hidden when quick filter is hidden) */}
      {showQuickFilter && (
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
          {headerFiltersEnabled
            ? localeText.bsHideFilters || "Hide Filters"
            : localeText.bsShowFilters || "Show Filters"}
        </Button>
      )}

      {/* Refresh Button */}
      <Button
        size="small"
        startIcon={<RefreshIcon />}
        onClick={
          onRefresh || (() => Logger.warn("No onRefresh handler provided"))
        }
        sx={{
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.8125rem",
          padding: "4px 8px",
          minHeight: "32px",
          color: "text.primary",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        {localeText.bsRefresh || "Refresh"}
      </Button>

      {/* MUI Grid Toolbar Buttons (icon only) */}
      <Box
        sx={(theme) => ({
          display: "flex",
          alignItems: "center",
          "& .MuiButton-root": {
            minWidth: "auto",
            padding: "4px 8px",
            fontSize: 0,
            color: "transparent",
            "& .MuiButton-startIcon": {
              margin: 0,
              fontSize: "1.5rem",
              color: theme.palette.text.secondary,
            },
          },
        })}
      >
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />

        {/* Custom Export Menu */}
        {showExport && (
          <React.Fragment>
            <Button
              ref={exportAnchorRef}
              size="small"
              onClick={handleExportMenuToggle}
              startIcon={<FileDownloadIcon />}
              endIcon={
                <ArrowDropDown
                  sx={(theme) => ({
                    color: `${theme.palette.text.secondary} !important`,
                    fontSize: "1.25rem !important",
                  })}
                />
              }
              sx={(theme) => ({
                minWidth: "auto",
                padding: "4px 8px",
                fontSize: 0,
                color: "transparent",
                "& .MuiButton-startIcon": {
                  margin: 0,
                  fontSize: "1.5rem",
                  color: theme.palette.text.secondary,
                },
                "& .MuiButton-endIcon": {
                  margin: 0,
                  marginLeft: "-4px",
                },
              })}
            >
              Export
            </Button>
            <Popper
              sx={{ zIndex: 1300 }}
              open={exportMenuOpen}
              anchorEl={exportAnchorRef.current}
              role={undefined}
              transition
              disablePortal
              placement="bottom-start"
            >
              {({ TransitionProps }) => (
                <Grow {...TransitionProps}>
                  <MenuPaper elevation={8}>
                    <ClickAwayListener onClickAway={handleExportMenuClose}>
                      <MenuList autoFocusItem>
                        <MenuListItem onClick={handleExcelExport}>
                          {localeText.bsExportExcel || "Export Excel"}
                        </MenuListItem>
                        <MenuListItem onClick={handleCsvExport}>
                          {localeText.toolbarExportCSV || "Download as CSV"}
                        </MenuListItem>
                        <MenuListItem onClick={handlePrint}>
                          {localeText.toolbarExportPrint || "Print"}
                        </MenuListItem>
                      </MenuList>
                    </ClickAwayListener>
                  </MenuPaper>
                </Grow>
              )}
            </Popper>
          </React.Fragment>
        )}
      </Box>
    </GridToolbarContainer>
  );
};

/**
 * OverflowTooltipCell Component
 * Shows tooltip when cell content overflows (text is truncated)
 * Uses ref to detect if text is actually overflowing
 */
const OverflowTooltipCell = ({ value, children }) => {
  const textRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (element) {
      // Check if text is overflowing (useLayoutEffect ensures DOM is measured after render)
      setIsOverflowed(element.scrollWidth > element.clientWidth);
    }
  }, [value, children]);

  const displayContent = children ?? value;
  const tooltipValue =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? "");

  return (
    <Tooltip
      title={isOverflowed ? tooltipValue : ""}
      arrow
      placement="top-start"
      enterDelay={500}
      leaveDelay={0}
      slotProps={{
        tooltip: {
          sx: {
            fontSize: "0.875rem", // 14px - larger than default 10px
            padding: "8px 12px",
            maxWidth: 400,
          },
        },
      }}
    >
      <Box
        ref={textRef}
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {displayContent}
      </Box>
    </Tooltip>
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
 *   bsRowPerPage={20}
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
 * - Parent-controlled toolbar and bulk callbacks
 * - View action when onView is provided (no built-in row edit/delete)
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
  bsRowPerPage = 20,
  bsColumnWidth = "auto", // "auto" (autosize to content) or a number (fixed width)
  bsPageSizeOptions = [20, 100, 200, 500, 1000],
  bsAutoHeightMaxRows = 10,
  bsShowCheckbox = false,
  bsShowRowNumber = true,
  bsShowCharacterCount = false,
  bsCellTooltip = true,
  bsExportFileName,
  bsPrintTitle,

  // Toolbar visibility controls forwarded to the client toolbar
  showQuickFilter = true,
  showExport = true,

  // User lookup configuration for audit fields
  bsUserLookup, // { table: "sec.t_com_user", idField: "user_id", displayFields: ["first_name", "last_name"], separator: " " }

  // Toolbar & Custom Actions
  showAdd = false,
  addRecordText, // Custom text for the Add Record button (overrides default)
  // Custom toolbar buttons rendered right after Add Record.
  // Array of { label, icon?, onClick, variant?, color?, sx?, disabled?, hidden? }.
  bsCustomActions = [],
  onAdd,
  onInlineAdd,
  onRefresh,
  onExportExcel,
  onExportCsv,
  onPrint,
  bsBulkEdit = false,
  bsBulkAdd = false,
  bsBulkDelete = false,
  bsEnableBulkMode = false,
  bsShowBulkSplitButton = false,
  onBulkEdit,
  onBulkDelete,
  onBulkAdd,
  showBulkDelete = false,
  bulkEditMode = false,
  onBulkSave,
  onBulkDiscard,
  hasUnsavedChanges = false,
  formLoading = false,
  changesCount = 0,

  // UI props
  height = "auto",
  showToolbar = true,

  // Event handlers
  onRowClick,
  onView,
  onCheckBoxSelected,

  sx: customSx,
  ...props
}) => {
  // Debug: Log received props
  Logger.log("🎯 BSDataGridClient Props:", {
    dataCount: data?.length || 0,
    columnsCount: columnDefs?.length || 0,
    bsCols,
    bsShowRowNumber,
    bsCellTooltip,
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

  const apiRef = useGridApiRef();

  // Get current user for locale information
  const { user } = useAuth();

  // Internal lang state that syncs with secureStorage to detect language changes
  // This is needed because bsLocale prop may not update when React Router caches route elements
  const [internalLang, setInternalLang] = useState(
    secureStorage?.get ? secureStorage.get("lang") || "en" : "en",
  );
  const bsLocaleRef = useRef(bsLocale);

  // Keep ref in sync with prop
  useEffect(() => {
    bsLocaleRef.current = bsLocale;
    // Also update internalLang when bsLocale prop changes
    if (bsLocale && bsLocale !== "default") {
      setInternalLang((prev) => {
        if (prev !== bsLocale) {
          Logger.log(`🌐 bsLocale prop changed: ${prev} -> ${bsLocale}`);
          return bsLocale;
        }
        return prev;
      });
    }
  }, [bsLocale]);

  // Listen for custom language change event (dispatched by AppRoutes when language changes)
  useEffect(() => {
    const handleLangChange = (event) => {
      const newLang = event.detail?.lang;
      if (newLang) {
        setInternalLang((prevLang) => {
          if (prevLang !== newLang) {
            return newLang;
          }
          return prevLang;
        });
      }
    };

    window.addEventListener("bsLangChange", handleLangChange);

    return () => {
      window.removeEventListener("bsLangChange", handleLangChange);
    };
  }, []);

  // Helper: Get effective locale for date formatting
  const getEffectiveLocale = useCallback(() => {
    // Priority: bsLocale prop > internalLang > user.locale_id > default 'en'
    if (bsLocale && bsLocale !== "default") {
      return bsLocale;
    }

    if (internalLang) {
      return internalLang;
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
  }, [bsLocale, internalLang, user]);

  // Helper: Custom date formatter for consistent dd/MM/yyyy format
  // Uses shared dateUtils for consistent formatting across application
  // const formatDateCustom = useCallback(
  //   (date, includeTime = false, effectiveLocale) => {
  //     return formatDate(date, { includeTime, locale: effectiveLocale });
  //   },
  //   [],
  // );
  const formatDateCustom = useCallback(
    (date, includeTime = false, effectiveLocale = getEffectiveLocale()) => {
      return formatDate(date, {
        includeTime,
        locale: "en",
        format: includeTime ? DATETIME_FORMAT : DATE_FORMAT,
      });
    },
    [getEffectiveLocale],
  );

  // State management
  const gridPaperRef = useRef(null);
  const [headerFiltersEnabled, setHeaderFiltersEnabled] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState([]);
  const [measuredToolbarHeight, setMeasuredToolbarHeight] = useState(
    showToolbar ? 44 : 0,
  );
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: bsRowPerPage,
  });
  const [sortModel, setSortModel] = useState([]);
  const [filterModel, setFilterModel] = useState({ items: [] });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const [quickFilterInputValue, setQuickFilterInputValue] = useState("");

  // Column pinning state
  const [pinnedColumns, setPinnedColumns] = useState({
    left: parsedPinColsLeft,
    right: parsedPinColsRight,
  });

  // Ensure the active page size is included in pageSizeOptions to avoid MUI X warnings
  const effectivePageSizeOptions = useMemo(() => {
    const currentPageSize =
      (paginationModel && paginationModel.pageSize) || bsRowPerPage || 20;
    const baseOptions = Array.isArray(bsPageSizeOptions)
      ? bsPageSizeOptions.slice()
      : [];

    // Add current page size if missing
    if (!baseOptions.includes(currentPageSize)) {
      baseOptions.push(currentPageSize);
    }

    // Ensure numeric, unique and sorted
    const numericOptions = Array.from(
      new Set(baseOptions.map((v) => Number(v))),
    )
      .filter((v) => !Number.isNaN(v))
      .sort((a, b) => a - b);

    return numericOptions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bsPageSizeOptions, paginationModel?.pageSize, bsRowPerPage]);

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
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
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
  const formatCellValue = useCallback(
    (value, type, format, colDef = null) => {
      if (value === null || value === undefined || value === "") return "";

      const effectiveLocale = getEffectiveLocale();

      switch (type?.toLowerCase()) {
        case "boolean":
        case "bit":
          return value ? "Yes" : "No";
        case "date": {
          try {
            const date = new Date(value);
            return isNaN(date.getTime())
              ? String(value)
              : formatDateCustom(date, false, effectiveLocale);
          } catch (e) {
            return String(value);
          }
        }
        case "datetime":
        case "datetime2":
        case "timestamp": {
          try {
            const date = new Date(value);
            return isNaN(date.getTime())
              ? String(value)
              : formatDateCustom(date, true, effectiveLocale);
          } catch (e) {
            return String(value);
          }
        }
        case "number":
        case "int":
        case "float":
        case "decimal": {
          if (format === "currency") {
            return new Intl.NumberFormat("th-TH", {
              style: "currency",
              currency: "THB",
            }).format(value);
          }
          if (format === "percentage") {
            return `${(value * 100).toFixed(2)}%`;
          }

          const num = Number(value);
          if (isNaN(num)) return value;

          const isIntType = type?.toLowerCase() === "int";
          let decimals = colDef?.decimals;
          if (decimals === undefined || decimals === null) {
            decimals = isIntType ? 0 : DEFAULT_DECIMAL_PLACES;
          } else {
            decimals = parseInt(decimals, 10);
            if (isNaN(decimals)) {
              decimals = isIntType ? 0 : DEFAULT_DECIMAL_PLACES;
            }
          }

          const thousandSeparator = colDef?.thousandSeparator !== false;
          const formatted = num.toFixed(decimals);
          const parts = formatted.split(".");
          if (thousandSeparator) {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          }
          return parts.join(".");
        }
        default:
          return String(value);
      }
    },
    [getEffectiveLocale, formatDateCustom],
  );

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
        let detectedType = colDef.type;

        // Auto-detect type if not explicitly provided
        if (!detectedType) {
          const fieldNameLower = colDef.field?.toLowerCase() || "";

          // 1. Try to detect from data rows first
          if (processedData.length > 0) {
            const sampleRow = processedData.find(
              (row) =>
                row[colDef.field] !== null && row[colDef.field] !== undefined,
            );
            const sampleValue = sampleRow ? sampleRow[colDef.field] : null;

            if (sampleValue instanceof Date) {
              detectedType = "date";
            } else if (typeof sampleValue === "string") {
              const isDateLike =
                /^\d{4}-\d{2}-\d{2}/.test(sampleValue) || // ISO date format
                /^\d{1,2}\/\d{1,2}\/\d{4}/.test(sampleValue) || // MM/DD/YYYY
                /^\d{4}\/\d{1,2}\/\d{1,2}/.test(sampleValue); // YYYY/MM/DD

              if (isDateLike && !isNaN(Date.parse(sampleValue))) {
                const hasNonZeroTime =
                  /T(?!00:00:00)(?!00:00)\d{2}:\d{2}/.test(sampleValue) ||
                  /\s(?!00:00:00)(?!00:00)\d{2}:\d{2}/.test(sampleValue);
                const isAuditField = /create|update|modify|log/i.test(
                  colDef.field,
                );
                detectedType =
                  hasNonZeroTime || isAuditField ? "datetime" : "date";
              }
            }
          }

          // 2. Fallback to field name heuristics if no data / not detected yet
          if (!detectedType) {
            if (
              fieldNameLower.includes("create") ||
              fieldNameLower.includes("update") ||
              fieldNameLower.includes("modify") ||
              fieldNameLower.includes("log")
            ) {
              if (
                fieldNameLower.includes("date") ||
                fieldNameLower.includes("time")
              ) {
                detectedType = "datetime";
              }
            } else if (
              fieldNameLower.endsWith("_date") ||
              fieldNameLower.endsWith("date")
            ) {
              detectedType = "date";
            } else if (
              fieldNameLower.endsWith("_time") ||
              fieldNameLower.endsWith("time")
            ) {
              detectedType = "datetime";
            }
          }
        }

        const baseColumn = {
          ...colDef,
          field: colDef.field,
          headerName: colDef.headerName || formatColumnName(colDef.field),
          width:
            colDef.width ||
            (typeof bsColumnWidth === "number"
              ? bsColumnWidth
              : bsColumnWidth === "auto"
                ? undefined
                : getColumnWidth(detectedType || colDef.type, colDef.field)),
          type:
            detectedType === "boolean" || colDef.type === "boolean"
              ? "boolean"
              : detectedType === "number" || colDef.type === "number"
                ? "number"
                : detectedType === "date" ||
                    detectedType === "datetime" ||
                    colDef.type === "date" ||
                    colDef.type === "datetime"
                  ? "date"
                  : "string",
          sortable: colDef.sortable ?? true,
          filterable: colDef.filterable ?? true,
          resizable: colDef.resizable ?? true,
        };

        // Set valueFormatter for number/decimal columns for sorting/exporting consistency
        const isNumberType =
          colDef.type === "number" ||
          colDef.type === "decimal" ||
          colDef.type === "float" ||
          colDef.type === "int" ||
          detectedType === "number" ||
          detectedType === "decimal";

        if (isNumberType && !colDef.valueFormatter) {
          const decimals =
            colDef.decimals !== undefined && colDef.decimals !== null
              ? parseInt(colDef.decimals, 10)
              : colDef.type === "int"
                ? 0
                : DEFAULT_DECIMAL_PLACES;
          const thousandSeparator = colDef.thousandSeparator !== false;

          baseColumn.valueFormatter = (value) => {
            if (value == null || value === "") return "";
            const num = Number(value);
            if (isNaN(num)) return value;
            const formatted = num.toFixed(
              isNaN(decimals) ? DEFAULT_DECIMAL_PLACES : decimals,
            );
            const parts = formatted.split(".");
            if (thousandSeparator) {
              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            return parts.join(".");
          };
          baseColumn.align = baseColumn.align || "right";
        }

        // Keep consumer renderers first; only apply fallback renderer when not provided.
        if (colDef.renderCell) {
          baseColumn.renderCell = colDef.renderCell;
        } else if (
          colDef.type === "boolean" ||
          colDef.type === "bit" ||
          detectedType === "boolean"
        ) {
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
              {formatCellValue(params.value, "number", "currency", colDef)}
            </Box>
          );
        } else {
          baseColumn.renderCell = (params) =>
            formatCellValue(
              params.value,
              detectedType || colDef.type,
              colDef.format,
              colDef,
            );
        }

        // Keep consumer valueGetter first; fallback for date sorting when missing.
        if (
          !colDef.valueGetter &&
          (colDef.type === "date" ||
            colDef.type === "datetime" ||
            detectedType === "date" ||
            detectedType === "datetime")
        ) {
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
              detectedType = getDateFieldDataType(key, sampleValue);
            }
          }

          if (detectedType === "string" && isDateLikeFieldName(key)) {
            detectedType = getDateFieldDataType(key, sampleValue);
          }

          const columnConfig = {
            field: key,
            headerName: formatColumnName(key),
            width:
              typeof bsColumnWidth === "number"
                ? bsColumnWidth
                : bsColumnWidth === "auto"
                  ? undefined
                  : getColumnWidth(detectedType, key),
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
            renderCell: (params) =>
              formatCellValue(
                params.value,
                detectedType,
                undefined,
                columnConfig,
              ),
          };

          if (detectedType === "number") {
            columnConfig.valueFormatter = (value) => {
              if (value == null || value === "") return "";
              const num = Number(value);
              if (isNaN(num)) return value;
              const formatted = num.toFixed(DEFAULT_DECIMAL_PLACES);
              const parts = formatted.split(".");
              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              return parts.join(".");
            };
            columnConfig.align = "right";
          }

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
        headerName: "#",
        width: 60,
        maxWidth: 60,
        sortable: false,
        filterable: false,
        resizable: false,
        hideable: false,
        disableColumnMenu: true,
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
        (col) => col.field === "actions",
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
        (c) => c.field !== "actions" && c.field !== "__rowNumber",
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

    // Apply cell tooltip wrapper if bsCellTooltip is enabled
    // Wraps text cells with OverflowTooltipCell to show tooltip on truncated text
    if (bsCellTooltip) {
      dataColumns = dataColumns.map((col) => {
        // Skip special column types that have their own rendering
        const skipTypes = ["actions", "boolean", "singleSelect"];
        const skipFields = ["__check__", "actions", "__rowNumber", "rowNumber"];

        if (
          skipTypes.includes(col.type) ||
          skipFields.includes(col.field) ||
          col.type === "attachFile" ||
          col.type === "stringAvatar"
        ) {
          return col;
        }

        // If column already has custom renderCell, wrap it
        const originalRenderCell = col.renderCell;

        return {
          ...col,
          renderCell: (params) => {
            // Get the rendered content
            let content;
            if (originalRenderCell) {
              content = originalRenderCell(params);
            } else {
              content = params.formattedValue ?? params.value ?? "";
            }

            // If content is a React element (not a simple string), don't wrap
            if (React.isValidElement(content)) {
              return content;
            }

            // Wrap with tooltip
            return (
              <OverflowTooltipCell value={content}>
                {content}
              </OverflowTooltipCell>
            );
          },
        };
      });
    }

    Logger.log("✅ Columns built successfully:", {
      totalColumns: dataColumns.length,
      columnFields: dataColumns.map((c) => c.field),
    });

    return dataColumns.map((col) => {
      const merged = excludesGlobalFilter(col.field)
        ? { ...col, getApplyQuickFilterFn: () => null }
        : { ...col };

      // Auto mode: guarantee a header-fit minWidth floor so a column never
      // collapses when MUI autosize can't measure it (e.g. scrolled off-screen).
      const isSpecial =
        merged.field === "actions" ||
        merged.field === "__rowNumber" ||
        merged.field === "__check__";
      if (
        bsColumnWidth === "auto" &&
        !isSpecial &&
        merged.minWidth === undefined &&
        merged.width === undefined &&
        merged.flex === undefined
      ) {
        merged.minWidth = headerMinWidthFloor(
          merged.headerName || merged.field,
        );
      }

      return merged;
    });
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
    bsCellTooltip,
    bsColumnWidth,
  ]);

  // Memoize autosizeOptions (mirrors BSDataGrid): autosize columns that have
  // no fixed width when bsColumnWidth === "auto".
  const autosizeOptions = useMemo(() => {
    const skipFields = new Set(["actions", "__rowNumber", "__check__"]);
    const columnsToAutosize =
      bsColumnWidth === "auto"
        ? columns
            .filter((col) => col.width == null && !skipFields.has(col.field))
            .map((col) => col.field)
        : [];
    return {
      columns: columnsToAutosize,
      includeHeaders: true,
      includeOutliers: true,
    };
  }, [columns, bsColumnWidth]);

  // Size "auto" columns to fit their content once data is present (and again
  // whenever the data changes). Deterministic measurement instead of MUI
  // autosize so off-screen columns are sized correctly too.
  useEffect(() => {
    if (bsColumnWidth !== "auto") return;
    if (!processedData.length) return;
    const api = apiRef.current;
    if (!api?.setColumnWidth) return;
    const t = setTimeout(() => {
      autoFitColumnsToContent(api, autosizeOptions.columns);
    }, 50);
    return () => clearTimeout(t);
  }, [apiRef, autosizeOptions, processedData, bsColumnWidth]);

  // Handle row selection changes
  const handleRowSelectionChange = useCallback(
    (newRowSelectionModel) => {
      setRowSelectionModel(newRowSelectionModel);

      if (onCheckBoxSelected && processedData.length > 0) {
        const selectedRows = processedData.filter((row) =>
          newRowSelectionModel.includes(row.id),
        );
        onCheckBoxSelected(selectedRows);
      }
    },
    [processedData, onCheckBoxSelected],
  );

  // Get localization object for DataGrid
  const getLocalization = useCallback(() => {
    const effectiveLocale = getEffectiveLocale();
    return getLocaleText(effectiveLocale);
  }, [getEffectiveLocale]);

  // Get current locale text for custom UI elements
  const localeText = useMemo(() => {
    const base = getLocalization();
    if (addRecordText) {
      return { ...base, bsAddRecord: addRecordText };
    }
    return base;
  }, [getLocalization, addRecordText]);

  const getExportFileName = useCallback(() => {
    return bsExportFileName || "export";
  }, [bsExportFileName]);

  const getExportVisibleColumns = useCallback(() => {
    return columns.filter(
      (col) =>
        col.field !== "actions" &&
        col.field !== "__check__" &&
        columnVisibilityModel[col.field] !== false,
    );
  }, [columns, columnVisibilityModel]);

  const getGridRowsForExport = useCallback(() => {
    try {
      const filteredRowIds = gridFilteredSortedRowIdsSelector(apiRef);
      const dataRows = filteredRowIds
        .map((id) => {
          if (apiRef.current) {
            return apiRef.current.getRow(id);
          }
          return processedData.find((row) => String(row.id) === String(id));
        })
        .filter(Boolean);

      return dataRows.length > 0 ? dataRows : processedData;
    } catch (err) {
      Logger.warn("Failed to read filtered grid rows for export:", err);
      return processedData;
    }
  }, [apiRef, processedData]);

  const getRowsForExport = useCallback(async () => {
    return getGridRowsForExport();
  }, [getGridRowsForExport]);

  const buildFormattedExportData = useCallback(
    (dataRows, visibleColumns) =>
      buildExportData(dataRows, visibleColumns, apiRef),
    [apiRef],
  );

  const escapeCsvValue = useCallback((value) => {
    if (value === null || value === undefined) {
      return "";
    }

    let cellValue = value;
    if (cellValue instanceof Date) {
      cellValue = cellValue.toLocaleString();
    }

    const stringValue = String(cellValue);
    if (/[;"\r\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }, []);

  const downloadTextFile = useCallback((content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Custom Excel Export Handler
  const handleExportExcel = useCallback(async () => {
    try {
      const exportVisibleColumns = getExportVisibleColumns();
      const exportRows = await getRowsForExport();
      const sheetRows = buildFormattedExportData(
        exportRows,
        exportVisibleColumns,
      );
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);

      worksheet["!cols"] = exportVisibleColumns.map((col) => {
        const header = col.headerName || col.field;
        const maxLength = Math.max(
          header.length,
          ...sheetRows.map((row) => String(row[header] || "").length),
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

      const filename = `${getExportFileName()}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      XLSX.writeFile(workbook, filename);
      Logger.log(
        "Excel export completed:",
        filename,
        "rows:",
        sheetRows.length,
      );
    } catch (err) {
      Logger.error("Excel export failed:", err);
      BSAlertSwal2.show(
        "error",
        localeText.bsExportExcelError || "Failed to export Excel",
        {
          title: localeText.bsError || "Error",
        },
      );
    }
  }, [
    buildFormattedExportData,
    getExportFileName,
    getExportVisibleColumns,
    getRowsForExport,
    localeText,
  ]);

  // Custom CSV Export Handler
  const handleExportCsv = useCallback(async () => {
    try {
      const exportVisibleColumns = getExportVisibleColumns();
      const exportRows = await getRowsForExport();
      const csvRows = buildFormattedExportData(
        exportRows,
        exportVisibleColumns,
      );
      const headers = exportVisibleColumns.map(
        (col) => col.headerName || col.field,
      );
      const csvContent = [
        headers.map(escapeCsvValue).join(";"),
        ...csvRows.map((row) =>
          headers.map((header) => escapeCsvValue(row[header])).join(";"),
        ),
      ].join("\r\n");

      const filename = `${getExportFileName()}_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      downloadTextFile(
        `\uFEFF${csvContent}`,
        filename,
        "text/csv;charset=utf-8;",
      );
      Logger.log("CSV export completed with", csvRows.length, "rows");
    } catch (err) {
      Logger.error("CSV export failed:", err);
    }
  }, [
    buildFormattedExportData,
    downloadTextFile,
    escapeCsvValue,
    getExportFileName,
    getExportVisibleColumns,
    getRowsForExport,
  ]);

  // Custom Print Handler - builds HTML table from grid data for printing
  const handlePrint = useCallback(async () => {
    let printPopup = null;

    try {
      printPopup = window.open("", "_blank");
      if (!printPopup) {
        BSAlertSwal2.show(
          "warning",
          localeText.bsAllowPopup || "Please allow pop-ups to print this data",
          {
            title: localeText.bsWarning || "Warning",
          },
        );
        return;
      }

      printPopup.document.write(`
        <html>
          <head><title>Preparing print</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            Preparing print data...
          </body>
        </html>
      `);
      printPopup.document.close();

      const exportVisibleColumns = getExportVisibleColumns();
      const exportRows = await getRowsForExport();
      const rawTitle = getExportFileName();
      const printTitle =
        bsPrintTitle ||
        rawTitle
          .replace(/^[vtspf]_/i, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      const printDate = new Date().toLocaleString();
      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      let printHtml = `
        <html>
        <head>
          <title>${escapeHtml(printTitle)}</title>
          <style>
            @media print {
              @page { margin: 10mm; size: landscape; }
            }
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            h2 { margin-bottom: 4px; }
            .print-date { font-size: 11px; color: #666; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f5f5f5; font-weight: 600; text-align: left;
                 padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; white-space: nowrap; }
            td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) { background-color: #fafafa; }
            .num { text-align: right; }
            .row-num { text-align: center; width: 40px; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(printTitle)}</h2>
          <div class="print-date">${escapeHtml(printDate)} - Total: ${exportRows.length} rows</div>
          <table>
            <thead><tr>`;

      exportVisibleColumns.forEach((col) => {
        if (col.field === "__rowNumber") {
          printHtml += `<th class="row-num">#</th>`;
        } else {
          printHtml += `<th>${escapeHtml(col.headerName || col.field)}</th>`;
        }
      });

      printHtml += `</tr></thead><tbody>`;
      exportRows.forEach((row, index) => {
        printHtml += `<tr>`;
        exportVisibleColumns.forEach((col) => {
          if (col.field === "__rowNumber") {
            printHtml += `<td class="row-num">${index + 1}</td>`;
            return;
          }

          const cellValue = getExportCellValue(row, col, index, apiRef);

          const isNumeric =
            col.type === "number" || typeof cellValue === "number";
          const cssClass = isNumeric ? ' class="num"' : "";
          printHtml += `<td${cssClass}>${escapeHtml(cellValue)}</td>`;
        });
        printHtml += `</tr>`;
      });

      printHtml += `</tbody></table></body></html>`;

      printPopup.document.open();
      printPopup.document.write(printHtml);
      printPopup.document.close();
      printPopup.focus();
      setTimeout(() => {
        if (!printPopup.closed) {
          printPopup.focus();
          printPopup.print();
        }
      }, 250);

      Logger.log("Print triggered with", exportRows.length, "rows");
    } catch (err) {
      Logger.error("Print failed:", err);
    }
  }, [
    apiRef,
    bsPrintTitle,
    getExportFileName,
    getExportVisibleColumns,
    getRowsForExport,
    localeText,
  ]);

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
    [logGridClientActivity, onRowClick],
  );

  useLayoutEffect(() => {
    if (!showToolbar) {
      setMeasuredToolbarHeight(0);
      return undefined;
    }

    const toolbarEl = gridPaperRef.current?.querySelector(
      ".MuiDataGrid-toolbarContainer",
    );

    if (!toolbarEl) {
      setMeasuredToolbarHeight(44);
      return undefined;
    }

    const updateToolbarHeight = () => {
      const nextHeight = Math.ceil(toolbarEl.getBoundingClientRect().height);
      setMeasuredToolbarHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    };

    updateToolbarHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateToolbarHeight);
      return () => window.removeEventListener("resize", updateToolbarHeight);
    }

    const observer = new ResizeObserver(updateToolbarHeight);
    observer.observe(toolbarEl);

    return () => observer.disconnect();
  }, [showToolbar, processedData.length, columns.length]);

  // When height is "auto", keep the grid at roughly N visible rows and let
  // the internal virtual scroller handle vertical scrolling.
  const resolvedGridHeight = useMemo(() => {
    if (height !== "auto") {
      return height;
    }

    const maxVisibleRows = Number.isFinite(bsAutoHeightMaxRows)
      ? Math.max(1, Math.floor(bsAutoHeightMaxRows))
      : 10;
    const visibleRows =
      processedData.length === 0
        ? 6
        : Math.min(maxVisibleRows, processedData.length);

    const rowHeight = 40;
    const headerHeight = 56;
    const toolbarHeight = showToolbar ? measuredToolbarHeight : 0;
    const footerHeight = 52;
    const paddingOffset = 8;

    return (
      rowHeight * visibleRows +
      headerHeight +
      toolbarHeight +
      footerHeight +
      paddingOffset
    );
  }, [
    height,
    bsAutoHeightMaxRows,
    processedData.length,
    showToolbar,
    measuredToolbarHeight,
  ]);

  const allowVirtualScrollerY = useMemo(() => {
    if (height !== "auto") {
      return true;
    }

    const maxVisibleRows = Number.isFinite(bsAutoHeightMaxRows)
      ? Math.max(1, Math.floor(bsAutoHeightMaxRows))
      : 10;

    return processedData.length > maxVisibleRows;
  }, [height, bsAutoHeightMaxRows, processedData.length]);

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

  // No columns and no data
  if (columns.length === 0) {
    return (
      <Paper
        square
        elevation={0}
        sx={{
          height,
          width: "100%",
          p: 3,
          textAlign: "center",
          borderRadius: 0,
        }}
      >
        <Alert
          severity="info"
          sx={{
            justifyContent: "center",
            alignItems: "center",
            "& .MuiAlert-message": {
              textAlign: "center",
            },
          }}
        >
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

  const fillsAvailableHeight = height === "100%";

  return (
    <Paper
      ref={gridPaperRef}
      square
      elevation={0}
      sx={{
        height: resolvedGridHeight,
        width: "100%",
        minWidth: 0,
        minHeight: fillsAvailableHeight ? 0 : undefined,
        flex: fillsAvailableHeight ? "1 1 0" : undefined,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderRadius: 0,
      }}
    >
      {/* DataGrid */}
      <DataGridPro
        apiRef={apiRef}
        rows={processedData}
        columns={columns}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        // Selection
        checkboxSelection={bsShowCheckbox}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={handleRowSelectionChange}
        // Column pinning
        pinnedColumns={pinnedColumns}
        onPinnedColumnsChange={setPinnedColumns}
        // Features
        pagination
        pageSizeOptions={effectivePageSizeOptions}
        disableRowSelectionOnClick={false}
        getRowClassName={(params) =>
          params.indexRelativeToCurrentPage % 2 === 0 ? "even" : ""
        }
        // Auto column sizing is handled deterministically via
        // autoFitColumnsToContent (MUI's autosize can't measure off-screen
        // columns), so MUI's autosize is intentionally off.
        // Row Heights
        rowHeight={40}
        // Header filters
        headerFilters={headerFiltersEnabled}
        // Toolbar
        slots={{
          toolbar: showToolbar ? ClientGridToolbar : null,
        }}
        slotProps={{
          toolbar: {
            onAdd,
            onInlineAdd,
            showAdd,
            bsCustomActions,
            headerFiltersEnabled,
            onToggleHeaderFilters: handleToggleHeaderFilters,
            bsBulkEdit,
            bsBulkAdd,
            bsBulkDelete,
            bsEnableBulkMode,
            bsShowBulkSplitButton,
            selectedRowCount: rowSelectionModel.length,
            onBulkEdit,
            onBulkDelete,
            onBulkAdd,
            showBulkDelete,
            onRefresh,
            onExportExcel: onExportExcel || handleExportExcel,
            onExportCsv: onExportCsv || handleExportCsv,
            onPrint: onPrint || handlePrint,
            showQuickFilter,
            showExport,
            localeText,
            apiRef,
            quickFilterValue: quickFilterInputValue,
            onQuickFilterChange: setQuickFilterInputValue,
            bulkEditMode,
            onBulkSave,
            onBulkDiscard,
            hasUnsavedChanges,
            formLoading,
            changesCount,
          },
          loadingOverlay: {
            variant: "skeleton",
            noRowsVariant: "skeleton",
          },
          pagination: {
            showFirstButton: true,
            showLastButton: true,
          },
        }}
        // Localization
        localeText={getLocalization()}
        // Events
        onRowClick={handleRowClick}
        sx={(theme) => {
          const selectedRowBackground = alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.22 : 0.12,
          );
          const selectedRowHoverBackground = alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.3 : 0.16,
          );
          const baseSx = {
            height: "100%",
            width: "100%",
            minHeight: 0,
            overflow: "hidden",
            border: 0,
            borderRadius: 0,
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${theme.palette.divider}`,
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.grey[800]
                  : theme.palette.grey[100],
              borderBottom: `2px solid ${theme.palette.divider}`,
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .required-field": {
              color: "error.main",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-main": {
              overflow: "hidden",
            },
            "& .MuiDataGrid-scrollbar": {
              display: "none",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflowX: "auto",
              overflowY: allowVirtualScrollerY ? "auto" : "hidden",
              scrollbarWidth: "thin",
              scrollbarColor: `${alpha(theme.palette.primary.main, 0.5)} transparent`,
              "&::-webkit-scrollbar": {
                width: 6,
                height: 6,
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(theme.palette.primary.main, 0.4),
                borderRadius: 8,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.6),
                },
              },
            },
            "& .MuiDataGrid-row": {
              backgroundColor: theme.palette.background.paper,
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[400]
                    : theme.palette.grey[100],
              },
              "&.Mui-selected": {
                backgroundColor: selectedRowBackground,
                "&:hover": {
                  backgroundColor: selectedRowHoverBackground,
                },
              },
              "&.even": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[300]
                    : theme.palette.grey[50],
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.grey[400]
                      : theme.palette.grey[100],
                },
                "&.Mui-selected": {
                  backgroundColor: selectedRowBackground,
                  "&:hover": {
                    backgroundColor: selectedRowHoverBackground,
                  },
                },
              },
            },
            flex: 1,
          };

          if (!customSx) return baseSx;

          const evaluatedCustomSx =
            typeof customSx === "function" ? customSx(theme) : customSx;

          const merged = { ...baseSx, ...evaluatedCustomSx };

          // Merge nested styling to prevent overwriting base classes
          if (evaluatedCustomSx["& .MuiDataGrid-row"]) {
            merged["& .MuiDataGrid-row"] = {
              ...baseSx["& .MuiDataGrid-row"],
              ...evaluatedCustomSx["& .MuiDataGrid-row"],
            };
          }
          if (evaluatedCustomSx["& .MuiDataGrid-cell"]) {
            merged["& .MuiDataGrid-cell"] = {
              ...baseSx["& .MuiDataGrid-cell"],
              ...evaluatedCustomSx["& .MuiDataGrid-cell"],
            };
          }
          if (evaluatedCustomSx["& .MuiDataGrid-virtualScroller"]) {
            merged["& .MuiDataGrid-virtualScroller"] = {
              ...baseSx["& .MuiDataGrid-virtualScroller"],
              ...evaluatedCustomSx["& .MuiDataGrid-virtualScroller"],
            };
          }

          return merged;
        }}
        {...props}
      />
    </Paper>
  );
};

export default BSDataGridClient;
