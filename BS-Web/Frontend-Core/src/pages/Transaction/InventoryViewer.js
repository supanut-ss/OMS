import {
  Box,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  IconButton,
  useTheme,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BSDataGrid from "../../components/BSDataGrid";
import BSAlert from "../../components/BSAlert";
// import BSFilterCustom from "../../components/BSFilterCustom";
import AxiosMaster from "../../utils/AxiosMaster";
import { useResource } from "../../hooks/useResource";

const INVENTORY_VIEWER_API = "/inventory-viewer";

const DEFAULT_TABS = [
  {
    key: "serial",
    label: "By Serial",
    viewName: "v_inv_viewer_inventory_serial",
  },
  { key: "item", label: "By Item", viewName: "v_inv_viewer_inventory" },
  {
    key: "itemSummary",
    label: "By Item Summary",
    viewName: "v_inv_viewer_inventory_sum_by_item",
  },
  {
    key: "lotSummary",
    label: "By Lot Summary",
    viewName: "v_inv_viewer_inventory_sum_by_lot",
  },
  {
    key: "minStock",
    label: "By Min Stock",
    viewName: "v_inv_viewer_inventory_min_stock",
  },
];

const getInvStatusPalette = (status) => {
  switch (status) {
    case "Available":
      return { text: "#059669" };
    case "Hold":
      return { text: "#d97706" };
    case "Damaged":
      return { text: "#dc2626" };
    case "Quarantine":
      return { text: "#7c3aed" };
    default:
      return { text: "#64748b" };
  }
};

const InvStatusChip = ({ status }) => {
  const palette = getInvStatusPalette(status);

  return (
    <Box
      component="span"
      sx={{
        fontSize: "0.72rem",
        fontWeight: 600,
        height: 22,
        lineHeight: "22px",
        color: palette.text,
        display: "inline-block",
      }}
    >
      {status || "—"}
    </Box>
  );
};

const colsBySerial = [
  { field: "zone", headerName: "Zone" },
  { field: "location", headerName: "Location" },
  { field: "loc_type", headerName: "Loc Type" },
  { field: "item_category", headerName: "Category" },
  {
    field: "item_number",
    headerName: "Item Number",
  },
  {
    field: "item_description",
    headerName: "Description",
    width: 280,
  },
  { field: "quantity", headerName: "Quantity", type: "number" },
  {
    field: "quantity_allocated",
    headerName: "Qty Allocate",
    type: "number",
  },
  { field: "uom", headerName: "UOM" },
  {
    field: "inv_status",
    headerName: "Inv Status",
    renderCell: ({ value }) => <InvStatusChip status={value} />,
  },
  { field: "lot_number", headerName: "Lot Number" },
  { field: "expiry_date", headerName: "Expiry Date" },
  {
    field: "serial_number",
    headerName: "Serial Number",
  },
  { field: "receive_date", headerName: "Receive Date" },
];

const colsByItem = [
  { field: "zone", headerName: "Zone" },
  { field: "location", headerName: "Location" },
  { field: "loc_type", headerName: "Loc Type" },
  { field: "item_category", headerName: "Category" },
  {
    field: "item_number",
    headerName: "Item Number",
  },
  {
    field: "item_description",
    headerName: "Description",
    width: 280,
  },
  { field: "quantity", headerName: "Quantity", type: "number" },
  {
    field: "quantity_allocated",
    headerName: "Qty Allocate",
    type: "number",
  },
  {
    field: "quantity_available",
    headerName: "Qty Available",
    type: "number",
  },
  { field: "uom", headerName: "UOM", width: 70 },
  {
    field: "inv_status",
    headerName: "Inv Status",
    renderCell: ({ value }) => <InvStatusChip status={value} />,
  },
  { field: "lot_number", headerName: "Lot Number" },
  { field: "expiry_date", headerName: "Expiry Date" },
  { field: "receive_date", headerName: "Receive Date" },
];

const colsByItemSummary = [
  { field: "item_category", headerName: "Category" },
  {
    field: "item_number",
    headerName: "Item Number",
  },
  {
    field: "item_description",
    headerName: "Description",
    width: 280,
  },
  { field: "quantity", headerName: "Quantity", type: "number" },
  {
    field: "quantity_allocated",
    headerName: "Qty Allocate",
    type: "number",
  },
  {
    field: "quantity_available",
    headerName: "Qty Available",
    type: "number",
  },
  { field: "uom", headerName: "UOM" },
  {
    field: "inv_status",
    headerName: "Inv Status",
    renderCell: ({ value }) => <InvStatusChip status={value} />,
  },
];

const colsByLotSummary = [
  { field: "item_category", headerName: "Category" },
  {
    field: "item_number",
    headerName: "Item Number",
  },
  {
    field: "item_description",
    headerName: "Description",
    width: 280,
  },
  { field: "lot_number", headerName: "Lot Number" },
  {
    field: "quantity",
    headerName: "Quantity",
    type: "number",
  },
  {
    field: "quantity_allocated",
    headerName: "Qty Allocate",
    type: "number",
  },
  {
    field: "quantity_available",
    headerName: "Qty Available",
    type: "number",
  },
  {
    field: "uom",
    headerName: "UOM",
  },
  {
    field: "inv_status",
    headerName: "Inv Status",
    renderCell: ({ value }) => <InvStatusChip status={value} />,
  },
];

const colsByMinStock = [
  { field: "item_category", headerName: "Category" },
  {
    field: "item_number",
    headerName: "Item Number",
  },
  {
    field: "item_description",
    headerName: "Description",
    width: 280,
  },
  { field: "quantity", headerName: "Quantity", type: "number" },
  {
    field: "quantity_allocated",
    headerName: "Qty Allocate",
    type: "number",
  },
  {
    field: "quantity_available",
    headerName: "Qty Available",
    type: "number",
  },
  { field: "uom", headerName: "UOM" },
  {
    field: "min_qty",
    headerName: "Min Stock",
    type: "number",
  },
  {
    field: "inv_status",
    headerName: "Inv Status",
    renderCell: ({ value }) => <InvStatusChip status={value} />,
  },
];

const COLUMNS_BY_TAB = {
  serial: colsBySerial,
  item: colsByItem,
  itemSummary: colsByItemSummary,
  lotSummary: colsByLotSummary,
  minStock: colsByMinStock,
};

const InventoryViewer = ({ lang }) => {
  const theme = useTheme();
  const gridRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [error, setError] = useState("");
  const [resourceData, setResourceData] = useState({});

  const { getResources } = useResource();

  const currentTab = tabs[activeTab] || DEFAULT_TABS[0];

  // Helper: Get resource value for column header
  const getColumnHeader = useCallback(
    (field, defaultHeader, viewName) => {
      const resources = resourceData[viewName];
      if (!resources || !Array.isArray(resources)) return defaultHeader;

      const resource = resources.find((res) => res.resource_name === field);
      return resource?.resource_value || defaultHeader;
    },
    [resourceData],
  );

  // Apply resources to column definitions
  const applyResourcesToColumns = useCallback(
    (columns, viewName) => {
      return columns.map((col) => ({
        ...col,
        headerName: getColumnHeader(col.field, col.headerName, viewName),
      }));
    },
    [getColumnHeader],
  );

  const currentColumns = useMemo(() => {
    const baseColumns = COLUMNS_BY_TAB[currentTab?.key] || colsBySerial;
    const viewName = currentTab?.viewName;

    if (!viewName || !resourceData[viewName]) {
      return baseColumns;
    }

    return applyResourcesToColumns(baseColumns, viewName);
  }, [currentTab, resourceData, applyResourcesToColumns]);

  const currentColumnFields = useMemo(
    () => currentColumns.map((column) => column.field).join(","),
    [currentColumns],
  );

  const handleRefresh = useCallback(() => {
    gridRef.current?.refreshData?.(true);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadMetadata = async () => {
      try {
        const tabsResponse = await AxiosMaster.get(
          `${INVENTORY_VIEWER_API}/tabs`,
        );

        if (ignore) {
          return;
        }

        const nextTabs = tabsResponse?.data?.data;
        if (Array.isArray(nextTabs) && nextTabs.length > 0) {
          setTabs(nextTabs);

          // Load resources for all view names
          const viewNames = nextTabs.map((tab) => tab.viewName).filter(Boolean);

          const resourcePromises = viewNames.map(async (viewName) => {
            try {
              const resources = await getResources(viewName, lang || "en");
              return { viewName, resources };
            } catch (err) {
              console.error(`Failed to load resources for ${viewName}:`, err);
              return { viewName, resources: [] };
            }
          });

          const resourceResults = await Promise.all(resourcePromises);
          const resourceMap = {};
          resourceResults.forEach(({ viewName, resources }) => {
            resourceMap[viewName] = resources;
          });
          setResourceData(resourceMap);
        }
      } catch (metadataError) {
        if (!ignore) {
          setError(
            metadataError?.response?.data?.message_text ||
              metadataError?.message ||
              "Failed to load Inventory Viewer metadata.",
          );
        }
      }
    };

    loadMetadata();

    return () => {
      ignore = true;
    };
  }, [lang, getResources]);

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      {/* <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Inventory Viewer
      </Typography> */}

      <Paper
        elevation={0}
        sx={{
          borderRadius: "0 !important",
          overflow: "hidden",
          border: "none",
          boxShadow: "none",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            borderRadius: "0 !important",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 44, flex: 1, borderRadius: "0 !important" }}
          >
            {tabs.map((tabItem) => (
              <Tab
                key={tabItem.key}
                label={tabItem.label}
                sx={{
                  fontSize: "0.8125rem",
                  minHeight: 44,
                  py: 1,
                  borderRadius: "0 !important",
                }}
              />
            ))}
          </Tabs>

          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh} sx={{ ml: 1 }}>
              <RefreshOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <BSAlert
          open={Boolean(error)}
          severity="error"
          message={error}
          sx={{ mx: 2, mt: 2 }}
        />

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <BSDataGrid
            key={`${currentTab?.key}-${currentTab?.viewName}`}
            ref={gridRef}
            height="auto"
            bsLocale={lang || "en"}
            bsPreObj="inv"
            bsObj={currentTab?.viewName}
            bsCols={currentColumnFields}
            bsColumnDefs={currentColumns}
            bsShowRowNumber={true}
            showAdd={false}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            bsAllowDelete={false}
            bsVisibleView={false}
            bsShowCheckbox={false}
            bsFilterMode="server"
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default InventoryViewer;
