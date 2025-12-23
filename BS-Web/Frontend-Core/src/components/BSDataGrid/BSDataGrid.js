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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  FormControl,
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
  InputAdornment,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Avatar,
  AvatarGroup,
  useTheme,
} from "@mui/material";
import {
  DataGridPro,
  gridClasses,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridRowModes,
  GridRowEditStopReasons,
  useGridApiRef,
  gridFilteredSortedRowIdsSelector,
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
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  AttachFile as AttachFileIcon,
} from "@mui/icons-material";
import { useDynamicCrud } from "../../hooks/useDynamicCrud";
import { getSchemaFromPreObj } from "../../utils/SchemaMapping";
import { useAuth } from "../../contexts/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import * as XLSX from "xlsx";
import { useResource } from "../../hooks/useResource";
import { getLocaleText } from "./locales";
import Logger from "../../utils/logger";
import { formatDate } from "../../utils/dateUtils";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  DATE_FORMAT,
  DATETIME_FORMAT,
  USE_24_HOUR,
} from "../../config/dateConfig";
import muiLicenseManager from "../../utils/muiLicenseManager";
import BSAlertSwal2 from "../BSAlertSwal2";
import BSChildDataGrid from "./BSChildDataGrid";
import BSFileUploadDialog from "../BSFileUploadDialog";
import { BSSwitchField } from "../BSSwitch";
import BSSaveOutlinedButton from "../Button/BSSaveOutlinedButton";
import BSCloseOutlinedButton from "../Button/BSCloseOutlinedButton";

// BSDataGrid verbose logging (disabled by default)
// Enable by setting REACT_APP_BSDATAGRID_VERBOSE_LOG=true and rebuilding the frontend.
const BSDATAGRID_VERBOSE_LOG =
  process.env.REACT_APP_BSDATAGRID_VERBOSE_LOG === "true";
const bsLog = (...args) => {
  if (BSDATAGRID_VERBOSE_LOG) {
    Logger.log(...args);
  }
};

// Initialize MUI X License
muiLicenseManager.initialize();

// Check license status
const licenseStatus = muiLicenseManager.getLicenseStatus();
if (!licenseStatus.hasLicenseKey) {
  Logger.warn("⚠️ MUI X Pro license not found - some features may be limited");
}

/**
 * Generate Avatar props from a name string
 * Creates background color based on name hash and extracts initials
 * Reference: https://mui.com/material-ui/react-avatar/
 *
 * @param {string} name - Full name (e.g., "John Doe")
 * @returns {object} - Avatar props { sx: { bgcolor }, children: initials }
 */
const stringAvatar = (name) => {
  if (!name || typeof name !== "string") {
    return {
      sx: { bgcolor: "#bdbdbd", width: 32, height: 32, fontSize: "0.875rem" },
      children: "?",
    };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      sx: { bgcolor: "#bdbdbd", width: 32, height: 32, fontSize: "0.875rem" },
      children: "?",
    };
  }

  // Generate color from name hash
  const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  };

  // Extract initials (max 2 characters)
  const nameParts = trimmedName.split(" ").filter((part) => part.length > 0);
  let initials;
  if (nameParts.length >= 2) {
    initials = `${nameParts[0][0]}${
      nameParts[nameParts.length - 1][0]
    }`.toUpperCase();
  } else if (nameParts.length === 1) {
    initials = nameParts[0].substring(0, 2).toUpperCase();
  } else {
    initials = "?";
  }

  return {
    sx: {
      bgcolor: stringToColor(trimmedName),
      width: 32,
      height: 32,
      fontSize: "0.875rem",
    },
    children: initials,
  };
};

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
      label: `${localeText.bsBulkEdit} (${selectedRowCount})`,
      icon: <Edit />,
      action: onBulkEdit,
      color: "info",
      show: bsBulkEdit,
    },
    {
      label: `${localeText.bsBulkDelete} (${selectedRowCount})`,
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
    // Main button action: Inline Add (add row directly in grid)
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
        // sx={{
        //   "& .MuiButton-root": {
        //     textTransform: "none",
        //     fontWeight: 500,
        //     fontSize: "0.8125rem",
        //     minHeight: "32px",
        //   },
        // }}
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
          {localeText.bsAddRecord}
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
                  {/* <MenuListItem
                    onClick={() => handleMenuItemClick(onInlineAdd)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Add fontSize="small" />
                      {localeText.bsAddInline || "Add Inline"}
                    </Box>
                  </MenuListItem> */}
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

// Fallback Toolbar - สำหรับใช้เมื่อไม่มี DataGrid context (offline mode)
const FallbackToolbar = ({
  onAdd,
  showAdd = true,
  headerFiltersEnabled,
  onToggleHeaderFilters,
  onRefresh,
  localeText,
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
        {localeText.bsOfflineToolbar}
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
          {localeText.bsAddRecord}
        </Button>
      )}

      {/* Refresh button */}
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
        {headerFiltersEnabled
          ? localeText.bsHideFilters
          : localeText.bsShowFilters}
      </Button>

      <Box sx={{ flexGrow: 1 }} />

      {headerFiltersEnabled && (
        <Chip
          label={localeText.bsHeaderFiltersEnabled}
          size="small"
          color="primary"
          variant="filled"
        />
      )}
    </Box>
  );
};

// Bulk Edit Toolbar - แสดงเมื่อเปิด bulk edit mode
// NOTE: This component is currently not used as bulk edit toolbar is integrated into DynamicGridToolbar
// Keeping it commented out for potential future use
/*
const BulkEditToolbar = ({
  onSave,
  onDiscard,
  hasUnsavedChanges,
  formLoading,
  changesCount,
  localeText,
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
        {localeText.bsBulkEditMode}
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "warning.contrastText", flexGrow: 1 }}
      >
        {localeText.bsBulkEditMessage}
        {changesCount > 0 &&
          ` (${changesCount} ${localeText.bsUnsavedChanges})`}
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
        {localeText.bsDiscardAllChanges}
      </Button>

      <Button
        variant="contained"
        onClick={onSave}
        disabled={formLoading || !hasUnsavedChanges}
        startIcon={formLoading ? <CircularProgress size={16} /> : undefined}
        sx={{ bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
      >
        {formLoading ? localeText.bsSaving : localeText.bsSave}
      </Button>
    </Box>
  );
};
*/

