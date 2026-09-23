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
    Tooltip,
    Typography,
} from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import dayjs from "dayjs";
import AxiosMaster from "../../utils/AxiosMaster";

// Read-only viewer for a transaction evidence photo. The API resolves the
// relative path under GTEC_ATTACHMENT_ROOT; the browser never receives the
// server filesystem path.
const MatchingTagPhotoView = ({
    photoType,
    path,
    label,
    hasPhoto,
    autoLoad = false,
    record = {},
}) => {
    const [open, setOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const objectUrlRef = useRef(null);

    const revokePreview = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    const loadPreview = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            if (!path) throw new Error("Attachment path is missing.");

            const res = await AxiosMaster.get("/GtecAttachment/Download", {
                params: { path },
                responseType: "blob",
            });
            revokePreview();
            const url = URL.createObjectURL(res.data);
            objectUrlRef.current = url;
            setPreviewUrl(url);
        } catch (err) {
            console.warn(`Failed to load ${photoType} attachment:`, err?.message || err);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [path, photoType, revokePreview]);

    useEffect(() => {
        if (autoLoad && hasPhoto) {
            loadPreview();
        }

        return () => revokePreview();
    }, [autoLoad, hasPhoto, loadPreview, revokePreview]);

    const handleOpen = useCallback(() => {
        setOpen(true);
        if (!previewUrl && !loading) {
            loadPreview();
        }
    }, [loadPreview, loading, previewUrl]);

    const partNumber =
        record?.gtec_part_number || record?.toyota_part_number || "-";
    const partDescription = record?.part_description || "-";
    const eventDate = record?.create_date || record?.gtec_date || record?.arrival_date;
    const formattedDate = eventDate && dayjs(eventDate).isValid()
        ? dayjs(eventDate).format("DD/MM/YYYY")
        : "-";
    const formattedDateTime = eventDate && dayjs(eventDate).isValid()
        ? dayjs(eventDate).format("DD/MM/YYYY HH:mm:ss")
        : "-";

    if (!hasPhoto) {
        return autoLoad ? (
            <Box
                sx={{
                    minHeight: 170,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    color: "text.disabled",
                    bgcolor: "action.hover",
                    borderRadius: 1.5,
                }}
            >
                <BrokenImageOutlinedIcon sx={{ fontSize: 42 }} />
                <Box sx={{ fontSize: 13 }}>No photo</Box>
            </Box>
        ) : (
            <Tooltip title="No photo">
                <span>
                    <IconButton size="small" disabled>
                        <BrokenImageOutlinedIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        );
    }

    const thumbnail = (
        <Box
            sx={{
                minHeight: 170,
                height: 170,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                bgcolor: "action.hover",
                borderRadius: 1.5,
                cursor: previewUrl ? "zoom-in" : "default",
            }}
            onClick={previewUrl ? handleOpen : undefined}
        >
            {loading ? (
                <CircularProgress size={28} />
            ) : failed ? (
                <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                    <BrokenImageOutlinedIcon sx={{ fontSize: 40, mb: 0.5 }} />
                    <Box sx={{ fontSize: 13 }}>Unable to load photo.</Box>
                </Box>
            ) : previewUrl ? (
                <Box
                    component="img"
                    src={previewUrl}
                    alt={label}
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
            ) : (
                <ImageOutlinedIcon sx={{ fontSize: 42, color: "text.disabled" }} />
            )}
        </Box>
    );

    return (
        <>
            {autoLoad ? (
                <Box>
                    {thumbnail}
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ZoomInIcon />}
                        onClick={handleOpen}
                        disabled={loading}
                        sx={{ mt: 1 }}
                    >
                        {failed ? "Retry" : "Preview"}
                    </Button>
                </Box>
            ) : (
                <Tooltip title={label}>
                    <IconButton size="small" color="primary" onClick={handleOpen}>
                        <ImageOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5, overflow: "hidden" } }}
            >
                <DialogTitle
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                            {label}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}
                        >
                            {partNumber} — {partDescription}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                            sx={{
                                px: 1.5,
                                py: 0.55,
                                borderRadius: 99,
                                bgcolor: "rgba(25, 118, 210, 0.08)",
                                color: "primary.main",
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {formattedDate}
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => setOpen(false)}
                            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent
                    sx={{
                        p: { xs: 2, sm: 3 },
                        bgcolor: "background.default",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Box
                        sx={{
                        width: "100%",
                        maxWidth: 720,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                        <Box
                            sx={{
                                width: "100%",
                                minHeight: { xs: 300, sm: 430 },
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={32} />
                            ) : failed ? (
                                <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                                    <BrokenImageOutlinedIcon sx={{ fontSize: 44, mb: 1 }} />
                                    <Typography variant="body2">Unable to load photo.</Typography>
                                    <Button size="small" variant="contained" onClick={loadPreview} sx={{ mt: 1.5 }}>
                                        Retry
                                    </Button>
                                </Box>
                            ) : previewUrl ? (
                                <Box
                                    component="img"
                                    src={previewUrl}
                                    alt={label}
                                    sx={{
                                        display: "block",
                                        maxWidth: "100%",
                                        maxHeight: { xs: 420, sm: 560 },
                                        objectFit: "contain",
                                        margin: "auto",
                                    }}
                                />
                            ) : (
                                <ImageOutlinedIcon sx={{ fontSize: 54, color: "text.disabled" }} />
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 1.5,
                        justifyContent: "space-between",
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}
                    >
                        {formattedDateTime} · {label} · {record?.create_by || "-"}
                    </Typography>
                    <Button variant="outlined" color="inherit" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default MatchingTagPhotoView;
