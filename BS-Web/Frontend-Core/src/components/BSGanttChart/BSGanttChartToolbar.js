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
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Tune as TuneIcon,
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
  
  // Localization
  localeText = {},
  
  // Loading state
  loading = false,
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
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
        p: 2,
        mb: 2,
        borderRadius: 2,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Main Toolbar Row */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
        }}
      >
       

        {/* Date Filters */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
              {localeText.bsDueDateStart || "Due Date Start"}:
            </Typography>
            <DatePicker
              value={startDate ? dayjs(startDate) : null}
              onChange={(date) => onStartDateChange && onStartDateChange(date?.toDate() || null)}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 165 },
                },
              }}
              disabled={loading}
            />
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
              {localeText.bsDueDateEnd || "Due Date End"}:
            </Typography>
            <DatePicker
              value={endDate ? dayjs(endDate) : null}
              onChange={(date) => onEndDateChange && onEndDateChange(date?.toDate() || null)}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 165 },
                },
              }}
              disabled={loading}
            />
          </Box>
        </LocalizationProvider>

        {/* Project Single-select */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 250 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
            {localeText.bsSelectProject || "Project"}:
          </Typography>
          <Autocomplete
            size="small"
            options={projects}
            value={selectedProject}
            onChange={(event, newValue) => onProjectChange && onProjectChange(newValue)}
            getOptionLabel={(option) => option?.label || ""}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={localeText.bsSearchProjects || "Search projects..."}
                variant="outlined"
              />
            )}
            sx={{ minWidth: 200 }}
            disabled={loading}
            noOptionsText={localeText.bsNoData || "No options"}
          />
        </Box>

        {/* Employee Multi-select */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 300, flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
            {localeText.bsSelectEmployees || "Employees"}:
          </Typography>
          <Autocomplete
            multiple
            size="small"
            options={employees}
            value={selectedEmployees}
            onChange={(event, newValue) => onEmployeesChange && onEmployeesChange(newValue)}
            getOptionLabel={(option) => option.label || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={employees.length > 0 
                  ? (localeText.bsSearchEmployees || "Search employees...") 
                  : (localeText.bsAllEmployees || "All")
                }
                variant="outlined"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.label}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))
            }
            sx={{ flexGrow: 1 }}
            disabled={loading}
            noOptionsText={localeText.bsNoData || "No options"}
          />
        </Box>

        {/* Selected count indicator */}
        {selectedEmployees.length > 0 && (
          <Chip
            label={`${selectedEmployees.length} ${localeText.bsPersonsSelected?.replace("{count}", "") || "selected"}`}
            size="small"
            color="info"
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Buttons */}
        <Tooltip title={localeText.bsClearFilters || "Clear Filters"}>
          <IconButton
            size="small"
            onClick={onClearFilters}
            disabled={loading || (!startDate && !endDate && selectedEmployees.length === 0 && !selectedProject)}
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

         {/* Filter Toggle */}
        <Tooltip title={localeText.bsToggleViewOptions || "Toggle View Options"}>
          <IconButton
            size="small"
            color={filtersExpanded ? "primary" : "default"}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            sx={{
              border: "1px solid",
              borderColor: filtersExpanded ? "primary.main" : "divider",
            }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Scale/Size Controls Row */}
      {filtersExpanded && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 3,
            }}
          >
            {/* Cell Width Control */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                {localeText.bsCellWidth || "Cell Width"}:
              </Typography>
              <Slider
                value={localCellWidth}
                onChange={handleCellWidthChange}
                onChangeCommitted={handleCellWidthCommit}
                min={30}
                max={120}
                step={10}
                size="small"
                valueLabelDisplay="auto"
                sx={{ width: 120 }}
                disabled={loading}
              />
              <Typography variant="body2" sx={{ minWidth: 30 }}>
                {localCellWidth}px
              </Typography>
            </Box>

            {/* Scale Height Control */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                {localeText.bsScaleHeight || "Scale Height"}:
              </Typography>
              <Slider
                value={localScaleHeight}
                onChange={handleScaleHeightChange}
                onChangeCommitted={handleScaleHeightCommit}
                min={25}
                max={60}
                step={5}
                size="small"
                valueLabelDisplay="auto"
                sx={{ width: 120 }}
                disabled={loading}
              />
              <Typography variant="body2" sx={{ minWidth: 30 }}>
                {localScaleHeight}px
              </Typography>
            </Box>

            {/* Scale Type Selector */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {localeText.bsScale || "Scale"}:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={currentScale}
                  onChange={(e) => onScaleChange && onScaleChange(e.target.value)}
                  disabled={loading}
                >
                  {scaleOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Zoom Buttons */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={localeText.bsZoomOut || "Zoom Out"}>
                <IconButton
                  size="small"
                  onClick={() => onCellWidthChange && onCellWidthChange(Math.max(30, cellWidth - 10))}
                  disabled={loading || cellWidth <= 30}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={localeText.bsZoomIn || "Zoom In"}>
                <IconButton
                  size="small"
                  onClick={() => onCellWidthChange && onCellWidthChange(Math.min(120, cellWidth + 10))}
                  disabled={loading || cellWidth >= 120}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default BSGanttChartToolbar;
