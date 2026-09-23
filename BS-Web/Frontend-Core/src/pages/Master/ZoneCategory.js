import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Chip,
  CircularProgress,
  alpha,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import CategoryIcon from "@mui/icons-material/Category";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { BSDataGrid, BSDataGridClient } from "../../components/BSDataGrid";
import { useDynamicCrud } from "../../hooks/useDynamicCrud";
import AxiosMaster from "../../utils/AxiosMaster";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import { ButtonConfigs } from "../../utils/ButtonConfigs";

const ZONE_COLORS = [
  "#C62828", // red      – hottest (max count)
  "#EF6C00", // orange
  "#F9A825", // amber
  "#558B2F", // green
  "#00838F", // teal
  "#1565C0", // blue
  "#546E7A", // blue-grey – coldest (zero / min)
];
// Returns a heat colour from ZONE_COLORS[0] (hottest) to ZONE_COLORS[last] (coolest)
// based on how large count is relative to maxCount.
const getCountHeatColor = (count, maxCount) => {
  if (!maxCount || count <= 0) return ZONE_COLORS[ZONE_COLORS.length - 1];
  const ratio = Math.min(count / maxCount, 1);
  const index = Math.round((1 - ratio) * (ZONE_COLORS.length - 1));
  return ZONE_COLORS[index];
};

const isActive = (val) => val === 1 || val === true || val === "1";

const PANEL_HEIGHT = "calc(100vh - 150px)";
const DEFAULT_ZONE_PANEL_WIDTH = 500;
const MIN_ZONE_PANEL_WIDTH = 360;
const MIN_CATEGORY_PANEL_WIDTH = 520;
const SPLIT_HANDLE_WIDTH = 14;

