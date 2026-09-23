import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  IconButton,
  Chip,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BSDataGrid } from "../../components/BSDataGrid";
import { motion } from "framer-motion";
import { useResource } from "../../hooks/useResource";

const MASTER_RESOURCE_GROUP = "t_inv_count_master";
const PLAN_RESOURCE_GROUP = "v_inv_count_plan_detail";
const DETAIL_RESOURCE_GROUP = "v_inv_count_plan_reconcile";
const RECONCILE_RESOURCE_GROUP = "v_inv_count_reconcile_merge";

const getEnvDecimalPlaces = () => {
  const envVal = process.env.REACT_APP_DECIMAL_PLACES;
  if (envVal !== undefined && envVal !== null && envVal !== "") {
    const parsed = parseInt(envVal, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 2;
};

const DECIMAL_PLACES = getEnvDecimalPlaces();

const fallbackFromField = (field) =>
  String(field || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getDefaultVisibilityModel = (cols) =>
  cols.reduce((acc, col) => {
    acc[col.field] = true;
    return acc;
  }, {});

const getStatusLabel = (row) => {
  const closeRemark = String(row?.close_remark || "").toLowerCase();
  if (closeRemark.includes("cancel")) return "Cancelled";
  if (row?.close_date) return "Completed";
  if (row?.update_date) return "In Progress";
  return "Open";
};

const getStatusColor = (status) => {
  if (status === "Completed")
    return { text: "#00a86b", border: "#8fdac0", bg: "#e9f8f2" };
  if (status === "In Progress")
    return { text: "#f59e0b", border: "#f4cf8f", bg: "#fff5e5" };
  if (status === "Cancelled")
    return { text: "#6b7280", border: "#cfd4dc", bg: "#f3f4f6" };
  return { text: "#2f6fed", border: "#9dbcf7", bg: "#eaf1ff" };
};

const getInvStatusPalette = (status) => {
  switch (status) {
    case "Available":
      return { text: "#059669", border: "#6ee7b7", bg: "#d1fae5" };
    case "Hold":
      return { text: "#d97706", border: "#fcd34d", bg: "#fef3c7" };
    case "Damaged":
      return { text: "#dc2626", border: "#fca5a5", bg: "#fee2e2" };
    case "Quarantine":
      return { text: "#7c3aed", border: "#c4b5fd", bg: "#ede9fe" };
    default:
      return { text: "#64748b", border: "#d1d5db", bg: "#f1f3f5" };
  }
};

const InvStatusChip = ({ status }) => {
  const palette = getInvStatusPalette(status);

  return (
    <Chip
      label={status || "—"}
      size="small"
      sx={{
        fontSize: "0.72rem",
        fontWeight: 600,
        height: 22,
        color: palette.text,
        // border: `1px solid ${palette.border}`,
        // bgcolor: palette.bg,
        // borderRadius: "6px",
        backgroundColor: "transparent",
        border: "none",
      }}
    />
  );
};

const CountReconcile = (props) => {
  const theme = useTheme();
  const { getResourceByGroupAndName } = useResource();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [viewMode, setViewMode] = useState("list");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");

  useEffect(() => {
    setLocale_id(props.lang || "en");
  }, [props.lang]);

  const getLabel = useCallback(
    (resourceGroup, resourceName, fallback) =>
      getResourceByGroupAndName(resourceGroup, resourceName, locale_id)
        ?.resource_value || fallback,
    [getResourceByGroupAndName, locale_id],
  );

  const labels = useMemo(
    () => ({
      pageTitle: getLabel(
        RECONCILE_RESOURCE_GROUP,
        "CountReconciliation",
        "Count Reconciliation",
      ),
      tabPlan: getLabel(RECONCILE_RESOURCE_GROUP, "CountPlan", "Count Plan"),
      tabDetail: getLabel(
        RECONCILE_RESOURCE_GROUP,
        "CountDetail",
        "Count Detail",
      ),
      tabReconcile: getLabel(
        RECONCILE_RESOURCE_GROUP,
        "CountReconcile",
        "Count Reconcile",
      ),
      notCounted: getLabel(
        RECONCILE_RESOURCE_GROUP,
        "NotCounted",
        "Not counted",
      ),
      selectCountNumber: getLabel(
        MASTER_RESOURCE_GROUP,
        "SelectCountNumber",
        "--- Select Count Number ---",
      ),
    }),
    [getLabel],
  );

  const resolveColumnLabel = useCallback(
    (resourceGroup, fieldName, fallback = null) =>
      getLabel(
        resourceGroup,
        fieldName,
        fallback || fallbackFromField(fieldName),
      ),
    [getLabel],
  );

  const planColumnDefs = useMemo(
    () => [
      {
        field: "zone",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "zone"),
      },
      {
        field: "location",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "location"),
      },
      {
        field: "item_number",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "item_number"),
        width: 150,
        renderCell: (params) => (
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "item_description",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "item_description"),
        width: 280,
      },
      {
        field: "lot_number",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "lot_number"),
      },
      {
        field: "expiry_date",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "expiry_date"),
      },
      {
        field: "serial_number",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "serial_number"),
      },
      {
        field: "quantity_stock",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "quantity_stock"),
        type: "number",
      },
      {
        field: "uom",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "uom", "UOM"),
      },
      {
        field: "create_date",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "create_date"),
      },
      {
        field: "create_by",
        headerName: resolveColumnLabel(PLAN_RESOURCE_GROUP, "create_by"),
      },
    ],
    [resolveColumnLabel],
  );

  const detailColumnDefs = useMemo(
    () => [
      {
        field: "zone",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "zone"),
      },
      {
        field: "location",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "location"),
      },
      {
        field: "item_category",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "item_category"),
      },
      {
        field: "item_number",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "item_number"),
        renderCell: (params) => (
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {params.value}
          </Typography>
        ),
        width: 150,
      },
      {
        field: "item_description",
        headerName: resolveColumnLabel(
          DETAIL_RESOURCE_GROUP,
          "item_description",
        ),
        width: 280,
      },
      {
        field: "lot_number",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "lot_number"),
      },
      {
        field: "expiry_date",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "expiry_date"),
      },
      {
        field: "serial_number",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "serial_number"),
      },
      {
        field: "quantity_count",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "quantity_count"),
        type: "number",
        renderCell: (params) => (
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {params.value == null ? "-" : params.value}
          </Typography>
        ),
      },
      {
        field: "uom",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "uom", "UOM"),
      },
      {
        field: "create_date",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "create_date"),
      },
      {
        field: "create_by",
        headerName: resolveColumnLabel(DETAIL_RESOURCE_GROUP, "create_by"),
      },
    ],
    [resolveColumnLabel],
  );

  const reconcileColumnDefs = useMemo(
    () => [
      {
        field: "zone",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "zone"),
      },
      {
        field: "location",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "location"),
      },
      {
        field: "item_category",
        headerName: resolveColumnLabel(
          RECONCILE_RESOURCE_GROUP,
          "item_category",
        ),
      },
      {
        field: "item_number",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "item_number"),
        renderCell: (params) => (
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {params.value}
          </Typography>
        ),
        width: 150,
      },
      {
        field: "item_description",
        headerName: resolveColumnLabel(
          RECONCILE_RESOURCE_GROUP,
          "item_description",
        ),
        width: 280,
      },
      {
        field: "lot_number",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "lot_number"),
      },
      {
        field: "expiry_date",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "expiry_date"),
      },
      {
        field: "serial_number",
        headerName: resolveColumnLabel(
          RECONCILE_RESOURCE_GROUP,
          "serial_number",
        ),
      },
      {
        field: "quantity_stock",
        headerName: resolveColumnLabel(
          RECONCILE_RESOURCE_GROUP,
          "quantity_stock",
        ),
        type: "number",
      },
      {
        field: "quantity_count",
        headerName: resolveColumnLabel(
          RECONCILE_RESOURCE_GROUP,
          "quantity_count",
        ),
        type: "number",
        renderCell: (params) => (
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {params.value == null ? "-" : params.value.toFixed(DECIMAL_PLACES)}
          </Typography>
        ),
      },
      {
        field: "diff_qty",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "diff_qty"),
        type: "number",
        renderCell: (params) => {
          if (params.value == null) {
            return (
              <Typography
                component="span"
                sx={{
                  color: "#f59e0b",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {labels.notCounted}
              </Typography>
            );
          }
          if (Number(params.value) === 0) {
            return (
              <Typography
                component="span"
                sx={{ color: "#00a86b", fontWeight: 700 }}
              >
                {params.value.toFixed(DECIMAL_PLACES)}
              </Typography>
            );
          }
          if (Number(params.value) < 0) {
            return (
              <Typography
                component="span"
                sx={{ color: "#ff3b30", fontWeight: 700 }}
              >
                {params.value.toFixed(DECIMAL_PLACES)}
              </Typography>
            );
          }
          return (
            <Typography component="span" sx={{ fontWeight: 700 }}>
              {params.value.toFixed(DECIMAL_PLACES)}
            </Typography>
          );
        },
      },
      {
        field: "inv_status",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "inv_status"),
        renderCell: ({ value }) => <InvStatusChip status={value} />,
      },
      {
        field: "count_by",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "count_by"),
      },
      {
        field: "count_date",
        headerName: resolveColumnLabel(RECONCILE_RESOURCE_GROUP, "count_date"),
      },
    ],
    [labels.notCounted, resolveColumnLabel],
  );

  const [detailDensity, setDetailDensity] = useState("standard");
  const [detailColumnVisibilityModel, setDetailColumnVisibilityModel] =
    useState(() => getDefaultVisibilityModel(planColumnDefs));

  const openDetail = (row) => {
    setSelectedPlan(row);
    setViewMode("detail");
    setActiveTab("plan");
    setDetailDensity("standard");
    setDetailColumnVisibilityModel(getDefaultVisibilityModel(planColumnDefs));
  };

  const closeDetail = () => {
    setViewMode("list");
    setSelectedPlan(null);
  };

  if (viewMode === "detail") {
    return (
      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{ mb: 2, display: "flex", alignItems: "flex-start", gap: 1.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <IconButton
              size="small"
              onClick={closeDetail}
              sx={{ border: "1px solid", borderColor: "divider", mt: 0.2 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </motion.div>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {labels.pageTitle}
            </Typography>
            <Typography color="text.secondary" fontSize="1.02rem">
              {selectedPlan?.count_number || selectedPlan?.count_id} ·{" "}
              {selectedPlan?.count_type || selectedPlan?.count_plan_type} ·{" "}
              {selectedPlan?.description}
            </Typography>
          </Box>
        </Box>
        <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
              setDetailDensity("standard");
              if (value === "plan") {
                setDetailColumnVisibilityModel(
                  getDefaultVisibilityModel(planColumnDefs),
                );
              } else if (value === "detail") {
                setDetailColumnVisibilityModel(
                  getDefaultVisibilityModel(detailColumnDefs),
                );
              } else {
                setDetailColumnVisibilityModel(
                  getDefaultVisibilityModel(reconcileColumnDefs),
                );
              }
            }}
            sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Tab value="plan" label={labels.tabPlan} />
            <Tab value="detail" label={labels.tabDetail} />
            <Tab value="reconcile" label={labels.tabReconcile} />
          </Tabs>
          <Box sx={{ px: 2.5, py: 2 }}>
            {activeTab === "plan" && (
              <BSDataGrid
                bsLocale={locale_id}
                bsPreObj="inv"
                bsObj={PLAN_RESOURCE_GROUP}
                bsCols="zone,location,item_number,item_description,lot_number,expiry_date,serial_number,quantity_stock,uom,create_date,create_by"
                bsObjBy="create_date desc"
                bsShowDescColumn={true}
                bsKeyId="count_detail_id"
                showAdd={false}
                bsVisibleView={false}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsVisibleAdd={false}
                bsObjWh={
                  selectedPlan
                    ? `count_master_id = '${selectedPlan.count_master_id}'`
                    : undefined
                }
                bsColumnDefs={planColumnDefs}
                density={detailDensity}
                columnVisibilityModel={detailColumnVisibilityModel}
                onColumnVisibilityModelChange={setDetailColumnVisibilityModel}
              />
            )}
            {activeTab === "detail" && (
              <BSDataGrid
                bsLocale={locale_id}
                bsPreObj="inv"
                bsObj={DETAIL_RESOURCE_GROUP}
                bsCols="zone,location,item_category,item_number,item_description,lot_number,expiry_date,serial_number,quantity_count,uom,create_date,create_by"
                bsObjBy="create_date desc"
                bsShowDescColumn={true}
                bsKeyId="count_reconcile_id"
                showAdd={false}
                bsVisibleView={false}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsVisibleAdd={false}
                bsObjWh={
                  selectedPlan
                    ? `count_master_id = '${selectedPlan.count_master_id}'`
                    : undefined
                }
                bsColumnDefs={detailColumnDefs}
                density={detailDensity}
                columnVisibilityModel={detailColumnVisibilityModel}
                onColumnVisibilityModelChange={setDetailColumnVisibilityModel}
              />
            )}
            {activeTab === "reconcile" && (
              <BSDataGrid
                bsLocale={locale_id}
                bsPreObj="inv"
                bsObj={RECONCILE_RESOURCE_GROUP}
                bsCols="zone,location,item_category,item_number,item_description,lot_number,expiry_date,serial_number,quantity_stock,quantity_count,diff_qty,inv_status,count_by,count_date"
                bsObjBy="zone,location,item_number"
                bsShowDescColumn={true}
                bsKeyId="count_master_id"
                showAdd={false}
                bsVisibleView={false}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsVisibleAdd={false}
                bsObjWh={
                  selectedPlan
                    ? `count_master_id = '${selectedPlan.count_master_id}'`
                    : undefined
                }
                bsColumnDefs={reconcileColumnDefs}
                density={detailDensity}
                columnVisibilityModel={detailColumnVisibilityModel}
                onColumnVisibilityModelChange={setDetailColumnVisibilityModel}
              />
            )}
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 2,
       // mb: 3,
        width: "100%",
        maxWidth: "100%",
     height: "100%",
          display: "flex",
          flexDirection: "column",
      }}
    >
      <motion.div
        layout={false}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <BSDataGrid
          bsLocale={locale_id}
          bsPreObj="inv"
          bsObj={MASTER_RESOURCE_GROUP}
          bsCols="count_master_id  
                 ,count_status
                 ,count_number
                 ,count_type
                 ,description
                 ,close_by
                 ,close_date
                 ,close_remark
                 ,create_by
                 ,create_date
                 ,update_by
                 ,update_date"
          bsObjBy="create_date desc"
          bsShowDescColumn={true}
          bsKeyId="count_master_id"
          showAdd={false}
          onView={openDetail}
          bsVisibleView={true}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsVisibleAdd={false}
          bsColumnDefs={[
            {
              field: "count_number",
              renderCell: (params) => (
                <Typography
                  component="span"
                  sx={{ color: "#3b56c5", fontWeight: 700 }}
                >
                  {params.value}
                </Typography>
              ),
              width: 150,
            },
            {
              field: "count_type",
            },
            {
              field: "description",
              headerName: labels.description,
              width: 280,
            },
            {
              field: "count_status",
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                const status = getStatusLabel(params.row);
                const palette = getStatusColor(status);
                return (
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <Chip
                      size="small"
                      label={status}
                      sx={{
                        color: palette.text,
                        // borderColor: palette.border,
                        // backgroundColor: palette.bg,
                        // borderWidth: 1,
                        // borderStyle: "solid",
                        backgroundColor: "transparent",
                        border: "none",
                        fontWeight: 700,
                        minWidth: 96,
                      }}
                    />
                  </motion.div>
                );
              },
            },
            {
              field: "create_date",
              headerName: labels.createDate,
              type: "datetime",
            },
            { field: "create_by", headerName: labels.createBy },
            { field: "close_by", hide: false },
            { field: "close_date", hide: false },
            { field: "close_remark", hide: false },
            { field: "update_by", type: "datetime" },
            { field: "update_date" },
          ]}
          bsComboBox={[
            {
              Column: "count_number",
              Display: "count_number",
              Value: "count_number",
              Default: labels.selectCountNumber,
              PreObj: "inv",
              Obj: "t_inv_count_master",
              ObjWh: "",
              ObjBy: "count_number asc",
            },
          ]}
        />
      </motion.div>
    </Paper>
  );
};

export default CountReconcile;
