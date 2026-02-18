import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BSDataGrid from "../../components/BSDataGrid";
import NotifyContext from "../../contexts/NotifyContext";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const initialFormData = {
  type: "ads",
  title: "",
  description: "",
  link: "",
  start_date: "",
  end_date: "",
  priority: 1,
  is_active: true
};

const initialDetails = [
  { name: "", imageUrl: "", sort_order: 1 },
];

// Helper function to format date from ISO format to YYYY-MM-DD
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  // Convert ISO format (2026-12-31T00:00:00) to YYYY-MM-DD
  return dateString.split('T')[0];
};

const Banner = (props) => {
  const theme = useTheme();
  const { permission } = useOutletContext();
  const [locale_id] = useState(props.lang || "en");
  const { bannerManager, getBannerNotify, bannerDetails, bannerDelete } = NotifyContext();
  const [formData, setFormData] = useState(initialFormData);
  const [details, setDetails] = useState(initialDetails);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const gridRef = useRef();

  const canSubmit = useMemo(() => {
    return (formData?.title || "").trim() && formData?.start_date && formData?.end_date;
  }, [formData]);

  const updateForm = (field) => (event) => {
    const value = event?.target?.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === "priority" ? Number(value) : value,
    }));
  };

  const toggleActive = (event) => {
    setFormData((prev) => ({
      ...prev,
      is_active: event.target.checked,
    }));
  };

  const updateDetail = (index, field) => (event) => {
    const value = event?.target?.value;
    setDetails((prev) => prev.map((item, idx) => (
      idx === index ? { ...item, [field]: value } : item
    )));
  };

  const addDetail = () => {
    setDetails((prev) => ([
      ...prev,
      { name: "", imageUrl: "", sort_order: prev.length + 1 },
    ]));
  };

  const removeDetail = (index) => {
    setDetails((prev) => prev
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, sort_order: idx + 1 }))
    );
    setSubmitting(false);
  };

  const handleOpenAdd = () => {
    setFormData(initialFormData);
    setDetails(initialDetails);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (submitting) return;
    setIsDialogOpen(false);
  };
  const handleOpenEdit = async (row) => {
    setFormData({
      ...row,
      start_date: formatDateForInput(row?.start_date) || "",
      end_date: formatDateForInput(row?.end_date) || "",
      is_active: row?.is_active === "YES" || row?.is_active === 1 ? true : false,
    });
    await viewBannerDetails(row.id);
  };

  const handleOpenDelete = async (id) => {
    await deleteBanner(id);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);

    const payload = {
      action: formData?.id ? "UPDATE" : "INSERT",
      id: formData?.id || 0,
      ...formData,
      is_active: formData?.id ? ((formData?.is_active === "YES" || formData?.is_active === true) ? true : false) : formData?.is_active,
      details: details
        .filter((item) => item.imageUrl || item.name)
        .map((item, idx) => ({
          name: item.name || null,
          imageUrl: item.imageUrl || null,
          sort_order: idx + 1,
        })),
    };

    try {
      const response = await bannerManager(payload);
      if (response?.message_code === 0) {
        await BSAlertSwal2.show("success", formData?.id ? "Banner updated." : "Banner created.");
        await getBannerNotify();
        setIsDialogOpen(false);
      } else {
        await BSAlertSwal2.show("error", response?.message || "Create banner failed.");
      }
    } catch (error) {
      await BSAlertSwal2.show("error", "Create banner failed.");
    } finally {
      setSubmitting(false);
      gridRef.current?.refreshData();
    }
  };
  const deleteBanner = async (id) => {
    if (!id) return;
    const confirmed = await BSAlertSwal2.confirm("Are you sure you want to delete this banner?");
    if (!confirmed) return;
    try {
      const response = await bannerDelete(id);
      if (response?.message_code === 0) {
        await BSAlertSwal2.show("success", "Banner deleted.");
        await getBannerNotify();
      } else {
        await BSAlertSwal2.show("error", response?.message || "Delete banner failed.");
      }
    } catch (error) {
      await BSAlertSwal2.show("error", "Delete banner failed.");
    }
  };
  const viewBannerDetails = async (id) => {
    if (!id) return;
    try {
      const response = await bannerDetails(id);
      if (response?.message_code === 0) {
        // Handle both array and single object responses
        const data = Array.isArray(response.data) ? response.data[0] : response.data;

        // setFormData(prev => ({
        //   ...prev,
        //   id: data.id,
        //   type: data.type || "ads",
        //   title: data.title || "",
        //   description: data.description || "",
        //   link: data.link || "",
        //   start_date: formatDateForInput(data?.start_date) || "",
        //   end_date: formatDateForInput(data?.end_date) || "",
        //   priority: data?.priority || 1,
        //   is_active: data?.is_active !== undefined ? data.is_active : true,
        //   update_by: data?.update_by || "admin",
        // }));

        // Map 'list' to 'details' format
        const detailsList = Array.isArray(data.list) && data.list.length > 0
          ? data.list.map((item, idx) => ({
            name: item.name || "",
            imageUrl: item.imageUrl || "",
            sort_order: idx + 1,
          }))
          : initialDetails;
        setDetails(detailsList);
        setIsDialogOpen(true);
      } else {
        await BSAlertSwal2.show("error", response?.message || "Fetch banner details failed.");
      }
    } catch (error) {
      await BSAlertSwal2.show("error", "Fetch banner details failed.");
    }
  };

  const rowConfig = useCallback(
    (row) => ({
      add: permission.is_add,
      edit: permission.is_edit,
      delete: permission.is_delete,
    }),
    [],
  );
  return (
    <Box sx={{ width: "100%" }}>
      <BSDataGrid
        ref={gridRef}
        bsLocale={locale_id}
        bsStoredProcedure="usp_get_all_banner"
        bsStoredProcedureSchema="noti"
        bsCols="id,
                  type,
                  title,
                  description,
                  link,
                  start_date,
                  end_date,
                  priority,
                  is_active,
                  create_at"
        bsStoredProcedureParams={[]}
        bsShowRowNumber={true}
        showAdd={permission?.is_add}
        bsVisibleEdit={permission?.is_edit}
        bsVisibleDelete={permission?.is_delete}
        bsAllowDelete={permission?.is_delete}
        bsVisibleView={permission?.is_view}
        // onView={onViewTask}
        bsKeyId="id"
        bsFilterMode="client"
        // onDataBind={handleDataLoaded}
        bsRowConfig={rowConfig}
        bsColumnDefs={[
          {
            field: "description",
            width: 300,
          },]}
        //  bsColumnDefs={columnDefs}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formData?.id ? "Edit Banner" : "Add Banner"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            {formData?.id ? "Edit the banner notification details." : "Create a new banner notification with optional images and names."}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Type"
                value={formData.type}
                onChange={updateForm("type")}
                fullWidth
              />
              <TextField
                label="Title"
                value={formData.title}
                onChange={updateForm("title")}
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={updateForm("description")}
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                label="Link"
                value={formData.link}
                onChange={updateForm("link")}
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={formData.start_date.toString("yyyy-MM-dd")}
                  onChange={updateForm("start_date")}
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={formData.end_date.toString("yyyy-MM-dd")}
                  onChange={updateForm("end_date")}
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Priority"
                  type="number"
                  value={formData.priority}
                  onChange={updateForm("priority")}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Stack>
              <FormControlLabel
                control={<Switch checked={formData.is_active} onChange={toggleActive} />}
                label="Active"
              />

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Details
                </Typography>
                <Stack spacing={2}>
                  {details.map((item, index) => (
                    <Box key={`detail-${index}`} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                      <Stack spacing={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <TextField
                            label="Name"
                            value={item.name}
                            onChange={updateDetail(index, "name")}
                            fullWidth
                          />
                          <TextField
                            label="Image URL"
                            value={item.imageUrl}
                            onChange={updateDetail(index, "imageUrl")}
                            fullWidth
                          />
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <TextField
                            label="Sort Order"
                            type="number"
                            value={item.sort_order}
                            onChange={updateDetail(index, "sort_order")}
                            inputProps={{ min: 1 }}
                            sx={{ maxWidth: 160 }}
                          />
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => removeDetail(index)}
                            disabled={details.length === 1}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={addDetail}>
                    Add Detail
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Saving..." : "Save Banner"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Banner;
