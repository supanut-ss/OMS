import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";
import MatchingTagPhotoView from "./MatchingTagPhotoView";

const RESOURCE_GROUP = "t_inv_transaction";

const initialForm = {
  key_id: null,
  transaction_id: "",
  toyota_tag_photo_url: "",
  gtec_tag_photo_url: "",
  part_photo_url: "",
  toyota_barcode: "",
  toyota_part_number: "",
  part_description: "",
  po_order_number: "",
  arrival_date: null,
  arrival_time: "",
  customer_quantity: null,
  gtec_barcode: "",
  gtec_part_number: "",
  gtec_quantity: null,
  gtec_date: null,
  lot_number: "",
  pallet_number: "",
  license_plate: "",
  create_by: "",
  create_date: null,
  update_by: "",
  update_date: null,
  rowversion: "",
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatDate = (value, includeTime = false) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format(includeTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY")
    : displayValue(value);
};

const DetailField = ({
  label,
  value,
  fullWidth = false,
  monospace = false,
}) => (
  <Box
    sx={{
      minWidth: 0,
      gridColumn: fullWidth ? "1 / -1" : "auto",
      p: 1.25,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 1.5,
      bgcolor: "background.paper",
    }}
  >
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={600}
      sx={{
        mt: 0.35,
        overflowWrap: "anywhere",
        whiteSpace: "pre-wrap",
        fontFamily: monospace ? "monospace" : "inherit",
      }}
    >
      {displayValue(value)}
    </Typography>
  </Box>
);

const DetailSection = ({ icon, title, children, fullWidth = false }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      gridColumn: fullWidth ? "1 / -1" : "auto",
      bgcolor: "background.paper",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
      <Box sx={{ display: "flex", color: "primary.main" }}>{icon}</Box>
      <Typography variant="h6" color="primary.main" fontWeight={700}>
        {title}
      </Typography>
    </Box>
    <Divider sx={{ mb: 1.5 }} />
    {children}
  </Paper>
);
const renderToyotaPhoto = (params) => (
  <MatchingTagPhotoView
    photoType="toyota"
    path={params.value}
    label="Photo Toyota Tag"
    hasPhoto={!!params.value}
    record={params.row}
  />
);

const renderGtecPhoto = (params) => (
  <MatchingTagPhotoView
    photoType="gtec"
    path={params.value}
    label="Photo G-TEC Tag"
    hasPhoto={!!params.value}
    record={params.row}
  />
);
const renderPartPhoto = (params) => (
  <MatchingTagPhotoView
    photoType="part"
    path={params.value}
    label="Photo Part"
    hasPhoto={!!params.value}
    record={params.row}
  />
);
const detailGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 1.25,
};

