import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Autocomplete,
  TextField,
  Slider,
  Typography,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Popover,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Tune as TuneIcon,
  UnfoldLess as UnfoldLessIcon,
  UnfoldMore as UnfoldMoreIcon,
  Fullscreen as FullscreenIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

/**
 * BSGanttChartToolbar - Toolbar with filters and controls for BSGanttChart
 */
const BSGanttChartToolbar = ({
  // Filter state
  startDate,
  endDate,
  selectedEmployees = [],
  employees = [],
  selectedProject = null,
  projects = [],
  
  // Scale/size state
  cellWidth = 60,
  scaleHeight = 40,
  currentScale = "day",
  
  // Callbacks
  onStartDateChange,
  onEndDateChange,
  onEmployeesChange,
  onProjectChange,
  onCellWidthChange,
  onScaleHeightChange,
  onScaleChange,
  onRefresh,
  onClearFilters,
  onExpandAll,
  onCollapseAll,
  onToggleFullscreen,
  
  // Localization
  localeText = {},
  
  // Loading state
  loading = false,
}) => {
  // Popover state for settings
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const openSettings = Boolean(settingsAnchorEl);

  const handleSettingsClick = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };
  
  // Local state for sliders to prevent excessive updates/errors while dragging
  const [localCellWidth, setLocalCellWidth] = useState(cellWidth);
  const [localScaleHeight, setLocalScaleHeight] = useState(scaleHeight);

  // Sync local state with props when props change (e.g. from zoom buttons outside control)
  useEffect(() => {
    setLocalCellWidth(cellWidth);
  }, [cellWidth]);

  useEffect(() => {
    setLocalScaleHeight(scaleHeight);
  }, [scaleHeight]);

  // Scale options
  const scaleOptions = useMemo(() => [
    { value: "day", label: localeText.bsScaleDay || "Day" },
    { value: "week", label: localeText.bsScaleWeek || "Week" },
    { value: "month", label: localeText.bsScaleMonth || "Month" },
  ], [localeText]);

  // Handle cell width slider change (local update only)
  const handleCellWidthChange = (event, newValue) => {
    setLocalCellWidth(newValue);
  };

  // Handle cell width commit (prop update)
  const handleCellWidthCommit = (event, newValue) => {
    if (onCellWidthChange) {
      onCellWidthChange(newValue);
    }
  };

  // Handle scale height slider change (local update only)
  const handleScaleHeightChange = (event, newValue) => {
    setLocalScaleHeight(newValue);
  };

  // Handle scale height commit (prop update)
  const handleScaleHeightCommit = (event, newValue) => {
    if (onScaleHeightChange) {
      onScaleHeightChange(newValue);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Compact Toolbar Layout */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="nowrap">
        {/* Date Filter Group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: 1,
            py: 0.5,
            gap: 1,
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.02)",
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={startDate ? dayjs(startDate) : null}
              onChange={(date) =>
                onStartDateChange && onStartDateChange(date?.toDate() || null)
              }
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  variant: "standard",
                  size: "small",
                  placeholder: localeText.bsStartDate || "Start",
                  InputProps: { disableUnderline: true },
                  sx: { width: 150, "& input": { textAlign: "center", fontSize: "0.875rem" } },
                },
              }}
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
            <DatePicker
              value={endDate ? dayjs(endDate) : null}
              onChange={(date) =>
                onEndDateChange && onEndDateChange(date?.toDate() || null)
              }
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  variant: "standard",
                  size: "small",
                  placeholder: localeText.bsEndDate || "End",
                  InputProps: { disableUnderline: true },
                  sx: { width: 150, "& input": { textAlign: "center", fontSize: "0.875rem" } },
                },
              }}
              disabled={loading}
            />
          </LocalizationProvider>
        </Box>

        {/* Project Filter */}
        <Autocomplete
          size="small"
          options={projects}
          value={selectedProject}
          onChange={(event, newValue) =>
            onProjectChange && onProjectChange(newValue)
          }
          getOptionLabel={(option) => option?.label || ""}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={localeText.bsSelectProject || "Select Project..."}
              variant="outlined"
              sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
            />
          )}
          sx={{flexGrow: 1, width: 220 }}
          disabled={loading}
          noOptionsText={localeText.bsNoData || "No options"}
        />

        {/* Employee Filter */}
        <Autocomplete
          multiple
          size="small"
          options={employees}
          value={selectedEmployees}
          onChange={(event, newValue) =>
            onEmployeesChange && onEmployeesChange(newValue)
          }
          getOptionLabel={(option) => option.label || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedEmployees.length === 0
                  ? localeText.bsSelectEmployees || "Select Employees..."
                  : ""
              }
              variant="outlined"
              sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
            />
          )}
          renderTags={(value, getTagProps) => {
             // Limit tags to 2 for cleaner look
             const numTags = 2;
             const limitTags = value.slice(0, numTags);
             const remaining = value.length - numTags;
             
             return (
               <>
                {limitTags.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.label}
                    size="small"
                    sx={{ height: 24, fontSize: "0.75rem" }}
                  />
                ))}
                {remaining > 0 && <Chip size="small" label={`+${remaining}`} sx={{ height: 24, fontSize: "0.75rem" }} />}
               </>
             );
          }}
          sx={{ minWidth: 240 }}
          disabled={loading}
          disableCloseOnSelect
          limitTags={2}
          noOptionsText={localeText.bsNoData || "No options"}
        />

        {/* Action Group */}
        <Stack direction="row" spacing={1} alignItems="center">
        
           <Tooltip title={localeText.bsClearFilters || "Clear Filters"}>
            <IconButton
              size="small"
              onClick={onClearFilters}
              disabled={
                loading ||
                (!startDate &&
                  !endDate &&
                  selectedEmployees.length === 0 &&
                  !selectedProject)
              }
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={localeText.bsRefresh || "Refresh"}>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              color="primary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: "auto" }} />
          <Tooltip title={localeText.bsExpandAll || "Expand All"}>
            <IconButton size="small" onClick={onExpandAll} disabled={loading}>
              <UnfoldMoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={localeText.bsCollapseAll || "Collapse All"}>
            <IconButton size="small" onClick={onCollapseAll} disabled={loading}>
               <UnfoldLessIcon fontSize="small" />
            </IconButton>
          </Tooltip>
         

          <Tooltip title={localeText.bsFullscreen || "Fullscreen"}>
            <IconButton
              size="small"
              onClick={onToggleFullscreen}
              disabled={loading}
              color="default"
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={localeText.bsViewSettings || "View Settings"}>
            <IconButton
              size="small"
              onClick={handleSettingsClick}
              color={openSettings ? "primary" : "default"}
              sx={{
                border: "1px solid",
                borderColor: openSettings ? "primary.main" : "divider",
              }}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* View Settings Popover */}
      <Popover
        open={openSettings}
        anchorEl={settingsAnchorEl}
        onClose={handleSettingsClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
            elevation: 3,
            sx: { p: 2, width: 320, borderRadius: 2, mt: 1 }
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
             {localeText.bsDisplayOptions || "Display Options"}
        </Typography>
        
        <Stack spacing={2}>
            {/* Scale Selector */}
            <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                    {localeText.bsScale || "Time Scale"}
                </Typography>
                <FormControl size="small" fullWidth>
                    <Select
                      value={currentScale}
                      onChange={(e) => onScaleChange && onScaleChange(e.target.value)}
                      disabled={loading}
                      sx={{ fontSize: "0.875rem" }}
                    >
                      {scaleOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                </FormControl>
            </Box>

            <Divider />

            {/* Cell Width Control */}
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                        {localeText.bsCellWidth || "Column Width"}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                         {localCellWidth}px
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={localeText.bsZoomOut || "Zoom Out"}>
                       <IconButton 
                         size="small" 
                         onClick={() => onCellWidthChange && onCellWidthChange(Math.max(30, cellWidth - 10))}
                         disabled={loading || cellWidth <= 30}>
                          <ZoomOutIcon fontSize="small" />
                       </IconButton>
                    </Tooltip>
                    <Slider
                        value={localCellWidth}
                        onChange={handleCellWidthChange}
                        onChangeCommitted={handleCellWidthCommit}
                        min={30}
                        max={120}
                        step={10}
                        size="small"
                        sx={{ mx: 1 }}
                        disabled={loading}
                    />
                    <Tooltip title={localeText.bsZoomIn || "Zoom In"}>
                       <IconButton 
                         size="small" 
                         onClick={() => onCellWidthChange && onCellWidthChange(Math.min(120, cellWidth + 10))}
                         disabled={loading || cellWidth >= 120}>
                          <ZoomInIcon fontSize="small" />
                       </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

             {/* Scale Height Control */}
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                         {localeText.bsScaleHeight || "Header Height"}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                        {localScaleHeight}px
                    </Typography>
                </Stack>
                 <Slider
                    value={localScaleHeight}
                    onChange={handleScaleHeightChange}
                    onChangeCommitted={handleScaleHeightCommit}
                    min={25}
                    max={60}
                    step={5}
                    size="small"
                    disabled={loading}
                  />
            </Box>
        </Stack>
      </Popover>
    </Paper>
  );
};

export default BSGanttChartToolbar;