// Custom Quick Filter - ค้นหาเมื่อกด Enter เท่านั้น
// รับ value และ onChange จาก props เพื่อเก็บ state ไว้ที่ parent component
const CustomQuickFilter = ({ apiRef, localeText, value = "", onChange }) => {
  const handleSearch = useCallback(() => {
    if (apiRef?.current) {
      apiRef.current.setQuickFilterValues(
        value ? value.split(" ").filter((word) => word) : []
      );
    }
  }, [apiRef, value]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleClear = useCallback(() => {
    onChange?.("");
    if (apiRef?.current) {
      apiRef.current.setQuickFilterValues([]);
    }
  }, [apiRef, onChange]);

  return (
    <TextField
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
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
        endAdornment: value ? (
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

// Custom Toolbar - ใช้ GridToolbarContainer (วิธีที่ถูกต้อง)
const DynamicGridToolbar = ({
  onAdd,
  onInlineAdd,
  showAdd = true,
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
  showBulkDelete = true,
  onRefresh,
  onExportExcel,
  onExportCsv,
  onPrint,
  localeText,
  apiRef,
  // Quick Filter props
  quickFilterValue = "",
  onQuickFilterChange,
  // Bulk Edit Mode props
  bulkEditMode = false,
  onBulkSave,
  onBulkDiscard,
  hasUnsavedChanges = false,
  formLoading = false,
  changesCount = 0,
}) => {
  // Debug: Log bulkEditMode and hasUnsavedChanges values
  bsLog("🔧 DynamicGridToolbar props:", {
    bulkEditMode,
    hasUnsavedChanges,
    changesCount,
    formLoading,
  });

  // Export menu state
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
      {/* Add Record Button - Split Button when bulk mode enabled, regular button otherwise */}
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
          {localeText.bsAddRecord}
        </Button>
      ) : null}

      {/* Bulk Edit/Delete Split Button - show only when rows are selected and checkbox is enabled */}
      {/* Controlled by bsShowBulkSplitButton prop (default: false) */}
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

      {/* Quick Filter - Right aligned (ค้นหาเมื่อกด Enter) */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Bulk Edit Mode Controls - Show when in bulk edit mode */}
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
            {localeText.bsBulkEditMode}
            {changesCount > 0 &&
              ` (${changesCount} ${localeText.bsUnsavedChanges})`}
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
            {localeText.bsDiscardAllChanges}
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={onBulkSave}
            disabled={formLoading || !hasUnsavedChanges}
            startIcon={formLoading ? <CircularProgress size={14} /> : undefined}
            sx={{
              bgcolor: "success.main",
              "&:hover": { bgcolor: "success.dark" },
              fontSize: "0.75rem",
              py: 0.25,
              px: 1,
              minHeight: 28,
            }}
          >
            {formLoading ? localeText.bsSaving : localeText.bsSave}
          </Button>
        </Box>
      ) : (
        <CustomQuickFilter
          apiRef={apiRef}
          localeText={localeText}
          value={quickFilterValue}
          onChange={onQuickFilterChange}
        />
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
          ? localeText.bsHideFilters
          : localeText.bsShowFilters}
      </Button>

      {/* Refresh button */}
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

      {/* Default MUI DataGrid Toolbar Components - Icon only */}
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

        {/* Custom Export Dropdown Button */}
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
  localeText,
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

        const result = await getComboBoxData(comboConfig);
        setOptions(result || []);
      } catch (error) {
        Logger.error("❌ Failed to load combobox options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.Obj,
    config.PreObj,
    config.Value,
    config.Display,
    config.ObjWh,
    config.ObjBy,
    config.ObjGrp,
  ]);

  // Auto-select if only one option available and current value is empty
  useEffect(() => {
    if (options.length === 1 && (!value || value === "" || value === 0)) {
      const singleOption = options[0];
      const valueData = singleOption.data || singleOption;
      const autoSelectValue = valueData[config.Value] || singleOption.value;

      onChange(autoSelectValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  // Build tooltip text
  const tooltipText = loading
    ? localeText?.bsLoadingOptions || "Loading options..."
    : description || "";

  const comboBoxContent = (
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

          const itemValue = valueData[config.Value] || option.value;
          // Prefer option.display (from API) over field lookup
          const itemDisplay =
            option.display || valueData[config.Display] || option.value;

          return (
            <MenuItem key={itemValue} value={itemValue}>
              {itemDisplay}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );

  // Wrap with Tooltip if there's tooltip text
  return tooltipText ? (
    <Tooltip title={tooltipText} arrow placement="top">
      {comboBoxContent}
    </Tooltip>
  ) : (
    comboBoxContent
  );
};

/**
 * BulkAddComboBoxField Component for Bulk Add Dialog
 * Simplified version of ComboBoxField for bulk add forms
 */
const BulkAddComboBoxField = ({
  columnName,
  config,
  value,
  onChange,
  required,
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
          valueField: config.Value,
          displayField: config.Display,
          customWhere: config.ObjWh || null,
          customOrderBy: config.ObjBy || null,
          groupBy: config.ObjGrp || null,
        };

        const result = await getComboBoxData(comboConfig);
        setOptions(result || []);
      } catch (error) {
        Logger.error("❌ Failed to load combobox options for bulk add:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.Obj,
    config.PreObj,
    config.Value,
    config.Display,
    config.ObjWh,
    config.ObjBy,
    config.ObjGrp,
  ]);

  return (
    <FormControl fullWidth size="small" required={required}>
      <InputLabel>
        {formatColumnName(columnName)}
        {required && <span style={{ color: "#d32f2f" }}> *</span>}
      </InputLabel>
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
          const valueData = option.data || option;
          const itemValue = valueData[config.Value] || option.value;
          // Prefer option.display (from API) over field lookup
          const itemDisplay =
            option.display || valueData[config.Display] || option.value;

          return (
            <MenuItem key={itemValue} value={itemValue}>
              {itemDisplay}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

/**
 * BSDataGrid - DataGrid ที่สร้างจาก metadata ของตารางอัตโนมัติ พร้อมรองรับ properties ครบครัน
 *
 * การใช้งานพื้นฐาน:
 * <BSDataGrid bsObj="t_wms_customer" />
 *
 * ===== Bulk Mode Configuration (NEW - Recommended) =====
 * รวม settings ทั้งหมดใน object เดียว ใช้งานง่ายกว่า:
 * <BSDataGrid
 *   bsObj="t_wms_customer"
 *   bsBulkMode={{
 *     enable: true,        // Enable all bulk operations (equivalent to bsEnableBulkMode)
 *     addInline: true,     // Add new rows inline instead of dialog (equivalent to bsBulkAddInline)
 *     edit: true,          // Enable bulk edit (equivalent to bsBulkEdit)
 *     delete: true,        // Enable bulk delete (equivalent to bsBulkDelete)
 *     add: true,           // Enable bulk add (equivalent to bsBulkAdd)
 *     showCheckbox: true,  // Show checkbox selection (equivalent to bsShowCheckbox)
 *     showSplitButton: false // Show split button for bulk actions (equivalent to bsShowBulkSplitButton)
 *   }}
 * />
 *
 * การใช้งานแบบเต็ม (Legacy props - still supported):
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
 * - type: "string" | "number" | "boolean" | "date" | "dateTime" | "singleSelect" | "currency" | "stringAvatar" | "attachFile"
 * - editable: boolean - Allow inline editing (default: true)
 * - readOnly: boolean - Disable editing in forms (default: false)
 * - required: boolean - Force required validation (overrides metadata)
 * - description: string - Tooltip text shown on hover in forms (alias: tooltip)
 * - tooltip: string - Tooltip text shown on hover in forms (alias: description)
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
 * StringAvatar (displays avatars from comma-separated names):
 * - maxAvatars: number (default: 4) - Maximum avatars to display before showing "+X"
 * - avatarSize: number (default: 32) - Avatar size in pixels
 * - showTooltip: boolean (default: true) - Show name tooltip on hover
 * - Example data: "John Doe,Jane Smith,Bob Johnson" -> displays 3 avatars
 * - Example usage:
 *     bsColumnDefs={[{ field: "assignee", type: "stringAvatar", maxAvatars: 3 }]}
 *
 * AttachFile (displays attach icon, opens file upload dialog on click):
 * - attachConfig: object - Configuration for file attachment
 *   - preObj: string - Schema prefix (e.g., "tmt")
 *   - attachTable: string (required) - Table to store attachments
 *   - foreignKey: string (required) - FK column linking to parent record
 *   - fileNameColumn: string (default: "file_name") - Column for file name
 *   - pathColumn: string (default: "path_file") - Column for file path
 *   - primaryKey: string (default: "id") - Primary key of attachment table
 *   - uploadEndpoint: string (default: "/api/files/upload") - Upload API endpoint
 *   - downloadEndpoint: string (default: "/api/files/download") - Download API endpoint
 *   - allowedTypes: string[] - Allowed file types (e.g., ["image/*", ".pdf", ".docx"])
 *   - maxFileSize: number (default: 10MB) - Maximum file size in bytes
 *   - maxFiles: number (default: 10) - Maximum number of files
 * - Example usage:
 *     bsColumnDefs={[{
 *       field: "attachments",
 *       type: "attachFile",
 *       headerName: "Files",
 *       width: 80,
 *       attachConfig: {
 *         preObj: "tmt",
 *         attachTable: "t_tmt_project_attach_file",
 *         foreignKey: "project_id",
 *         fileNameColumn: "file_name",
 *         pathColumn: "path_file",
 *         allowedTypes: ["image/*", ".pdf", ".doc", ".docx"],
 *         maxFileSize: 10 * 1024 * 1024,
 *         maxFiles: 5
 *       }
 *     }]}
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
 * @bsVisibleView Configuration:
 * - bsVisibleView={false} (default): Hide view button in actions column
 * - bsVisibleView={true}: Show view button in actions column
 *   * Requires onView callback to be provided
 *   * Button will trigger onView callback with the row data
 *   * Useful for read-only views or custom view dialogs
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
 *
 * @bsDialogSize Configuration:
 * - bsDialogSize="Default": Controls the size of the add/edit dialog
 *   * Available values:
 *     - "Small": Small dialog (sm - 600px max width)
 *     - "Default": Default medium size (md - 900px max width)
 *     - "Large": Large dialog (lg - 1200px max width)
 *     - "FullScreen": Full screen dialog
 *   * Example: <BSDataGrid bsDialogSize="Large" />
 *
 * @bsDialogTab Configuration:
 * - bsDialogTab: Organize form fields into tabs within the dialog
 *   * Structure: Array of tab configurations
 *   * Each tab contains:
 *     - Column: Comma-separated list of column names to include in this tab
 *     - name: Display name for the tab
 *   * Fields not assigned to any tab will appear in an "Other" tab
 *   * Example:
 *     ```jsx
 *     bsDialogTab={[
 *       {
 *         Tabs: [
 *           { Tab: { Column: "name,email,phone", name: "General Info" } },
 *           { Tab: { Column: "address,city,country", name: "Address" } },
 *           { Tab: { Column: "notes,description", name: "Additional" } }
 *         ]
 *       }
 *     ]}
 *     ```
 *   * Alternative simple format:
 *     ```jsx
 *     bsDialogTab={[
 *       { Column: "name,email,phone", name: "General Info" },
 *       { Column: "address,city,country", name: "Address" }
 *     ]}
 *     ```
 *
 * @bsDialogColumns Configuration:
 * - bsDialogColumns: Number of columns per row in the dialog form (default: 3)
 *   * Valid values: 1, 2, 3, 4, 6, or 12 (must be a divisor of 12 for MUI Grid)
 *   * 1 = Full width (1 field per row)
 *   * 2 = Half width (2 fields per row)
 *   * 3 = One-third width (3 fields per row) - Default
 *   * 4 = Quarter width (4 fields per row)
 *   * 6 = One-sixth width (6 fields per row)
 *   * 12 = Smallest width (12 fields per row)
 *   * Example: <BSDataGrid bsDialogColumns={2} /> - Shows 2 fields per row
 *
 * @bsChildGrids Configuration (Hierarchical Data):
 * - bsChildGrids: Array of child grid configurations for master-detail relationships
 *   * Enables hierarchical data editing within a single dialog
 *   * Parent form appears in an Accordion, child grids appear in Tabs below
 *   * Child grids are hidden during Add mode until parent record is saved
 *   * Each child grid configuration supports all BSDataGrid props plus:
 *     - name: Tab display name (required)
 *     - foreignKeys: Array of FK column names linking to parent (required)
 *   * Example:
 *     ```jsx
 *     bsChildGrids={[
 *       {
 *         name: "Documents",
 *         bsPreObj: "tmt",
 *         bsObj: "t_tmt_iso_type_doc",
 *         foreignKeys: ["iso_type_id"],
 *         bsObjBy: "create_date desc",
 *         bsVisibleEdit: true,
 *         bsVisibleDelete: true,
 *         height: 350,
 *       },
 *       {
 *         name: "Phases",
 *         bsPreObj: "tmt",
 *         bsObj: "t_tmt_iso_type_phase",
 *         foreignKeys: ["iso_type_id"],
 *         bsObjBy: "phase_order asc",
 *       }
 *     ]}
 *     ```
 *
 * @bsParentRecordLabel Configuration (Hierarchical Data):
 * - bsParentRecordLabel: Custom label for the parent record accordion header
 *   * Overrides the default "Parent Record" text
 *   * Supports resource key lookup (prefix with "resource:" for resource-based text)
 *   * Examples:
 *     - Direct text: bsParentRecordLabel="ข้อมูลหลัก"
 *     - Resource key: bsParentRecordLabel="resource:bsParentRecordLabel"
 *   * Default: localeText.bsParentRecord or "Parent Record"
 *
 * @bsPrimaryKeys Configuration (Hierarchical Data):
 * - bsPrimaryKeys: Array of primary key column names for the parent table
 *   * Required when using bsChildGrids
 *   * Used to pass parent PK values to child grids for FK filtering
 *   * Example: bsPrimaryKeys={["iso_type_id"]}
 *
 * @bsDefaultFormValues Configuration:
 * - bsDefaultFormValues: Object with default values for new records
 *   * Used internally by child grids to pre-populate FK values
 *   * Can also be used to set default values for any field
 *   * Example: bsDefaultFormValues={{ status: "active", priority: 1 }}
 *
 * @bsHiddenColumns Configuration:
 * - bsHiddenColumns: Array of column names to hide from both grid and form
 *   * Used internally by child grids to hide FK columns
 *   * FK columns are auto-populated so users don't need to see/edit them
 *   * Example: bsHiddenColumns={["iso_type_id", "parent_id"]}
 *
 * @bsAutoPermission Configuration:
 * - bsAutoPermission={false} (default): Permission must be set manually via showAdd, bsVisibleEdit, etc.
 * - bsAutoPermission={true}: Auto-apply permissions from menu settings
 *   * Reads permissions from SecureStorage based on current route path
 *   * Overrides showAdd, bsVisibleEdit, bsVisibleDelete, bsVisibleView based on canAdd, canEdit, canDelete, canView
 *   * Menu permissions are set via AssignMenu page for each user group
 *   * Example: <BSDataGrid bsAutoPermission={true} />
 *   * Benefits:
 *     - No need to manually set permission props in each page
 *     - Centralized permission management through menu settings
 *     - Automatic permission enforcement based on user role
 *   * Note: Props are AND-combined with permissions (e.g., bsVisibleEdit={false} will hide edit even if canEdit=true)
 *
 * Hierarchical Data Usage Example:
 * ```jsx
 * <BSDataGrid
 *   bsPreObj="tmt"
 *   bsObj="t_tmt_iso_type"
 *   bsPrimaryKeys={["iso_type_id"]}
 *   bsChildGrids={[
 *     {
 *       name: "Documents",
 *       bsPreObj: "tmt",
 *       bsObj: "t_tmt_iso_type_doc",
 *       foreignKeys: ["iso_type_id"],
 *     },
 *     {
 *       name: "Phases",
 *       bsPreObj: "tmt",
 *       bsObj: "t_tmt_iso_type_phase",
 *       foreignKeys: ["iso_type_id"],
 *     }
 *   ]}
 *   bsDialogSize="Large"
 * />
 * ```
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
      bsShowBulkSplitButton = false, // Show Bulk Split Button (Edit/Delete dropdown)

      // ===== NEW: Consolidated Bulk Mode Configuration =====
      // bsBulkMode={{ enable: true, addInline: true, edit: true, delete: true, add: true, showCheckbox: true, showSplitButton: false }}
      // This consolidates all bulk mode settings into a single object prop
      // Individual props above are kept for backward compatibility
      bsBulkMode = null,
      bsShowDescColumn = true,
      bsShowRowNumber = true, // Show row number column
      bsVisibleView = false, // Show view button (requires onView callback)
      bsVisibleEdit = true, // Show edit button
      bsVisibleDelete = true, // Show delete button
      bsPinColsLeft,
      bsPinColsRight,
      bsRowPerPage = 20,
      bsComboBox = [],
      bsFilterMode = "server", // "server" | "client"
      bsShowCharacterCount = false, // Show character count in helper text
      bsColumnDefs = [], // Custom column definitions (overrides metadata)
      bsKeyId, // Manual primary key specification (fallback if metadata unavailable)
      bsCustomFilters = [], // Custom filters from BSFilterCustom component
      bsExportFileName, // Custom filename for export (default: table name)

      // Row-level configuration function
      // bsRowConfig={(row) => ({ showCheckbox: true, showEdit: true, showDelete: true, backgroundColor: null, textColor: null, disabled: false })}
      bsRowConfig, // Function to configure each row dynamically

      // Enhanced Stored Procedure support
      bsStoredProcedure, // Enhanced stored procedure name
      bsStoredProcedureSchema = "dbo", // Schema for stored procedure
      bsStoredProcedureParams = {}, // Additional parameters for stored procedure
      bsStoredProcedureCrud = false, // Use stored procedure for CRUD operations (INSERT/UPDATE/DELETE)

      // User lookup configuration for audit fields
      bsUserLookup, // User lookup configuration: { table: "sec.t_com_user", idField: "user_id", displayFields: ["first_name", "last_name"], separator: " " }

      // Dialog configuration
      bsDialogSize = "Default", // Dialog size: "Small" | "Default" | "Large" | "FullScreen"
      bsDialogTab, // Tab configuration for form fields: [{ Tabs: [{ Tab: { Column: "col1,col2", name: "Tab Name" } }] }]
      bsDialogColumns = 4, // Number of columns per row in dialog form: 1, 2, 3, 4, 6, or 12

      // Hierarchical Data configuration
      bsChildGrids = [], // Child grid configurations: [{ name: "Tab Name", bsPreObj, bsObj, foreignKeys: ["fk_col"], ...gridProps }]
      bsPrimaryKeys = [], // Primary key column names for parent record (used for child grid FK linking)
      bsDefaultFormValues = {}, // Default values for new records (used by child grids for FK values)
      bsHiddenColumns = [], // Columns to hide from both grid and form (used by child grids to hide FK columns)
      bsParentRecordLabel, // Custom label for parent record accordion (supports "resource:key" format)

      // Unique field validation
      bsUniqueFields = [], // Fields that must be unique: ["field_name"] or [{ field: "field_name", message: "Custom error" }]

      // Permission configuration
      bsAutoPermission = false, // Auto-apply permissions from menu settings (canView, canAdd, canEdit, canDelete)

      onCheckBoxSelected,

      // Data binding callback
      onDataBind, // Callback to receive loaded data for external processing
      onFilteredDataChange, // Callback to receive filtered/visible data for summary calculations
      bsPageSizeOptions = [20, 100, 200, 500, 1000],
      ...props
    },
    ref
  ) => {
    // Get theme for icon colors
    const theme = useTheme();

    // Determine effective table name (bsObj takes priority over tableName)
    const effectiveTableName = bsObj || tableName;

    // ===== Consolidated Bulk Mode Configuration =====
    // Support both new bsBulkMode object and legacy individual props
    // bsBulkMode takes priority over individual props when specified
    const bulkModeConfig = bsBulkMode || {};

    // Merge bsBulkMode with individual props (bsBulkMode takes priority)
    const resolvedBulkEnable = bulkModeConfig.enable ?? bsEnableBulkMode;
    const resolvedBulkEdit = bulkModeConfig.edit ?? bsBulkEdit;
    const resolvedBulkAdd = bulkModeConfig.add ?? bsBulkAdd;
    const resolvedBulkDelete = bulkModeConfig.delete ?? bsBulkDelete;
    const resolvedBulkAddInline = bulkModeConfig.addInline ?? bsBulkAddInline;
    const resolvedShowCheckbox = bulkModeConfig.showCheckbox ?? bsShowCheckbox;
    const resolvedShowSplitButton =
      bulkModeConfig.showSplitButton ?? bsShowBulkSplitButton;

    // Determine effective bulk mode settings
    // When enable is true, enable all bulk operations by default
    const effectiveBulkAdd = resolvedBulkEnable || resolvedBulkAdd;
    const effectiveBulkEdit = resolvedBulkEnable || resolvedBulkEdit;
    const effectiveBulkDelete = resolvedBulkEnable || resolvedBulkDelete;
    const effectiveBulkAddInline = resolvedBulkAddInline;
    const effectiveShowCheckbox = resolvedShowCheckbox;
    const effectiveShowSplitButton = resolvedShowSplitButton;

    // Get permissions from menu settings (when bsAutoPermission is enabled)
    const permissions = usePermission();

    // Determine effective permission-based visibility settings
    // When bsAutoPermission is true, use permissions from menu
    // Otherwise, use the props directly
    const effectiveShowAdd = bsAutoPermission
      ? permissions.canAdd && showAdd
      : showAdd;
    const effectiveVisibleEdit = bsAutoPermission
      ? permissions.canEdit && bsVisibleEdit
      : bsVisibleEdit;
    const effectiveVisibleDelete = bsAutoPermission
      ? permissions.canDelete && bsVisibleDelete
      : bsVisibleDelete;
    const effectiveVisibleView = bsAutoPermission
      ? permissions.canView && bsVisibleView
      : bsVisibleView;

    // Log permission status when bsAutoPermission is enabled
    if (bsAutoPermission) {
      bsLog("🔐 BSDataGrid: Auto Permission enabled", {
        currentPath: permissions.currentPath,
        canView: permissions.canView,
        canAdd: permissions.canAdd,
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
        effectiveShowAdd,
        effectiveVisibleEdit,
        effectiveVisibleDelete,
        effectiveVisibleView,
      });
    }

    // Parse BS-specific configurations
    const parsedCols = useMemo(() => {
      if (!bsCols) {
        return null;
      }

      const cols = bsCols
        .split(",")
        .map((col) => col.trim())
        .filter(Boolean);

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
    // Supports both array format: [{ field: "name", ... }]
    // and object format: { name: { ... }, age: { ... } }
    const columnDefsConfig = useMemo(() => {
      const config = {};
      if (Array.isArray(bsColumnDefs) && bsColumnDefs.length > 0) {
        bsColumnDefs.forEach((colDef) => {
          if (colDef.field) {
            config[colDef.field] = colDef;
          }
        });
      } else if (bsColumnDefs && typeof bsColumnDefs === "object") {
        // Object format: { fieldName: { headerName, width, ... } }
        Object.entries(bsColumnDefs).forEach(([field, colDef]) => {
          config[field] = { field, ...colDef };
        });
      }
      return config;
    }, [bsColumnDefs]);

    // Build columnVisibilityModel from bsColumnDefs (hide: true)
    // CRITICAL: Create a stable key to track when visibility actually changes
    // Supports both array and object formats
    const initialColumnVisibilityKey = useMemo(() => {
      let hiddenFields = [];
      if (Array.isArray(bsColumnDefs) && bsColumnDefs.length > 0) {
        hiddenFields = bsColumnDefs
          .filter((col) => col.field && col.hide === true)
          .map((col) => col.field);
      } else if (bsColumnDefs && typeof bsColumnDefs === "object") {
        hiddenFields = Object.entries(bsColumnDefs)
          .filter(([, colDef]) => colDef.hide === true)
          .map(([field]) => field);
      }
      return hiddenFields.sort().join(",");
    }, [bsColumnDefs]);

    const initialColumnVisibility = useMemo(() => {
      const visibility = {};
      if (Array.isArray(bsColumnDefs) && bsColumnDefs.length > 0) {
        bsColumnDefs.forEach((colDef) => {
          if (colDef.field && colDef.hide === true) {
            visibility[colDef.field] = false;
          }
        });
      } else if (bsColumnDefs && typeof bsColumnDefs === "object") {
        Object.entries(bsColumnDefs).forEach(([field, colDef]) => {
          if (colDef.hide === true) {
            visibility[field] = false;
          }
        });
      }
      return visibility;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialColumnVisibilityKey]);

    // State for column visibility (allow user to toggle)
    const [columnVisibilityModel, setColumnVisibilityModel] = useState(
      initialColumnVisibility
    );

    // CRITICAL: Track the last applied visibility key to prevent infinite loops
    const lastVisibilityKeyRef = useRef(initialColumnVisibilityKey);

    // Update column visibility ONLY when the actual hidden fields change
    useEffect(() => {
      // Only update if the visibility key has actually changed
      if (lastVisibilityKeyRef.current !== initialColumnVisibilityKey) {
        lastVisibilityKeyRef.current = initialColumnVisibilityKey;
        setColumnVisibilityModel((prev) => ({
          ...prev,
          ...initialColumnVisibility,
        }));
      }
    }, [initialColumnVisibilityKey, initialColumnVisibility]);

    // Parse bsDialogSize to MUI Dialog maxWidth
    const dialogMaxWidth = useMemo(() => {
      switch (bsDialogSize?.toLowerCase()) {
        case "small":
          return "sm";
        case "large":
          return "lg";
        case "fullscreen":
          return "xl"; // Will also use fullScreen prop
        case "default":
        default:
          return "md";
      }
    }, [bsDialogSize]);

    // Check if dialog should be fullscreen
    const isDialogFullScreen = useMemo(() => {
      return bsDialogSize?.toLowerCase() === "fullscreen";
    }, [bsDialogSize]);

    // Calculate Grid sizes based on bsDialogColumns
    // MUI v7 Grid uses "size" prop instead of xs/sm/md
    const dialogGridSize = useMemo(() => {
      // Ensure columns is a valid divisor of 12
      const validColumns = [1, 2, 3, 4, 6, 12];
      const cols = validColumns.includes(bsDialogColumns) ? bsDialogColumns : 3;
      const size = 12 / cols;

      return size;
    }, [bsDialogColumns]);

    // Parse bsDialogTab configuration
    const parsedDialogTabs = useMemo(() => {
      if (
        !bsDialogTab ||
        !Array.isArray(bsDialogTab) ||
        bsDialogTab.length === 0
      ) {
        return null;
      }

      try {
        // Handle different tab configuration formats
        const tabs = [];

        bsDialogTab.forEach((tabConfig) => {
          if (tabConfig.Tabs && Array.isArray(tabConfig.Tabs)) {
            // Format: [{ Tabs: [{ Tab: { Column: "...", name: "..." } }] }]
            tabConfig.Tabs.forEach((tabItem) => {
              if (tabItem.Tab) {
                const columns = tabItem.Tab.Column
                  ? tabItem.Tab.Column.split(",")
                      .map((c) => c.trim())
                      .filter(Boolean)
                  : [];
                tabs.push({
                  name: tabItem.Tab.name || `Tab ${tabs.length + 1}`,
                  columns: columns,
                });
              } else if (tabItem.Column && tabItem.name) {
                // Alternate format: [{ Tabs: [{ Column: "...", name: "..." }] }]
                const columns = tabItem.Column.split(",")
                  .map((c) => c.trim())
                  .filter(Boolean);
                tabs.push({
                  name: tabItem.name,
                  columns: columns,
                });
              }
            });
          } else if (tabConfig.Column && tabConfig.name) {
            // Simple format: [{ Column: "...", name: "..." }]
            const columns = tabConfig.Column.split(",")
              .map((c) => c.trim())
              .filter(Boolean);
            tabs.push({
              name: tabConfig.name,
              columns: columns,
            });
          }
        });

        if (tabs.length === 0) {
          return null;
        }

        return tabs;
      } catch (error) {
        Logger.error("❌ Error parsing bsDialogTab:", error);
        return null;
      }
    }, [bsDialogTab]);

    // State for active tab in dialog
    const [activeDialogTab, setActiveDialogTab] = useState(0);

    // Reset active tab when dialog opens
    const handleDialogTabChange = useCallback((event, newValue) => {
      setActiveDialogTab(newValue);
    }, []);

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

    // Helper: Get userId from user object (handles both string and object format)
    const getUserId = useCallback(() => {
      if (!user) {
        Logger.warn("⚠️ No user object available, defaulting to 'system'");
        return "system";
      }

      try {
        // Parse user if it's a string
        const userObj = typeof user === "string" ? JSON.parse(user) : user;

        // Try different possible userId field names
        const userId =
          userObj?.UserId ||
          userObj?.userid ||
          userObj?.user_id ||
          userObj?.id ||
          userObj?.Id ||
          "system";

        return userId;
      } catch (e) {
        Logger.error("❌ Failed to parse user object:", e);
        return "system";
      }
    }, [user]);

    // Helper: Custom date formatter for consistent dd/MM/yyyy format
    // Uses shared dateUtils for consistent formatting across application
    const formatDateCustom = useCallback(
      (date, includeTime = false, effectiveLocale) => {
        return formatDate(date, { includeTime, locale: effectiveLocale });
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
      getComboBoxData,
    } = useDynamicCrud(effectiveTableName);

    // Enhanced SP metadata override
    const [enhancedMetadata, setEnhancedMetadata] = useState(null);

    // Use Enhanced SP metadata if available, otherwise use original metadata
    const metadata = enhancedMetadata || originalMetadata;

    // Helper: Convert camelCase to PascalCase for SP parameter names
    const toPascalCase = useCallback((str) => {
      if (!str) return str;
      // Handle snake_case: project_task_id -> ProjectTaskId
      if (str.includes("_")) {
        return str
          .split("_")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join("");
      }
      // Handle camelCase: projectTaskId -> ProjectTaskId
      return str.charAt(0).toUpperCase() + str.slice(1);
    }, []);

    // Helper: Execute CRUD operation via Stored Procedure
    const executeSpCrud = useCallback(
      async (operation, data, primaryKeyValue = null) => {
        if (!bsStoredProcedure || !executeEnhancedStoredProcedure) {
          throw new Error(
            "Stored procedure not configured for CRUD operations"
          );
        }

        // Start with additional stored procedure params (e.g., ProjectTaskId, ProjectHeaderId)
        // These have lower priority and will be overwritten by actual data
        const spParams = {};
        if (bsStoredProcedureParams) {
          Object.entries(bsStoredProcedureParams).forEach(([key, value]) => {
            if (value != null) {
              spParams[key] = value;
            }
          });
        }

        // Convert data keys to PascalCase for SP parameters
        // This overwrites any params with same name from bsStoredProcedureParams
        Object.entries(data).forEach(([key, value]) => {
          const pascalKey = toPascalCase(key);
          spParams[pascalKey] = value;
        });

        // Add primary key for UPDATE/DELETE
        // Priority: bsKeyId > metadata.primaryKeys > auto-detect from data
        if (primaryKeyValue != null) {
          let primaryKeyName = bsKeyId || metadata?.primaryKeys?.[0];

          // If no primary key found, try to detect from data keys
          if (!primaryKeyName && data && Object.keys(data).length > 0) {
            const dataKeys = Object.keys(data);
            primaryKeyName = dataKeys.find(
              (k) => k.toLowerCase().endsWith("_id") || k.toLowerCase() === "id"
            );
          }

          // Fallback: use common patterns for SP primary key parameter
          if (!primaryKeyName) {
            // For DELETE operation with primaryKeyValue, we need to find a matching key
            // Common patterns: project_task_member_id, Id, etc.
            primaryKeyName = "Id"; // Default fallback
            bsLog(`⚠️ No primary key found, using fallback: ${primaryKeyName}`);
          }

          const pascalPrimaryKey = toPascalCase(primaryKeyName);
          spParams[pascalPrimaryKey] = primaryKeyValue;
          bsLog(
            `🔑 Added primary key param: ${pascalPrimaryKey} = ${primaryKeyValue}`
          );
        }

        // Add LoginUserId for audit (only if not already set)
        if (!spParams.LoginUserId) {
          spParams.LoginUserId = getUserId();
        }

        bsLog(`📤 SP CRUD ${operation}:`, {
          procedureName: bsStoredProcedure,
          operation,
          spParams,
        });

        const request = {
          procedureName: bsStoredProcedure,
          schemaName: bsStoredProcedureSchema,
          operation: operation, // INSERT, UPDATE, DELETE
          parameters: spParams,
          userId: getUserId(),
        };

        const result = await executeEnhancedStoredProcedure(request);

        if (!result.success) {
          throw new Error(
            result.message || `Failed to ${operation.toLowerCase()} record`
          );
        }

        bsLog(`✅ SP CRUD ${operation} success:`, result);
        return result;
      },
      [
        bsStoredProcedure,
        bsStoredProcedureSchema,
        bsStoredProcedureParams,
        executeEnhancedStoredProcedure,
        metadata?.primaryKeys,
        toPascalCase,
        getUserId,
        bsKeyId,
      ]
    );

    // DataGrid state
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [headerFiltersEnabled, setHeaderFiltersEnabled] = useState(false);
    const [quickFilterInputValue, setQuickFilterInputValue] = useState("");

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
        new Set(baseOptions.map((v) => Number(v)))
      )
        .filter((v) => !Number.isNaN(v))
        .sort((a, b) => a - b);

      return numericOptions;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bsPageSizeOptions, paginationModel?.pageSize, bsRowPerPage]);

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
    const isBulkSavingRef = React.useRef(false); // Track if bulk save is in progress
    const isDiscardingRef = React.useRef(false); // Track if discard is in progress
    const savedRowIdsRef = React.useRef(new Set()); // Track rows already saved in bulk save to prevent double-save
    const isLoadingDataRef = React.useRef(false); // Track if data is currently being loaded to prevent duplicate calls

    // Inline Bulk Add states
    const [rowModesModel, setRowModesModel] = useState({});
    const newRowIdCounter = useRef(0);

    // Hierarchical Data states
    const [isParentSaved, setIsParentSaved] = useState(false); // Track if parent record is saved (for child grids)
    const [activeChildTab, setActiveChildTab] = useState(0); // Active child grid tab index
    const [parentAccordionExpanded, setParentAccordionExpanded] =
      useState(true); // Parent form accordion state
    const [savedParentKeyValues, setSavedParentKeyValues] = useState({}); // Saved parent PK values for child grids
    const childGridRefs = useRef({}); // Refs for child grid components

    // AttachFile Dialog states
    const [attachFileDialogOpen, setAttachFileDialogOpen] = useState(false);
    const [attachFileRowData, setAttachFileRowData] = useState(null);
    const [attachFileConfig, setAttachFileConfig] = useState(null);

    // API ref for accessing DataGrid internal state (filtered rows, etc.)
    const apiRef = useGridApiRef();


    // ComboBox Lookup Data state - stores fetched data from combobox configs for display in grid
    const [comboBoxLookupData, setComboBoxLookupData] = useState({});
    // ComboBox Value Options state - stores dropdown options for inline editing
    const [comboBoxValueOptions, setComboBoxValueOptions] = useState({});
    // ComboBox loading state - track if lookup data is being loaded
    // Initialize as true if there's combobox config to prevent showing raw values before loading
    const [comboBoxLoading, setComboBoxLoading] = useState(
      () => Array.isArray(bsComboBox) && bsComboBox.length > 0
    );
    
    // Refs to hold the latest values of comboBoxLookupData and comboBoxValueOptions
    // This solves the stale closure problem where renderComboBoxCell captures old values
    const comboBoxLookupDataRef = useRef(comboBoxLookupData);
    const comboBoxValueOptionsRef = useRef(comboBoxValueOptions);
    
    // Keep refs in sync with state
    useEffect(() => {
      comboBoxLookupDataRef.current = comboBoxLookupData;
    }, [comboBoxLookupData]);
    
    useEffect(() => {
      comboBoxValueOptionsRef.current = comboBoxValueOptions;
    }, [comboBoxValueOptions]);

    // Load ComboBox lookup data for grid display and editing
    useEffect(() => {
      console.log("🚀 ComboBox useEffect triggered:", {
        hasConfig: !!comboBoxConfig,
        configKeys: Object.keys(comboBoxConfig || {}),
        comboBoxConfigDetails: Object.entries(comboBoxConfig || {}).slice(0, 3),
      });
      
      const loadComboBoxLookupData = async () => {
        if (!comboBoxConfig || Object.keys(comboBoxConfig).length === 0) {
          console.log("⚠️ ComboBox useEffect: No config, skipping load");
          setComboBoxLoading(false);
          return;
        }

        console.log("📥 Starting combobox data fetch...");
        setComboBoxLoading(true);

        const lookupData = {};
        const valueOptionsData = {};

        for (const [columnName, config] of Object.entries(comboBoxConfig)) {
          try {
            const comboConfig = {
              tableName: config.Obj,
              schemaName: config.PreObj
                ? getSchemaFromPreObj(config.PreObj)
                : "tmt",
              valueField: config.Value,
              displayField: config.Display,
              customWhere: config.ObjWh || null,
              customOrderBy: config.ObjBy || null,
              groupBy: config.ObjGrp || null,
            };

            const result = await getComboBoxData(comboConfig);
            if (result && Array.isArray(result)) {
              // Create a lookup map: value -> display
              const lookupMap = {};
              // Create valueOptions array for dropdown editing
              const options = [];

              result.forEach((item) => {
                const valueData =
                  item.value !== undefined ? item : item.data || item;
                const itemValue = valueData[config.Value] || item.value;
                // Prefer valueData[config.Display] (direct field lookup), then item.display (from API format)
                const itemDisplay =
                  valueData[config.Display] ||
                  item.display ||
                  (item.data && item.data[config.Display]) ||
                  item.value;
                if (itemValue !== undefined) {
                  // Store with both original and string key for type mismatch handling
                  lookupMap[itemValue] = itemDisplay;
                  lookupMap[String(itemValue)] = itemDisplay;
                  options.push({ value: itemValue, label: itemDisplay });
                }
              });

              lookupData[columnName] = lookupMap;
              valueOptionsData[columnName] = options;

              bsLog(`✅ Loaded ComboBox lookup for ${columnName}:`, {
                count: Object.keys(lookupMap).length,
                sample: Object.entries(lookupMap).slice(0, 3),
                options: options.slice(0, 3),
              });
            }
          } catch (error) {
            Logger.error(
              `❌ Failed to load ComboBox lookup for ${columnName}:`,
              error
            );
          }
        }

        setComboBoxLookupData((prev) => {
          const prevKeys = Object.keys(prev || {});
          const newKeys = Object.keys(lookupData || {});
          const isSame =
            prevKeys.length === newKeys.length &&
            prevKeys.every((k) => prev[k] === lookupData[k]);
          return isSame ? prev : lookupData;
        });
        setComboBoxValueOptions((prev) => {
          const prevKeys = Object.keys(prev || {});
          const newKeys = Object.keys(valueOptionsData || {});
          const isSame =
            prevKeys.length === newKeys.length &&
            prevKeys.every(
              (k) =>
                JSON.stringify(prev[k]) === JSON.stringify(valueOptionsData[k])
            );
          console.log("🔽 Setting comboBoxValueOptions:", {
            keys: newKeys,
            totalOptions: Object.entries(valueOptionsData).map(([k, v]) => ({
              column: k,
              count: v?.length || 0,
            })),
            isSame,
          });
          return isSame ? prev : valueOptionsData;
        });
        setComboBoxLoading(false);
      };

      loadComboBoxLookupData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comboBoxConfig]);

    // Load resources for multi-language support when table or locale changes
    useEffect(() => {
      const loadResourceData = async () => {
        if (effectiveTableName || bsStoredProcedure) {
          const resourceGroup = bsStoredProcedure || effectiveTableName;
          const res = await getResources(resourceGroup);
          setResourceData((prev) => {
            try {
              if (JSON.stringify(prev) === JSON.stringify(res)) return prev;
            } catch (e) {
              // If stringify fails for any reason, fall through and update
            }
            return res;
          });
        }
      };
      loadResourceData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveTableName, bsStoredProcedure, bsLocale]);

    // Load metadata when table name changes or for Enhanced Stored Procedure
    useEffect(() => {
      if (autoLoad) {
        if (bsStoredProcedure) {
          // For Enhanced Stored Procedure, skip metadata loading - columns come from SP response
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
        return;
      }

      // For client-side filtering, reload data to apply filters
      if (bsFilterMode === "client" && hasLoadedRef.current) {
        loadDataRef.current();
      }
      // For server-side filtering, reload data with custom filters
      else if (bsFilterMode === "server" && hasLoadedRef.current) {
        loadDataRef.current();
      }
    }, [bsCustomFilters, bsFilterMode]);

    // Helper function to apply custom filters to rows (client-side)
    const applyCustomFilters = useCallback((data, customFilters) => {
      if (!customFilters || customFilters.length === 0) {
        return data;
      }

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
        if (!effectiveTableName || !metadata) {
          Logger.warn("⚠️ loadData skipped - missing requirements:", {
            effectiveTableName: !!effectiveTableName,
            metadata: !!metadata,
            forceRefresh,
          });
          return;
        }

        // Prevent duplicate concurrent loads (unless force refresh)
        if (isLoadingDataRef.current && !forceRefresh) {
          bsLog("⏳ Skipping duplicate load - already loading data");
          return;
        }

        isLoadingDataRef.current = true;
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

          // Always include primary key columns in the query for proper row identification
          // This ensures we have the actual primary key value for update/delete operations
          if (columnsForQuery && metadata?.primaryKeys) {
            metadata.primaryKeys.forEach((pk) => {
              if (!columnsForQuery.includes(pk)) {
                columnsForQuery.push(pk);
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
            // User lookup configuration for audit fields (optional until backend is ready)
            userLookup: bsUserLookup
              ? {
                  table: bsUserLookup.table || "sec.t_com_user",
                  idField: bsUserLookup.idField || "user_id",
                  displayFields: bsUserLookup.displayFields || [
                    "first_name",
                    "last_name",
                  ],
                  separator: bsUserLookup.separator || " ",
                }
              : undefined,
          };

          // Add cache buster for force refresh (like after bulk edit)
          if (forceRefresh) {
            request.cacheBuster = Date.now();
            request._forceRefresh = true; // Additional flag for backend
          }

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
            processedRows = applyCustomFilters(processedRows, bsCustomFilters);
          }

          setRows(processedRows);

          // If backend didn't provide a total rowCount (some table endpoints
          // may omit it), fall back to the number of rows we received so the
          // DataGrid can still render pagination controls (rows-per-page selector).
          // For large server-side datasets this should be provided by the API,
          // but this fallback prevents the selector from disappearing when
          // the API only returns the current page data.
          const effectiveRowCount =
            result.rowCount && result.rowCount > 0
              ? result.rowCount
              : processedRows.length || 0;
          setRowCount(effectiveRowCount);

          // Call onDataBind callback with the loaded data
          if (onDataBind && typeof onDataBind === "function") {
            try {
              onDataBind(processedRows);
            } catch (err) {
              Logger.error("❌ Error in onDataBind callback:", err);
            }
          }

          // Reset row selection when data changes to prevent stale references
          setRowSelectionModel([]);

          // Return processed rows for callers that need them (e.g., hierarchical data)
          return processedRows;
        } catch (err) {
          Logger.error("❌ Failed to load BS dynamic data:", err);
          setError(err.message || "Failed to load data");
          setRows([]);
          setRowCount(0);
          return [];
        } finally {
          setLoading(false);
          isLoadingDataRef.current = false;
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
        bsUserLookup,
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

        // Prevent duplicate concurrent loads (unless force refresh)
        if (isLoadingDataRef.current && !forceRefresh) {
          bsLog("⏳ Skipping duplicate load - already loading data");
          return;
        }

        isLoadingDataRef.current = true;
        setLoading(true);
        setError(null);

        try {
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
            // User lookup configuration for audit fields
            userLookup: bsUserLookup
              ? {
                  table: bsUserLookup.table || "sec.t_com_user",
                  idField: bsUserLookup.idField || "user_id",
                  displayFields: bsUserLookup.displayFields || [
                    "first_name",
                    "last_name",
                  ],
                  separator: bsUserLookup.separator || " ",
                }
              : undefined,
            userId: getUserId(),
          };

          const result = await executeEnhancedStoredProcedure(request);

          if (result.success) {
            // Determine primary key from metadata or bsKeyId
            const pkFromMetadata = result.metadata?.primaryKeys?.[0];
            const effectivePk = bsKeyId || pkFromMetadata;

            bsLog(
              "🔑 loadStoredProcedureData - effectivePk:",
              effectivePk,
              "bsKeyId:",
              bsKeyId,
              "pkFromMetadata:",
              pkFromMetadata
            );

            let processedRows = (result.data || []).map((row, index) => {
              // Use primary key value as id if available, else fallback
              const pkValue = effectivePk ? row[effectivePk] : null;
              const rowId = pkValue ?? row.id ?? row.ID ?? `sp_row_${index}`;

              bsLog("🔑 Row processing:", {
                effectivePk,
                pkValue,
                rowId,
                hasEffectivePkInRow: effectivePk ? effectivePk in row : "N/A",
                rowKeys: Object.keys(row),
              });

              return {
                ...row,
                id: rowId, // Ensure unique ID using primary key
              };
            });

            // Apply custom filters if in client-side mode
            if (
              bsFilterMode === "client" &&
              bsCustomFilters &&
              bsCustomFilters.length > 0
            ) {
              processedRows = applyCustomFilters(
                processedRows,
                bsCustomFilters
              );
            }

            bsLog("🔄 loadStoredProcedureData - Setting rows:", {
              count: processedRows.length,
              rowIds: processedRows.map((r) => ({
                id: r.id,
                pk: r[effectivePk],
                bsKeyId: bsKeyId,
              })),
            });

            setRows(processedRows);
            // For client-side mode: always use actual row count
            // For server-side mode: use rowCount from API
            setRowCount(
              bsFilterMode === "client"
                ? processedRows.length
                : result.rowCount || processedRows.length
            );

            // Call onDataBind callback with the loaded data
            if (onDataBind && typeof onDataBind === "function") {
              try {
                onDataBind(processedRows);
              } catch (err) {
                Logger.error(
                  "❌ Error in Enhanced SP onDataBind callback:",
                  err
                );
              }
            }

            // Extract metadata from Enhanced SP result (API returns as 'metadata' property)
            if (result.metadata) {
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
              }
            }
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
          isLoadingDataRef.current = false;
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
        getUserId,
        setEnhancedMetadata,
        bsFilterMode,
        onDataBind,
        bsKeyId,
        applyCustomFilters,
        bsCustomFilters,
        bsUserLookup,
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
        hasLoadedRef.current = true;
        loadDataRef.current();
        return;
      }

      // For regular tables, wait for metadata before loading
      if (!bsStoredProcedure && metadata && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadDataRef.current();
        return;
      }

      // Reset hasLoaded flag if table/SP changes
      if (isEnhancedSPRef.current !== !!bsStoredProcedure) {
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

      loadDataRef.current();
    }, [paginationModel, sortModel, filterModel, bsFilterMode]);

    // Track filtered/visible rows and notify parent component
    const notifyFilteredDataChange = useCallback(() => {
      if (!onFilteredDataChange || typeof onFilteredDataChange !== "function")
        return;
      if (!apiRef.current) return;
      if (rows.length === 0) return;

      try {
        // Use gridFilteredSortedRowIdsSelector to get only filtered row IDs
        const filteredRowIds = gridFilteredSortedRowIdsSelector(apiRef);

        // Get the actual row data for filtered rows
        const filteredRows = filteredRowIds
          .map((id) => apiRef.current.getRow(id))
          .filter((row) => row != null);

        onFilteredDataChange(filteredRows);
      } catch (error) {
        Logger.error("❌ Error getting filtered rows:", error);
        // Fallback to all rows if filtering fails
        onFilteredDataChange(rows);
      }
    }, [onFilteredDataChange, apiRef, rows]);

    // Notify on initial load and data changes
    useEffect(() => {
      if (rows.length === 0) return;

      const timer = setTimeout(() => {
        notifyFilteredDataChange();
      }, 150);

      return () => clearTimeout(timer);
    }, [rows, notifyFilteredDataChange]);

    // Handler for sort model changes
    const handleSortModelChange = useCallback((newSortModel) => {
      setSortModel(newSortModel);
    }, []);

    // Handler for filter model changes
    const handleFilterModelChange = useCallback(
      (newFilterModel) => {
        setFilterModel(newFilterModel);

        // Notify parent about filtered data after a short delay
        setTimeout(() => {
          notifyFilteredDataChange();
        }, 150);
      },
      [notifyFilteredDataChange]
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

        // bsLog("🌐 Format cell value with locale:", {
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
        // Exception: is_* fields (except is_active) should always show even with default values
        const isIsField =
          columnName.toLowerCase().startsWith("is_") &&
          columnName.toLowerCase() !== "is_active";
        if (
          (hasDefault || !!defaultValue) &&
          dialogMode === "add" &&
          !isIsField
        ) {
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
            return false;
          }

          // Skip generic ID field (case-insensitive) - common auto-generated field
          if (columnName.toLowerCase() === "id") {
            return false;
          }

          // Skip bsKeyId field if specified
          if (bsKeyId && columnName.toLowerCase() === bsKeyId.toLowerCase()) {
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
          //   bsLog(
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
            return false;
          }

          // Skip generic ID field (case-insensitive) - common auto-generated field
          if (columnName.toLowerCase() === "id") {
            return false;
          }

          // Skip bsKeyId field if specified
          if (bsKeyId && columnName.toLowerCase() === bsKeyId.toLowerCase()) {
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

    // Helper: Check if field is boolean type (is_active or any field starting with is_)
    const isActiveField = useCallback((columnName) => {
      if (!columnName) return false;
      const lowerName = columnName.toLowerCase();
      // Match is_active or any field starting with is_
      return lowerName === "is_active" || lowerName.startsWith("is_");
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

    // Helper: Format SQL error message to be user-friendly with collapsible details
    // Supports DELETE (FK constraint), INSERT (duplicate key, FK violation), UPDATE errors
    const formatSqlErrorMessage = useCallback(
      (errorMessage, operation = "save") => {
        // Get locale text for error messages
        const currentLocaleText = getLocaleText(getEffectiveLocale());

        // Check for FK constraint error on DELETE (with optional prefix like "Error deleting record: ")
        const fkDeleteMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?The DELETE statement conflicted with the REFERENCE constraint "([^"]+)".*table "([^"]+)".*column '([^']+)'/i
        );

        if (fkDeleteMatch) {
          const friendlyMessage =
            currentLocaleText.bsCannotDeleteReferenced ||
            "Cannot delete this record because it is being referenced by other data.";

          return {
            type: "fk_delete",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsDeleteError || "Delete Error",
          };
        }

        // Check for FK constraint error on INSERT/UPDATE
        const fkInsertMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?The INSERT statement conflicted with the FOREIGN KEY constraint "([^"]+)".*table "([^"]+)".*column '([^']+)'/i
        );

        if (fkInsertMatch) {
          const friendlyMessage =
            currentLocaleText.bsForeignKeyViolation ||
            "The referenced record does not exist. Please select a valid value.";

          return {
            type: "fk_insert",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsInsertError || "Insert Error",
          };
        }

        // Check for FK constraint error on UPDATE
        const fkUpdateMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?The UPDATE statement conflicted with the FOREIGN KEY constraint "([^"]+)".*table "([^"]+)".*column '([^']+)'/i
        );

        if (fkUpdateMatch) {
          const friendlyMessage =
            currentLocaleText.bsForeignKeyViolation ||
            "The referenced record does not exist. Please select a valid value.";

          return {
            type: "fk_update",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsUpdateError || "Update Error",
          };
        }

        // Check for duplicate key / unique constraint violation
        const duplicateKeyMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?(duplicate key|unique constraint|primary key violation|Cannot insert duplicate key|Violation of UNIQUE KEY constraint|Violation of PRIMARY KEY constraint)/i
        );

        if (duplicateKeyMatch) {
          const friendlyMessage =
            currentLocaleText.bsDuplicateKeyError ||
            "This record already exists. Please use a different value.";

          return {
            type: "duplicate_key",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsSaveError || "Save Error",
          };
        }

        // Check for NOT NULL constraint violation
        const notNullMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?Cannot insert the value NULL into column '([^']+)'/i
        );

        if (notNullMatch) {
          const columnName = notNullMatch[1];
          const friendlyMessage = (
            currentLocaleText.bsRequiredFieldError ||
            "Required field '{field}' cannot be empty."
          ).replace("{field}", columnName);

          return {
            type: "not_null",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsSaveError || "Save Error",
          };
        }

        // Check for data type/conversion errors
        const conversionMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?(Conversion failed|Error converting data type)/i
        );

        if (conversionMatch) {
          const friendlyMessage =
            currentLocaleText.bsDataTypeError ||
            "Invalid data format. Please check your input values.";

          return {
            type: "conversion",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsSaveError || "Save Error",
          };
        }

        // Check for string/binary data truncation
        const truncationMatch = errorMessage.match(
          /(?:Error\s+\w+\s+record:\s*)?(String or binary data would be truncated)/i
        );

        if (truncationMatch) {
          const friendlyMessage =
            currentLocaleText.bsDataTruncationError ||
            "Input value is too long. Please shorten your text.";

          return {
            type: "truncation",
            friendlyMessage,
            detailMessage: "",
            originalError: errorMessage,
            title: currentLocaleText.bsSaveError || "Save Error",
          };
        }

        // Default: determine title based on operation
        let defaultTitle = currentLocaleText.bsSaveError || "Save Error";
        if (operation === "delete") {
          defaultTitle = currentLocaleText.bsDeleteError || "Delete Error";
        } else if (operation === "insert") {
          defaultTitle = currentLocaleText.bsInsertError || "Insert Error";
        } else if (operation === "update") {
          defaultTitle = currentLocaleText.bsUpdateError || "Update Error";
        }

        return {
          type: "unknown",
          friendlyMessage: errorMessage,
          detailMessage: "",
          originalError: errorMessage,
          title: defaultTitle,
        };
      },
      [getEffectiveLocale]
    );

    // Helper: Show error with collapsible details (for INSERT, UPDATE, DELETE)
    const showErrorWithDetails = useCallback(
      (errorInfo) => {
        // Get locale text
        const currentLocaleText = getLocaleText(getEffectiveLocale());

        let htmlContent = `<p style="margin: 0 0 10px 0; font-size: 16px;">${errorInfo.friendlyMessage}</p>`;

        if (errorInfo.detailMessage) {
          htmlContent += `<p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">${errorInfo.detailMessage}</p>`;
        }

        // Add collapsible exception details
        htmlContent += `
          <details style="text-align: left; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
            <summary style="cursor: pointer; padding: 8px 12px; background: #f5f5f5; font-size: 13px; color: #666; user-select: none;">
              ${
                currentLocaleText.bsViewExceptionDetails ||
                "View Exception Details"
              }
            </summary>
            <div style="padding: 12px; background: #fafafa; font-size: 12px; font-family: monospace; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; color: #333;">
${errorInfo.originalError}
            </div>
          </details>
        `;

        BSAlertSwal2.fire({
          icon: "error",
          title: errorInfo.title,
          html: htmlContent,
          width: 500,
          confirmButtonText: currentLocaleText.bsOk || "OK",
        });
      },
      [getEffectiveLocale]
    );

    // Helper: Get effective primary key (from metadata or detected from data)
    const getEffectivePrimaryKey = useCallback(
      (rowData = null) => {
        // Priority 1: Manual bsKeyId specification (highest priority)
        if (bsKeyId) {
          // bsLog(
          //   "🔑 Using manually specified primary key (bsKeyId):",
          //   bsKeyId
          // );
          return bsKeyId;
        }

        // Priority 2: Metadata primary key
        if (metadata?.primaryKeys?.[0]) {
          // bsLog(
          //   "🔑 Using primary key from metadata:",
          //   metadata.primaryKeys[0]
          // );
          return metadata.primaryKeys[0];
        }

        // Priority 3: Auto-detect from data (for Enhanced SP)
        if (bsStoredProcedure && rowData) {
          const detected = detectPrimaryKeyFromData(rowData);
          // bsLog("🔑 Detected primary key from data:", detected);
          return detected;
        }

        // Priority 4: Fallback to common name
        // bsLog("🔑 Using fallback primary key: Id");
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

          return init;
        }

        // Regular metadata-based initialization
        if (!metadata?.columns) return {};
        const init = {};

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
            } else {
              // Special handling for is_active field - default to "YES" for new records
              if (isActiveField(c.columnName)) {
                init[c.columnName] = "YES"; // Default to active for new records
                return;
              }

              // For ComboBox fields, check if there's only 1 option - auto-select it
              // Otherwise default to empty string (will show "-- เลือก --" placeholder)
              const comboConfig = comboBoxConfig[c.columnName];
              if (comboConfig) {
                // Check if there's only 1 option in the combobox
                const options = comboBoxValueOptions[c.columnName] || [];
                if (options.length === 1) {
                  // Auto-select the only option
                  init[c.columnName] = options[0].value;
                  bsLog(`🎯 Auto-selected single option for ${c.columnName}:`, options[0].value);
                } else {
                  init[c.columnName] = ""; // Empty string matches the empty option in dropdown
                }
                return; // Skip default value assignment
              }

              // Handle other field types based on dataType
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
                  // Don't set default value for numeric fields - leave empty/null
                  // Setting 0 as default can cause incorrect data to be saved
                  init[c.columnName] = null;
                  break;
                case "bit":
                  init[c.columnName] = false;
                  break;
                case "datetime":
                case "datetime2":
                case "date":
                case "time":
                  // Don't set default value for date/time fields - leave empty/null
                  // User should explicitly select a date if needed
                  init[c.columnName] = null;
                  break;
                default:
                  init[c.columnName] = "";
              }
            }
          });

        // Apply default form values (used for FK values in child grids)
        if (
          bsDefaultFormValues &&
          Object.keys(bsDefaultFormValues).length > 0
        ) {
          Object.keys(bsDefaultFormValues).forEach((key) => {
            init[key] = bsDefaultFormValues[key];
          });
        }

        // Apply defaultValue from bsColumnDefs
        if (bsColumnDefs && Array.isArray(bsColumnDefs)) {
          bsColumnDefs.forEach((colDef) => {
            if (colDef.field && colDef.defaultValue !== undefined) {
              // Find matching field in init (case-insensitive)
              const matchingField = Object.keys(init).find(
                (key) => key.toLowerCase() === colDef.field.toLowerCase()
              );
              const fieldToUse = matchingField || colDef.field;

              // Only set if not already set by existing data or bsDefaultFormValues
              if (
                init[fieldToUse] === undefined ||
                init[fieldToUse] === null ||
                init[fieldToUse] === ""
              ) {
                init[fieldToUse] = colDef.defaultValue;
                bsLog(
                  `🎯 Applied defaultValue for ${fieldToUse}:`,
                  colDef.defaultValue
                );
              }
            }
          });
        }

        return init;
      },
      [
        metadata,
        isFieldInForm,
        isActiveField,
        comboBoxConfig,
        comboBoxValueOptions,
        bsStoredProcedure,
        detectPrimaryKeyFromData,
        bsDefaultFormValues,
        bsColumnDefs,
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
        BSAlertSwal2.show(
          "warning",
          `Offline mode: Cannot create form without metadata.\nPlease connect to backend server.`,
          { title: `Add Record for ${tableName}` }
        );
        return;
      }

      // For Enhanced SP without metadata AND without bsColumnDefs/bsCols, show warning
      // But if bsColumnDefs or bsCols is provided, allow Add even with no data
      const hasColumnDefinitions =
        (bsColumnDefs && bsColumnDefs.length > 0) ||
        (bsCols && bsCols.length > 0);
      if (
        !metadata &&
        bsStoredProcedure &&
        rows.length === 0 &&
        !hasColumnDefinitions
      ) {
        BSAlertSwal2.show(
          "warning",
          "No data available to generate form fields.\nPlease load data first or define bsColumnDefs or bsCols.",
          { title: "Add Record" }
        );
        return;
      }

      // Inline bulk add mode
      bsLog(
        "🔍 handleAddClick - effectiveBulkAddInline:",
        effectiveBulkAddInline
      );
      if (effectiveBulkAddInline) {
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

        // Enable bulk edit mode and mark as having unsaved changes
        // This enables the Save All / Discard All buttons on the toolbar
        bsLog("🔧 Setting bulkEditMode=true and hasUnsavedChanges=true");
        setBulkEditMode(true);
        setHasUnsavedChanges(true);

        bsLog("➕ New row added in inline mode:", { id, newRow });
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
      effectiveBulkAddInline,
      bsStoredProcedure,
      rows.length,
      bsColumnDefs,
      bsCols,
    ]);

    // Dialog Add - force open dialog mode (bypass effectiveBulkAddInline)
    // This is used by "Add by Dialog" menu option in AddRecordSplitButton
    const handleDialogAdd = useCallback(() => {
      if (onAdd) {
        onAdd();
        return;
      }

      // For offline mode without metadata AND no Enhanced SP data, show alert
      if (!metadata && !bsStoredProcedure) {
        BSAlertSwal2.show(
          "warning",
          `Offline mode: Cannot create form without metadata.\nPlease connect to backend server.`,
          { title: `Add Record for ${tableName}` }
        );
        return;
      }

      // For Enhanced SP without metadata AND without bsColumnDefs/bsCols, show warning
      const hasColumnDefinitions =
        (bsColumnDefs && bsColumnDefs.length > 0) ||
        (bsCols && bsCols.length > 0);
      if (
        !metadata &&
        bsStoredProcedure &&
        rows.length === 0 &&
        !hasColumnDefinitions
      ) {
        BSAlertSwal2.show(
          "warning",
          "No data available to generate form fields.\nPlease load data first or define bsColumnDefs or bsCols.",
          { title: "Add Record" }
        );
        return;
      }

      // Force dialog mode (ignore effectiveBulkAddInline)
      setDialogMode("add");
      setSelectedRow(null);
      setFormData(initializeFormData());
      setDialogOpen(true);
    }, [
      onAdd,
      initializeFormData,
      metadata,
      tableName,
      bsStoredProcedure,
      rows.length,
      bsColumnDefs,
      bsCols,
    ]);

    // Inline Add - add new row directly in grid for editing
    const handleInlineAdd = useCallback(() => {
      if (!metadata?.columns && !bsStoredProcedure) {
        Logger.warn("⚠️ Cannot add inline without metadata");
        return;
      }

      const id = `new-${newRowIdCounter.current++}`;
      const newRow = {
        id,
        ...initializeFormData(),
        isNew: true,
      };

      // Find first editable column from metadata (skip id, actions, row number columns)
      const metadataColumns = metadata?.columns || [];
      const editableColumns = metadataColumns.filter(
        (col) =>
          col.column_name !== "id" &&
          col.column_name !== "__row_number__" &&
          col.column_name !== "actions" &&
          !col.is_identity &&
          !col.is_computed
      );
      const firstEditableField = editableColumns[0]?.column_name;

      // Add new row at the beginning of the grid
      setRows((oldRows) => [newRow, ...oldRows]);

      // Set the row to edit mode immediately
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: {
          mode: GridRowModes.Edit,
          fieldToFocus: firstEditableField,
        },
      }));

      // Enable bulk edit mode if not already enabled
      if (!bulkEditMode) {
        setBulkEditMode(true);
        unsavedChangesRef.current = {};
      }
      // Always set hasUnsavedChanges to true when adding a new row
      setHasUnsavedChanges(true);
      bsLog("➕ New row added via handleInlineAdd:", {
        id,
        newRow,
        bulkEditMode: true,
        hasUnsavedChanges: true,
      });

      // Use requestAnimationFrame + setTimeout to ensure the row is rendered and then focus
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (apiRef.current) {
            try {
              // Scroll to the new row first
              apiRef.current.scrollToIndexes({ rowIndex: 0 });

              // Ensure row is in edit mode
              const rowMode = apiRef.current.getRowMode(id);
              if (rowMode !== GridRowModes.Edit) {
                apiRef.current.startRowEditMode({
                  id,
                  fieldToFocus: firstEditableField,
                });
              }

              // Focus the first editable cell
              if (firstEditableField) {
                apiRef.current.setCellFocus(id, firstEditableField);
              }
            } catch (err) {
              Logger.warn("⚠️ Could not focus cell:", err);
            }
          }
        }, 50);
      });
    }, [initializeFormData, metadata, bsStoredProcedure, bulkEditMode, apiRef]);

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

        setFormData(initialFormData);

        // For hierarchical data: set parent as saved and extract PK values for child grids
        if (bsChildGrids && bsChildGrids.length > 0) {
          setIsParentSaved(true);
          setParentAccordionExpanded(true); // Keep parent form expanded when editing

          // Extract parent primary key values for child grids
          const pkValues = {};
          const effectivePrimaryKeys =
            bsPrimaryKeys.length > 0
              ? bsPrimaryKeys
              : metadata?.primaryKeys || [];

          effectivePrimaryKeys.forEach((pk) => {
            if (row[pk] !== undefined) {
              pkValues[pk] = row[pk];
            }
          });

          setSavedParentKeyValues(pkValues);
        }

        setDialogOpen(true);
      },
      [
        onEdit,
        initializeFormData,
        bsChildGrids,
        bsPrimaryKeys,
        metadata?.primaryKeys,
      ]
    );

    // Handle Delete (external or built-in)
    const handleDeleteClick = useCallback(
      async (row) => {
        bsLog("🗑️ handleDeleteClick called", { row });
        const primaryKey = getEffectivePrimaryKey(row);
        const id = row?.[primaryKey];
        bsLog(
          "🗑️ Delete - primaryKey:",
          primaryKey,
          "id:",
          id,
          "metadata.primaryKeys:",
          metadata?.primaryKeys
        );
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

        // Get locale text for confirm message
        const currentLocaleText = getLocaleText(getEffectiveLocale());
        const isConfirmed = await BSAlertSwal2.confirm(
          currentLocaleText.bsConfirmDeleteRecord,
          {
            title: currentLocaleText.bsConfirmDelete || "Delete Confirmation",
            confirmButtonText:
              currentLocaleText.bsYesDelete || "Yes, delete it!",
            cancelButtonText: currentLocaleText.bsCancel || "Cancel",
          }
        );

        if (isConfirmed) {
          try {
            if (bsStoredProcedure) {
              // Use executeSpCrud if bsStoredProcedureCrud is enabled for consistency
              if (bsStoredProcedureCrud) {
                bsLog("🗑️ Using executeSpCrud for DELETE");
                await executeSpCrud("DELETE", {}, id);
                await loadStoredProcedureData();
              } else {
                // Helper function to convert snake_case to PascalCase for SP parameters
                const toPascalCase = (str) => {
                  return str
                    .split("_")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join("");
                };

                // Convert primary key to PascalCase
                const pascalPrimaryKey = toPascalCase(primaryKey);

                // DEVICE COMPATIBILITY: Handle @id vs @part_id scenarios
                const deviceCompatParams = {};

                // If primary key is device-specific parameter (@id, @part_id), handle both scenarios
                if (primaryKey.startsWith("@")) {
                  // Add both variations for maximum compatibility
                  if (primaryKey === "@id") {
                    deviceCompatParams["Id"] = id;
                    deviceCompatParams["PartId"] = id; // Fallback for part_id devices
                  } else if (primaryKey === "@part_id") {
                    deviceCompatParams["PartId"] = id;
                    deviceCompatParams["Id"] = id; // Fallback for id devices
                  }
                }

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
                  userId: getUserId(),
                };

                const result = await executeEnhancedStoredProcedure(
                  deleteRequest
                );

                if (result.success) {
                  // Show success notification if message is not empty
                  if (result.message && result.message.trim() !== "") {
                    BSAlertSwal2.show("success", result.message, {
                      title: "Success",
                    });
                  }
                  await loadStoredProcedureData();
                } else {
                  const errorMsg = result.message || "Delete operation failed";
                  const errorInfo = formatSqlErrorMessage(errorMsg, "delete");
                  showErrorWithDetails(errorInfo);
                  throw new Error(errorMsg);
                }
              }
            } else {
              // Use standard delete record
              await deleteRecord(id, null, bsPreObj);
              await loadData();
            }
          } catch (err) {
            Logger.error("❌ Failed to delete record:", err);
            const errorInfo = formatSqlErrorMessage(
              err.message || "Failed to delete record",
              "delete"
            );
            showErrorWithDetails(errorInfo);
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
        getEffectivePrimaryKey,
        getUserId,
        getEffectiveLocale,
        bsStoredProcedureCrud,
        executeSpCrud,
        formatSqlErrorMessage,
        showErrorWithDetails,
      ]
    );

    // Validate unique fields against database
    // Supports:
    // - Single field: "field_name" or { field: "field_name", message: "..." }
    // - Composite key (multiple fields): { fields: ["field1", "field2"], message: "..." }
    const validateUniqueFields = useCallback(
      async (data, mode = "add", currentPrimaryKeyValue = null) => {
        if (!bsUniqueFields || bsUniqueFields.length === 0) {
          return { isValid: true, errors: [] };
        }

        const errors = [];
        const primaryKeyField = bsKeyId || metadata?.primaryKeys?.[0] || "id";

        // Merge bsDefaultFormValues with data to include hidden field values (e.g., FK values)
        const mergedData = { ...bsDefaultFormValues, ...data };

        for (const fieldConfig of bsUniqueFields) {
          // Determine if this is a composite key (multiple fields) or single field
          const isCompositeKey =
            typeof fieldConfig === "object" &&
            Array.isArray(fieldConfig.fields);

          if (isCompositeKey) {
            // Composite key validation (multiple fields combined)
            const fields = fieldConfig.fields;
            const customMessage = fieldConfig.message;

            // Check if all fields have values (use mergedData to include default/hidden values)
            const allFieldsHaveValues = fields.every((f) => {
              const val = mergedData[f];
              return val != null && val !== "";
            });

            if (!allFieldsHaveValues) {
              bsLog("🔍 Skipping composite key validation - missing values:", {
                fields,
                values: fields.map((f) => ({
                  field: f,
                  value: mergedData[f],
                })),
              });
              continue; // Skip if any field is empty
            }

            try {
              // Build WHERE condition for all fields (use mergedData)
              const whereConditions = fields.map((f) => {
                const val = mergedData[f];
                return `${f} = '${String(val).replace(/'/g, "''")}'`;
              });
              let whereCondition = whereConditions.join(" AND ");

              // In edit mode, exclude current record from check
              if (mode === "edit" && currentPrimaryKeyValue != null) {
                whereCondition += ` AND ${primaryKeyField} <> '${String(
                  currentPrimaryKeyValue
                ).replace(/'/g, "''")}'`;
              }

              // Query database to check if combination exists
              const response = await getTableData({
                tableName: effectiveTableName,
                preObj: bsPreObj,
                page: 1,
                pageSize: 1,
                customWhere: whereCondition,
                selectColumns: [primaryKeyField],
              });

              const existingCount =
                response?.rowCount || response?.data?.length || 0;

              if (existingCount > 0) {
                const displayNames = fields
                  .map((f) => formatColumnName(f))
                  .join(" + ");
                const displayValues = fields
                  .map((f) => `"${mergedData[f]}"`)
                  .join(", ");
                const errorMessage =
                  customMessage ||
                  //`${displayNames}: The combination ${displayValues} already exists. Please use different values.`;
                  `${displayNames}: The combination ${displayValues} already exists. Please use different values.`;
                errors.push(errorMessage);
              }
            } catch (err) {
              Logger.error(
                "❌ Error checking composite unique key:",
                fields,
                err
              );
            }
          } else {
            // Single field validation (existing logic)
            const fieldName =
              typeof fieldConfig === "string" ? fieldConfig : fieldConfig.field;
            const customMessage =
              typeof fieldConfig === "object" ? fieldConfig.message : null;
            const value = mergedData[fieldName];

            // Skip if value is empty
            if (value == null || value === "") {
              continue;
            }

            try {
              // Build WHERE condition to check for existing record
              let whereCondition = `${fieldName} = '${String(value).replace(
                /'/g,
                "''"
              )}' `;

              // In edit mode, exclude current record from check
              if (mode === "edit" && currentPrimaryKeyValue != null) {
                whereCondition += ` AND ${primaryKeyField} <> '${String(
                  currentPrimaryKeyValue
                ).replace(/'/g, "''")}'`;
              }

              // Query database to check if value exists
              const response = await getTableData({
                tableName: effectiveTableName,
                preObj: bsPreObj,
                page: 1,
                pageSize: 1,
                customWhere: whereCondition,
                selectColumns: [primaryKeyField],
              });

              // If record found, field value is not unique
              const existingCount =
                response?.rowCount || response?.data?.length || 0;
              if (existingCount > 0) {
                const displayName = formatColumnName(fieldName);
                const errorMessage =
                  customMessage ||
                  `${displayName}: "${value}" already exists in the system. Please use a different value.`;
                errors.push(errorMessage);
              }
            } catch (err) {
              Logger.error("❌ Error checking unique field:", fieldName, err);
              // Continue with other validations if one fails
            }
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      },
      [
        bsUniqueFields,
        bsKeyId,
        metadata,
        effectiveTableName,
        bsPreObj,
        getTableData,
        formatColumnName,
        bsDefaultFormValues,
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
          BSAlertSwal2.show("error", "", {
            title: "Validation Errors",
            html: validation.errors.join("<br>"),
          });
          return;
        }

        // Validate unique fields before saving
        const primaryKeyField = bsKeyId || metadata?.primaryKeys?.[0] || "id";
        const currentPrimaryKeyValue =
          dialogMode === "edit" ? selectedRow?.[primaryKeyField] : null;

        const uniqueValidation = await validateUniqueFields(
          formData,
          dialogMode,
          currentPrimaryKeyValue
        );
        if (!uniqueValidation.isValid) {
          BSAlertSwal2.show("error", "", {
            title: "Duplicate Value Error",
            html: uniqueValidation.errors.join("<br>"),
          });
          setFormLoading(false);
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
              }

              // Handle fields with defaults - let SQL Server use default value
              else if (hasDefault && !isIdentity) {
                saveData[columnName] = "DEFAULT"; // Special value to trigger server-side default
              }

              // Identity fields are handled automatically by SQL Server, no need to send
            });
          }

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

            // Use Enhanced Stored Procedure for INSERT operation
            const insertRequest = {
              procedureName: bsStoredProcedure,
              schemaName: bsStoredProcedureSchema,
              operation: "INSERT",
              parameters: {
                ...spSaveData,
                ...bsStoredProcedureParams,
              },
              userId: getUserId(),
            };

            const result = await executeEnhancedStoredProcedure(insertRequest);

            if (!result.success) {
              const errorMsg = result.message || "Insert operation failed";
              const errorInfo = formatSqlErrorMessage(errorMsg, "insert");
              showErrorWithDetails(errorInfo);
              throw new Error(errorMsg);
            }

            // Show success notification if message is not empty
            if (result.message && result.message.trim() !== "") {
              BSAlertSwal2.show("success", result.message, {
                title: "Success",
              });
            }
          } else {
            // createRecord returns the created record with its PK (for identity columns)
            const createdRecord = await createRecord(saveData, bsPreObj);

            // Store created record for hierarchical data PK extraction
            if (bsChildGrids && bsChildGrids.length > 0) {
              // Update formData with the returned PK values
              const effectivePrimaryKeys =
                bsPrimaryKeys.length > 0
                  ? bsPrimaryKeys
                  : metadata?.primaryKeys || [];

              // Try to get PK from createdRecord response
              if (createdRecord) {
                // Check if response has the PK directly
                effectivePrimaryKeys.forEach((pk) => {
                  if (createdRecord[pk] !== undefined) {
                    formData[pk] = createdRecord[pk];
                  }
                });

                // Also check if PK is in a nested 'data' property
                if (createdRecord.data) {
                  effectivePrimaryKeys.forEach((pk) => {
                    if (createdRecord.data[pk] !== undefined && !formData[pk]) {
                      formData[pk] = createdRecord.data[pk];
                    }
                  });
                }

                // Check if response has 'insertedId' or similar
                if (
                  createdRecord.insertedId !== undefined &&
                  effectivePrimaryKeys.length > 0
                ) {
                  const pk = effectivePrimaryKeys[0];
                  if (!formData[pk]) {
                    formData[pk] = createdRecord.insertedId;
                  }
                }

                // Check if response has 'id' field
                if (
                  createdRecord.id !== undefined &&
                  effectivePrimaryKeys.length > 0
                ) {
                  const pk = effectivePrimaryKeys[0];
                  if (!formData[pk]) {
                    formData[pk] = createdRecord.id;
                  }
                }
              }
            }
          }
        } else {
          // For edit mode, use formData as is
          const primaryKey = getEffectivePrimaryKey(selectedRow);
          const id = selectedRow?.[primaryKey];
          if (!id) throw new Error("No primary key for update");

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
              bsLog(
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
              userId: getUserId(),
            };

            const result = await executeEnhancedStoredProcedure(updateRequest);

            if (!result.success) {
              const errorMsg = result.message || "Update operation failed";
              const errorInfo = formatSqlErrorMessage(errorMsg, "update");
              showErrorWithDetails(errorInfo);
              throw new Error(errorMsg);
            }

            // Show success notification if message is not empty
            if (result.message && result.message.trim() !== "") {
              BSAlertSwal2.show("success", result.message, {
                title: "Success",
              });
            }

            bsLog(
              "✅ Record updated via Enhanced Stored Procedure:",
              result.message
            );
          } else {
            await updateRecord(id, formData, bsPreObj);
          }
        }

        // For hierarchical data in add mode: don't close dialog, enable child grids
        if (dialogMode === "add" && bsChildGrids && bsChildGrids.length > 0) {
          // Reload data to get the newly created record with its PK
          let loadedRows = [];
          if (bsStoredProcedure) {
            await loadStoredProcedureData();
          } else {
            loadedRows = (await loadData()) || [];
          }

          // Try to find the newly created record by matching form data
          // This is a best-effort approach - ideally the API should return the created record
          const effectivePrimaryKeys =
            bsPrimaryKeys.length > 0
              ? bsPrimaryKeys
              : metadata?.primaryKeys || [];

          // For now, we'll need to get the PK from the response or reload
          // Mark parent as saved and keep accordion expanded
          setIsParentSaved(true);
          setParentAccordionExpanded(true);

          // Extract PK values from formData (now updated with created record's PK)
          const pkValues = {};
          effectivePrimaryKeys.forEach((pk) => {
            if (
              formData[pk] !== undefined &&
              formData[pk] !== null &&
              formData[pk] !== 0
            ) {
              pkValues[pk] = formData[pk];
            }
          });

          // If we still don't have PK values, try to find the matching record from freshly loaded data
          if (
            Object.keys(pkValues).length === 0 &&
            loadedRows &&
            loadedRows.length > 0
          ) {
            // For identity columns, find the row with the highest PK value (most recently created)
            const pk = effectivePrimaryKeys[0];
            if (pk) {
              // Sort by PK descending and get the highest
              const sortedRows = [...loadedRows].sort((a, b) => {
                const aVal = Number(a[pk]) || 0;
                const bVal = Number(b[pk]) || 0;
                return bVal - aVal;
              });

              const newestRow = sortedRows[0];
              if (newestRow && newestRow[pk] !== undefined) {
                pkValues[pk] = newestRow[pk];
              }
            }
          }

          if (Object.keys(pkValues).length === 0) {
            Logger.warn(
              "⚠️ Could not extract PK values. Child grids may not work correctly."
            );
          }

          setSavedParentKeyValues(pkValues);

          // Switch to edit mode so subsequent saves will update instead of create
          setDialogMode("edit");
          // Set selectedRow with PK values so update knows which record to update
          // Also update formData with PK values
          const updatedFormData = { ...formData, ...pkValues };
          setFormData(updatedFormData);
          setSelectedRow(updatedFormData);

          bsLog(
            "🔗 Hierarchical Add - Parent saved, switched to edit mode, PK values:",
            pkValues
          );

          // Don't close dialog - show child grids
          return;
        }

        // For hierarchical edit mode, don't close dialog - allow user to continue editing child grids
        if (dialogMode === "edit" && bsChildGrids && bsChildGrids.length > 0) {
          // Reload data in background but keep dialog open
          if (bsStoredProcedure) {
            await loadStoredProcedureData();
          } else {
            await loadData();
          }
          return;
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
        const errorMessage = err.message || "Failed to save record";
        const errorInfo = formatSqlErrorMessage(errorMessage, "save");
        showErrorWithDetails(errorInfo);
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
      validateUniqueFields,
      bsStoredProcedure,
      bsStoredProcedureSchema,
      bsStoredProcedureParams,
      executeEnhancedStoredProcedure,
      loadStoredProcedureData,
      getEffectivePrimaryKey,
      getUserId,
      bsChildGrids,
      bsPrimaryKeys,
      bsKeyId,
      formatSqlErrorMessage,
      showErrorWithDetails,
    ]);

    const handleDialogClose = useCallback(() => {
      setDialogOpen(false);
      setFormData({});
      setSelectedRow(null);
      setActiveDialogTab(0); // Reset to first tab when closing
      // Reset hierarchical data states
      setIsParentSaved(false);
      setActiveChildTab(0);
      setParentAccordionExpanded(true);
      setSavedParentKeyValues({});
    }, []);

    // Helper: Render combobox for columns with ComboBox configuration
    // Uses refs instead of state to avoid stale closure - refs always have the latest values
    const renderComboBoxCell = useCallback(
      (params, comboConfig) => {
        const { value, field } = params;
        
        // Access the latest values from refs (not from closure)
        const currentLookupData = comboBoxLookupDataRef.current;
        const currentValueOptions = comboBoxValueOptionsRef.current;
        
        // // Debug log to trace lookup
        // if (field === 'app_id' || field === 'platform') {
        //   console.log(`🔎 renderComboBoxCell called for ${field}:`, {
        //     value,
        //     comboConfig,
        //     hasLookupData: !!currentLookupData[field],
        //     lookupDataKeys: Object.keys(currentLookupData),
        //     hasValueOptions: !!currentValueOptions[field],
        //     valueOptionsCount: currentValueOptions[field]?.length || 0,
        //   });
        // }

        // If value is empty/null, show default or empty
        if (value === null || value === undefined || value === "") {
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                color: "text.secondary",
              }}
            >
              {comboConfig.Default || ""}
            </Box>
          );
        }

        // First try to get display value from comboBoxLookupData
        // Try both original value and string version for type mismatch handling
        const lookupMap = currentLookupData[field];
        let displayText = null;
        if (lookupMap) {
          displayText = lookupMap[value] || lookupMap[String(value)];
        }

        // Fallback to comboBoxValueOptions if no lookup data found
        if (!displayText && currentValueOptions[field]) {
          const option = currentValueOptions[field].find(
            (opt) => opt.value === value || String(opt.value) === String(value)
          );
          if (option) {
            displayText = option.label;
          }
        }

        // Fallback to static valueOptions if provided in config
        if (!displayText && comboConfig.valueOptions) {
          const option = comboConfig.valueOptions.find(
            (opt) => opt.value === value || String(opt.value) === String(value)
          );
          if (option) {
            displayText = option.label;
          }
        }

        // Final fallback - just show the raw value
        // The loading indicator is already handled by comboBoxLoading state
        if (!displayText) {
          displayText = value; // Show raw value as last resort
        }

        return (
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            {displayText}
          </Box>
        );
      },
      [] // No dependencies - uses refs instead to get latest values
    );

    // Helper: Get ComboBox value options for editing (uses pre-fetched data)
    const getComboBoxOptions = useCallback(
      (comboConfig, columnName) => {
        // Use pre-fetched valueOptions from comboBoxValueOptions state
        const options = comboBoxValueOptions[columnName];
        // Add empty option at the beginning for new rows with null/undefined values
        const emptyOption = { value: "", label: "-- เลือก --" };
        if (options && options.length > 0) {
          return [emptyOption, ...options];
        }
        // Fallback to static valueOptions if provided in config
        const staticOptions = comboConfig.valueOptions || [];
        return staticOptions.length > 0
          ? [emptyOption, ...staticOptions]
          : [emptyOption];
      },
      [comboBoxValueOptions]
    );

    // Custom Edit Cell for ComboBox columns - reads options from ref at edit time
    // This bypasses MUI DataGrid's column caching by using useGridApiContext
    const renderComboBoxEditCell = useCallback(
      (params, comboConfig) => {
        const { id, field, value, api } = params;
        
        // Get options from ref at edit time (always current)
        const options = comboBoxValueOptionsRef.current[field] || [];
        const emptyOption = { value: "", label: "-- เลือก --" };
        const valueOptions = [emptyOption, ...options];
        
        console.log(`✏️ renderComboBoxEditCell for ${field}:`, {
          currentValue: value,
          optionsCount: options.length,
          sampleOptions: options.slice(0, 3),
        });
        
        const handleChange = (event) => {
          const newValue = event.target.value;
          api.setEditCellValue({ id, field, value: newValue });
        };
        
        return (
          <Select
            value={value ?? ""}
            onChange={handleChange}
            autoFocus
            fullWidth
            size="small"
            sx={{
              height: "100%",
              "& .MuiSelect-select": {
                py: 0.5,
              },
            }}
          >
            {valueOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        );
      },
      [] // No dependencies - always read from ref
    );

    // Helper: Get is_active dropdown options
    const getIsActiveOptions = useCallback(() => {
      return [
        { value: "", label: "-- เลือก --" },
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

        bsLog("🔍 Enhanced SP Form - Primary Key Detection:", {
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

        bsLog("🔍 Enhanced SP Form - Field Exclusion Setup:", {
          excludedFields,
          excludedFieldsCount: excludedFields.length,
          templateRowFieldsCount: Object.keys(templateRow).length,
        });

        const fields = Object.keys(templateRow)
          .filter((key) => {
            // Exclude DataGrid internal IDs (sp_row_*, generated-*, etc.)
            if (key.startsWith("sp_row_") || key.startsWith("generated-")) {
              bsLog(`🚫 Excluding DataGrid internal ID: ${key}`);
              return false;
            }

            // Check if field is hidden via bsColumnDefs (hide: true)
            const customDef = columnDefsConfig[key];
            if (customDef?.hide === true) {
              bsLog(`🙈 Excluding hidden field from form: ${key}`);
              return false;
            }

            // Check if field should be excluded (case-insensitive)
            const isExcluded = excludedFields.some(
              (excludedField) =>
                key.toLowerCase() === excludedField.toLowerCase()
            );

            if (isExcluded) {
              bsLog(
                `🚫 Excluding field from form (${dialogMode} mode): ${key} (matched: ${excludedFields.find(
                  (f) => f.toLowerCase() === key.toLowerCase()
                )})`
              );
            } else {
              bsLog(`✅ Including field in form (${dialogMode} mode): ${key}`);
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

            // Determine if field is read-only (only apply readOnly in edit mode, not add mode)
            const isReadOnly =
              (dialogMode === "edit" && customDef?.readOnly === true) ||
              readOnly;

            // Determine if field is required
            const isRequired = customDef?.required === true;

            return (
              <Grid item size={dialogGridSize} key={fieldName}>
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
        // Filter out is_active field in add mode (only is_active, not other is_* fields)
        if (
          dialogMode === "add" &&
          c.columnName.toLowerCase() === "is_active"
        ) {
          return false;
        }
        // Filter out hidden columns (used by child grids to hide FK columns)
        if (bsHiddenColumns && bsHiddenColumns.includes(c.columnName)) {
          bsLog(`🙈 Hiding column from form: ${c.columnName}`);
          return false;
        }
        // Filter out columns hidden via bsColumnDefs (hide: true)
        const customDef = columnDefsConfig[c.columnName];
        if (customDef?.hide === true) {
          bsLog(`🙈 Hiding column from form via bsColumnDefs: ${c.columnName}`);
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
                bsLog(`✅ Added ComboBox field to form: ${comboFieldName}`, {
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
        const rawVal = formData[columnName];
        let inputType = "text";
        let multiline = false;

        // Get custom column definition if exists
        const customDef = columnDefsConfig[columnName];

        // Determine if field is read-only (only apply customDef.readOnly in edit mode, not add mode)
        const isReadOnly =
          (dialogMode === "edit" && customDef?.readOnly === true) || readOnly;

        // Determine if field is required (customDef overrides metadata)
        const isRequired =
          customDef?.required !== undefined ? customDef.required : !isNullable;

        // Check if this column has a combobox configuration
        const comboConfig = comboBoxConfig[columnName];
        if (comboConfig) {
          bsLog("🎨 Rendering ComboBox for column:", {
            columnName,
            value: rawVal,
            config: comboConfig,
            formData: formData[columnName],
            originalRowData: dialogMode === "edit" ? selectedRow : null,
            dialogMode,
          });
          return (
            <Grid item size={dialogGridSize} key={columnName}>
              <ComboBoxField
                columnName={columnName}
                config={comboConfig}
                value={rawVal ?? ""}
                onChange={(value) =>
                  setFormData((p) => ({ ...p, [columnName]: value }))
                }
                required={isRequired}
                dataType={dataType}
                isNullable={isNullable}
                description={
                  customDef?.tooltip || customDef?.description || description
                }
                disabled={isReadOnly}
                localeText={getLocaleText(getEffectiveLocale())}
              />
            </Grid>
          );
        }

        // Special handling for is_active and is_* fields - use iOS-style Switch
        if (isActiveField(columnName)) {
          return (
            <Grid item size={dialogGridSize} key={columnName}>
              <BSSwitchField
                columnName={columnName}
                label={formatColumnName(columnName)}
                value={rawVal || "YES"}
                onChange={(newValue) =>
                  setFormData((p) => ({ ...p, [columnName]: newValue }))
                }
                disabled={isReadOnly}
                required={isRequired}
                description={
                  customDef?.tooltip || customDef?.description || description
                }
                yesValue="YES"
                noValue="NO"
                localeText={getLocaleText(getEffectiveLocale())}
              />
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
            inputType = "datetime-local";
            break;
          case "date":
            // Date only (no time) - use date input
            inputType = "date";
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

        // Override input type based on bsColumnDefs type (highest priority)
        if (customDef?.type === "date") {
          inputType = "date";
        } else if (customDef?.type === "dateTime") {
          inputType = "datetime-local";
        }

        // Determine the display value based on input type
        // For number and datetime fields, null should show empty input
        let displayVal;
        if (inputType === "number") {
          // For number inputs, null/undefined shows empty, 0 shows "0"
          displayVal = rawVal === null || rawVal === undefined ? "" : rawVal;
        } else if (inputType === "datetime-local") {
          // For datetime inputs, null/undefined shows empty picker
          displayVal = rawVal === null || rawVal === undefined ? "" : rawVal;
        } else if (inputType === "date") {
          // For date inputs, extract only the date part (YYYY-MM-DD) and show empty if null
          if (rawVal === null || rawVal === undefined || rawVal === "") {
            displayVal = "";
          } else {
            // Handle ISO date string or date with time - extract only date part
            const dateStr = String(rawVal);
            displayVal = dateStr.includes("T")
              ? dateStr.split("T")[0]
              : dateStr.substring(0, 10);
          }
        } else if (inputType === "checkbox") {
          // For checkbox, use Boolean conversion
          displayVal = Boolean(rawVal);
        } else {
          // For text fields, null/undefined becomes empty string
          displayVal = rawVal ?? "";
        }

        if (inputType === "checkbox") {
          return (
            <Grid item size={dialogGridSize} key={columnName}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(rawVal)}
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

        // For text/ntext fields, use full width; otherwise use bsDialogColumns setting
        const gridSizeValue = multiline ? 12 : dialogGridSize;

        // Build tooltip text with length information
        // Use customDef.tooltip first, then customDef.description, then metadata description
        let tooltipText =
          customDef?.tooltip || customDef?.description || description || "";
        if (
          bsShowCharacterCount &&
          maxLength > 0 &&
          (inputType === "text" || multiline)
        ) {
          const currentLength = String(displayVal).length;
          const lengthInfo = `${currentLength}/${maxLength} characters`;
          tooltipText = tooltipText
            ? `${tooltipText} (${lengthInfo})`
            : lengthInfo;
        }

        // For datetime-local and date, use MUI DateTimePicker/DatePicker for consistent format across locales
        if (inputType === "datetime-local") {
          const dateTimePickerContent = (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label={formatColumnName(columnName)}
                value={rawVal ? dayjs(rawVal) : null}
                onChange={(newValue) => {
                  // Convert dayjs to ISO string for storage
                  const isoValue = newValue ? newValue.toISOString() : null;
                  setFormData((p) => ({ ...p, [columnName]: isoValue }));
                }}
                disabled={isReadOnly}
                format={DATETIME_FORMAT}
                ampm={!USE_24_HOUR}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    required: isRequired,
                  },
                }}
              />
            </LocalizationProvider>
          );

          return (
            <Grid
              item
              size={gridSizeValue}
              key={columnName}
              sx={{ minWidth: 0 }}
            >
              {tooltipText ? (
                <Tooltip title={tooltipText} arrow placement="top">
                  <span>{dateTimePickerContent}</span>
                </Tooltip>
              ) : (
                dateTimePickerContent
              )}
            </Grid>
          );
        }

        // For date only, use MUI DatePicker
        if (inputType === "date") {
          const datePickerContent = (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={formatColumnName(columnName)}
                value={rawVal ? dayjs(rawVal) : null}
                onChange={(newValue) => {
                  // Convert dayjs to YYYY-MM-DD format for storage
                  const dateValue = newValue
                    ? newValue.format("YYYY-MM-DD")
                    : null;
                  setFormData((p) => ({ ...p, [columnName]: dateValue }));
                }}
                disabled={isReadOnly}
                format={DATE_FORMAT}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    required: isRequired,
                  },
                }}
              />
            </LocalizationProvider>
          );

          return (
            <Grid
              item
              size={gridSizeValue}
              key={columnName}
              sx={{ minWidth: 0 }}
            >
              {tooltipText ? (
                <Tooltip title={tooltipText} arrow placement="top">
                  <span>{datePickerContent}</span>
                </Tooltip>
              ) : (
                datePickerContent
              )}
            </Grid>
          );
        }

        const textFieldContent = (
          <TextField
            fullWidth
            size="small"
            label={formatColumnName(columnName)}
            type={inputType}
            value={displayVal}
            onChange={(e) =>
              setFormData((p) => ({ ...p, [columnName]: e.target.value }))
            }
            required={isRequired}
            disabled={isReadOnly}
            multiline={multiline}
            rows={multiline ? 3 : 1}
            // For datetime-local, date, and number inputs, always shrink label to avoid overlap with browser placeholder
            InputLabelProps={{
              shrink:
                inputType === "datetime-local" || inputType === "date" //|| inputType === "number"
                  ? true
                  : undefined,
            }}
            inputProps={{
              ...(maxLength > 0 &&
                (inputType === "text" || multiline) && {
                  maxLength: maxLength,
                }),
            }}
            error={maxLength > 0 && String(displayVal).length > maxLength}
          />
        );

        return (
          <Grid item size={gridSizeValue} key={columnName} sx={{ minWidth: 0 }}>
            {tooltipText ? (
              <Tooltip title={tooltipText} arrow placement="top">
                {textFieldContent}
              </Tooltip>
            ) : (
              textFieldContent
            )}
          </Grid>
        );
      });

      // If tabs are configured, organize fields by tabs
      if (parsedDialogTabs && parsedDialogTabs.length > 0) {
        // Create a map of column names to form field elements
        const fieldMap = {};
        formFields.forEach((field) => {
          if (field && field.key) {
            fieldMap[field.key] = field;
          }
        });

        // Get columns assigned to any tab
        const assignedColumns = new Set();
        parsedDialogTabs.forEach((tab) => {
          tab.columns.forEach((col) => assignedColumns.add(col));
        });

        // Find unassigned fields
        const unassignedFields = formFields.filter(
          (field) => field && field.key && !assignedColumns.has(field.key)
        );

        return (
          <Box sx={{ width: "100%" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeDialogTab}
                onChange={handleDialogTabChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="form tabs"
              >
                {parsedDialogTabs.map((tab, index) => (
                  <Tab key={index} label={tab.name} />
                ))}
                {unassignedFields.length > 0 && <Tab label="Other" />}
              </Tabs>
            </Box>

            {/* Render tab panels */}
            {parsedDialogTabs.map((tab, index) => (
              <Box
                key={index}
                role="tabpanel"
                hidden={activeDialogTab !== index}
                sx={{ pt: 2 }}
              >
                {activeDialogTab === index && (
                  <Grid container spacing={2}>
                    {tab.columns.map((colName) => {
                      const field = fieldMap[colName];
                      return field || null;
                    })}
                  </Grid>
                )}
              </Box>
            ))}

            {/* Other tab for unassigned fields */}
            {unassignedFields.length > 0 && (
              <Box
                role="tabpanel"
                hidden={activeDialogTab !== parsedDialogTabs.length}
                sx={{ pt: 2 }}
              >
                {activeDialogTab === parsedDialogTabs.length && (
                  <Grid container spacing={2}>
                    {unassignedFields}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        );
      }

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
      comboBoxConfig,
      selectedRow,
      bsShowCharacterCount,
      bsStoredProcedure,
      detectPrimaryKeyFromData,
      columnDefsConfig,
      readOnly,
      bsKeyId,
      rows,
      getEffectiveLocale,
      parsedDialogTabs,
      activeDialogTab,
      handleDialogTabChange,
      dialogGridSize,
      bsHiddenColumns,
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
              bsLog("🔄 Restoring row to original state:", {
                rowId,
                primaryKey,
                originalData: change.originalData,
              });
              return change.originalData;
            }
            return row;
          })
        );

        bsLog("✅ Row restored successfully:", {
          rowId,
          remainingChanges,
        });
      },
      [getEffectivePrimaryKey]
    );

    // Inline editing handlers for bsBulkAddInline functionality
    // Prevent auto-save when row loses focus - only save when user explicitly clicks Save button
    const handleInlineRowEditStop = useCallback(
      (params, event) => {
        const rowId = params.id;
        const isNewRow = typeof rowId === "string" && rowId.startsWith("new-");

        // For new rows in bsBulkAddInline mode, prevent ALL automatic exits from edit mode
        // User must explicitly click Save or Cancel button
        if (isNewRow) {
          // Allow only Escape key to cancel (which will remove the row)
          if (params.reason === GridRowEditStopReasons.escapeKeyDown) {
            // When Escape is pressed on a new row, remove it
            bsLog(`🚫 Escape pressed on new row: ${rowId} - removing row`);
            setRows((oldRows) => oldRows.filter((row) => row.id !== rowId));
            setRowModesModel((oldModel) => {
              const newModel = { ...oldModel };
              delete newModel[rowId];
              return newModel;
            });
            // Prevent default to avoid processRowUpdate being called
            event.defaultMuiPrevented = true;
            return;
          }

          // Block all other reasons (focus out, enter, tab, etc.)
          event.defaultMuiPrevented = true;
          bsLog(
            `🚫 Prevented auto-exit for new row: ${rowId}, reason: ${params.reason}`
          );
          return;
        }

        // For existing rows, prevent only rowFocusOut (other reasons like Enter/Tab are ok)
        if (params.reason === GridRowEditStopReasons.rowFocusOut) {
          event.defaultMuiPrevented = true;
        }
      },
      [setRows, setRowModesModel]
    );

    // Bulk Edit Mode row-level handlers (Save/Cancel per row)
    const handleBulkRowEditClick = useCallback((id) => {
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit },
      }));
    }, []);

    const handleBulkRowSaveClick = useCallback((id) => {
      // Exit edit mode - processRowUpdate will handle the actual save tracking
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: { mode: GridRowModes.View },
      }));
    }, []);

    const handleBulkRowCancelClick = useCallback(
      (id) => {
        setRowModesModel((oldModel) => {
          const newModel = { ...oldModel };
          newModel[id] = { mode: GridRowModes.View, ignoreModifications: true };
          return newModel;
        });

        // If it's a new row, remove it from the grid
        const editedRow = rows.find((row) => {
          const rowId = row[getEffectivePrimaryKey()] || row.id;
          return String(rowId) === String(id);
        });

        const isNewRow =
          editedRow &&
          String(
            editedRow[getEffectivePrimaryKey()] || editedRow.id
          ).startsWith("new-");

        if (isNewRow) {
          setRows((oldRows) => {
            const remainingRows = oldRows.filter((row) => {
              const rowId = row[getEffectivePrimaryKey()] || row.id;
              return String(rowId) !== String(id);
            });

            // Check if there are any remaining new rows or unsaved changes
            const hasRemainingNewRows = remainingRows.some((row) => {
              const rowId = row[getEffectivePrimaryKey()] || row.id;
              return String(rowId).startsWith("new-");
            });
            const hasUnsavedEdits =
              Object.keys(unsavedChangesRef.current).length > 0;

            // If no more new rows and no unsaved changes, exit bulk edit mode
            if (!hasRemainingNewRows && !hasUnsavedEdits) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => {
                setBulkEditMode(false);
                setHasUnsavedChanges(false);
                setRowModesModel({});
              }, 0);
            }

            return remainingRows;
          });
        } else {
          // For existing rows, remove from unsaved changes if present
          if (unsavedChangesRef.current[id]) {
            delete unsavedChangesRef.current[id];

            // Check if there are any remaining unsaved changes or new rows
            const hasUnsavedEdits =
              Object.keys(unsavedChangesRef.current).length > 0;
            const hasNewRows = rows.some((row) => {
              const rowId = row[getEffectivePrimaryKey()] || row.id;
              return String(rowId).startsWith("new-");
            });

            if (!hasUnsavedEdits && !hasNewRows) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => {
                setBulkEditMode(false);
                setHasUnsavedChanges(false);
                setRowModesModel({});
              }, 0);
            } else {
              setHasUnsavedChanges(hasUnsavedEdits);
            }
          }
        }
      },
      [rows, getEffectivePrimaryKey]
    );

    const handleInlineEditClick = useCallback(
      (id) => () => {
        if (effectiveBulkAddInline || effectiveBulkEdit) {
          setRowModesModel((oldModel) => ({
            ...oldModel,
            [id]: { mode: GridRowModes.Edit },
          }));
          // Enable bulk edit mode to show Save All / Discard All toolbar
          if (!bulkEditMode) {
            setBulkEditMode(true);
            unsavedChangesRef.current = {};
            setHasUnsavedChanges(false);
            bsLog("📝 Bulk Edit mode enabled via edit button click");
          }
        }
      },
      [effectiveBulkAddInline, effectiveBulkEdit, bulkEditMode]
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
      (id) => async () => {
        // Use apiRef to get the latest rows from DataGrid (avoids stale closure)
        let currentRows = rows;
        try {
          if (apiRef?.current?.getRowModels) {
            const rowModels = apiRef.current.getRowModels();
            currentRows = Array.from(rowModels.values());
            bsLog("🗑️ Got rows from apiRef:", currentRows.length);
          }
        } catch (e) {
          bsLog("🗑️ Could not get rows from apiRef, using state:", e.message);
        }

        bsLog("🗑️ handleInlineDeleteClick called", {
          id,
          rowsCount: currentRows.length,
          allRowIds: currentRows.map((r) => ({
            id: r.id,
            rowId: r.id,
            pkField: bsKeyId,
            pkValue: r[bsKeyId],
          })),
          bsKeyId,
        });

        // Find the row to delete - id from DataGrid params.id is the value returned by getRowId
        // getRowId returns String(row[primaryKey]) or String(row.id)
        // So we need to match against BOTH primary key field AND id field

        // First, determine primary key field
        const primaryKey = bsKeyId || getEffectivePrimaryKey(currentRows[0]);
        bsLog("🗑️ Using primaryKey:", primaryKey, "bsKeyId:", bsKeyId);

        // Try multiple matching strategies:
        // 1. Match by row.id (which is set to primaryKey value in loadStoredProcedureData)
        let rowToDelete = currentRows.find(
          (row) => String(row.id) === String(id)
        );

        // 2. Match by primary key field if different from id
        if (!rowToDelete && primaryKey && primaryKey !== "id") {
          rowToDelete = currentRows.find(
            (row) => String(row[primaryKey]) === String(id)
          );
        }

        // 3. Fallback: try other common ID fields
        if (!rowToDelete) {
          rowToDelete = currentRows.find();
        }

        bsLog("🗑️ Row to delete:", {
          rowToDelete,
          foundById: !!rowToDelete,
          primaryKey,
        });

        if (!rowToDelete) {
          Logger.error(
            "❌ Could not find row with id:",
            id,
            "primaryKey:",
            primaryKey
          );
          return;
        }

        const isNewRow = rowToDelete?.isNew || String(id).startsWith("new-");
        bsLog("🗑️ Is new row:", isNewRow);

        if (isNewRow) {
          // For new rows that haven't been saved yet, just remove from UI
          // Use the same matching logic as above
          setRows((oldRows) =>
            oldRows.filter(
              (row) =>
                String(row[primaryKey]) !== String(id) &&
                String(row.id) !== String(id)
            )
          );
          setRowModesModel((oldModel) => {
            const newModel = { ...oldModel };
            delete newModel[id];
            return newModel;
          });
        } else {
          // For existing rows, use handleDeleteClick to delete from database
          bsLog("🗑️ Calling handleDeleteClick for existing row");
          await handleDeleteClick(rowToDelete);
        }
      },
      [rows, handleDeleteClick, getEffectivePrimaryKey, bsKeyId, apiRef]
    );

    const handleInlineCancelClick = useCallback(
      (id) => () => {
        setRowModesModel((oldModel) => ({
          ...oldModel,
          [id]: { mode: GridRowModes.View, ignoreModifications: true },
        }));

        const editedRow = rows.find((row) => row.id === id);
        if (editedRow?.isNew) {
          setRows((oldRows) => {
            const remainingRows = oldRows.filter((row) => row.id !== id);

            // Check if there are any remaining new rows
            const hasRemainingNewRows = remainingRows.some(
              (row) => row.isNew || String(row.id).startsWith("new-")
            );
            const hasUnsavedEdits =
              Object.keys(unsavedChangesRef.current).length > 0;

            // If no more new rows and no unsaved changes, exit bulk edit mode
            if (!hasRemainingNewRows && !hasUnsavedEdits) {
              setTimeout(() => {
                setBulkEditMode(false);
                setHasUnsavedChanges(false);
                setRowModesModel({});
              }, 0);
            }

            return remainingRows;
          });
        }
      },
      [rows]
    );

    const processRowUpdate = useCallback(
      async (newRow) => {
        try {
          // CRITICAL: Skip all processing if bulk save is in progress
          // This prevents double-save when stopCellEditMode triggers processRowUpdate
          if (isBulkSavingRef.current) {
            bsLog("⏭️ processRowUpdate skipped - bulk save in progress");
            return newRow;
          }

          // CRITICAL: Skip all processing if discard is in progress
          // This prevents create API being called when user clicks Discard
          if (isDiscardingRef.current) {
            bsLog("⏭️ processRowUpdate skipped - discard in progress");
            return newRow;
          }

          // Validate the row data
          const validation = validateFormData(newRow);
          if (!validation.isValid) {
            BSAlertSwal2.show("error", "", {
              title: "Validation Errors",
              html: validation.errors.join("<br>"),
            });
            return newRow; // Return unchanged to keep edit mode
          }

          // If it's a new row, create it
          if (newRow.isNew) {
            // Check if this row was already saved in bulk (prevents double-save)
            const tempId = newRow.id || newRow.Id || newRow.ID;
            if (tempId && savedRowIdsRef.current.has(String(tempId))) {
              bsLog(
                "⏭️ processRowUpdate skipped - row already saved in bulk:",
                tempId
              );
              savedRowIdsRef.current.delete(String(tempId));
              return { ...newRow, isNew: false };
            }

            const { isNew, id, ...dataToSave } = newRow;

            // Filter to only include fields that exist in metadata (actual table columns)
            // This removes display-only fields like create_by_display, update_by_display
            const cleanData = { ...dataToSave };

            // Remove audit fields - these should be managed by backend
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
              "timestamp",
            ];
            auditFields.forEach((field) => {
              delete cleanData[field];
            });

            if (metadata?.columns && Array.isArray(metadata.columns)) {
              const validColumns = new Set(
                metadata.columns.map((col) => col.columnName)
              );
              Object.keys(cleanData).forEach((key) => {
                if (!validColumns.has(key)) {
                  delete cleanData[key];
                }
              });
            }

            const savedRecord = await createRecord(cleanData, bsPreObj);

            // Merge original row data with saved record to preserve all fields
            // savedRecord only contains the fields that were sent to the API
            const updatedRow = {
              ...newRow, // Keep original row data (including display columns)
              ...savedRecord, // Override with new values from API
              isNew: false,
            };

            setRows((oldRows) =>
              oldRows.map((row) => (row.id === newRow.id ? updatedRow : row))
            );

            // Refresh data to get the latest from server
            await loadData(true);

            bsLog("✅ New record created successfully:", savedRecord);
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

          // Remove audit fields - these should be managed by backend
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
            "timestamp",
          ];
          auditFields.forEach((field) => {
            delete cleanData[field];
          });

          // Filter to only include fields that exist in metadata (actual table columns)
          // This removes display-only fields like create_by_display, update_by_display
          // that are generated by user lookup but are not actual database columns
          if (metadata?.columns && Array.isArray(metadata.columns)) {
            const validColumns = new Set(
              metadata.columns.map((col) => col.columnName)
            );
            Object.keys(cleanData).forEach((key) => {
              if (!validColumns.has(key)) {
                delete cleanData[key];
              }
            });
          }

          const savedRecord = await updateRecord(id, cleanData, bsPreObj);

          // Merge original row data with saved record to preserve all fields
          // savedRecord only contains the fields that were sent to the API
          // but we need to keep all the original fields (like display columns)
          const updatedRow = {
            ...newRow, // Keep all original row data
            ...savedRecord, // Override with updated values from API
            id: newRow.id, // Preserve original id for DataGrid
          };

          setRows((oldRows) =>
            oldRows.map((row) => (row.id === newRow.id ? updatedRow : row))
          );

          bsLog("✅ Record updated successfully:", {
            savedRecord,
            updatedRow,
            preservedId: newRow.id,
          });
          return updatedRow;
        } catch (error) {
          Logger.error("❌ Failed to save record:", error);
          const errorInfo = formatSqlErrorMessage(
            error.message || "Failed to save record",
            "save"
          );
          showErrorWithDetails(errorInfo);
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
        formatSqlErrorMessage,
        showErrorWithDetails,
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

        bsLog(`🎨 Applying custom column def for: ${fieldName}`, {
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

          // MUI X Data Grid v7+ signature: valueFormatter(value, row, column, apiRef)
          mergedColumn.valueFormatter = (value) => {
            if (value == null) return "";
            const num = Number(value);
            if (isNaN(num)) return value;
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
          customDef.type === "number" ||
          customDef.type === "decimal"
        ) {
          const decimals = customDef.decimals ?? 2;
          const thousandSeparator = customDef.thousandSeparator !== false;

          // Set column type to "number" for proper DataGrid behavior
          mergedColumn.type = "number";

          // MUI X Data Grid v7+ signature: valueFormatter(value, row, column, apiRef)
          mergedColumn.valueFormatter = (value) => {
            if (value == null) return "";
            const num = Number(value);
            if (isNaN(num)) return value;
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
          // MUI X Data Grid v7+ signature: valueFormatter(value, row, column, apiRef)
          mergedColumn.valueFormatter = (value) => {
            if (value == null) return "";
            const num = Number(value);
            if (isNaN(num)) return value;
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
          // Use config from environment or bsColumnDefs override
          const defaultFormat =
            customDef.type === "dateTime"
              ? DATETIME_FORMAT.toLowerCase()
                  .replace("dd", "dd")
                  .replace("mm", "MM")
              : DATE_FORMAT.toLowerCase()
                  .replace("dd", "dd")
                  .replace("mm", "MM");
          const dateFormat =
            customDef.dateFormat || customDef.dateTimeFormat || defaultFormat;
          const includeTime = customDef.type === "dateTime";

          // Remove existing renderCell to let valueFormatter work
          // This is needed because renderCell has higher priority than valueFormatter in MUI DataGrid
          delete mergedColumn.renderCell;

          // MUI X Data Grid v7+ signature: valueFormatter(value, row, column, apiRef)
          mergedColumn.valueFormatter = (value) => {
            if (!value) return "";
            try {
              const date = new Date(value);
              if (isNaN(date.getTime())) return value;

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
              return value;
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

        // status
        if (customDef.type === "status") {
          mergedColumn.renderCell = (params) => {
            const val = (params.value || "").toString().toLowerCase();

            const getStatusColor = (status) => {
              switch (status) {
                case "open":
                  return "default"; // สีเทา
                case "in process":
                  return "warning"; // สีส้ม
                case "close":
                  return "success"; // สีเขียว
                case "cancel":
                  return "info"; // สีน้ำเงิน
                default:
                  return "default";
              }
            };

            const getLabel = (status) => {
              switch (status) {
                case "open":
                  return "Open";
                case "in process":
                  return "In Process";
                case "close":
                  return "Close";
                case "cancel":
                  return "Cancel";
                default:
                  return status;
              }
            };

            return (
              <Chip
                label={getLabel(val)}
                color={getStatusColor(val)}
                size="small"
                variant="outlined"
              />
            );
          };
        }

        // StringAvatar type - displays avatars from comma-separated names
        if (customDef.type === "stringAvatar") {
          const maxAvatars = customDef.maxAvatars || 4; // Maximum avatars to show
          const avatarSize = customDef.avatarSize || 32; // Avatar size in pixels
          const showTooltip = customDef.showTooltip !== false; // Show tooltip by default

          mergedColumn.renderCell = (params) => {
            const value = params.value;
            if (!value || typeof value !== "string") {
              return null;
            }

            // Split by comma and filter empty values
            const names = value
              .split(",")
              .map((name) => name.trim())
              .filter((name) => name.length > 0);

            if (names.length === 0) {
              return null;
            }

            // Single avatar
            if (names.length === 1) {
              const avatarProps = stringAvatar(names[0]);
              avatarProps.sx = {
                ...avatarProps.sx,
                width: avatarSize,
                height: avatarSize,
              };

              return showTooltip ? (
                <Tooltip title={names[0]} arrow>
                  <Avatar {...avatarProps} />
                </Tooltip>
              ) : (
                <Avatar {...avatarProps} />
              );
            }

            // Multiple avatars - use AvatarGroup
            return (
              <AvatarGroup
                max={maxAvatars}
                sx={{
                  justifyContent: "flex-end",
                  "& .MuiAvatar-root": {
                    width: avatarSize,
                    height: avatarSize,
                    fontSize: avatarSize * 0.4,
                    border: "2px solid white",
                  },
                }}
              >
                {names.map((name, index) => {
                  const avatarProps = stringAvatar(name);
                  return showTooltip ? (
                    <Tooltip key={index} title={name} arrow>
                      <Avatar {...avatarProps} />
                    </Tooltip>
                  ) : (
                    <Avatar key={index} {...avatarProps} />
                  );
                })}
              </AvatarGroup>
            );
          };

          // Make column wider to accommodate avatars
          if (!mergedColumn.width && !mergedColumn.minWidth) {
            mergedColumn.minWidth = 120;
          }
        }

        // AttachFile type - displays attach icon, opens file upload dialog on click
        if (customDef.type === "attachFile") {
          const attachConfig = customDef.attachConfig || {};

          // Set column properties
          mergedColumn.sortable = false;
          mergedColumn.filterable = false;
          mergedColumn.editable = false;
          mergedColumn.align = "center";
          mergedColumn.headerAlign = "center";

          // Default width for attach column
          if (!mergedColumn.width && !mergedColumn.minWidth) {
            mergedColumn.width = 80;
          }

          mergedColumn.renderCell = (params) => {
            const handleAttachClick = (event) => {
              event.stopPropagation();

              // Get the foreign key value from the row
              const foreignKeyField = attachConfig.foreignKey;
              const foreignKeyValue = foreignKeyField
                ? params.row[foreignKeyField]
                : null;

              // Update state to open attach dialog
              setAttachFileRowData(params.row);
              setAttachFileConfig({
                ...attachConfig,
                foreignKeyValue: foreignKeyValue,
              });
              setAttachFileDialogOpen(true);
            };

            // Check if row has primary key (saved record)
            const primaryKey = getEffectivePrimaryKey(params.row);
            const hasPrimaryKey =
              params.row[primaryKey] !== undefined &&
              params.row[primaryKey] !== null;

            return (
              <Tooltip
                title={
                  hasPrimaryKey
                    ? localeText.bsAttachFiles || "Attach Files"
                    : localeText.bsSaveRecordFirst ||
                      "Save record first to attach files"
                }
                arrow
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={handleAttachClick}
                    disabled={!hasPrimaryKey}
                    sx={{
                      color: hasPrimaryKey ? "primary.main" : "action.disabled",
                      "&:hover": {
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                      },
                    }}
                  >
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
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

        bsLog(`✅ Applied bsColumnDefs for: ${fieldName}`, {
          width: mergedColumn.width,
          type: mergedColumn.type,
          headerName: mergedColumn.headerName,
        });

        return mergedColumn;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [columnDefsConfig, getEffectivePrimaryKey]
    );

    // Get localization object for DataGrid
    const getLocalization = useCallback(() => {
      const effectiveLocale = getEffectiveLocale();
      return getLocaleText(effectiveLocale);
    }, [getEffectiveLocale]);

    // Get current locale text for custom UI elements
    // IMPORTANT: Memoize to prevent infinite re-renders in columns useMemo
    const localeText = useMemo(() => getLocalization(), [getLocalization]);

    // IMPORTANT: Create a stable key for the column structure based on the keys of the first row
    // This prevents the columns useMemo from recalculating every time rows data changes
    // We only want to regenerate columns when the STRUCTURE changes (different keys), not when values change
    const rowColumnStructureKey = useMemo(() => {
      if (!rows || rows.length === 0) return "";
      const keys = Object.keys(rows[0] || {})
        .sort()
        .join(",");
      return keys;
    }, [rows]);

    // Cache the first row for column generation to prevent infinite re-renders
    // We use the structure key to only update when column structure actually changes
    const firstRowForColumns = useMemo(() => {
      if (!rows || rows.length === 0) return null;
      return rows[0];
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowColumnStructureKey]);

    // CRITICAL FIX: Use ref to cache columns and prevent infinite re-renders
    // DataGrid's useGridColumns hook causes state updates when columns prop changes
    // This ref-based approach ensures columns only truly change when structure changes
    const columnsRef = useRef([]);
    const columnsKeyRef = useRef("");

    // CRITICAL FIX: Create truly stable metadata key using ref-based approach
    // This prevents metadata object reference changes from triggering column regeneration
    const metadataColumnsKeyRef = useRef("");
    const prevMetadataRef = useRef(null);

    // Compute metadata key only when metadata actually changes content, not just reference
    const stableMetadataKey = useMemo(() => {
      if (!metadata?.columns || !Array.isArray(metadata.columns)) {
        if (metadataColumnsKeyRef.current !== "") {
          metadataColumnsKeyRef.current = "";
        }
        return "";
      }

      // Generate a key from the actual column data
      const newKey = metadata.columns
        .map((c) => `${c.columnName}:${c.dataType}`)
        .join("|");

      // Only update if the content actually changed
      if (newKey !== metadataColumnsKeyRef.current) {
        metadataColumnsKeyRef.current = newKey;
        prevMetadataRef.current = metadata;
      }

      return metadataColumnsKeyRef.current;
    }, [metadata]);

    // Create a stable key for when columns should actually regenerate
    // Only include properties that affect column STRUCTURE, not render-time state
    const columnsKey = useMemo(() => {
      const storedProcKey = bsStoredProcedure || "";
      const firstRowKey = rowColumnStructureKey;
      const configKey = `${readOnly}-${bulkEditMode}-${effectiveBulkAddInline}-${bsShowRowNumber}`;
      const visibilityKey = `${effectiveVisibleView}-${effectiveVisibleEdit}-${effectiveVisibleDelete}`;
      const colsKey = parsedCols ? parsedCols.join(",") : "";
      const hiddenKey = bsHiddenColumns ? JSON.stringify(bsHiddenColumns) : "";
      // Include comboBoxValueOptions keys to regenerate columns when dropdown data loads
      const comboBoxKeys = Object.keys(comboBoxValueOptions).sort().join(",");
      const comboBoxDataKey = Object.entries(comboBoxValueOptions)
        .map(([k, v]) => `${k}:${v?.length || 0}`)
        .join("|");
      // Include comboBoxLookupData keys to regenerate columns when lookup data loads
      const lookupDataKey = Object.keys(comboBoxLookupData).sort().join(",");

      return `${stableMetadataKey}::${storedProcKey}::${firstRowKey}::${configKey}::${visibilityKey}::${colsKey}::${hiddenKey}::${comboBoxKeys}::${comboBoxDataKey}::${lookupDataKey}`;
    }, [
      stableMetadataKey,
      bsStoredProcedure,
      rowColumnStructureKey,
      readOnly,
      bulkEditMode,
      effectiveBulkAddInline,
      bsShowRowNumber,
      effectiveVisibleView,
      effectiveVisibleEdit,
      effectiveVisibleDelete,
      parsedCols,
      bsHiddenColumns,
      comboBoxValueOptions,
      comboBoxLookupData,
    ]);

    // Build columns from metadata - ONLY regenerate when columnsKey changes
    const columns = useMemo(() => {
      // Debug log for tracking column regeneration
      console.log("🔄 columns useMemo triggered", {
        columnsKey,
        previousKey: columnsKeyRef.current,
        keyChanged: columnsKeyRef.current !== columnsKey,
        cachedColumnsCount: columnsRef.current?.length || 0,
        comboBoxValueOptionsKeys: Object.keys(comboBoxValueOptions),
        comboBoxValueOptionsData: Object.entries(comboBoxValueOptions).map(([k, v]) => ({
          column: k,
          count: v?.length || 0,
        })),
      });
      
       // CRITICAL: Check if we can reuse cached columns
      // BUT don't use cache if combobox config exists and data isn't loaded yet
      const hasComboBoxConfig = Object.keys(comboBoxConfig).length > 0;
      const hasComboBoxData = Object.keys(comboBoxValueOptions).length > 0 &&
        Object.values(comboBoxValueOptions).some(opts => opts && opts.length > 0);
      const shouldForceRebuild = hasComboBoxConfig && !hasComboBoxData;
      
      console.log("🔍 Cache check:", {
        hasComboBoxConfig,
        hasComboBoxData,
        shouldForceRebuild,
        comboBoxConfigKeys: Object.keys(comboBoxConfig),
        comboBoxValueOptionsKeys: Object.keys(comboBoxValueOptions),
        comboBoxValueOptionsDetails: Object.entries(comboBoxValueOptions).map(([k, v]) => ({
          column: k,
          optionsLength: v?.length || 0,
          sample: v?.slice?.(0, 2)
        })),
      });
      
      if (
        columnsKeyRef.current === columnsKey &&
        columnsRef.current.length > 0 &&
        !shouldForceRebuild
      ) {
        console.log("📦 Returning cached columns (key unchanged)");
        return columnsRef.current;
      }
      
      if (shouldForceRebuild) {
        console.log("🔄 Forcing column rebuild - waiting for combobox data");
      }
      // For Enhanced Stored Procedure, try to create columns from data if no metadata
      if (
        bsStoredProcedure &&
        (!metadata?.columns || !Array.isArray(metadata.columns))
      ) {
        // Use cached firstRowForColumns instead of rows[0] to prevent infinite re-renders
        if (firstRowForColumns) {
          // Detect primary key to exclude it from visible columns
          const detectedPrimaryKey =
            detectPrimaryKeyFromData(firstRowForColumns);

          // Also check metadata for primary keys if available
          const metadataPrimaryKeys = metadata?.primaryKeys || [];

          const dataColumns = Object.keys(firstRowForColumns || {})
            .filter((key) => {
              // Skip special fields
              if (key === "__rowNumber") {
                // bsLog(`🔍 Skipping special field: ${key}`);
                return false;
              }

              // Skip primary keys from metadata (Enhanced SP returned metadata)
              if (metadataPrimaryKeys.includes(key)) {
                // bsLog(
                //   `🔍 Hiding primary key column from metadata: ${key}`
                // );
                return false;
              }

              // Skip detected primary key (fallback detection)
              if (detectedPrimaryKey && key === detectedPrimaryKey) {
                // bsLog(`🔍 Hiding detected primary key column: ${key}`);
                return false;
              }

              // Use the comprehensive primary key detection instead of hardcoded values
              const isPrimaryKey = detectPrimaryKeyFromData({
                [key]: firstRowForColumns[key],
                ...firstRowForColumns,
              });
              if (isPrimaryKey === key) {
                // bsLog(
                //   `🔍 Hiding primary key column (by detection): ${key}`
                // );
                return false;
              }

              // Skip common primary key patterns as additional fallback
              if (
                /^(id|Id|ID)$/.test(key) ||
                /.*_id$/i.test(key) ||
                /.*Id$/.test(key) ||
                /.*ID$/.test(key)
              ) {
                // bsLog(`🔍 Hiding primary key column (by pattern): ${key}`);
                return false;
              }

              // bsLog(`✅ Including column: ${key}`);
              return true;
            })
            .map((key) => {
              // Detect data type from the first row value
              const firstValue = firstRowForColumns[key];
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

              // bsLog(`🔧 Column config for ${key}:`, {
              //   field: key,
              //   type: columnType,
              //   width: width,
              //   firstValue: firstValue,
              //   valueType: typeof firstValue,
              // });

              // Apply custom column definitions if provided
              return applyColumnDefs(columnConfig, key);
            });

          // Add actions column if not read-only (for Enhanced Stored Procedure)
          if (!readOnly) {
            const actions = [];

            if (effectiveVisibleView && onView) {
              actions.push((params) => {
                // Get row-specific config
                const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
                const showView = rowConfig.showView !== false;

                if (!showView) return null;

                return (
                  <GridActionsCellItem
                    icon={
                      <Visibility
                        htmlColor={
                          theme.palette.mode === "dark"
                            ? theme.palette.info.light
                            : theme.palette.info.main
                        }
                      />
                    }
                    label="View"
                    onClick={() => onView(params.row)}
                    disabled={rowConfig.disabled}
                    sx={{
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(41, 182, 246, 0.2)"
                            : "rgba(2, 136, 209, 0.1)",
                      },
                    }}
                  />
                );
              });
            }

            // In bulk edit mode, show Save/Cancel buttons for editing rows
            if (bulkEditMode) {
              actions.push((params) => {
                const isInEditMode =
                  rowModesModel[params.id]?.mode === GridRowModes.Edit;
                const primaryKey =
                  bsKeyId || detectPrimaryKeyFromData(rows) || "id";
                const rowId = params.row[primaryKey] || params.row.id;
                const hasChanges = !!unsavedChangesRef.current[rowId];

                if (isInEditMode) {
                  // Row is in edit mode - show Save and Cancel buttons
                  return [
                    <GridActionsCellItem
                      key="save"
                      icon={
                        <SaveIcon
                          htmlColor={
                            theme.palette.mode === "dark"
                              ? theme.palette.success.light
                              : theme.palette.success.main
                          }
                        />
                      }
                      label={localeText.bsSave}
                      onClick={() => handleBulkRowSaveClick(params.id)}
                      sx={{
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(102, 187, 106, 0.2)"
                              : "rgba(46, 125, 50, 0.1)",
                        },
                      }}
                    />,
                    <GridActionsCellItem
                      key="cancel"
                      icon={
                        <CancelIcon
                          htmlColor={
                            theme.palette.mode === "dark"
                              ? theme.palette.error.light
                              : theme.palette.error.main
                          }
                        />
                      }
                      label={localeText.bsCancel}
                      onClick={() => handleBulkRowCancelClick(params.id)}
                      sx={{
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(244, 67, 54, 0.2)"
                              : "rgba(211, 47, 47, 0.1)",
                        },
                      }}
                    />,
                  ];
                } else {
                  // Row is in view mode - show Edit button (and Restore if has changes)
                  const viewModeActions = [
                    <GridActionsCellItem
                      key="edit"
                      icon={
                        <Edit
                          htmlColor={
                            theme.palette.mode === "dark"
                              ? theme.palette.warning.light
                              : theme.palette.warning.dark
                          }
                        />
                      }
                      label={localeText.bsEdit}
                      onClick={() => handleBulkRowEditClick(params.id)}
                      sx={{
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(255, 183, 77, 0.2)"
                              : "rgba(237, 108, 2, 0.1)",
                        },
                      }}
                    />,
                  ];
                  if (hasChanges) {
                    viewModeActions.push(
                      <GridActionsCellItem
                        key="restore"
                        icon={
                          <Restore
                            htmlColor={
                              theme.palette.mode === "dark"
                                ? theme.palette.warning.light
                                : theme.palette.warning.main
                            }
                          />
                        }
                        label={localeText.bsRestore || "Restore"}
                        onClick={() => handleRestoreRow(rowId)}
                        sx={{
                          "&:hover": {
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "rgba(255, 183, 77, 0.2)"
                                : "rgba(237, 108, 2, 0.1)",
                          },
                        }}
                      />
                    );
                  }
                  return viewModeActions;
                }
              });
            } else if (effectiveVisibleEdit) {
              actions.push((params) => {
                // Get row-specific config
                const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
                const showEdit = rowConfig.showEdit !== false;

                if (!showEdit) return null;

                return (
                  <GridActionsCellItem
                    icon={
                      <Edit
                        htmlColor={
                          theme.palette.mode === "dark"
                            ? theme.palette.warning.light
                            : theme.palette.warning.dark
                        }
                      />
                    }
                    label="Edit"
                    onClick={() => handleEditClick(params.row)}
                    disabled={rowConfig.disabled}
                    sx={{
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 183, 77, 0.2)"
                            : "rgba(237, 108, 2, 0.1)",
                      },
                    }}
                  />
                );
              });
            }

            if (effectiveVisibleDelete) {
              bsLog(
                "🗑️ Adding Delete button action - effectiveVisibleDelete:",
                effectiveVisibleDelete
              );
              actions.push((params) => {
                // Get row-specific config
                const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
                const showDelete = rowConfig.showDelete !== false;

                if (!showDelete) return null;

                return (
                  <GridActionsCellItem
                    icon={
                      <Delete
                        htmlColor={
                          theme.palette.mode === "dark"
                            ? theme.palette.error.light
                            : theme.palette.error.main
                        }
                      />
                    }
                    label={localeText.bsDelete}
                    onClick={() => {
                      bsLog("🗑️ Delete button clicked for row:", params.row);
                      handleDeleteClick(params.row);
                    }}
                    disabled={rowConfig.disabled}
                    sx={{
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(244, 67, 54, 0.2)"
                            : "rgba(211, 47, 47, 0.1)",
                      },
                    }}
                  />
                );
              });
            }

            // Only insert actions column if there are actual actions
            if (actions.length > 0) {
              // Calculate actions column width based on mode
              const actionsWidth = bulkEditMode ? 100 : 80;

              dataColumns.unshift({
                field: "actions",
                type: "actions",
                headerName: "", // Hide column header
                width: actionsWidth,
                sortable: false,
                filterable: false,
                hideable: false,
                disableColumnMenu: true,
                getActions: (params) =>
                  actions
                    .map((a) => a(params))
                    .flat()
                    .filter(Boolean),
              });
            }
          }

          // Add row number column if enabled (for Enhanced Stored Procedure)
          if (bsShowRowNumber) {
            const rowNumberCol = {
              field: "__rowNumber",
              headerName: localeText.bsRowNumber,
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

                // Get the index of current row in the VISIBLE (paginated) rows
                // getRowIndexRelativeToVisibleRows returns 0-19 for page of 20 items
                const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
                  params.id
                );

                // Calculate absolute row number: page * pageSize + index + 1
                // Page 0: 0*20 + 0-19 + 1 = 1-20
                // Page 1: 1*20 + 0-19 + 1 = 21-40
                // Page 2: 2*20 + 0-19 + 1 = 41-60
                const rowNumber = currentPage * pageSize + rowIndex + 1;

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

          bsLog("✅ Generated columns from data:", dataColumns);
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
            
            // Debug: Check if comboConfig is found for this column
            if (columnName === 'app_id' || columnName === 'platform') {
              console.log(`🔎 Column ${columnName} comboConfig check:`, {
                comboConfig,
                comboBoxConfigKeys: Object.keys(comboBoxConfig),
                comboBoxValueOptions: comboBoxValueOptions[columnName],
              });
            }

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
              // CRITICAL: MUI DataGrid needs getOptionValue and getOptionLabel
              baseColumn.getOptionValue = (option) => option?.value ?? "";
              baseColumn.getOptionLabel = (option) => option?.label ?? "";
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
              // Read from state first (available during this render), fallback to ref
              // Note: Check for array with length > 0, not just truthy, since [] is truthy
              const stateOptions = comboBoxValueOptions[columnName];
              const refOptions = comboBoxValueOptionsRef.current[columnName];
              const options = (stateOptions && stateOptions.length > 0) 
                ? stateOptions 
                : (refOptions && refOptions.length > 0) 
                  ? refOptions 
                  : [];
              
              console.log(`📋 Building valueOptions for ${columnName}:`, {
                fromState: stateOptions?.length || 0,
                fromRef: refOptions?.length || 0,
                finalOptionsLength: options.length,
                sampleOptions: options.slice(0, 2),
              });
              
              const emptyOption = { value: "", label: "-- เลือก --" };
              let valueOptions;
              if (options && options.length > 0) {
                valueOptions = [emptyOption, ...options];
              } else {
                // Fallback to static valueOptions if provided in config
                const staticOptions = comboConfig.valueOptions || [];
                valueOptions =
                  staticOptions.length > 0
                    ? [emptyOption, ...staticOptions]
                    : [emptyOption];
              }
              baseColumn.valueOptions = valueOptions;
              // CRITICAL: MUI DataGrid needs getOptionValue and getOptionLabel
              // when valueOptions is an array of objects with { value, label }
              baseColumn.getOptionValue = (option) => option?.value ?? "";
              baseColumn.getOptionLabel = (option) => option?.label ?? "";
              baseColumn.renderCell = (params) =>
                renderComboBoxCell(params, comboConfig);
              // CRITICAL FIX: Use custom renderEditCell to bypass MUI's column caching
              // This reads options from ref at edit time, always getting current data
              baseColumn.renderEditCell = (params) =>
                renderComboBoxEditCell(params, comboConfig);
              console.log(`🔽 ComboBox column configured: ${columnName}`, {
                type: baseColumn.type,
                editable: baseColumn.editable,
                valueOptionsCount: valueOptions?.length || 0,
                sampleOptions: valueOptions?.slice(0, 3),
                hasOptions: options && options.length > 0,
              });
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

            baseColumn.valueGetter = (value, row) => {
              // Handle user lookup display fields for create_by and update_by
              // Always check for _display fields (backend now always provides them)
              // Fallback to user_id if _display is null/empty
              if (columnName === "create_by") {
                return row.create_by_display || value || "";
              }
              if (columnName === "update_by") {
                return row.update_by_display || value || "";
              }

              // Handle datetime fields
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

          if (effectiveVisibleView && onView) {
            actions.push((params) => {
              // Get row-specific config
              const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
              const showView = rowConfig.showView !== false;

              if (!showView) return null;

              return (
                <GridActionsCellItem
                  icon={<Visibility />}
                  label="View"
                  onClick={() => onView(params.row)}
                  disabled={rowConfig.disabled}
                />
              );
            });
          }

          // In bulk edit mode, show Save/Cancel buttons for editing rows, or Edit/Delete for non-editing rows
          if (bulkEditMode) {
            actions.push((params) => {
              const isInEditMode =
                rowModesModel[params.id]?.mode === GridRowModes.Edit;
              const primaryKey = metadata?.primaryKeys?.[0] || bsKeyId || "id";
              const rowId =
                params.row[primaryKey] || params.row.id || params.row.Id;
              const hasChanges = !!unsavedChangesRef.current[rowId];

              if (isInEditMode) {
                // Row is in edit mode - show Save and Cancel buttons
                return [
                  <GridActionsCellItem
                    key="save"
                    icon={<SaveIcon />}
                    label={localeText.bsSave}
                    onClick={() => handleBulkRowSaveClick(params.id)}
                    sx={{ color: "primary.main" }}
                  />,
                  <GridActionsCellItem
                    key="cancel"
                    icon={<CancelIcon />}
                    label={localeText.bsCancel}
                    onClick={() => handleBulkRowCancelClick(params.id)}
                    color="inherit"
                  />,
                ];
              } else {
                // Row is in view mode - show Edit button (and Restore if has changes)
                const viewModeActions = [
                  <GridActionsCellItem
                    key="edit"
                    icon={<Edit />}
                    label={localeText.bsEdit}
                    onClick={() => handleBulkRowEditClick(params.id)}
                    color="inherit"
                  />,
                ];
                if (hasChanges) {
                  viewModeActions.push(
                    <GridActionsCellItem
                      key="restore"
                      icon={<Restore />}
                      label={localeText.bsRestore || "Restore"}
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
                }
                return viewModeActions;
              }
            });

            // // Add Delete button separately for bulk edit mode (so it always shows)
            // if (effectiveVisibleDelete) {
            //   actions.push((params) => {
            //     // Get row-specific config
            //     const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
            //     const showDelete = rowConfig.showDelete !== false;

            //     if (!showDelete) return null;

            //     return (
            //       <GridActionsCellItem
            //         key="delete"
            //         icon={<Delete />}
            //         label={localeText.bsDelete}
            //         onClick={() => handleDeleteClick(params.row)}
            //         disabled={rowConfig.disabled}
            //         sx={{ color: "error.main" }}
            //       />
            //     );
            //   });
            // }
          } else if (effectiveBulkAddInline) {
            // Inline bulk add actions
            actions.push((params) => {
              const isInEditMode =
                rowModesModel[params.id]?.mode === GridRowModes.Edit;

              if (isInEditMode) {
                return [
                  <GridActionsCellItem
                    key="save"
                    icon={<SaveIcon />}
                    label={localeText.bsSave}
                    onClick={handleInlineSaveClick(params.id)}
                    sx={{ color: "primary.main" }}
                  />,
                  <GridActionsCellItem
                    key="cancel"
                    icon={<CancelIcon />}
                    label={localeText.bsCancel}
                    onClick={handleInlineCancelClick(params.id)}
                    color="inherit"
                  />,
                ];
              } else {
                // In bulk edit/add mode - only show edit button, no delete
                return [
                  <GridActionsCellItem
                    key="edit"
                    icon={<Edit />}
                    label={localeText.bsEdit}
                    onClick={handleInlineEditClick(params.id)}
                    color="inherit"
                  />,
                  <GridActionsCellItem
                    key="delete"
                    icon={<Delete />}
                    label={localeText.bsDelete}
                    onClick={handleInlineDeleteClick(params.id)}
                    color="inherit"
                  />,
                ];
              }
            });
          } else {
            // Regular edit/delete actions (only in normal mode)
            if (effectiveVisibleEdit) {
              actions.push((params) => {
                // Get row-specific config
                const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
                const showEdit = rowConfig.showEdit !== false;

                if (!showEdit) return null;

                return (
                  <GridActionsCellItem
                    icon={<Edit />}
                    label="Edit"
                    onClick={() => handleEditClick(params.row)}
                    disabled={rowConfig.disabled}
                  />
                );
              });
            }

            if (effectiveVisibleDelete) {
              actions.push((params) => {
                // Get row-specific config
                const rowConfig = bsRowConfig ? bsRowConfig(params.row) : {};
                const showDelete = rowConfig.showDelete !== false;

                if (!showDelete) return null;

                return (
                  <GridActionsCellItem
                    icon={<Delete />}
                    label={localeText.bsDelete}
                    onClick={() => handleDeleteClick(params.row)}
                    disabled={rowConfig.disabled}
                  />
                );
              });
            }
          }

          // Only insert actions column if there are actual actions
          // Note: bulkEditMode and effectiveBulkAddInline always have actions, so check for them first
          // For normal mode, check if we have any visible actions (effectiveVisibleView, effectiveVisibleEdit, effectiveVisibleDelete)
          const hasActions =
            bulkEditMode ||
            effectiveBulkAddInline ||
            (effectiveVisibleView && onView) ||
            effectiveVisibleEdit ||
            effectiveVisibleDelete;

          if (hasActions && actions.length > 0) {
            // Calculate actions column width based on mode
            // Bulk edit mode needs more space for Save/Cancel/Delete or Edit/Restore/Delete buttons
            const actionsWidth =
              bulkEditMode || effectiveBulkAddInline ? 130 : 80;

            dataColumns.unshift({
              field: "actions",
              type: "actions",
              headerName: "", // Hide column header
              width: actionsWidth,
              sortable: false,
              filterable: false,
              hideable: false,
              disableColumnMenu: true,
              getActions: (params) =>
                actions
                  .map((a) => a(params))
                  .flat()
                  .filter(Boolean),
            });
          }
        }

        // Add row number column if enabled
        if (bsShowRowNumber) {
          const rowNumberCol = {
            field: "__rowNumber",
            headerName: localeText.bsRowNumber,
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

              // Get the index of current row in the VISIBLE (paginated) rows
              // getRowIndexRelativeToVisibleRows returns 0-19 for page of 20 items
              const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
                params.id
              );

              // Calculate absolute row number: page * pageSize + index + 1
              // Page 0: 0*20 + 0-19 + 1 = 1-20
              // Page 1: 1*20 + 0-19 + 1 = 21-40
              // Page 2: 2*20 + 0-19 + 1 = 41-60
              const rowNumber = currentPage * pageSize + rowIndex + 1;

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
        bsLog("🔍 Column filtering in useMemo:", {
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

          bsLog("✅ Column filtering applied:", {
            originalCount: dataColumns.length,
            filteredCount: filteredDataColumns.length,
            filteredFields: filteredDataColumns.map((c) => c.field),
          });
        } else {
          bsLog("⚠️ No column filtering - showing all columns");
        }

        // Apply hidden columns filter (used by child grids to hide FK columns)
        if (bsHiddenColumns && bsHiddenColumns.length > 0) {
          filteredDataColumns = filteredDataColumns.filter(
            (col) =>
              col.field === "actions" ||
              col.field === "__rowNumber" ||
              !bsHiddenColumns.includes(col.field)
          );
          bsLog("🙈 Hidden columns applied:", {
            hiddenColumns: bsHiddenColumns,
            remainingCount: filteredDataColumns.length,
          });
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
          // description: col.description || col.headerName,
          headerName: col.headerName,
          type: col.type || "string",
          // Removed default width - let DataGrid auto-calculate
          editable: Boolean(col.editable),
          sortable: col.sortable !== false,
          filterable: col.filterable !== false,
          hideable: col.hideable !== false,
          ...col, // Include any other properties
        }));

        // console.log("🔍 Final columns check:", {
        //   isArray: Array.isArray(finalColumns),
        //   count: finalColumns.length,
        //   type: typeof finalColumns,
        //   allValid: finalColumns.every(
        //     (c) =>
        //       c &&
        //       typeof c.field === "string" &&
        //       typeof c.headerName === "string"
        //   ),
        //   comboboxColumns: finalColumns.filter(c => 
        //     c.field === 'app_id' || c.field === 'platform'
        //   ).map((c) => ({
        //     field: c.field,
        //     type: c.type,
        //     hasValueOptions: !!c.valueOptions,
        //     valueOptionsCount: c.valueOptions?.length || 0,
        //     sampleOptions: c.valueOptions?.slice(0, 3),
        //   })),
        // });

        // Cache the columns before returning
        columnsKeyRef.current = columnsKey;
        columnsRef.current = finalColumns;
        return finalColumns;
      } catch (error) {
        Logger.error("❌ Error building columns:", error);
        return columnsRef.current.length > 0 ? columnsRef.current : []; // Return cached or empty on error
      }
      // CRITICAL: columnsKey encapsulates most dependencies, but we need comboBoxValueOptions
      // to be directly referenced to avoid stale closure when building dropdown options
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnsKey, comboBoxValueOptions]);

    // Generate custom row styles from bsRowConfig
    const customRowStyles = useMemo(() => {
      bsLog("🎨 customRowStyles computing:", {
        hasBsRowConfig: !!bsRowConfig,
        rowsLength: rows?.length || 0,
      });

      if (!bsRowConfig || !rows || rows.length === 0) return {};

      const styles = {};
      rows.forEach((row) => {
        const rowConfig = bsRowConfig(row);
        const primaryKey = getEffectivePrimaryKey(row);
        const rowId = row[primaryKey] || row.id || row.Id;

        // Build row selector for styling
        const rowSelector = `& .MuiDataGrid-row[data-id="${rowId}"]`;

        // Hide checkbox when showCheckbox is false
        if (rowConfig.showCheckbox === false) {
          bsLog("🚫 Hiding checkbox for row:", rowId);
          styles[`${rowSelector} .MuiDataGrid-cellCheckbox .MuiCheckbox-root`] =
            {
              visibility: "hidden",
            };
        }

        // Apply background and text colors
        if (rowConfig.backgroundColor || rowConfig.textColor) {
          styles[rowSelector] = {
            ...(styles[rowSelector] || {}),
            backgroundColor: rowConfig.backgroundColor || "inherit",
            color: rowConfig.textColor || "inherit",
            "&:hover": {
              backgroundColor: rowConfig.backgroundColor
                ? `${rowConfig.backgroundColor}dd` // Slightly darker on hover
                : "#f9f9f9",
            },
            "& .MuiDataGrid-cell": {
              color: rowConfig.textColor || "inherit",
            },
          };
        }
      });

      bsLog("🎨 customRowStyles result:", {
        stylesCount: Object.keys(styles).length,
        styles,
      });
      return styles;
    }, [bsRowConfig, rows, getEffectivePrimaryKey]);

    // CRITICAL: Use ref to cache validatedColumns and prevent new array references
    const validatedColumnsRef = useRef([]);
    const validatedColumnsKeyRef = useRef("");

    // Memoize validated columns to prevent infinite re-renders in DataGridPro
    const validatedColumns = useMemo(() => {
      const safeColumns = Array.isArray(columns) ? columns : [];

      // Create a stable key from column fields
      const columnsFieldKey = safeColumns.map((c) => c?.field || "").join(",");

      // Only recompute if the columns have actually changed
      if (
        validatedColumnsKeyRef.current === columnsFieldKey &&
        validatedColumnsRef.current.length > 0
      ) {
        return validatedColumnsRef.current;
      }

      const validated = safeColumns.filter(
        (col) =>
          col &&
          typeof col === "object" &&
          typeof col.field === "string" &&
          col.field.length > 0 &&
          typeof col.headerName === "string"
      );

      // Cache the result
      validatedColumnsKeyRef.current = columnsFieldKey;
      validatedColumnsRef.current = validated;

      return validated;
    }, [columns]);

    // Memoize filtered rows to prevent new array reference on every render
    const filteredRows = useMemo(() => {
      return rows.filter(
        (row) => row && typeof row === "object" && Object.keys(row).length > 0
      );
    }, [rows]);

    // Memoize autosizeOptions to prevent infinite re-renders
    const autosizeOptions = useMemo(() => {
      const columnsToAutosize = validatedColumns
        .filter((col) => {
          const customDef = columnDefsConfig[col.field];
          return !customDef?.width;
        })
        .map((col) => col.field);
      return {
        columns: columnsToAutosize,
        includeHeaders: true,
        includeOutliers: false,
        expand: true,
      };
    }, [validatedColumns, columnDefsConfig]);

    // Memoize getRowId callback to prevent infinite re-renders
    const getRowId = useCallback(
      (row) => {
        const primaryKey = getEffectivePrimaryKey(row);

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
      },
      [getEffectivePrimaryKey]
    );

    // Memoize getRowClassName callback to prevent re-renders
    const getRowClassName = useCallback(
      (params) => {
        const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
        const rowId = params.row[primaryKey] || params.row.id || params.row.Id;

        const classes = [];

        // Add striped styling
        if (params.indexRelativeToCurrentPage % 2 === 0) {
          classes.push("even");
        }

        // Add unsaved changes styling
        if (unsavedChangesRef.current[rowId]) {
          classes.push("unsaved-changes");
        }

        // Add custom row class from bsRowConfig
        if (bsRowConfig) {
          const rowConfig = bsRowConfig(params.row);
          if (rowConfig.className) {
            classes.push(rowConfig.className);
          }
          // Add custom-styled class if backgroundColor or textColor is set
          if (rowConfig.backgroundColor || rowConfig.textColor) {
            classes.push(`custom-row-${params.id}`);
          }
        }

        return classes.join(" ");
      },
      [metadata?.primaryKeys, bsRowConfig]
    );

    // Memoize isRowSelectable callback to prevent re-renders
    const isRowSelectable = useCallback(
      (params) => {
        if (bsRowConfig) {
          const rowConfig = bsRowConfig(params.row);
          // If showCheckbox is explicitly false, row is not selectable
          if (rowConfig.showCheckbox === false) {
            return false;
          }
        }
        return true;
      },
      [bsRowConfig]
    );

    // Handle row selection changes for checkbox selection
    const handleRowSelectionChange = useCallback(
      (newRowSelectionModel) => {
        bsLog("🔍 ROW SELECTION DEBUG - Start:", {
          newRowSelectionModel,
          rowsCount: rows.length,
          firstRowSample: rows.length > 0 ? Object.keys(rows[0]) : "NO ROWS",
          firstRowData: rows.length > 0 ? rows[0] : "NO ROWS",
        });

        setRowSelectionModel(newRowSelectionModel);

        if (onCheckBoxSelected) {
          // Debug metadata information
          bsLog("🔑 PRIMARY KEY DETECTION - Start:", {
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

          bsLog("🔑 Using primary key from metadata:", primaryKey);

          bsLog("🔑 PRIMARY KEY for selection:", {
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

            bsLog("🔍 Checking row:", {
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

          bsLog("✅ FINAL SELECTED ROWS:", {
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

    // Bulk operations handlers
    const handleBulkAdd = useCallback(() => {
      if (!effectiveBulkAdd) {
        Logger.warn("⚠️ Bulk Add is disabled");
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
      bsLog("📝 Bulk Add dialog opened with", bulkRowCount, "empty rows");
    }, [effectiveBulkAdd, metadata, bulkRowCount, initializeFormData]);

    const handleBulkEdit = useCallback(() => {
      if (!effectiveBulkEdit) {
        Logger.warn("⚠️ Bulk Edit is disabled");
        return;
      }

      bsLog("🔍 handleBulkEdit - checking selection:", {
        rowSelectionModel,
        rowsCount: rows.length,
      });

      const selectedRows = rows.filter((row) => {
        const primaryKey = getEffectivePrimaryKey(row);
        // Use String() to match getRowId logic which returns String(row[primaryKey])
        const rowId =
          row[primaryKey] != null ? String(row[primaryKey]) : row.id || row.Id;
        const isSelected = rowSelectionModel.includes(rowId);

        bsLog("🔍 Row check:", { primaryKey, rowId, isSelected });
        return isSelected;
      });

      bsLog("🔍 handleBulkEdit - selectedRows:", selectedRows.length);

      if (selectedRows.length === 0) {
        Logger.warn("⚠️ No rows selected for bulk edit");
        return;
      }

      setBulkEditMode(true);
      unsavedChangesRef.current = {};
      setHasUnsavedChanges(false);
      bsLog("📝 Bulk Edit mode enabled for", selectedRows.length, "rows");
    }, [effectiveBulkEdit, rows, rowSelectionModel, getEffectivePrimaryKey]);

    const handleBulkDelete = useCallback(async () => {
      if (!effectiveBulkDelete) {
        Logger.warn("⚠️ Bulk Delete is disabled");
        return;
      }

      const selectedRows = rows.filter((row) => {
        const primaryKey = getEffectivePrimaryKey(row);
        // Use String() to match getRowId logic which returns String(row[primaryKey])
        const rowId =
          row[primaryKey] != null ? String(row[primaryKey]) : row.id || row.Id;
        return rowSelectionModel.includes(rowId);
      });

      if (selectedRows.length === 0) return;

      // Get locale text for confirm message
      const currentLocaleText = getLocaleText(getEffectiveLocale());
      const isConfirmed = await BSAlertSwal2.confirm(
        currentLocaleText.bsConfirmDeleteRecords(selectedRows.length),
        {
          title: currentLocaleText.bsConfirmDelete || "Delete Confirmation",
          confirmButtonText:
            currentLocaleText.bsYesDelete || "Yes, delete them!",
          cancelButtonText: currentLocaleText.bsCancel || "Cancel",
        }
      );

      if (isConfirmed) {
        try {
          // Bulk delete - use SP CRUD if configured
          for (const row of selectedRows) {
            const primaryKey = getEffectivePrimaryKey(row);
            const id = row[primaryKey];
            if (id) {
              if (bsStoredProcedure && bsStoredProcedureCrud) {
                await executeSpCrud("DELETE", {}, id);
              } else {
                await deleteRecord(id, null, bsPreObj);
              }
            }
          }

          setRowSelectionModel([]);
          await loadData();
          bsLog("✅ Bulk delete completed");
        } catch (err) {
          Logger.error("❌ Bulk delete failed:", err);
          setError(err.message || "Failed to delete records");
        }
      }
    }, [
      effectiveBulkDelete,
      rows,
      rowSelectionModel,
      deleteRecord,
      loadData,
      bsPreObj,
      getEffectivePrimaryKey,
      getEffectiveLocale,
      bsStoredProcedure,
      bsStoredProcedureCrud,
      executeSpCrud,
    ]);

    // Custom Excel Export Handler
    const handleExportExcel = useCallback(() => {
      try {
        // Get visible column definitions (excluding actions and checkbox columns)
        const visibleColumns = columns.filter(
          (col) => col.field !== "actions" && col.field !== "__check__"
        );

        // Get filtered and sorted row IDs from grid using apiRef
        const filteredRowIds = gridFilteredSortedRowIdsSelector(apiRef);

        bsLog("📊 Export - filteredRowIds:", {
          count: filteredRowIds.length,
          sample: filteredRowIds.slice(0, 5),
        });

        // Get rows data using apiRef.current.getRow() for accurate filtered data
        const filteredRows = filteredRowIds
          .map((id) => {
            // Use apiRef.current.getRow() to get the actual row from DataGrid state
            if (apiRef.current) {
              return apiRef.current.getRow(id);
            }
            // Fallback to finding in rows array
            const primaryKey = getEffectivePrimaryKey(rows[0]);
            return rows.find((r) => r[primaryKey] === id);
          })
          .filter(Boolean);

        bsLog("📊 Export - filteredRows:", {
          count: filteredRows.length,
          totalRows: rows.length,
        });

        // Use filtered rows (if any filters are applied, filteredRowIds will be subset of all rows)
        const dataToExport = filteredRows.length > 0 ? filteredRows : rows;

        // Transform data to include only visible columns with proper headers
        // Include row number column with calculated values
        const exportData = dataToExport.map((row, index) => {
          const exportRow = {};
          visibleColumns.forEach((col) => {
            const header = col.headerName || col.field;

            // Handle row number column specially - calculate the value
            // Note: field is "__rowNumber" (not "__rowNumber__")
            if (col.field === "__rowNumber") {
              // For export, always start from 1 (not based on current page)
              exportRow[header] = index + 1;
            } else {
              exportRow[header] = row[col.field] ?? "";
            }
          });
          return exportRow;
        });

        // Create worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Auto-fit column widths
        const columnWidths = visibleColumns.map((col) => {
          const header = col.headerName || col.field;
          const maxLength = Math.max(
            header.length,
            ...exportData.map((row) => String(row[header] || "").length)
          );
          return { wch: Math.min(maxLength + 2, 50) };
        });
        worksheet["!cols"] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

        // Generate filename - use bsExportFileName prop if provided, otherwise use table name
        const exportFileName =
          bsExportFileName || effectiveTableName || "export";
        const filename = `${exportFileName}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

        // Trigger download
        XLSX.writeFile(workbook, filename);

        bsLog(
          "✅ Excel export completed:",
          filename,
          "rows:",
          exportData.length
        );
      } catch (err) {
        Logger.error("❌ Excel export failed:", err);
        BSAlertSwal2.show(
          "error",
          localeText.bsExportExcelError || "Failed to export Excel",
          {
            title: localeText.bsError || "Error",
          }
        );
      }
    }, [
      apiRef,
      columns,
      rows,
      effectiveTableName,
      bsExportFileName,
      getEffectivePrimaryKey,
      localeText,
    ]);

    // Custom CSV Export Handler (uses DataGrid's built-in CSV export)
    const handleExportCsv = useCallback(() => {
      try {
        if (apiRef.current) {
          // Use bsExportFileName prop if provided, otherwise use table name
          const exportFileName =
            bsExportFileName || effectiveTableName || "export";
          apiRef.current.exportDataAsCsv({
            delimiter: ";",
            utf8WithBom: true,
            escapeFormulas: false,
            fileName: `${exportFileName}_${
              new Date().toISOString().split("T")[0]
            }`,
          });
          bsLog("✅ CSV export triggered");
        }
      } catch (err) {
        Logger.error("❌ CSV export failed:", err);
      }
    }, [apiRef, bsExportFileName, effectiveTableName]);

    // Custom Print Handler (uses DataGrid's built-in print)
    const handlePrint = useCallback(() => {
      try {
        if (apiRef.current) {
          apiRef.current.exportDataAsPrint({
            hideFooter: false,
            hideToolbar: true,
          });
          bsLog("✅ Print triggered");
        }
      } catch (err) {
        Logger.error("❌ Print failed:", err);
      }
    }, [apiRef]);

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
            validationErrors.push({
              rowNumber: index + 1,
              errors: validation.errors,
            });
          }
        });

        if (validationErrors.length > 0) {
          // Build user-friendly HTML message
          const errorHtml = validationErrors
            .map((item) => {
              const errorItems = item.errors
                .map(
                  (err) => `<li style="margin: 2px 0; color: #666;">${err}</li>`
                )
                .join("");
              return `
                <div style="text-align: left; margin-bottom: 12px; padding: 10px; background: #fff5f5; border-radius: 6px; border-left: 3px solid #e74c3c;">
                  <strong style="color: #c0392b;">📋 ${
                    localeText.bsRow || "Row"
                  } ${item.rowNumber}</strong>
                  <ul style="margin: 5px 0 0 15px; padding: 0; list-style: disc;">${errorItems}</ul>
                </div>`;
            })
            .join("");

          BSAlertSwal2.show("error", "", {
            title:
              localeText.bsValidationError || "Please complete required fields",
            html: `<div style="max-height: 300px; overflow-y: auto;">${errorHtml}</div>`,
            width: 450,
          });
          return;
        }

        bsLog("💾 Saving", validRows.length, "bulk records");

        // Save each row individually
        for (const row of validRows) {
          const { _id, ...data } = row;
          await createRecord(data, bsPreObj);
        }

        setBulkAddDialogOpen(false);
        setBulkAddRows([]);
        await loadData();
        bsLog("✅ Bulk add completed successfully");
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
          // Get the actual primary key value from row data
          // Do NOT use generated id (starts with "generated-") as it's not a real database value
          let rowId = newRow[primaryKey];

          // If primary key value is not found, try other common id fields
          if (rowId == null) {
            rowId = newRow.id || newRow.Id || newRow.ID;
          }

          // Validate that we have a real primary key value, not a generated one
          if (
            rowId == null ||
            (typeof rowId === "string" && rowId.startsWith("generated-"))
          ) {
            const errorMsg = `Cannot update row: Primary key "${primaryKey}" value is missing or invalid. Please refresh the data.`;
            Logger.error("❌ " + errorMsg, { newRow, primaryKey, rowId });
            throw new Error(errorMsg);
          }

          bsLog("📝 Normal mode update:", {
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

          // Filter to only include fields that exist in metadata (actual table columns)
          // This removes display-only fields like create_by_display, update_by_display
          // that are generated by user lookup but are not actual database columns
          if (metadata?.columns && Array.isArray(metadata.columns)) {
            const validColumns = new Set(
              metadata.columns.map((col) => col.columnName)
            );
            Object.keys(cleanData).forEach((key) => {
              if (!validColumns.has(key)) {
                delete cleanData[key];
              }
            });
          }

          bsLog("📝 Clean data for update (normal mode):", {
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
              bsLog("✅ Normal mode update successful:", {
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
                  bsLog(
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
              const errorInfo = formatSqlErrorMessage(
                error.message || "Failed to update record",
                "update"
              );
              showErrorWithDetails(errorInfo);
              throw error;
            });
        }

        // Bulk edit mode - handle new rows vs existing rows
        const primaryKey = metadata?.primaryKeys?.[0] || bsKeyId || "id";
        // Get the actual primary key value - prefer real PK over generated id
        let rowId = newRow[primaryKey];
        if (rowId == null) {
          rowId = newRow.id || newRow.Id || newRow.ID;
        }

        // Check if this is a new row (Add mode) - new rows have id starting with "new-"
        const isNewRow = typeof rowId === "string" && rowId.startsWith("new-");

        // For new rows, save immediately to backend to get real ID
        // BUT skip if bulk save is already in progress OR row was already saved in bulk
        if (isNewRow) {
          // Check if bulk save is in progress - if so, skip individual save
          if (isBulkSavingRef.current) {
            bsLog(
              "⏭️ Skipping individual save - bulk save in progress:",
              rowId
            );
            return newRow; // Return row as-is, bulk save will handle it
          }

          // Check if this row was already saved in bulk save (prevents double-save after bulk completes)
          if (savedRowIdsRef.current.has(rowId)) {
            bsLog(
              "⏭️ Skipping individual save - row already saved in bulk:",
              rowId
            );
            savedRowIdsRef.current.delete(rowId); // Clear after check
            return newRow;
          }

          bsLog("📝 Bulk edit - saving NEW row immediately:", {
            rowId,
            newRow,
          });

          // Remove invalid id fields from data before sending to backend
          const cleanData = { ...newRow };
          delete cleanData.id;
          delete cleanData.Id;
          delete cleanData.ID;
          delete cleanData.isNew;

          // Remove audit fields - these should be managed by backend
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
            "timestamp",
          ];
          auditFields.forEach((field) => {
            delete cleanData[field];
          });

          // Filter to only include fields that exist in metadata (actual table columns)
          if (metadata?.columns && Array.isArray(metadata.columns)) {
            const validColumns = new Set(
              metadata.columns.map((col) => col.columnName)
            );
            Object.keys(cleanData).forEach((key) => {
              if (!validColumns.has(key)) {
                delete cleanData[key];
              }
            });
          }

          // Save new record to backend
          return createRecord(cleanData, bsPreObj)
            .then(async (result) => {
              bsLog("✅ New row created successfully:", result);

              // Show success notification
              BSAlertSwal2.show(
                "success",
                localeText.bsRecordCreated || "Record created successfully",
                {
                  title: localeText.bsSuccess || "Success",
                }
              );

              // Refresh data to get the latest from server
              setTimeout(() => {
                loadData(true);
              }, 100);

              return result;
            })
            .catch((error) => {
              Logger.error("❌ Failed to create new row:", error);
              const errorMessage = error.message || "Failed to create record";
              const errorInfo = formatSqlErrorMessage(errorMessage, "insert");
              showErrorWithDetails(errorInfo);
              throw error;
            });
        }

        // For existing rows, store changes WITHOUT saving to backend
        // User must click "Save All" to save changes
        unsavedChangesRef.current[rowId] = {
          newData: newRow,
          originalData: oldRow,
        };
        setHasUnsavedChanges(true);

        bsLog("📝 Bulk edit - row change stored (not saved):", {
          primaryKey,
          rowId,
          newData: newRow,
          originalData: oldRow,
        });

        // Update rows state to reflect the changes in UI immediately
        // This is important for bulk edit mode where we need to show edited values
        // even before saving to backend
        setRows((prevRows) =>
          prevRows.map((row) => {
            const currentRowId = row[primaryKey] || row.id || row.Id || row.ID;
            if (String(currentRowId) === String(rowId)) {
              return { ...row, ...newRow };
            }
            return row;
          })
        );

        // Return newRow to update the grid display but don't save to backend
        return newRow;
      },
      [
        bulkEditMode,
        metadata,
        bsKeyId,
        updateRecord,
        createRecord,
        loadData,
        bsPreObj,
        effectiveTableName,
        loadMetadata,
        localeText,
        formatSqlErrorMessage,
        showErrorWithDetails,
      ]
    );

    const handleBulkSaveChanges = useCallback(async () => {
      try {
        setFormLoading(true);
        setLoading(true); // Set loading to prevent rendering issues
        isBulkSavingRef.current = true; // Mark bulk save in progress

        // CRITICAL: Get current edit state and merge with row data BEFORE stopping edits
        // This ensures we capture values that are currently being edited
        let editRowsState = {};
        if (apiRef?.current) {
          try {
            editRowsState = apiRef.current.state?.editRows || {};
            bsLog("📝 Current editRows state:", editRowsState);
          } catch (e) {
            Logger.warn("⚠️ Could not get editRows state:", e);
          }
        }

        // Get the latest rows from the grid state
        let latestRows = [...rows]; // Clone to avoid mutation
        if (apiRef?.current) {
          try {
            const allRowIds = apiRef.current.getAllRowIds();
            latestRows = allRowIds
              .map((id) => apiRef.current.getRow(id))
              .filter(Boolean)
              .map((row) => ({ ...row })); // Clone each row
            bsLog("📝 Got latest rows from apiRef:", latestRows.length);
          } catch (getRowsError) {
            Logger.warn(
              "⚠️ Could not get rows from apiRef, using state:",
              getRowsError
            );
          }
        }

        // CRITICAL: Merge editRows state values into the row data
        // editRowsState structure: { [rowId]: { [fieldName]: { value: any } } }
        latestRows = latestRows.map((row) => {
          const rowId = String(row.id || row[getEffectivePrimaryKey()] || "");
          const editingFields = editRowsState[rowId];

          if (editingFields) {
            const updatedRow = { ...row };
            Object.entries(editingFields).forEach(([fieldName, fieldData]) => {
              // fieldData has structure: { value: actualValue, ... }
              if (fieldData && fieldData.value !== undefined) {
                updatedRow[fieldName] = fieldData.value;
                bsLog(
                  `📝 Merged edit value for ${rowId}.${fieldName}:`,
                  fieldData.value
                );
              }
            });
            return updatedRow;
          }
          return row;
        });

        bsLog("📝 Rows after merging editRows state:", latestRows);

        // Now stop cell edit mode (optional cleanup)
        if (apiRef?.current) {
          try {
            const editingRowIds = Object.keys(editRowsState);
            for (const rowId of editingRowIds) {
              const fieldIds = Object.keys(editRowsState[rowId] || {});
              for (const field of fieldIds) {
                try {
                  apiRef.current.stopCellEditMode({
                    id: rowId,
                    field: field,
                    ignoreModifications: true, // We already captured the values above
                  });
                } catch (stopError) {
                  // Ignore - cell may have already exited edit mode
                }
              }
            }
          } catch (editCommitError) {
            Logger.warn("⚠️ Error stopping cell edits:", editCommitError);
          }
        }

        // Get only the new data from changes (not the original data)
        const changesFromRef = Object.values(unsavedChangesRef.current).map(
          (change) => change.newData
        );

        // Also include new rows that are in the rows state but not yet in unsavedChangesRef
        // These are rows added via inline add mode
        // Use latestRows (with merged edit values) to get most current data
        const newRowsInGrid = latestRows.filter((row) => {
          const rowId = String(row.id || row[getEffectivePrimaryKey()] || "");
          return rowId.startsWith("new-") || row.isNew;
        });

        // Merge changes: prefer data from latestRows (with edit values), then from unsavedChangesRef
        // Create a map to merge by row ID
        const changesMap = new Map();

        // First, add all new rows from the grid (these have the latest cell values including edits)
        newRowsInGrid.forEach((row) => {
          const rowId = String(row.id || row[getEffectivePrimaryKey()] || "");
          changesMap.set(rowId, row);
        });

        // Then, merge with unsavedChangesRef data (for existing edited rows)
        changesFromRef.forEach((row) => {
          const rowId = String(row.id || row[getEffectivePrimaryKey()] || "");
          const existingRow = changesMap.get(rowId);
          if (existingRow) {
            // Merge: existing row from grid has latest values, overlay with ref data
            changesMap.set(rowId, { ...row, ...existingRow });
          } else {
            // For existing rows being edited, check if they have edit state
            const editingFields = editRowsState[rowId];
            if (editingFields) {
              const updatedRow = { ...row };
              Object.entries(editingFields).forEach(
                ([fieldName, fieldData]) => {
                  if (fieldData && fieldData.value !== undefined) {
                    updatedRow[fieldName] = fieldData.value;
                  }
                }
              );
              changesMap.set(rowId, updatedRow);
            } else {
              changesMap.set(rowId, row);
            }
          }
        });

        const changes = Array.from(changesMap.values());

        bsLog("📝 Final changes to save:", changes);

        if (changes.length === 0) {
          Logger.warn("⚠️ No changes to save");
          BSAlertSwal2.show("info", "No changes to save", {
            title: "Information",
          });
          return;
        }

        // Validate all changed rows before saving
        const validationErrors = [];
        changes.forEach((row, index) => {
          const validation = validateFormData(row);
          if (!validation.isValid) {
            // Build friendly error message for each row
            const rowNumber = index + 1;
            const errorList = validation.errors
              .map((err) => `  • ${err}`)
              .join("\n");
            validationErrors.push({
              rowNumber,
              errors: validation.errors,
            });
          }
        });

        if (validationErrors.length > 0) {
          // Build user-friendly HTML message
          const errorHtml = validationErrors
            .map((item) => {
              const errorItems = item.errors
                .map(
                  (err) => `<li style="margin: 2px 0; color: #666;">${err}</li>`
                )
                .join("");
              return `
                <div style="text-align: left; margin-bottom: 12px; padding: 10px; background: #fff5f5; border-radius: 6px; border-left: 3px solid #e74c3c;">
                  <strong style="color: #c0392b;">📋 ${
                    localeText.bsRow || "Row"
                  } ${item.rowNumber}</strong>
                  <ul style="margin: 5px 0 0 15px; padding: 0; list-style: disc;">${errorItems}</ul>
                </div>`;
            })
            .join("");

          BSAlertSwal2.show("error", "", {
            title:
              localeText.bsValidationError || "Please complete required fields",
            html: `<div style="max-height: 300px; overflow-y: auto;">${errorHtml}</div>`,
            width: 450,
          });
          return;
        }

        bsLog("💾 Saving bulk changes:", changes.length, "rows");

        // Save each changed row
        for (const row of changes) {
          const primaryKey = metadata?.primaryKeys?.[0] || "Id" || "id";
          // Get the actual primary key value from row data
          // Do NOT use generated id (starts with "generated-") as it's not a real database value
          let id = row[primaryKey];

          // If primary key value is not found, try other common id fields
          if (id == null) {
            id = row.id || row.Id || row.ID;
          }

          // Check if this is a new row (Add mode) - new rows have id starting with "new-" or isNew flag
          const isNewRow =
            row.isNew || (typeof id === "string" && id.startsWith("new-"));

          // Remove invalid id fields from data before sending to backend
          const cleanData = { ...row };

          // Remove isNew flag before saving
          delete cleanData.isNew;

          // Remove generic id fields that don't match the actual primary key
          if (primaryKey !== "id") delete cleanData.id;
          if (primaryKey !== "Id") delete cleanData.Id;
          if (primaryKey !== "ID") delete cleanData.ID;

          // Remove audit fields - these should be managed by backend
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
            "timestamp",
          ];
          auditFields.forEach((field) => {
            delete cleanData[field];
          });

          // Filter to only include fields that exist in metadata (actual table columns)
          // This removes display-only fields like create_by_display, update_by_display
          // that are generated by user lookup but are not actual database columns
          if (metadata?.columns && Array.isArray(metadata.columns)) {
            const validColumns = new Set(
              metadata.columns.map((col) => col.columnName)
            );
            Object.keys(cleanData).forEach((key) => {
              if (!validColumns.has(key)) {
                delete cleanData[key];
              }
            });
          }

          if (isNewRow) {
            // New row - use createRecord or SP INSERT
            bsLog("📝 Bulk save NEW row:", {
              isNewRow,
              cleanData,
              bsPreObj,
              useSpCrud: bsStoredProcedure && bsStoredProcedureCrud,
            });
            // Mark this row as saved to prevent double-save in processRowUpdate
            const originalRowId = row.id || row.Id || row.ID;
            if (originalRowId) {
              savedRowIdsRef.current.add(String(originalRowId));
            }

            // Use stored procedure CRUD if configured
            if (bsStoredProcedure && bsStoredProcedureCrud) {
              await executeSpCrud("INSERT", cleanData);
            } else {
              await createRecord(cleanData, bsPreObj);
            }
          } else {
            // Existing row - use updateRecord or SP UPDATE
            // Validate that we have a real primary key value, not a generated one
            if (
              id == null ||
              (typeof id === "string" && id.startsWith("generated-"))
            ) {
              const errorMsg = `Cannot update row: Primary key "${primaryKey}" value is missing or invalid. Please ensure the primary key column is included in bsCols or refresh the data.`;
              Logger.error("❌ " + errorMsg, { row, primaryKey, id });
              throw new Error(errorMsg);
            }

            bsLog("📝 Bulk save EXISTING row:", {
              primaryKey,
              id,
              cleanData,
              bsPreObj,
              useSpCrud: bsStoredProcedure && bsStoredProcedureCrud,
            });

            // Use stored procedure CRUD if configured
            if (bsStoredProcedure && bsStoredProcedureCrud) {
              await executeSpCrud("UPDATE", cleanData, id);
            } else {
              await updateRecord(id, cleanData, bsPreObj);
            }
          }
        }

        // Reset bulk edit state
        setBulkEditMode(false);
        unsavedChangesRef.current = {};
        setHasUnsavedChanges(false);
        setRowSelectionModel([]);
        setRowModesModel({}); // Clear row modes model to exit edit mode for all rows

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
        // Use loadStoredProcedureData for SP mode, otherwise use loadData
        if (bsStoredProcedure) {
          await loadStoredProcedureData(
            paginationModel,
            sortModel,
            filterModel,
            true // forceRefresh
          );
        } else {
          await loadData(true);
        }
        bsLog("✅ Bulk changes saved successfully and data refreshed");
      } catch (err) {
        Logger.error("❌ Bulk save failed:", err);
        setError(err.message || "Failed to save bulk changes");
      } finally {
        setFormLoading(false);
        setLoading(false); // Clear loading state
        isBulkSavingRef.current = false; // Reset bulk save flag
        // Clear saved row IDs after a delay to allow any pending processRowUpdate calls to check
        setTimeout(() => {
          savedRowIdsRef.current.clear();
        }, 500);
      }
    }, [
      metadata,
      createRecord,
      updateRecord,
      loadData,
      bsPreObj,
      validateFormData,
      loadMetadata,
      rows,
      getEffectivePrimaryKey,
      apiRef,
      bsStoredProcedure,
      bsStoredProcedureCrud,
      executeSpCrud,
      loadStoredProcedureData,
      paginationModel,
      sortModel,
      filterModel,
    ]);

    const handleBulkDiscardChanges = useCallback(async () => {
      try {
        // Set discard flag BEFORE any state changes to prevent processRowUpdate from firing
        isDiscardingRef.current = true;

        setLoading(true); // Set loading state
        setBulkEditMode(false);
        unsavedChangesRef.current = {};
        setHasUnsavedChanges(false);
        setRowSelectionModel([]);

        // IMPORTANT: Reset rowModesModel to clear any editing state
        // This prevents "No row with id #new-X found" error
        setRowModesModel({});

        // Remove all new rows (rows with id starting with "new-") before reloading
        setRows((oldRows) =>
          oldRows.filter((row) => {
            const rowId = String(row.id || row[getEffectivePrimaryKey()] || "");
            return !rowId.startsWith("new-");
          })
        );

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
        // Use loadStoredProcedureData for SP mode, otherwise use loadData
        if (bsStoredProcedure) {
          await loadStoredProcedureData(
            paginationModel,
            sortModel,
            filterModel,
            true // forceRefresh
          );
        } else {
          await loadData(true);
        }
        bsLog("🗑️ Bulk changes discarded");
      } catch (err) {
        Logger.error("❌ Failed to discard bulk changes:", err);
        setError(err.message || "Failed to discard changes");
      } finally {
        setLoading(false); // Always clear loading state
        // Reset discard flag after all operations complete
        isDiscardingRef.current = false;
      }
    }, [
      loadData,
      metadata,
      loadMetadata,
      bsPreObj,
      getEffectivePrimaryKey,
      bsStoredProcedure,
      loadStoredProcedureData,
      paginationModel,
      sortModel,
      filterModel,
    ]);

    const handleToggleHeaderFilters = useCallback(() => {
      setHeaderFiltersEnabled((prev) => {
        const newValue = !prev;
        bsLog(`🔧 Header filters ${newValue ? "enabled" : "disabled"}`);
        return newValue;
      });
    }, []);

    // Handle row editing events
    const handleRowEditStart = useCallback(
      (params) => {
        bsLog("📝 Row edit started:", params.id);

        // If bulk edit is disabled, prevent any editing
        if (!effectiveBulkEdit && !effectiveBulkAddInline) {
          Logger.warn("⚠️ Bulk edit mode is disabled - preventing edit");
          // Prevent entering edit mode
          if (params.event) {
            params.event.defaultMuiPrevented = true;
          }
          return; // Stop execution here
        }

        // Enable bulk edit mode if effectiveBulkEdit OR effectiveBulkAddInline is true
        // This shows the Save All / Discard All toolbar
        if (!bulkEditMode && (effectiveBulkEdit || effectiveBulkAddInline)) {
          setBulkEditMode(true);
          unsavedChangesRef.current = {};
          setHasUnsavedChanges(false);
          bsLog("📝 Bulk Edit mode enabled via row double-click");
        }
      },
      [bulkEditMode, effectiveBulkEdit, effectiveBulkAddInline]
    );

    const handleRowEditStop = useCallback(
      (params) => {
        bsLog("📝 Row edit stopped:", params.id, "reason:", params.reason);

        // If user cancels editing (Escape key) and there are no unsaved changes,
        // automatically exit bulk edit mode
        if (params.reason === "escapeKeyDown" && !hasUnsavedChanges) {
          setBulkEditMode(false);
          bsLog("📝 Bulk Edit mode disabled - user cancelled with no changes");
        }
        // For other reasons (like clicking away), keep bulk edit mode active
        // Let user manually save/discard changes via toolbar
      },
      [hasUnsavedChanges]
    );

    // Loading state
    if (metadataLoading) {
      bsLog("🔄 BSDataGrid: metadata is loading...", effectiveTableName);
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
            <Typography variant="body1">{localeText.bsLoadingData}</Typography>
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
                {localeText.bsRetry}
              </Button>
            }
          >
            <Typography variant="h6">
              {isNotFound
                ? localeText.bsTableNotFound
                : localeText.bsFailedToLoadMetadata}
            </Typography>
            <Typography variant="body2">Table: {effectiveTableName}</Typography>
            <Typography variant="body2">
              {isNotFound
                ? localeText.bsTableNotFoundMessage
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
            <Typography variant="h6">
              {localeText.bsBackendNotAvailable}
            </Typography>
            <Typography variant="body2">Table: {effectiveTableName}</Typography>
            <Typography variant="body2">
              {localeText.bsCheckBackendConnection}
            </Typography>
          </Alert>

          {/* Show toolbar even without metadata for testing */}
          {showToolbar && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" component="div">
                {effectiveTableName} ({localeText.bsOfflineMode})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {localeText.bsCannotLoadMetadata}
              </Typography>
            </Box>
          )}

          {/* Show basic toolbar for testing */}
          {showToolbar && (
            <FallbackToolbar
              onAdd={handleAddClick}
              showAdd={effectiveShowAdd}
              headerFiltersEnabled={headerFiltersEnabled}
              onToggleHeaderFilters={handleToggleHeaderFilters}
              localeText={localeText}
            />
          )}

          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              {localeText.bsCannotDisplayData}
            </Typography>
            <Button
              onClick={() => loadMetadata(bsPreObj)}
              variant="outlined"
              sx={{ mt: 2 }}
            >
              {localeText.bsTryAgain}
            </Button>
          </Box>
        </Paper>
      );
    }

    bsLog("✅ BSDataGrid: rendering with metadata", {
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
              <IconButton
                aria-label={localeText.bsClose}
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CancelIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {/* Bulk Edit Toolbar - Now integrated into DynamicGridToolbar */}
        {/* The old standalone BulkEditToolbar is no longer needed here */}

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
            bsLog("🔧 About to render DataGridPro with:", {
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

            // If no valid columns, show appropriate message with Add button
            if (validatedColumns.length === 0) {
              // Check if we're still loading data
              const isStillLoading = loading || metadataLoading;

              // Check if Add should be allowed (Enhanced SP with bsColumnDefs or bsCols)
              const canAddWithoutData =
                bsStoredProcedure &&
                ((bsColumnDefs && bsColumnDefs.length > 0) ||
                  (bsCols && bsCols.length > 0));

              return (
                <Box
                  sx={{
                    height: height === "auto" ? 400 : height,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Show Toolbar with Add button like normal DataGrid */}
                  {showToolbar && (canAddWithoutData || metadata) && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        p: 1,
                        borderBottom: 1,
                        borderColor: "divider",
                        backgroundColor: "background.paper",
                      }}
                    >
                      {showAdd && (
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={handleAddClick}
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
                          {localeText.bsAddRecord}
                        </Button>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => refreshData(true)}
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
                    </Box>
                  )}

                  {/* No Data Message */}
                  <Box
                    sx={{
                      flex: 1,
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
                              ? localeText.bsLoadingColumns
                              : localeText.bsLoadingData}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography
                            variant="h6"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            {localeText.bsNoData}
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            {bsStoredProcedure
                              ? localeText.bsNoDataInDatabase
                              : localeText.bsNoRecordsInTable}
                          </Typography>
                        </>
                      )}
                    </Box>
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
                  apiRef={apiRef}
                  rows={filteredRows}
                  columns={validatedColumns}
                  // Only set rowCount for server-side pagination
                  {...(bsFilterMode === "server" && { rowCount })}
                  loading={
                    loading ||
                    metadataLoading ||
                    comboBoxLoading ||
                    (!Array.isArray(columns) && loading) ||
                    (columns.length === 0 && loading)
                  }
                  // Ensure we don't render until we have valid data structure
                  // Use stable key that forces re-mount when combobox data loads
                  // This ensures columns are rebuilt with correct valueOptions
                  key={`datagrid-${effectiveTableName}-comboReady-${!comboBoxLoading && Object.keys(comboBoxValueOptions).length > 0}`}
                  // Editing - only enable if bulk edit mode is enabled
                  editMode="row"
                  processRowUpdate={
                    effectiveBulkEdit || effectiveBulkAddInline
                      ? effectiveBulkAddInline
                        ? processRowUpdate
                        : processBulkRowUpdate
                      : undefined
                  }
                  onRowEditStart={handleRowEditStart}
                  onRowEditStop={
                    effectiveBulkAddInline
                      ? handleInlineRowEditStop
                      : handleRowEditStop
                  }
                  // Disable all cell editing when bulk edit mode is not enabled
                  // Also respect readOnly property from bsColumnDefs (only for existing rows, not new rows)
                  isCellEditable={(params) => {
                    if (!(effectiveBulkEdit || effectiveBulkAddInline)) {
                      return false;
                    }
                    // Check if this is a new row (Add mode) - new rows have id starting with "new-"
                    const rowId = params.row?.id || params.id;
                    const isNewRow =
                      typeof rowId === "string" && rowId.startsWith("new-");

                    // readOnly only applies to existing rows (Edit mode), not new rows (Add mode)
                    if (!isNewRow) {
                      const customDef = columnDefsConfig[params.field];
                      if (customDef?.readOnly === true) {
                        return false;
                      }
                    }
                    return true;
                  }}
                  // Inline editing for effectiveBulkAddInline or Bulk Edit mode (for row-level Save/Cancel)
                  {...((effectiveBulkEdit || effectiveBulkAddInline) && {
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
                  pageSizeOptions={effectivePageSizeOptions}
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
                  headerFilterHeight={48}
                  // Auto-sizing columns (exclude columns with custom width in bsColumnDefs)
                  autosizeOnMount
                  autosizeOptions={autosizeOptions}
                  // Row Heights
                  rowHeight={40} //{() => "auto"}
                  // showToolbar={showToolbar && !bulkEditMode}
                  //showToolbar
                  // Row Selection (checkbox selection when enabled)
                  // Only show checkbox when explicitly enabled or onCheckBoxSelected is provided
                  // NOT automatically when bulkMode is active (user can still bulk edit via double-click)
                  checkboxSelection={
                    effectiveShowCheckbox || !!onCheckBoxSelected
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
                  // Column Visibility (for hide: true in bsColumnDefs)
                  columnVisibilityModel={columnVisibilityModel}
                  onColumnVisibilityModelChange={setColumnVisibilityModel}
                  // Column Pinning (Pro feature)
                  pinnedColumns={pinnedColumns}
                  onPinnedColumnsChange={setPinnedColumns}
                  // UI Settings
                  getRowId={getRowId}
                  // Localization
                  localeText={getLocalization()}
                  // Row styling for unsaved changes, striped rows, and custom row config
                  getRowClassName={getRowClassName}
                  // Control row selectability (checkbox) based on bsRowConfig
                  isRowSelectable={isRowSelectable}
                  // Custom Toolbar (use slots + slotProps for better compatibility)
                  // Show toolbar when showToolbar is true (including bulk edit mode)
                  slots={
                    showToolbar ? { toolbar: DynamicGridToolbar } : undefined
                  }
                  slotProps={
                    showToolbar
                      ? {
                          toolbar: {
                            onAdd: handleDialogAdd,
                            onInlineAdd: handleInlineAdd,
                            showAdd: effectiveShowAdd,
                            headerFiltersEnabled,
                            onToggleHeaderFilters: handleToggleHeaderFilters,
                            bsBulkEdit: effectiveBulkEdit,
                            bsBulkAdd: effectiveBulkAdd,
                            bsBulkDelete: effectiveBulkDelete,
                            bsEnableBulkMode: resolvedBulkEnable,
                            bsShowBulkSplitButton: effectiveShowSplitButton,
                            selectedRowCount: rowSelectionModel.length,
                            onBulkEdit: handleBulkEdit,
                            onBulkDelete: handleBulkDelete,
                            onBulkAdd: handleBulkAdd,
                            showBulkDelete: effectiveBulkDelete,
                            onRefresh: () => refreshData(true),
                            onExportExcel: handleExportExcel,
                            onExportCsv: handleExportCsv,
                            onPrint: handlePrint,
                            localeText,
                            apiRef,
                            quickFilterValue: quickFilterInputValue,
                            onQuickFilterChange: setQuickFilterInputValue,
                            bulkEditMode,
                            onBulkSave: handleBulkSaveChanges,
                            onBulkDiscard: handleBulkDiscardChanges,
                            hasUnsavedChanges,
                            formLoading,
                            changesCount: Object.keys(unsavedChangesRef.current)
                              .length,
                          },
                          headerFilterCell: {
                            showClearIcon: true,
                          },
                          pagination: {
                            showFirstButton: true,
                            showLastButton: true,
                          },
                        }
                      : headerFiltersEnabled
                      ? {
                          headerFilterCell: {
                            showClearIcon: true,
                          },
                          pagination: {
                            showFirstButton: true,
                            showLastButton: true,
                          },
                        }
                      : {
                          pagination: {
                            showFirstButton: true,
                            showLastButton: true,
                          },
                        }
                  }
                  // Styling with required field indicator and custom row styles
                  sx={(theme) => ({
                    height:
                      height === "auto"
                        ? "100%" // Use full height of flex container
                        : height - (showToolbar ? 60 : 0), // Fixed height: account for toolbar height
                    //",
                    flex: height === "auto" ? 1 : "none", // Flex grow when auto height
                    minHeight: height === "auto" ? 300 : undefined, // Minimum height for auto mode
                    border: 0,
                    // Apply custom row styles from bsRowConfig
                    ...customRowStyles,
                    [`& .${gridClasses.cell}`]: {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      fontSize: "0.875rem",
                    },
                    [`& .${gridClasses.columnHeaders}`]: {
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[800]
                          : theme.palette.grey[100],
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
                      backgroundColor: theme.palette.background.paper,
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? theme.palette.grey[400] // Subtle hover
                            : theme.palette.grey[100],
                      },
                      // Striped rows styling - even rows get slightly different background
                      "&.even": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? theme.palette.grey[300] // Elevated surface for stripe
                            : theme.palette.grey[50],
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? theme.palette.grey[400]
                              : theme.palette.grey[100],
                        },
                      },
                      // Highlight rows with unsaved changes
                      "&.unsaved-changes": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 217, 61, 0.15)"
                            : "#fff3cd",
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(255, 217, 61, 0.25)"
                              : "#ffeaa7",
                        },
                      },
                      // Selected row styling - primary glow
                      "&.Mui-selected": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(0, 212, 255, 0.2) !important"
                            : "#bbdefb !important",
                        "&:hover": {
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "rgba(0, 212, 255, 0.3) !important"
                              : "#90caf9 !important",
                        },
                      },
                    },
                    // Header filter styling
                    [`& .MuiDataGrid-headerFilterRow`]: {
                      backgroundColor: `${
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[200]
                          : "#E0DEDEFF"
                      } !important`,
                      borderBottom: `1px solid ${theme.palette.divider} !important`,
                      minHeight: "30px !important",
                      maxHeight: "46px !important",
                      "& .MuiInputBase-root": {
                        fontSize: "0.875rem !important",
                        minHeight: "30px !important",
                        height: "30px !important",
                        maxHeight: "30px !important",
                      },
                      "& .MuiInputBase-input": {
                        padding: "4px 10px !important",
                        height: "auto !important",
                      },
                      "& .MuiFormControl-root": {
                        minHeight: "30px !important",
                        height: "30px !important",
                      },
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: `${theme.palette.background.paper} !important`,
                        height: "30px !important",
                        "& fieldset": {
                          borderColor: `${theme.palette.divider} !important`,
                        },
                        "&:hover fieldset": {
                          borderColor: `${theme.palette.primary.light} !important`,
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: `${theme.palette.primary.main} !important`,
                          borderWidth: "1px !important",
                        },
                      },
                      "& .MuiSelect-select": {
                        padding: "4px 10px !important",
                        minHeight: "auto !important",
                        height: "auto !important",
                        lineHeight: "1.5 !important",
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: "0.875rem !important",
                        transform: "translate(10px, 6px) scale(1) !important",
                        "&.MuiInputLabel-shrink": {
                          transform:
                            "translate(14px, -9px) scale(0.75) !important",
                        },
                      },
                      "& label + .MuiInputBase-root": {
                        marginTop: "10px !important",
                      },
                    },
                    // Header filter cells
                    "& .MuiDataGrid-headerFilterCell": {
                      padding: "6px 4px !important",
                      height: "46px !important",
                    },
                    // Edit mode cell input styling - add subtle border to show it's editable
                    "& .MuiDataGrid-cell--editing": {
                      backgroundColor: `${
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[800]
                          : "#fafafa"
                      } !important`,
                      "& .MuiInputBase-root": {
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: "4px",
                        backgroundColor: theme.palette.background.paper,
                        padding: "2px 8px",
                        "&:hover": {
                          borderColor: theme.palette.grey[500],
                        },
                        "&.Mui-focused": {
                          borderColor: theme.palette.primary.main,
                          boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
                        },
                      },
                      "& .MuiInputBase-input": {
                        padding: "4px 0",
                      },
                    },
                    // New row styling
                    "& .MuiDataGrid-row--editing": {
                      backgroundColor: `${
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[800]
                          : "#f5f9ff"
                      } !important`,
                      boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}`,
                    },
                  })}
                  {...props}
                />
              </Box>
            );
          } catch (error) {
            Logger.error("❌ DataGridPro render error:", error);
            return (
              <Alert severity="error" sx={{ m: 2 }}>
                <Typography variant="h6">
                  {localeText.bsDataGridError}
                </Typography>
                <Typography variant="body2">
                  {localeText.bsFailedToRenderGrid} {error.message}
                </Typography>
              </Alert>
            );
          }
        })()}

        {/* Built-in CRUD Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          maxWidth={
            bsChildGrids && bsChildGrids.length > 0 ? "lg" : dialogMaxWidth
          }
          fullWidth
          fullScreen={isDialogFullScreen}
          PaperProps={{
            sx: {
              borderRadius: isDialogFullScreen ? 0 : 1,
            },
          }}
        >
          <DialogTitle>
            {dialogMode === "add"
              ? localeText.bsAddNewRecord
              : localeText.bsEditRecord}
          </DialogTitle>
          <DialogContent
            dividers={
              parsedDialogTabs || (bsChildGrids && bsChildGrids.length > 0)
                ? true
                : false
            }
          >
            {/* Hierarchical Data Mode - with child grids */}
            {bsChildGrids && bsChildGrids.length > 0 ? (
              <Box sx={{ width: "100%" }}>
                {/* Parent Form in Accordion */}
                <Accordion
                  expanded={parentAccordionExpanded}
                  onChange={(e, expanded) =>
                    setParentAccordionExpanded(expanded)
                  }
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="parent-form-content"
                    id="parent-form-header"
                    sx={(theme) => ({
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[300]
                          : "#EBEBEBFF",
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? theme.palette.grey[400]
                            : "#d5d5d5",
                      },
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                    })}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {(() => {
                        // Priority: bsParentRecordLabel (with resource support) > localeText > default
                        if (bsParentRecordLabel) {
                          // Check if it's a resource key (format: "resource:keyName")
                          if (bsParentRecordLabel.startsWith("resource:")) {
                            const resourceKey =
                              bsParentRecordLabel.substring(9);
                            const resourceValue = getResource(
                              resourceData,
                              resourceKey
                            );

                            bsLog("🏷️ bsParentRecordLabel resource lookup:", {
                              bsParentRecordLabel,
                              resourceKey,
                              resourceValue,
                              resourceDataCount: resourceData?.length || 0,
                              resourceDataSample: resourceData?.slice(0, 5),
                              resourceGroup:
                                bsStoredProcedure || effectiveTableName,
                            });

                            return (
                              resourceValue ||
                              localeText.bsParentRecord ||
                              "Parent Record"
                            );
                          }
                          return bsParentRecordLabel;
                        }
                        return localeText.bsParentRecord || "Parent Record";
                      })()}
                      {isParentSaved && (
                        <Chip
                          label={localeText.bsSaved || "Saved"}
                          size="small"
                          color="success"
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {metadata?.columns || bsStoredProcedure ? (
                      renderFormFields()
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          {localeText.bsLoadingMetadata}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Child Grids in Tabs */}
                {bsChildGrids.length > 0 && (
                  <Box sx={{ width: "100%", mt: 2 }}>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                      <Tabs
                        value={activeChildTab}
                        onChange={(e, newValue) => setActiveChildTab(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="child grid tabs"
                      >
                        {bsChildGrids.map((childConfig, index) => (
                          <Tab
                            key={index}
                            label={childConfig.name || `Child ${index + 1}`}
                            disabled={!isParentSaved}
                          />
                        ))}
                      </Tabs>
                    </Box>

                    {/* Child Grid Tab Panels */}
                    {bsChildGrids.map((childConfig, index) => (
                      <Box
                        key={index}
                        role="tabpanel"
                        hidden={activeChildTab !== index}
                        sx={{ pt: 2, minHeight: 400 }}
                      >
                        {activeChildTab === index && (
                          <BSChildDataGrid
                            ref={(el) => {
                              childGridRefs.current[index] = el;
                            }}
                            name={childConfig.name}
                            foreignKeys={childConfig.foreignKeys || []}
                            parentKeyValues={savedParentKeyValues}
                            isParentSaved={isParentSaved}
                            bsLocale={bsLocale}
                            localeText={localeText}
                            // Pass all other BSDataGrid props
                            bsPreObj={childConfig.bsPreObj || bsPreObj}
                            bsObj={childConfig.bsObj}
                            bsCols={childConfig.bsCols}
                            bsObjBy={childConfig.bsObjBy}
                            bsObjWh={childConfig.bsObjWh}
                            bsComboBox={childConfig.bsComboBox}
                            bsColumnDefs={childConfig.bsColumnDefs}
                            bsDialogSize={childConfig.bsDialogSize}
                            bsDialogColumns={childConfig.bsDialogColumns}
                            bsVisibleEdit={childConfig.bsVisibleEdit !== false}
                            bsVisibleDelete={
                              childConfig.bsVisibleDelete !== false
                            }
                            bsShowRowNumber={
                              childConfig.bsShowRowNumber !== false
                            }
                            bsRowPerPage={childConfig.bsRowPerPage || 10}
                            bsPageSizeOptions={
                              childConfig.bsPageSizeOptions || [10, 20, 50]
                            }
                            height={childConfig.height}
                            bsUniqueFields={childConfig.bsUniqueFields}
                            // Bulk mode props
                            bsBulkMode={childConfig.bsBulkMode}
                            bsBulkAddInline={childConfig.bsBulkAddInline}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ) : // Standard Mode - no child grids
            metadata?.columns || bsStoredProcedure ? (
              renderFormFields()
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {localeText.bsLoadingMetadata}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <BSCloseOutlinedButton
              onClick={handleDialogClose}
              disabled={formLoading}
            >
              {isParentSaved && bsChildGrids && bsChildGrids.length > 0
                ? localeText.bsClose || "Close"
                : localeText.bsCancel}
            </BSCloseOutlinedButton>
            {/* Show Save button always - user can save/update parent record anytime */}
            <BSSaveOutlinedButton onClick={handleSave} disabled={formLoading}>
              {formLoading
                ? localeText.bsSaving
                : bsChildGrids &&
                  bsChildGrids.length > 0 &&
                  dialogMode === "add" &&
                  !isParentSaved
                ? localeText.bsSaveAndContinue || "Save & Continue"
                : localeText.bsSave}
            </BSSaveOutlinedButton>
          </DialogActions>
        </Dialog>

        {/* Bulk Add Dialog */}
        <Dialog
          open={bulkAddDialogOpen}
          onClose={handleBulkDialogClose}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle>
            {localeText.bsBulkAddRecords}
            <Typography variant="body2" color="text.secondary">
              {localeText.bsBulkAddDescription}
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
                    label={localeText.bsNumberOfRows}
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
                    {localeText.bsAddMoreRows}
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
                        {localeText.bsRow} #{rowIndex + 1}
                        <Button
                          size="small"
                          onClick={() => removeBulkRow(rowIndex)}
                          sx={{ ml: 2 }}
                          color="error"
                        >
                          {localeText.bsRemove}
                        </Button>
                      </Typography>
                      <Grid container spacing={2}>
                        {metadata.columns
                          .filter(
                            (c) =>
                              // Include field if it passes normal isFieldInForm check
                              // OR if it has a comboBoxConfig defined (FK fields that should be included)
                              isFieldInForm(
                                c.columnName,
                                c.dataType,
                                c.isIdentity,
                                c.hasDefault,
                                c.defaultValue
                              ) || comboBoxConfig[c.columnName]
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
                                      {formatColumnName(columnName)}
                                      {!isNullable && (
                                        <span style={{ color: "#d32f2f" }}>
                                          {" "}
                                          *
                                        </span>
                                      )}
                                    </InputLabel>
                                    <Select
                                      value={val || "YES"}
                                      label={
                                        <>
                                          {formatColumnName(columnName)}
                                          {!isNullable && (
                                            <span style={{ color: "#d32f2f" }}>
                                              {" "}
                                              *
                                            </span>
                                          )}
                                        </>
                                      }
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

                            // ComboBox field handling
                            const comboConfig = comboBoxConfig[columnName];
                            if (comboConfig) {
                              return (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={columnName}
                                >
                                  <BulkAddComboBoxField
                                    columnName={columnName}
                                    config={comboConfig}
                                    value={val}
                                    onChange={(value) =>
                                      updateBulkRow(rowIndex, columnName, value)
                                    }
                                    required={!isNullable}
                                  />
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
                                inputType = "datetime-local";
                                break;
                              case "date":
                                inputType = "date";
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

                            // Handle datetime-local with MUI DateTimePicker for consistent format
                            if (inputType === "datetime-local") {
                              return (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={columnName}
                                >
                                  <LocalizationProvider
                                    dateAdapter={AdapterDayjs}
                                  >
                                    <DateTimePicker
                                      label={
                                        <>
                                          {formatColumnName(columnName)}
                                          {!isNullable && (
                                            <span style={{ color: "#d32f2f" }}>
                                              {" "}
                                              *
                                            </span>
                                          )}
                                        </>
                                      }
                                      value={val ? dayjs(val) : null}
                                      onChange={(newValue) => {
                                        const isoValue = newValue
                                          ? newValue.toISOString()
                                          : null;
                                        updateBulkRow(
                                          rowIndex,
                                          columnName,
                                          isoValue
                                        );
                                      }}
                                      format={DATETIME_FORMAT}
                                      ampm={!USE_24_HOUR}
                                      slotProps={{
                                        textField: {
                                          size: "small",
                                          fullWidth: true,
                                          required: !isNullable,
                                        },
                                      }}
                                    />
                                  </LocalizationProvider>
                                </Grid>
                              );
                            }

                            // Handle date with MUI DatePicker for consistent format
                            if (inputType === "date") {
                              return (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={columnName}
                                >
                                  <LocalizationProvider
                                    dateAdapter={AdapterDayjs}
                                  >
                                    <DatePicker
                                      label={
                                        <>
                                          {formatColumnName(columnName)}
                                          {!isNullable && (
                                            <span style={{ color: "#d32f2f" }}>
                                              {" "}
                                              *
                                            </span>
                                          )}
                                        </>
                                      }
                                      value={val ? dayjs(val) : null}
                                      onChange={(newValue) => {
                                        const dateValue = newValue
                                          ? newValue.format("YYYY-MM-DD")
                                          : null;
                                        updateBulkRow(
                                          rowIndex,
                                          columnName,
                                          dateValue
                                        );
                                      }}
                                      format={DATE_FORMAT}
                                      slotProps={{
                                        textField: {
                                          size: "small",
                                          fullWidth: true,
                                          required: !isNullable,
                                        },
                                      }}
                                    />
                                  </LocalizationProvider>
                                </Grid>
                              );
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
                                    label={
                                      <>
                                        {formatColumnName(columnName)}
                                        {!isNullable && (
                                          <span style={{ color: "#d32f2f" }}>
                                            {" "}
                                            *
                                          </span>
                                        )}
                                      </>
                                    }
                                  />
                                </Grid>
                              );
                            }

                            const gridSize = multiline
                              ? { xs: 12 }
                              : { xs: 12, sm: 6, md: 4 };

                            // Build tooltip text with length information for bulk add
                            let tooltipText = "";
                            if (
                              bsShowCharacterCount &&
                              maxLength > 0 &&
                              (inputType === "text" || multiline)
                            ) {
                              const currentLength = String(val).length;
                              tooltipText = `${currentLength}/${maxLength} characters`;
                            }

                            const bulkTextField = (
                              <TextField
                                fullWidth
                                size="small"
                                label={
                                  <>
                                    {formatColumnName(columnName)}
                                    {!isNullable && (
                                      <span style={{ color: "#d32f2f" }}>
                                        {" "}
                                        *
                                      </span>
                                    )}
                                  </>
                                }
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
                            );

                            return (
                              <Grid item {...gridSize} key={columnName}>
                                {tooltipText ? (
                                  <Tooltip
                                    title={tooltipText}
                                    arrow
                                    placement="top"
                                  >
                                    {bulkTextField}
                                  </Tooltip>
                                ) : (
                                  bulkTextField
                                )}
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
                  {localeText.bsLoadingMetadata}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <BSCloseOutlinedButton
              onClick={handleBulkDialogClose}
              disabled={formLoading}
            >
              {localeText.bsCancel}
            </BSCloseOutlinedButton>
            <BSSaveOutlinedButton
              onClick={handleBulkSave}
              disabled={formLoading}
            >
              {formLoading
                ? localeText.bsSaving
                : localeText.bsSaveRecords(bulkAddRows.length)}
            </BSSaveOutlinedButton>
          </DialogActions>
        </Dialog>

        {/* AttachFile Dialog */}
        <BSFileUploadDialog
          open={attachFileDialogOpen}
          onClose={() => {
            setAttachFileDialogOpen(false);
            setAttachFileRowData(null);
            setAttachFileConfig(null);
          }}
          rowData={attachFileRowData}
          attachConfig={attachFileConfig}
          localeText={localeText}
          onFilesChanged={() => {
            // Optionally refresh grid data when files change
            if (bsStoredProcedure) {
              loadStoredProcedureData();
            } else {
              loadData();
            }
          }}
        />
      </Paper>
    );
  }
);

BSDataGrid.displayName = "BSDataGrid";

export default BSDataGrid;
