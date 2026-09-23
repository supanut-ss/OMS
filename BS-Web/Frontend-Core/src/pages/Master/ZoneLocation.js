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
  Backdrop,
  alpha,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { BSDataGrid, BSDataGridClient } from "../../components/BSDataGrid";
import { useDynamicCrud } from "../../hooks/useDynamicCrud";
import { useResource } from "../../hooks/useResource";
import AxiosMaster from "../../utils/AxiosMaster";
import { useOutletContext } from "react-router-dom";
import { ButtonConfigs } from "../../utils/ButtonConfigs";

const ZONE_COLORS = [
  "#C62828", // hottest
  "#EF6C00",
  "#F9A825",
  "#558B2F",
  "#00838F",
  "#1565C0",
  "#546E7A", // coldest
];
const getCountHeatColor = (count, maxCount) => {
  if (!maxCount || count <= 0) {
    return ZONE_COLORS[ZONE_COLORS.length - 1];
  }

  const ratio = Math.min(count / maxCount, 1);
  const index = Math.round((1 - ratio) * (ZONE_COLORS.length - 1));

  return ZONE_COLORS[index];
};

const isActive = (val) => val === 1 || val === true || val === "1";

const normalizeLocationCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const compareLocationCode = (left, right) =>
  normalizeLocationCode(left).localeCompare(
    normalizeLocationCode(right),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  );

const isLocationChildOf = (location, parent) => {
  const loc = normalizeLocationCode(location);
  const base = normalizeLocationCode(parent);
  return Boolean(base) && (loc === base || loc.startsWith(`${base}-`));
};

const isLocationInRange = (location, from, to) => {
  const loc = normalizeLocationCode(location);
  const fromCode = normalizeLocationCode(from);
  const toCode = normalizeLocationCode(to);

  if (fromCode && compareLocationCode(loc, fromCode) < 0) return false;
  if (
    toCode &&
    compareLocationCode(loc, toCode) > 0 &&
    !isLocationChildOf(loc, toCode)
  )
    return false;

  return true;
};

const PANEL_HEIGHT = "calc(100vh - 150px)";
const ASSIGN_BATCH_SIZE = 250;
const DEFAULT_ZONE_PANEL_WIDTH = 500;
const MIN_ZONE_PANEL_WIDTH = 360;
const MIN_LOCATION_PANEL_WIDTH = 520;
const SPLIT_HANDLE_WIDTH = 14;

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const assertBulkSuccess = (result, action) => {
  const failed = Number(result?.failed ?? 0);
  if (failed > 0) {
    const detail =
      Array.isArray(result?.errors) && result.errors.length > 0
        ? ` ${result.errors.slice(0, 3).join(" ")}`
        : "";
    throw new Error(`${action} failed for ${failed} record(s).${detail}`);
  }
};