const TransactionMatching = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [resourceData, setResourceData] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { getResources } = useResource();

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        const res = await getResources(RESOURCE_GROUP, props.lang || "en");
        setResourceData(res || []);
      } catch (e) {
        console.error(`getResources(${RESOURCE_GROUP}) error:`, e);
      }
    };
    loadRes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const r = (name, fallback) =>
    resourceData?.find((res) => res.resource_name === name)?.resource_value ??
    fallback;

  const handleOpenView = (row) => {
    setForm({ ...initialForm, ...row });
    setIsViewOpen(true);
  };

  const handleCloseView = () => {
    setIsViewOpen(false);
    setForm(initialForm);
  };

  const photoItems = [
    ["part", "part_photo", "Part Photo", form.part_photo_url],
    ["gtec", "gtec_tag_photo", "G-TEC Tag Photo", form.gtec_tag_photo_url],
    [
      "toyota",
      "toyota_tag_photo",
      "Toyota Tag Photo",
      form.toyota_tag_photo_url,
    ],
  ];

  return (
    <Box>
      <Paper
        sx={{
          p: 2,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <BSDataGrid
            bsLocale={locale_id}
            bsPreObj="inv"
            bsObj="t_inv_transaction"
            bsObjBy="create_date desc"
            bsCols={Object.keys(initialForm).join(",")}
            bsHiddenColumns={[
              "key_id",
              // "toyota_tag_photo_url",
              "toyota_barcode",
              // "part_photo_url",
              // "gtec_tag_photo_url",
              "gtec_barcode",
              "update_by",
              "update_date",
              "rowversion",
            ]}
            bsKeyId="key_id"
            bsShowRowNumber={true}
            showAdd={false}
            bsVisibleEdit={false}
            bsVisibleDelete={false}
            bsAllowDelete={false}
            bsBulkMode={{ enable: false }}
            bsVisibleView={permission?.is_view}
            onView={handleOpenView}
            bsColumnDefs={[
              { field: "key_id", readOnly: true },
              { field: "transaction_id", readOnly: true, width: 170 },
              {
                field: "toyota_tag_photo_url",
                headerName: "Toyota Tag Photo",
                renderCell: renderToyotaPhoto,
                width: 100,
                sortable: false,
                filterable: false,
                align: "center",
                headerAlign: "center",
              },
              {
                field: "gtec_tag_photo_url",
                headerName: "GTEC Tag Photo",
                renderCell: renderGtecPhoto,
                width: 100,
                sortable: false,
                filterable: false,
                align: "center",
                headerAlign: "center",
              },
              {
                field: "part_photo_url",
                headerName: "Part Photo",
                renderCell: renderPartPhoto,
                width: 100,
                sortable: false,
                filterable: false,
                align: "center",
                headerAlign: "center",
              },
              { field: "toyota_part_number", readOnly: true },
              { field: "part_description", readOnly: true, width: 220 },
              { field: "po_order_number", readOnly: true },
              { field: "arrival_date", type: "date", readOnly: true },
              {
                field: "arrival_time",
                type: "time",
                readOnly: true,
                renderCell: (params) =>
                  params.value ? dayjs(`1970-01-01T${params.value}`).format("HH:mm") : "",
              },
              {
                field: "customer_quantity",
                type: "number",
                decimals: 5,
                readOnly: true,
                renderCell: (params) =>
                  params.value === null || params.value === undefined
                    ? ""
                    : Number(params.value).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    }),
              },

              { field: "gtec_part_number", readOnly: true },
              {
                field: "gtec_quantity",
                type: "number",
                // decimals: 5,
                readOnly: true,
                renderCell: (params) =>
                  params.value === null || params.value === undefined
                    ? ""
                    : Number(params.value).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    }),
              },
              { field: "gtec_date", type: "date", readOnly: true },
              { field: "lot_number", readOnly: true },
              { field: "pallet_number", readOnly: true },
              { field: "license_plate", readOnly: true },
            ]}
          />
        </motion.div>
      </Paper>

      <Dialog
        open={isViewOpen}
        onClose={handleCloseView}
        maxWidth="xl"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            backgroundImage: "none",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {r("view_transaction", "View Matching Tag Transaction")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`${r("transaction_id", "Transaction ID")} #${form.transaction_id ?? "-"} · ${r("created_by", "Created by")} ${form.create_by || "-"}`}
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseView}
            aria-label={r("close", "Close")}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ bgcolor: "background.default", p: { xs: 1.5, md: 2.5 } }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <DetailSection
              icon={<LocalShippingOutlinedIcon />}
              title={r("ToyotaInfo", r("section_toyota_info", "Toyota Tag"))}
            >
              <Box sx={detailGridSx}>
                <DetailField
                  label={r("toyota_part_number", "Toyota Part Number")}
                  value={form.toyota_part_number}
                />
                <DetailField
                  label={r("po_order_number", "PO / Order No.")}
                  value={form.po_order_number}
                />
                <DetailField
                  label={r("customer_quantity", "Toyota Quantity")}
                  value={form.customer_quantity}
                />
                <DetailField
                  label={r("arrival_date", "Arrival Date")}
                  value={formatDate(form.arrival_date)}
                />
                <DetailField
                  label={r("arrival_time", "Arrival Time")}
                  value={form.arrival_time}
                />
                <DetailField
                  label={r("part_description", "Part Description")}
                  value={form.part_description}
                />
                {/* <DetailField
                  label={r("toyota_barcode", "Toyota Barcode")}
                  value={form.toyota_barcode}
                  fullWidth
                  monospace
                /> */}
              </Box>
            </DetailSection>

            <DetailSection
              icon={<FactoryOutlinedIcon />}
              title={r("GtecInfo", r("section_gtec_info", "G-TEC Tag"))}
            >
              <Box sx={detailGridSx}>
                <DetailField
                  label={r("gtec_part_number", "G-TEC Part Number")}
                  value={form.gtec_part_number}
                />
                <DetailField
                  label={r("gtec_quantity", "G-TEC Quantity")}
                  value={form.gtec_quantity}
                />
                <DetailField
                  label={r("gtec_date", "G-TEC Date")}
                  value={formatDate(form.gtec_date)}
                />
                <DetailField
                  label={r("lot_number", "Lot Number")}
                  value={form.lot_number}
                />
                {/* <DetailField
                  label={r("gtec_barcode", "G-TEC Barcode")}
                  value={form.gtec_barcode}
                  fullWidth
                  monospace
                /> */}
              </Box>
            </DetailSection>
          </Box>
          <Box sx={{ height: 10 }} />
          <DetailSection
            icon={<ImageOutlinedIcon />}
            title={r("evidence_photos", "Evidence Photos")}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {photoItems.map(([photoType, resourceName, fallback, path]) => (
                <Box
                  key={photoType}
                  sx={{
                    p: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                    {r(resourceName, fallback)}
                  </Typography>
                  <MatchingTagPhotoView
                    photoType={photoType}
                    path={path}
                    label={r(resourceName, fallback)}
                    hasPhoto={Boolean(path)}
                    autoLoad
                    record={form}
                  />
                </Box>
              ))}
            </Box>
          </DetailSection>
          <Box sx={{ height: 10 }} />
          <DetailSection
            icon={<Inventory2OutlinedIcon />}
            title={r(
              "DeliveryInfo",
              r("section_delivery_info", "Delivery Information"),
            )}
          >
            <Box sx={detailGridSx}>
              <DetailField
                label={r("pallet_number", "Pallet Number")}
                value={form.pallet_number}
              />
              <DetailField
                label={r("part_description", "Part Description")}
                value={form.part_description}
              />
              <DetailField
                label={r("license_plate", "License Plate")}
                value={form.license_plate}
              />
            </Box>
          </DetailSection>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button variant="contained" onClick={handleCloseView}>
            {r("close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionMatching;
