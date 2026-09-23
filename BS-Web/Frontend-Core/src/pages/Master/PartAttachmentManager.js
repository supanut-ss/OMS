import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

const extensionOf = (name = "") => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
};

const validateFile = (file) => {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file?.name))) {
    return "Only JPG, PNG or PDF files are allowed.";
  }
  if (file.size < 1 || file.size > MAX_FILE_SIZE) {
    return "File must be between 1 byte and 10 MB.";
  }
  return null;
};

const downloadBlob = async (path) => {
  const response = await AxiosMaster.get("/GtecAttachment/Download", {
    params: { path },
    responseType: "blob",
  });
  return response.data;
};

const AttachmentEditor = ({
  partId,
  deferred = false,
  readOnly = false,
  canDelete = true,
  onPendingChange,
  onSaved,
}) => {
  const [attachment, setAttachment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [markedForDelete, setMarkedForDelete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const objectUrlRef = useRef(null);

  const revokePreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewMime("");
  }, []);

  const setBlobPreview = useCallback(
    (blob, mimeType) => {
      revokePreview();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setPreviewMime(mimeType || blob.type || "");
    },
    [revokePreview],
  );

  const loadAttachment = useCallback(async () => {
    setAttachment(null);
    setSelectedFile(null);
    setMarkedForDelete(false);
    revokePreview();
    onPendingChange?.(null);
    if (!partId) return;

    setLoading(true);
    try {
      const response = await AxiosMaster.get(`/PartAttachment/${partId}`);
      const current = response.data;
      setAttachment(current);
      if (current?.storage_path) {
        const blob = await downloadBlob(current.storage_path);
        setBlobPreview(blob, current.mime_type);
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.warn("Failed to load Part attachment:", error?.message || error);
      }
    } finally {
      setLoading(false);
    }
  }, [onPendingChange, partId, revokePreview, setBlobPreview]);

  useEffect(() => {
    loadAttachment();
    return () => revokePreview();
  }, [loadAttachment, revokePreview]);

  const processSelectedFile = async (file) => {
    if (!file) return;

    const validationMessage = validateFile(file);
    if (validationMessage) {
      await BSAlertSwal2.show("warning", validationMessage);
      return;
    }

    if (deferred) {
      setSelectedFile(file);
      setMarkedForDelete(false);
      setBlobPreview(file, file.type);
      onPendingChange?.({ action: "upsert", file });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await AxiosMaster.post(`/PartAttachment/${partId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachment(response.data);
      setSelectedFile(null);
      setMarkedForDelete(false);
      setBlobPreview(file, response.data?.mime_type || file.type);
      onSaved?.();
    } catch (error) {
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || "Unable to save Part attachment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await processSelectedFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!readOnly && !loading) setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (readOnly || loading) return;
    await processSelectedFile(event.dataTransfer.files?.[0]);
  };

  const handleDelete = async () => {
    if (!attachment && !selectedFile) return;
    const confirmed = await BSAlertSwal2.confirm("Delete this Part attachment?", {
      title: "Delete Attachment",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!confirmed) return;

    if (deferred) {
      setSelectedFile(null);
      setMarkedForDelete(true);
      revokePreview();
      onPendingChange?.({ action: "delete" });
      return;
    }

    setLoading(true);
    try {
      await AxiosMaster.post(`/PartAttachment/${partId}/delete`);
      setAttachment(null);
      setSelectedFile(null);
      setMarkedForDelete(false);
      revokePreview();
      onSaved?.();
    } catch (error) {
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || "Unable to delete Part attachment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const currentName = markedForDelete
    ? "Attachment will be removed after Save"
    : selectedFile?.name || attachment?.attachment_name || "No attachment selected";
  const hasAttachment = !markedForDelete && Boolean(selectedFile || attachment);
  const isPdf = (selectedFile?.type || attachment?.mime_type || previewMime) === "application/pdf";

  return (
    <>
      <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Box sx={{ color: isPdf ? "error.main" : "primary.main", display: "flex" }}>
            {isPdf ? <PictureAsPdfOutlinedIcon /> : <ImageOutlinedIcon />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography variant="subtitle2">Part Reference Attachment</Typography>
            <Typography variant="caption" color={markedForDelete ? "error" : "text.secondary"}>
              {currentName}
            </Typography>
          </Box>
          {loading && <CircularProgress size={22} />}
          {!readOnly && canDelete && hasAttachment && (
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
          )}
        </Box>
        {!readOnly && (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => !loading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !loading) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              mt: 1.5,
              minHeight: 150,
              px: 2,
              py: 2.5,
              border: "2px dashed",
              borderColor: dragActive ? "primary.main" : "grey.300",
              borderRadius: 2.5,
              bgcolor: dragActive ? "rgba(25, 118, 210, 0.06)" : "grey.50",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              transition: "border-color 160ms ease, background-color 160ms ease",
              outline: "none",
              "&:hover, &:focus-visible": {
                borderColor: loading ? "grey.300" : "primary.main",
                bgcolor: loading ? "grey.50" : "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={32} />
            ) : (
              <UploadFileOutlinedIcon sx={{ fontSize: 40, color: dragActive ? "primary.main" : "grey.500", mb: 1 }} />
            )}
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
              <Box component="span" sx={{ color: "primary.main" }}>
                {hasAttachment ? "Click to replace the file" : "Click to upload a file"}
              </Box>
              {" or drag & drop"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              PNG, JPG or PDF (max 10 MB)
            </Typography>
          </Box>
        )}
        {hasAttachment && (
          <Paper
            variant="outlined"
            sx={{
              mt: 1.5,
              overflow: "hidden",
              borderRadius: 2,
              bgcolor: "grey.50",
              minHeight: 320,
              display: "grid",
              placeItems: "center",
            }}
          >
            {previewUrl && isPdf ? (
              <Box
                component="iframe"
                title={selectedFile?.name || attachment?.attachment_name || "PDF Preview"}
                src={previewUrl}
                sx={{ width: "100%", height: 520, border: 0, bgcolor: "common.white" }}
              />
            ) : previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt={selectedFile?.name || attachment?.attachment_name || "Part attachment"}
                sx={{ width: "100%", maxHeight: 520, objectFit: "contain", p: 1 }}
              />
            ) : loading ? (
              <CircularProgress size={30} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Unable to display attachment preview.
              </Typography>
            )}
          </Paper>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          hidden
          onChange={handleSelect}
        />
      </Paper>

    </>
  );
};

export const PartAttachmentFormField = ({ partId, readOnly, onPendingChange }) => (
  <AttachmentEditor
    partId={partId}
    deferred
    readOnly={readOnly}
    canDelete={!readOnly}
    onPendingChange={onPendingChange}
  />
);

const PartAttachmentManager = ({ row, canEdit, canDelete, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setPendingAction(null);
    setOpen(false);
  };

  const handleSave = async () => {
    if (!pendingAction || !row?.part_id || saving) return;

    setSaving(true);
    try {
      if (pendingAction.action === "delete") {
        await AxiosMaster.post(`/PartAttachment/${row.part_id}/delete`);
      } else if (pendingAction.action === "upsert" && pendingAction.file) {
        const formData = new FormData();
        formData.append("file", pendingAction.file);
        await AxiosMaster.post(`/PartAttachment/${row.part_id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setPendingAction(null);
      onSaved?.();
      setOpen(false);
    } catch (error) {
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || "Unable to save Part attachment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title="View or manage Part attachment">
        <IconButton size="small" onClick={() => setOpen(true)}>
          <AttachFileIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Part Attachment · {row?.part_number || "-"}
          <IconButton onClick={handleClose} disabled={saving}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {open && (
            <AttachmentEditor
              partId={row?.part_id}
              deferred
              readOnly={!canEdit}
              canDelete={canDelete}
              onPendingChange={setPendingAction}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Close</Button>
          {canEdit && (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!pendingAction || saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PartAttachmentManager;