const ZoneCategory = (props) => {
  const { permission } = useOutletContext();

  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mappings, setMappings] = useState(new Map());
  const [recordIds, setRecordIds] = useState(new Map());

  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedCatIds, setSelectedCatIds] = useState(new Set());
  const [categorySearch, setCategorySearch] = useState("");
  const [catFilterMode, setCatFilterMode] = useState("all");
  const [operating, setOperating] = useState(false);
  const [gridResetKey, setGridResetKey] = useState(0);
  const [zoneGridRefreshKey, setZoneGridRefreshKey] = useState(0);
  const [zonePanelWidth, setZonePanelWidth] = useState(
    DEFAULT_ZONE_PANEL_WIDTH,
  );
  const splitContainerRef = useRef(null);
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const { getResources, getResourceByGroupAndName } = useResource();

  const { createRecord, deleteRecord } = useDynamicCrud("t_inv_zone_category");

  const clampZonePanelWidth = useCallback((width) => {
    const containerWidth =
      splitContainerRef.current?.getBoundingClientRect().width || 0;
    const maxWidth =
      containerWidth > 0
        ? Math.max(
          MIN_ZONE_PANEL_WIDTH,
          containerWidth - MIN_CATEGORY_PANEL_WIDTH - SPLIT_HANDLE_WIDTH,
        )
        : DEFAULT_ZONE_PANEL_WIDTH;
    return Math.min(Math.max(width, MIN_ZONE_PANEL_WIDTH), maxWidth);
  }, []);

  const handleSplitResizePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;

      event.preventDefault();
      const container = splitContainerRef.current;
      if (!container) return;

      const handlePointerMove = (moveEvent) => {
        const containerRect = container.getBoundingClientRect();
        const nextWidth = moveEvent.clientX - containerRect.left;
        setZonePanelWidth(clampZonePanelWidth(nextWidth));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [clampZonePanelWidth],
  );

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        await getResources(
          "t_inv_zone_category",
          props.lang || "en",
        );
      } catch (e) {
        console.error("getResources(t_inv_zone_category) error:", e);
      }
    };
    loadRes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  useEffect(() => {
    const handleResize = () => {
      setZonePanelWidth((currentWidth) => clampZonePanelWidth(currentWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampZonePanelWidth]);

  const loadData = useCallback(async () => {
    try {
      const [zonesRes, catsRes, mapsRes] = await Promise.all([
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_zone",
          schema: "inv",
          columns: [
            { field: "zone_id", key: true },
            { field: "zone", display: true },
            { field: "zone_type" },
            { field: "is_active" },
          ],
          order_by: "zone asc",
          limit: 9999,
        }),
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_category",
          schema: "inv",
          columns: [
            { field: "category_id", key: true },
            { field: "item_category", display: true },
            { field: "is_active" },
          ],
          order_by: "item_category asc",
          limit: 9999,
        }),
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_zone_category",
          schema: "inv",
          columns: [
            { field: "zone_category_id", key: true },
            { field: "zone_id" },
            { field: "category_id", display: true },
          ],
          order_by: "zone_id asc",
          limit: 9999,
        }),
      ]);

      setZones(zonesRes.data?.data || []);
      setCategories(catsRes.data?.data || []);

      const map = new Map();
      const recIds = new Map();
      (mapsRes.data?.data || []).forEach((row) => {
        const zId = String(row.zone_id ?? "");
        const cId = String(row.category_id ?? "");
        const recId = row.zone_category_id ?? row.code;
        if (!map.has(zId)) map.set(zId, new Set());
        map.get(zId).add(cId);
        recIds.set(`${zId}-${cId}`, recId);
      });

      setMappings(map);
      setRecordIds(recIds);
      setZoneGridRefreshKey((prev) => prev + 1);
    } catch (err) {
      BSAlertSwal2.show("error", err?.message || "Failed to load data.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const zoneById = useMemo(() => {
    const map = new Map();
    zones.forEach((zone) => map.set(String(zone.zone_id), zone));
    return map;
  }, [zones]);

  const categoryZonesMap = useMemo(() => {
    const map = new Map();
    mappings.forEach((categorySet, zoneId) => {
      categorySet.forEach((categoryId) => {
        if (!map.has(categoryId)) map.set(categoryId, []);
        map.get(categoryId).push(zoneId);
      });
    });
    return map;
  }, [mappings]);

  const maxCatCount = useMemo(() => {
    let max = 0;
    mappings.forEach((catSet) => {
      if (catSet.size > max) max = catSet.size;
    });
    return max;
  }, [mappings]);

  const selectedZoneCatSet = useMemo(
    () =>
      selectedZoneId != null
        ? mappings.get(String(selectedZoneId)) || new Set()
        : new Set(),
    [selectedZoneId, mappings],
  );

  const filteredCategories = useMemo(() => {
    let list = categories;

    if (categorySearch) {
      const searchText = categorySearch.toLowerCase();
      list = list.filter((category) =>
        String(category.item_category ?? "")
          .toLowerCase()
          .includes(searchText),
      );
    }

    if (selectedZoneId != null && catFilterMode !== "all") {
      if (catFilterMode === "assigned") {
        list = list.filter((category) =>
          selectedZoneCatSet.has(String(category.category_id)),
        );
      }
      if (catFilterMode === "unassigned") {
        list = list.filter(
          (category) => !selectedZoneCatSet.has(String(category.category_id)),
        );
      }
    }

    return list;
  }, [
    categories,
    categorySearch,
    selectedZoneId,
    catFilterMode,
    selectedZoneCatSet,
  ]);

  // Only show is_active = 1 in gridCategories for BSDataGridClient
  const gridCategories = useMemo(
    () =>
      filteredCategories
        .filter((category) => isActive(category.is_active))
        .map((category) => {
          const categoryId = String(category.category_id);
          const assignedZoneIds = categoryZonesMap.get(categoryId) || [];
          return {
            ...category,
            id: categoryId,
            assigned_zone_ids: assignedZoneIds,
            assigned_zone_names: assignedZoneIds.map(
              (zoneId) => zoneById.get(String(zoneId))?.zone || String(zoneId),
            ),
            is_assigned_selected:
              selectedZoneId != null
                ? selectedZoneCatSet.has(categoryId)
                : false,
          };
        }),
    [
      filteredCategories,
      categoryZonesMap,
      zoneById,
      selectedZoneId,
      selectedZoneCatSet,
    ],
  );

  const zoneColumnDefs = useMemo(
    () => [
      { field: "zone_id", hide: true },
      {
        field: "zone",
        // headerName: "Zone",
        width: 190,
        required: true,
        readOnly: true,
        renderCell: (params) => {
          const catCount = mappings.get(String(params.row.zone_id))?.size ?? 0;
          const heatColor = getCountHeatColor(catCount, maxCatCount);
          const active = isActive(params.row.is_active);

          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%", height: "100%" }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: heatColor,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${alpha(heatColor, 0.3)}`,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  noWrap
                  sx={{
                    color: active ? "text.primary" : "text.disabled",
                    lineHeight: 1.3,
                  }}
                >
                  {params.value}
                </Typography>
              </Box>
              <Chip
                label={catCount}
                size="small"
                sx={{
                  height: 18,
                  minWidth: 24,
                  fontSize: "0.65rem",
                  flexShrink: 0,
                  "& .MuiChip-label": { px: 0.75 },
                  bgcolor: catCount > 0 ? alpha(heatColor, 0.15) : "transparent",
                  color: catCount > 0 ? heatColor : "text.disabled",
                  border: `1px solid ${catCount > 0 ? alpha(heatColor, 0.45) : "rgba(0,0,0,0.2)"
                    }`,
                }}
              />
            </Stack>
          );
        },
      },
      {
        field: "zone_type",
        // width: 140,
        required: true,
      },
      { field: "is_active", defaultValue: 1 },
    ],
    [mappings, maxCatCount],
  );

  const fallbackFromField = useCallback((field) => {
    return String(field || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  const getLabel = useCallback(
    (resourceGroup, fieldName, fallback) => {
      // getResourceByGroupAndName returns the fieldName itself when no row exists,
      // so treat that as "not found" and use the fallback.
      const value = getResourceByGroupAndName(
        resourceGroup,
        fieldName,
        locale_id,
      )?.resource_value;
      return value && value !== fieldName ? value : fallback;
    },
    [getResourceByGroupAndName, locale_id],
  );

  // Static UI labels live under the page's own resource group.
  const t = useCallback(
    (fieldName, fallback) =>
      getLabel("t_inv_zone_category", fieldName, fallback),
    [getLabel],
  );

  const resolveColumnLabel = useCallback(
    (resourceGroup, fieldName, fallback = null) =>
      getLabel(
        resourceGroup,
        fieldName,
        fallback || fallbackFromField(fieldName),
      ),
    [getLabel, fallbackFromField],
  );

  const categoryColumnDefs = useMemo(
    () => [
      //อันนี้
      {
        field: "item_category",
        // headerName: "Category",
        headerName: resolveColumnLabel(
          "t_inv_zone_category",
          "item_category",
          "Category",
        ),
        // width: 260,
        renderCell: (params) => (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ width: "100%", height: "100%" }}
          >
            {params.row.is_assigned_selected && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: "success.main",
                }}
              />
            )}
            <Typography variant="body2" fontWeight={700} noWrap>
              {params.value}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "assigned_zone_names",
        // headerName: "Assigned Zones",
        headerName: resolveColumnLabel(
          "t_inv_zone_category",
          "assigned_zone_names",
          "Assigned Zones",
        ),
        // width: 280,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const zoneNames = Array.isArray(params.value) ? params.value : [];
          const zoneIds = Array.isArray(params.row.assigned_zone_ids)
            ? params.row.assigned_zone_ids
            : [];

          if (zoneNames.length === 0) {
            return (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontStyle: "italic" }}
              >
                -
              </Typography>
            );
          }

          const visibleZoneNames = zoneNames.slice(0, 2);
          const extraCount = zoneNames.length - visibleZoneNames.length;

          return (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ width: "100%", overflow: "hidden", paddingTop: "8px" }}
            >
              {visibleZoneNames.map((zoneName, index) => {
                const zoneId = zoneIds[index] ?? zoneName;
                const zoneCount =
                  mappings.get(String(zoneId))?.size ?? 0;
                const zoneColor = getCountHeatColor(zoneCount, maxCatCount);

                return (
                  <Chip
                    key={`${zoneId}-${zoneName}`}
                    label={zoneName}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      bgcolor: alpha(zoneColor, 0.12),
                      color: zoneColor,
                      border: `1px solid ${alpha(zoneColor, 0.3)}`,
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                );
              })}
              {extraCount > 0 && (
                <Chip
                  label={`+${extraCount}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              )}
            </Stack>
          );
        },
      },
      {
        field: "is_active",
        // headerName: "Status",
        headerName: resolveColumnLabel(
          "t_inv_zone_category",
          "is_active",
          "Status",
        ),
        // width: 120,
        sortable: false,
        renderCell: (params) => {
          const active = isActive(params.value);

          return (
            <Chip
              label={active ? "Active" : "Inactive"}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: active
                  ? "rgba(76,175,80,0.12)"
                  : "rgba(244,67,54,0.12)",
                color: active ? "success.main" : "error.main",
                border: `1px solid ${active ? "rgba(76,175,80,0.3)" : "rgba(244,67,54,0.3)"}`,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          );
        },
      },
    ],
    [resolveColumnLabel, mappings, maxCatCount],
  );

  const canAssign =
    permission?.is_add &&
    selectedZoneId != null &&
    selectedCatIds.size > 0 &&
    [...selectedCatIds].some(
      (categoryId) => !selectedZoneCatSet.has(categoryId),
    );

  const selectedAssignmentRecordIds = useMemo(() => {
    const recordIdSet = new Set();

    selectedCatIds.forEach((categoryId) => {
      const zoneIds = categoryZonesMap.get(categoryId) || [];
      zoneIds.forEach((zoneId) => {
        const recordId = recordIds.get(`${String(zoneId)}-${categoryId}`);
        if (recordId != null) {
          recordIdSet.add(recordId);
        }
      });
    });

    return Array.from(recordIdSet);
  }, [selectedCatIds, categoryZonesMap, recordIds]);

  const selectedZoneAssignmentRecordIds = useMemo(() => {
    if (selectedZoneId == null) return [];

    const recordIdSet = new Set();
    selectedCatIds.forEach((categoryId) => {
      const recordId = recordIds.get(`${String(selectedZoneId)}-${categoryId}`);
      if (recordId != null) {
        recordIdSet.add(recordId);
      }
    });

    return Array.from(recordIdSet);
  }, [selectedZoneId, selectedCatIds, recordIds]);

  const unassignRecordIds =
    selectedZoneId == null
      ? selectedAssignmentRecordIds
      : selectedZoneAssignmentRecordIds;

  const canUnassign =
    permission?.is_delete &&
    selectedCatIds.size > 0 &&
    unassignRecordIds.length > 0;

  const handleZoneSelection = useCallback((selectedRows) => {
    const zoneId = selectedRows?.[0]?.zone_id ?? null;
    setSelectedZoneId(zoneId);
    setSelectedCatIds(new Set());
    setGridResetKey((prev) => prev + 1);
  }, []);

  const handleCategorySelection = useCallback((selectedRows) => {
    setSelectedCatIds(
      new Set((selectedRows || []).map((row) => String(row.category_id))),
    );
  }, []);

  const handleZoneBeforeSave = useCallback(({ formData }) => {
    if (!formData || typeof formData !== "object") return true;
    Object.keys(formData).forEach((key) => {
      if (typeof formData[key] === "string") {
        formData[key] = formData[key].trim();
      }
    });
    return true;
  }, []);

  const resetZoneSelection = useCallback(() => {
    setSelectedZoneId(null);
    setSelectedCatIds(new Set());
    setCatFilterMode("all");
    setGridResetKey((prev) => prev + 1);
  }, []);

  const resetGridSelection = useCallback(() => {
    setSelectedCatIds(new Set());
    setGridResetKey((prev) => prev + 1);
  }, []);

  const handleCategoryFilterChange = useCallback(
    (event) => {
      const nextMode = event.target.value;
      setCatFilterMode(nextMode);
      resetGridSelection();

      if (nextMode === "assigned" || nextMode === "unassigned") {
        loadData();
      }
    },
    [resetGridSelection, loadData],
  );

  const handleAssignToZone = async () => {
    if (selectedZoneId == null || selectedCatIds.size === 0) return;

    setOperating(true);
    try {
      const toCreate = [...selectedCatIds].filter(
        (categoryId) => !selectedZoneCatSet.has(categoryId),
      );
      if (toCreate.length === 0) {
        BSAlertSwal2.show(
          "info",
          "Selected categories are already assigned to this zone.",
        );
        return;
      }

      await Promise.all(
        toCreate.map((categoryId) =>
          createRecord(
            { zone_id: selectedZoneId, category_id: categoryId },
            "inv",
          ),
        ),
      );

      BSAlertSwal2.show(
        "success",
        `Assigned ${toCreate.length} categor${toCreate.length !== 1 ? "ies" : "y"} to zone.`,
        { timer: 2000 },
      );
      resetZoneSelection();
      await loadData();
    } catch (err) {
      BSAlertSwal2.show("error", err?.message || "Assign failed.");
    } finally {
      setOperating(false);
    }
  };

  const handleUnassign = async () => {
    if (selectedCatIds.size === 0) {
      BSAlertSwal2.show("info", "Please select category rows first.");
      return;
    }

    setOperating(true);
    try {
      if (unassignRecordIds.length === 0) {
        BSAlertSwal2.show(
          "info",
          selectedZoneId == null
            ? "Selected categories do not have assigned zones."
            : "Selected categories are not assigned to selected zone.",
        );
        return;
      }

      await Promise.all(
        unassignRecordIds.map((recordId) =>
          deleteRecord(recordId, { zone_category_id: recordId }, "inv"),
        ),
      );

      BSAlertSwal2.show(
        "success",
        selectedZoneId == null
          ? `Unassigned all ${unassignRecordIds.length} zone assignment${unassignRecordIds.length !== 1 ? "s" : ""} from selected categor${selectedCatIds.size !== 1 ? "ies" : "y"}.`
          : `Unassigned ${unassignRecordIds.length} mapping${unassignRecordIds.length !== 1 ? "s" : ""} from selected zone.`,
        { timer: 2000 },
      );
      resetZoneSelection();
      await loadData();
    } catch (err) {
      BSAlertSwal2.show("error", err?.message || "Unassign failed.");
    } finally {
      setOperating(false);
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Paper sx={{ p: 2.5 }}>
        <Box
          ref={splitContainerRef}
          sx={{
            minHeight: 520,
            display: "flex",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              width: zonePanelWidth,
              minWidth: MIN_ZONE_PANEL_WIDTH,
              display: "flex",
              flexDirection: "column",
              height: PANEL_HEIGHT,
              borderRadius: 2,
              overflow: "hidden",
              borderColor: (t) => alpha(t.palette.primary.main, 0.25),
              "& .MuiPaper-root": {
                boxShadow: "none",
                borderRadius: 0,
              },
              "& .MuiPaper-root > div": {
                minWidth: "0 !important",
                width: "100% !important",
                height: "100% !important",
              },
              "& .MuiDataGrid-root": {
                border: 0,
              },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                background: (t) =>
                  `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <LayersIcon sx={{ color: "#fff", fontSize: 18 }} />
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="#fff"
                sx={{ flex: 1 }}
              >
                {t("zones", "Zones")}
              </Typography>
              {selectedZoneId != null && (
                <Chip
                  label={t("selected_one", "1 selected")}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    height: 20,
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              )}
            </Box>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                maxWidth: "100%",
                height: (theme) => `calc(100vh - ${theme.spacing(8)})`,
              }}
            >
              <BSDataGrid
                key={`zone-grid-${zoneGridRefreshKey}`}
                bsLocale={props.lang || "en"}
                bsPreObj="inv"
                bsObj="t_inv_zone"
                bsObjBy="zone asc"
                bsOnBeforeSave={handleZoneBeforeSave}
                bsCols="zone_id,zone,zone_type,is_active"
                bsKeyId="zone_id"
                bsUniqueFields={[
                  {
                    field: "zone",
                    message: "Zone already exists.",
                  },
                ]}
                bsShowRowNumber={false}
                bsShowCheckbox
                bsSelectionType="radio"
                showToolbar
                showAdd={permission?.is_add}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsAllowDelete={false}
                bsVisibleView={false}
                bsBulkMode={{
                  enable: false,
                  showCheckbox: true,
                  selectionType: "radio",
                }}
                bsDialogSize="Default"
                bsDialogColumns={2}
                bsDialogSection={[
                  {
                    Column: "zone,zone_type",
                    // name: "resource:Zone Information",
                    name: getLabel(
                      "t_inv_zone",
                      "ZoneInformation",
                      getLabel("t_inv_zone", "section_zone_info", "Zone Information"),
                    ),
                    icon: <LayersOutlinedIcon sx={{ fontSize: 18 }} />,
                  },
                  {
                    Column: "is_active",
                    showHeader: false,
                  },
                ]}
                bsComboBox={[
                  {
                    Column: "zone_type",
                    Display: "display_member",
                    Value: "value_member",
                    Default: "--- Select Zone Type ---",
                    PreObj: "sec",
                    Obj: "t_com_combobox_item",
                    ObjWh: "group_name='zone_type' AND is_active=1",
                    ObjBy: "display_sequence asc",
                  },
                ]}
                bsColumnDefs={zoneColumnDefs}
                bsPageSizeOptions={[20, 100, 200, 500, 1000]}
                height="100%"
                onCheckBoxSelected={handleZoneSelection}
                bsOnAfterSave={loadData}
              />
            </Box>
          </Paper>

          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Zone and Category panels"
            onPointerDown={handleSplitResizePointerDown}
            sx={{
              width: SPLIT_HANDLE_WIDTH,
              flex: `0 0 ${SPLIT_HANDLE_WIDTH}px`,
              cursor: "col-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
              mx: 1,
              touchAction: "none",
              "&::before": {
                content: '""',
                width: 4,
                height: 56,
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.16),
                transition: "background-color 120ms ease",
              },
              "&:hover::before": {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.55),
              },
            }}
          />

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: MIN_CATEGORY_PANEL_WIDTH,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                height: PANEL_HEIGHT,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                overflow: "hidden",
                borderColor: (t) => alpha(t.palette.warning.main, 0.25),
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  background: (t) =>
                    `linear-gradient(135deg, ${t.palette.warning.dark}, ${t.palette.warning.main})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CategoryIcon sx={{ color: "#fff", fontSize: 18 }} />
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#fff"
                  sx={{ flex: 1 }}
                >
                  {t("categories", "Categories")}
                </Typography>
                <Chip
                  label={
                    selectedZoneId != null
                      ? `${selectedZoneCatSet.size} assigned`
                      : "—"
                  }
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    height: 20,
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Box>

              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.04),
                  borderBottom: (t) =>
                    `1px solid ${alpha(t.palette.warning.main, 0.12)}`,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Autocomplete
                    freeSolo
                    options={categories
                      .map((category) => category.item_category)
                      .filter(Boolean)}
                    value={categorySearch}
                    onInputChange={(_, value) => {
                      setCategorySearch(value);
                      resetGridSelection();
                    }}
                    size="small"
                    sx={{ width: 220 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category Search"
                        placeholder="เช่น RAW MATERIAL"
                        sx={{
                          "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                        }}
                      />
                    )}
                  />

                  <TextField
                    select
                    size="small"
                    label="Category Filter"
                    value={catFilterMode}
                    onChange={handleCategoryFilterChange}
                    sx={{
                      minWidth: 180,
                      "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: "0.8125rem" }}>
                      {t("filter_all", "All")}
                    </MenuItem>
                    <MenuItem
                      value="assigned"
                      disabled={selectedZoneId == null}
                      sx={{ fontSize: "0.8125rem" }}
                    >
                      {t("filter_assigned", "Assigned to Zone")}
                    </MenuItem>
                    <MenuItem
                      value="unassigned"
                      disabled={selectedZoneId == null}
                      sx={{ fontSize: "0.8125rem" }}
                    >
                      {t("filter_unassigned", "Not Assigned to Zone")}
                    </MenuItem>
                  </TextField>

                  <Button
                    variant="contained"
                    //color="primary"
                    size="small"
                    startIcon={
                      operating ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <LinkIcon fontSize="small" />
                      )
                    }
                    onClick={handleAssignToZone}
                    disabled={!canAssign || operating}
                    sx={{
                      ...ACTION_BUTTON_THEMES.primary,
                      ml: "auto !important",
                      alignSelf: "center",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      //px: 2.5,
                      //minHeight: 36,
                      //borderRadius: 2,
                    }}
                  >
                    {t("assign_to_zone", "Assign to Zone")}
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={
                      operating ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <LinkOffIcon fontSize="small" />
                      )
                    }
                    onClick={handleUnassign}
                    disabled={!canUnassign || operating}
                    sx={{
                      ...ACTION_BUTTON_THEMES.clear,
                      alignSelf: "center",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      //   px: 2.5,
                      //   minHeight: 36,
                      //   borderRadius: 2,
                    }}
                  >
                    {t("unassign", "Unassign")}
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  maxWidth: "100%",
                  height: (theme) => `calc(100vh - ${theme.spacing(8)})`,
                }}
              >
                {gridCategories.length === 0 ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{ height: "100%", opacity: 0.55 }}
                  >
                    <CategoryIcon
                      sx={{ fontSize: 36, color: "action.disabled" }}
                    />
                    <Typography variant="body2" color="text.disabled">
                      {selectedZoneId != null
                        ? // ? "No categories match the current filters"
                        // : "Select a zone to manage its category assignments"}
                        t(
                          "no_locations_match",
                          "No locations match the current filters",
                        )
                        : t(
                          "select_zone_hint",
                          "Select a zone to manage its location assignments",
                        )}
                    </Typography>
                  </Stack>
                ) : (
                  <BSDataGridClient
                    key={`${selectedZoneId ?? "all"}-${categorySearch}-${catFilterMode}-${gridResetKey}-${locale_id}`}
                    data={gridCategories}
                    columns={categoryColumnDefs}
                    bsCols="item_category,assigned_zone_names,is_active"
                    // bsLocale={props.lang || "en"}
                    bsLocale={locale_id}
                    bsShowCheckbox
                    bsShowRowNumber
                    bsRowPerPage={20}
                    pageSizeOptions={[20, 50, 100, 200]}
                    height="100%"
                    showToolbar={false}
                    onCheckBoxSelected={handleCategorySelection}
                  // Prevent selection for inactive rows (is_active !== 1)
                  // isRowSelectable={(row) => isActive(row.is_active)}
                  />
                )}
              </Box>
            </Paper>

            {selectedZoneId == null && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{ mt: 1, px: 0.5, opacity: 0.55 }}
              >
                <InfoOutlinedIcon
                  sx={{ fontSize: 14, color: "text.disabled" }}
                />
                <Typography variant="caption" color="text.disabled">
                  Select a zone from the left panel to enable category
                  assignment
                </Typography>
              </Stack>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ZoneCategory;