const ZoneLocation = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const { getResources, getResourceByGroupAndName } = useResource();
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        await getResources("t_inv_zone_location", props.lang || "en");
      } catch (e) {
        console.error("getResources(t_inv_zone_location) error:", e);
      }
    };
    loadRes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mappings, setMappings] = useState(new Map());
  const [recordIds, setRecordIds] = useState(new Map());

  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedLocIds, setSelectedLocIds] = useState(new Set());
  const [locFrom, setLocFrom] = useState("");
  const [locTo, setLocTo] = useState("");
  const [zoneFilterMode, setZoneFilterMode] = useState("all");
  const [operating, setOperating] = useState(false);
  const [gridResetKey, setGridResetKey] = useState(0);
  const [zoneGridRefreshKey, setZoneGridRefreshKey] = useState(0);
  const [zonePanelWidth, setZonePanelWidth] = useState(
    DEFAULT_ZONE_PANEL_WIDTH,
  );
  const splitContainerRef = useRef(null);

  const { bulkCreate, bulkDelete } = useDynamicCrud("t_inv_zone_location");

  const clampZonePanelWidth = useCallback((width) => {
    const containerWidth =
      splitContainerRef.current?.getBoundingClientRect().width || 0;
    const maxWidth =
      containerWidth > 0
        ? Math.max(
          MIN_ZONE_PANEL_WIDTH,
          containerWidth - MIN_LOCATION_PANEL_WIDTH - SPLIT_HANDLE_WIDTH,
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
    const handleResize = () => {
      setZonePanelWidth((currentWidth) => clampZonePanelWidth(currentWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampZonePanelWidth]);

  const loadData = useCallback(async () => {
    try {
      const [zonesRes, locsRes, mapsRes] = await Promise.all([
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_zone",
          schema: "inv",
          columns: [
            { field: "zone_id", key: true },
            { field: "zone", display: true },
            { field: "zone_type", display: true },
            { field: "is_active" },
          ],
          order_by: "zone asc",
          limit: 9999,
        }),
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_location",
          schema: "inv",
          columns: [
            { field: "location_id", key: true },
            { field: "location", display: true },
            { field: "description" },
            { field: "loc_type" },
            { field: "putaway_sequence" },
            { field: "pick_sequence" },
            { field: "is_active" },
          ],
          where: "loc_type NOT IN ('RSTG','STG')",
          order_by: "location asc",
          limit: 9999,
        }),
        AxiosMaster.post("/autocomplete", {
          table: "t_inv_zone_location",
          schema: "inv",
          columns: [
            { field: "zone_location_id", key: true },
            { field: "zone_id" },
            { field: "location_id", display: true },
          ],
          order_by: "zone_id asc",
          limit: 9999,
        }),
      ]);

      setZones(zonesRes.data?.data || []);
      setLocations(locsRes.data?.data || []);

      const map = new Map();
      const recIds = new Map();
      (mapsRes.data?.data || []).forEach((row) => {
        const zId = String(row.zone_id ?? "");
        const lId = String(row.location_id ?? "");
        const recId = row.zone_location_id ?? row.code;
        if (!map.has(zId)) map.set(zId, new Set());
        map.get(zId).add(lId);
        recIds.set(`${zId}-${lId}`, recId);
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

  // ── Lookup maps ─────────────────────────────────────────────────────────
  const zoneById = useMemo(() => {
    const m = new Map();
    zones.forEach((z) => m.set(String(z.zone_id), z));
    return m;
  }, [zones]);

  // Inverted: location_id → [zone_id, ...]
  const locationZonesMap = useMemo(() => {
    const m = new Map();
    mappings.forEach((locSet, zId) => {
      locSet.forEach((lId) => {
        if (!m.has(lId)) m.set(lId, []);
        m.get(lId).push(zId);
      });
    });
    return m;
  }, [mappings]);

  const selectedZoneLocSet = useMemo(
    () =>
      selectedZoneId
        ? mappings.get(String(selectedZoneId)) || new Set()
        : new Set(),
    [selectedZoneId, mappings],
  );

  const filteredLocations = useMemo(() => {
    let list = locations;
    if (locFrom || locTo)
      list = list.filter((l) => isLocationInRange(l.location, locFrom, locTo));
    if (selectedZoneId && zoneFilterMode !== "all") {
      if (zoneFilterMode === "assigned")
        list = list.filter((l) =>
          selectedZoneLocSet.has(String(l.location_id)),
        );
      if (zoneFilterMode === "unassigned")
        list = list.filter((l) => !locationZonesMap.has(String(l.location_id)));
    }
    return list;
  }, [
    locations,
    locFrom,
    locTo,
    selectedZoneId,
    zoneFilterMode,
    selectedZoneLocSet,
    locationZonesMap,
  ]);

  const gridLocations = useMemo(
    () =>
      filteredLocations.map((loc) => {
        const lIdStr = String(loc.location_id);
        const assignedZoneIds = locationZonesMap.get(lIdStr) || [];
        const currentZoneId = assignedZoneIds[0] ?? null;
        const currentZone =
          currentZoneId != null ? zoneById.get(String(currentZoneId)) : null;
        // console.log("Processing sdsads", currentZoneId);

        let zoneLabel = "";
        if (currentZone) {
          if (currentZone.zone_type && currentZone.zone_type !== "undefined") {
            zoneLabel = `${currentZone.zone} - ${currentZone.zone_type}`;
          } else {
            zoneLabel = `${currentZone.zone}`;
          }
        } else if (currentZoneId) {
          zoneLabel = `${currentZoneId}`;
        }

        return {
          ...loc,
          id: lIdStr,
          current_zone_id: currentZoneId,
          current_zone: zoneLabel,
          is_assigned_selected: selectedZoneId
            ? selectedZoneLocSet.has(lIdStr)
            : false,
        };
      }),
    [
      filteredLocations,
      locationZonesMap,
      selectedZoneId,
      selectedZoneLocSet,
      zoneById,
    ],
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
      getLabel("t_inv_zone_location", fieldName, fallback),
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

  const maxLocCount = useMemo(() => {
    let max = 0;

    mappings.forEach((locSet) => {
      if (locSet.size > max) {
        max = locSet.size;
      }
    });

    return max;
  }, [mappings]);

  const locationColumnDefs = useMemo(
    () => [
      {
        field: "location",
        // headerName: "Location Code",
        headerName: resolveColumnLabel(
          "t_inv_location",
          "location",
          "Location Code",
        ),
        // width: 190,
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
        field: "description",
        headerName: resolveColumnLabel(
          "t_inv_location",
          "description",
          "Description",
        ),
        // width: 320,
        width: 280,
        renderCell: (params) => (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ width: "100%", height: "100%" }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: "100%" }}
            >
              {params.value || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "loc_type",
        headerName: resolveColumnLabel("t_inv_location", "loc_type", "Type"),
        // width: 140,
        renderCell: (params) => (
          <Typography variant="body2" color="text.secondary">
            {params.value || "-"}
          </Typography>
        ),
      },
      {
        field: "current_zone",
        headerName: resolveColumnLabel(
          "t_inv_zone_location",
          "current_zone",
          "Current Zone",
        ),
        // width: 170,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params.value) {
            return (
              <Typography
                variant="body2"
                color="text.disabled"
                sx={{ fontStyle: "italic" }}
              >
                -
              </Typography>
            );
          }
          const zoneCount =
            mappings.get(String(params.row.current_zone_id))?.size ?? 0;

          const zColor = getCountHeatColor(zoneCount, maxLocCount);
          return (
            <Chip
              label={params.value}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: alpha(zColor, 0.12),
                color: zColor,
                border: `1px solid ${alpha(zColor, 0.3)}`,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          );
        },
      },
      // {
      //     field: "is_active",
      //     headerName: "Status",
      //     width: 120,
      //     sortable: false,
      //     renderCell: (params) => {
      //         const active = isActive(params.value);
      //         return (
      //             <Chip
      //                 label={active ? "Active" : "Inactive"}
      //                 size="small"
      //                 sx={{
      //                     height: 20,
      //                     fontSize: "0.7rem",
      //                     fontWeight: 700,
      //                     bgcolor: active ? "rgba(76,175,80,0.12)" : "rgba(244,67,54,0.12)",
      //                     color: active ? "success.main" : "error.main",
      //                     border: `1px solid ${active ? "rgba(76,175,80,0.3)" : "rgba(244,67,54,0.3)"}`,
      //                     "& .MuiChip-label": { px: 0.75 },
      //                 }}
      //             />
      //         );
      //     },
      // },
    ],
    [
      resolveColumnLabel,
      mappings,
      maxLocCount
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
          const locCount = mappings.get(String(params.row.zone_id))?.size ?? 0;
          const zColor = getCountHeatColor(locCount, maxLocCount);
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
                  bgcolor: zColor,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${alpha(zColor, 0.3)}`,
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
                label={locCount}
                size="small"
                color={locCount > 0 ? "primary" : "default"}
                variant={locCount > 0 ? "filled" : "outlined"}
                sx={{
                  height: 18,
                  minWidth: 24,
                  fontSize: "0.65rem",
                  flexShrink: 0,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Stack>
          );
        },
      },
      {
        field: "zone_type",
        //  width: 140,
        required: true,
      },
      { field: "is_active", defaultValue: 1 },
    ],
    [mappings, maxLocCount],
  );

  // ── Button enabled states ────────────────────────────────────────────────
  const canAssign =
    permission?.is_add &&
    selectedZoneId &&
    selectedLocIds.size > 0 &&
    [...selectedLocIds].some((lId) => !selectedZoneLocSet.has(lId));

  const selectedCurrentAssignments = useMemo(() => {
    const assignments = [];
    selectedLocIds.forEach((lId) => {
      const currentZoneId = (locationZonesMap.get(lId) || [])[0] ?? null;
      if (currentZoneId == null) return;

      const recId = recordIds.get(`${String(currentZoneId)}-${lId}`);
      if (recId == null) return;

      assignments.push({
        location_id: lId,
        zone_id: String(currentZoneId),
        zone_location_id: recId,
      });
    });
    return assignments;
  }, [selectedLocIds, locationZonesMap, recordIds]);

  const canUnassign =
    permission?.is_delete &&
    selectedLocIds.size > 0 &&
    selectedCurrentAssignments.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleZoneSelection = useCallback((selectedRows) => {
    const zoneId = selectedRows?.[0]?.zone_id ?? null;
    setSelectedZoneId(zoneId);
    setSelectedLocIds(new Set());
    setGridResetKey((prev) => prev + 1);
  }, []);

  const handleLocationSelection = useCallback((selectedRows) => {
    setSelectedLocIds(
      new Set((selectedRows || []).map((row) => String(row.location_id))),
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
    setSelectedLocIds(new Set());
    setZoneFilterMode("all");
    setGridResetKey((prev) => prev + 1);
  }, []);

  const resetGridSelection = useCallback(() => {
    setSelectedLocIds(new Set());
    setGridResetKey((prev) => prev + 1);
  }, []);

  const handleZoneFilterChange = useCallback(
    (event) => {
      const nextMode = event.target.value;
      setZoneFilterMode(nextMode);
      resetGridSelection();
    },
    [resetGridSelection],
  );

  const handleAssignToZone = async () => {
    if (!selectedZoneId || selectedLocIds.size === 0) return;
    setOperating(true);
    try {
      const toCreate = [...selectedLocIds].filter(
        (lId) => !selectedZoneLocSet.has(lId),
      );
      if (toCreate.length === 0) {
        BSAlertSwal2.show(
          "info",
          "Selected locations are already assigned to this zone.",
        );
        return;
      }

      // Remove any existing zone assignment for these locations (enforce 1-to-1).
      const deleteConditions = [];
      toCreate.forEach((lId) => {
        const existingZoneIds = locationZonesMap.get(lId) || [];
        existingZoneIds.forEach((existingZId) => {
          if (String(existingZId) === String(selectedZoneId)) return;
          const recId = recordIds.get(`${String(existingZId)}-${lId}`);
          if (recId != null) deleteConditions.push({ zone_location_id: recId });
        });
      });

      for (const chunk of chunkArray(deleteConditions, ASSIGN_BATCH_SIZE)) {
        const result = await bulkDelete(chunk, "inv");
        assertBulkSuccess(result, "Remove existing zone assignment");
      }

      const createRows = toCreate.map((lId) => ({
        zone_id: selectedZoneId,
        location_id: lId,
      }));

      for (const chunk of chunkArray(createRows, ASSIGN_BATCH_SIZE)) {
        const result = await bulkCreate(chunk, "inv");
        assertBulkSuccess(result, "Assign locations to zone");
      }

      BSAlertSwal2.show(
        "success",
        `Assigned ${toCreate.length} location(s) to zone.`,
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
    if (selectedLocIds.size === 0) return;
    setOperating(true);
    try {
      if (selectedCurrentAssignments.length === 0) {
        BSAlertSwal2.show(
          "info",
          "Selected locations are not assigned to any zone.",
        );
        return;
      }

      const deleteConditions = Array.from(
        new Set(selectedCurrentAssignments.map((item) => item.zone_location_id)),
      ).map((recId) => ({ zone_location_id: recId }));

      for (const chunk of chunkArray(deleteConditions, ASSIGN_BATCH_SIZE)) {
        const result = await bulkDelete(chunk, "inv");
        assertBulkSuccess(result, "Unassign locations from zone");
      }

      BSAlertSwal2.show(
        "success",
        `Unassigned ${selectedCurrentAssignments.length} location(s) from current zone.`,
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ position: "relative" }}>
      {operating && (
        <Backdrop
          open
          sx={{
            position: "absolute",
            zIndex: (t) => t.zIndex.modal,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
            backdropFilter: "blur(2px)",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            {t("processing", "Processing…")}
          </Typography>
        </Backdrop>
      )}
      <Paper sx={{ p: 2.5 }}>
        {/* ── Main Layout ─────────────────────────────────────────── */}
        <Box
          ref={splitContainerRef}
          sx={{
            minHeight: 520,
            display: "flex",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {/* ── Zone Panel ──────────────────────────────────────── */}
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
            {/* Header */}
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
              {selectedZoneId && (
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
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                maxWidth: "100%",
                height: (theme) => `calc(100vh - ${theme.spacing(8)})`,
              }}
            >
              <BSDataGrid
                key={`zone-grid-${zoneGridRefreshKey}-${locale_id}`}
                bsLocale={locale_id}
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
            aria-label="Resize Zone and Location panels"
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

          {/* ── Location Panel ──────────────────────────────────── */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: MIN_LOCATION_PANEL_WIDTH,
            }}
          >
            {/* Location Table Container */}
            <Paper
              variant="outlined"
              sx={{
                height: PANEL_HEIGHT,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                overflow: "hidden",
                borderColor: (t) => alpha(t.palette.success.main, 0.25),
              }}
            >
              {/* Panel header */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  background: (t) =>
                    `linear-gradient(135deg, ${t.palette.success.dark}, ${t.palette.success.main})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <LocationOnIcon sx={{ color: "#fff", fontSize: 18 }} />
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#fff"
                  sx={{ flex: 1 }}
                >
                  {t("locations", "Locations")}
                </Typography>
                <Chip
                  label={
                    selectedZoneId
                      ? `${selectedZoneLocSet.size} ${t("assigned", "assigned")}`
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

              {/* Filter + Action bar */}
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: (t) => alpha(t.palette.success.main, 0.04),
                  borderBottom: (t) =>
                    `1px solid ${alpha(t.palette.success.main, 0.12)}`,
                }}
              >
                {/* Filter row */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Autocomplete
                    freeSolo
                    options={locations.map((l) => l.location)}
                    value={locFrom}
                    onInputChange={(_, v) => {
                      setLocFrom(v.toUpperCase());
                      resetGridSelection();
                    }}
                    size="small"
                    sx={{ width: 170 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("from_location", "From Location")}
                        placeholder="เช่น A01-01-01"
                        sx={{
                          "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                        }}
                      />
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={locations.map((l) => l.location)}
                    value={locTo}
                    onInputChange={(_, v) => {
                      setLocTo(v.toUpperCase());
                      resetGridSelection();
                    }}
                    size="small"
                    sx={{ width: 170 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("to_location", "To Location")}
                        placeholder="เช่น A02-99-99"
                        sx={{
                          "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                        }}
                      />
                    )}
                  />

                  <TextField
                    select
                    size="small"
                    label={t("zone_filter", "Zone Filter")}
                    value={zoneFilterMode}
                    onChange={handleZoneFilterChange}
                    sx={{
                      minWidth: 165,
                      "& .MuiInputBase-input": { fontSize: "0.8125rem" },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: "0.8125rem" }}>
                      {t("filter_all", "All")}
                    </MenuItem>
                    <MenuItem
                      value="assigned"
                      disabled={!selectedZoneId}
                      sx={{ fontSize: "0.8125rem" }}
                    >
                      {t("filter_assigned", "Assigned to Zone")}
                    </MenuItem>
                    <MenuItem
                      value="unassigned"
                      disabled={!selectedZoneId}
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

              {/* Location Grid */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  maxWidth: "100%",
                  height: (theme) => `calc(100vh - ${theme.spacing(8)})`,
                }}
              >
                {gridLocations.length === 0 ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{ height: "100%", opacity: 0.55 }}
                  >
                    <LocationOnIcon
                      sx={{ fontSize: 36, color: "action.disabled" }}
                    />
                    <Typography variant="body2" color="text.disabled">
                      {selectedZoneId
                        ? t(
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
                    key={`${selectedZoneId || "all"}-${locFrom}-${locTo}-${zoneFilterMode}-${gridResetKey}-${locale_id}`}
                    data={gridLocations}
                    columns={locationColumnDefs}
                    bsCols="location,description,loc_type,current_zone,is_active"
                    bsLocale={locale_id}
                    bsShowCheckbox
                    bsShowRowNumber
                    bsRowPerPage={20}
                    pageSizeOptions={[20, 50, 100, 200]}
                    height="100%"
                    showToolbar={false}
                    onCheckBoxSelected={handleLocationSelection}
                  />
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ZoneLocation;
