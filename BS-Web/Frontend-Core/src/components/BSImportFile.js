import React, { useRef, useState, useMemo } from "react";
import {
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Chip,
  ListItemIcon,
  IconButton,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import BSDialog from "./BSDialog"; // นำเข้า BSDialog ตามมาตรฐานที่กำหนด
import BSAlertSwal2 from "../components/BSAlertSwal2";

const getFileIcon = (fileName) => {
  if (!fileName) return <FileIcon />;
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
    return <ImageIcon sx={{ color: "success.main" }} />;
  }
  if (ext === "pdf") {
    return <PdfIcon sx={{ color: "error.main" }} />;
  }
  if (["doc", "docx", "odt", "rtf"].includes(ext)) {
    return <DocIcon sx={{ color: "primary.main" }} />;
  }
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) {
    return <ExcelIcon sx={{ color: "success.dark" }} />;
  }
  return <FileIcon sx={{ color: "action.active" }} />;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const BSImportFile = ({
  mode = "multi",
  accept = [".xlsx", ".xls", "image/*"],
  dialogTitle = "Import File(s)",
  buttonLabel = "Browse File(s)",
  cancelText = "Cancel",
  importText = "Import",
  importingText = "Importing...",
  maxFileSize = 10 * 1024 * 1024,
  onImport,
  beforeOpen,
  disabled = false,
  fullWidth = false,
  buttonSx,
}) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const acceptAttribute = useMemo(
    () => (Array.isArray(accept) ? accept.join(",") : accept),
    [accept],
  );

  const handleOpen = async () => {
    if (beforeOpen && (await beforeOpen()) === false) return;
    setOpenDialog(true);
  };

  const handleClose = () => {
    if (importing) return;
    setSelectedFiles([]);
    setProgress(0);
    setOpenDialog(false);
  };

  const showAlert = (icon, text) =>
    BSAlertSwal2.show(icon, text, {
      timer: 1500,
      showConfirmButton: false,
    });

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter((f) => {
      const isAccepted = accept.some((type) =>
        type.startsWith(".")
          ? f.name.toLowerCase().endsWith(type.toLowerCase())
          : f.type.match(type.replace("*", ".*")),
      );
      if (!isAccepted) {
        showAlert("error", `ไม่รองรับชนิดไฟล์ ${f.name}`);
        return false;
      }
      if (f.size > maxFileSize) {
        showAlert(
          "warning",
          `${f.name} มีขนาดเกิน ${formatFileSize(maxFileSize)}`,
        );
        return false;
      }
      return true;
    });

    if (mode === "single") {
      setSelectedFiles(validFiles.slice(0, 1));
    } else {
      const existing = selectedFiles.map((f) => f.name);
      const newFiles = validFiles.filter((f) => !existing.includes(f.name));
      if (newFiles.length < validFiles.length)
        showAlert("info", "ข้ามไฟล์ที่ชื่อซ้ำ");
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => handleFileSelect(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleImport = async () => {
    if (!selectedFiles.length) return;
    if (!onImport) {
      showAlert("error", "ไม่พบฟังก์ชัน onImport()");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const timer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 10 : p));
      }, 200);

      await onImport(selectedFiles, setProgress);

      clearInterval(timer);
      setProgress(100);
      setTimeout(handleClose, 1000);
    } catch (err) {
      showAlert("error", "เกิดข้อผิดพลาดระหว่างนำเข้า");
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveFile = (index) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const canAddMoreFiles = true;

  const ACTION_BUTTON_BASE_SX = {
    minWidth: 160,
    height: 46,
    borderRadius: 1,
    px: 2,
    color: "#ffffff",
    fontWeight: 700,
    textTransform: "none",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)",
    border: "0",
    "& .MuiButton-startIcon": {
      mr: 1,
    },
    "&:hover": {
      boxShadow: "0 12px 26px rgba(15, 23, 42, 0.24)",
      filter: "brightness(1.04)",
    },
  };

  const ACTION_BUTTON_THEMES = {
    save: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
    },
    close: {
      ...ACTION_BUTTON_BASE_SX,
      background: "linear-gradient(135deg, #64748B 0%, #6B7280 100%)",
    },
  };
  return (
    <>
      <Button
        variant="contained"
        startIcon={<CloudUploadIcon />}
        onClick={handleOpen}
        disabled={disabled}
        fullWidth={fullWidth}
        sx={buttonSx}
      >
        {dialogTitle}
      </Button>

      {/* 🛠️ ปรับปรุงรูปแบบโครงสร้างการเรียกใช้งาน BSDialog ให้สั้นตามแบบมาตรฐานหน้าอื่นของคุณ */}
      <BSDialog
        open={openDialog}
        onClose={handleClose}
        maxWidth="md"
        title={dialogTitle}
        closeDisabled={importing}
        actionsSx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 0,
          px: 1.25,
          py: 1,
          overflow: "hidden",
        }}
        actions={
          <>
            <Box sx={{ minWidth: 0 }}>
              <Button
                variant="contained"
                startIcon={<CloseIcon />}
                onClick={handleClose}
                disabled={importing}
                fullWidth
                sx={ACTION_BUTTON_THEMES.close}
              >
                {cancelText}
              </Button>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Button
                onClick={handleImport}
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                fullWidth
                disabled={selectedFiles.length === 0 || importing}
                sx={ACTION_BUTTON_THEMES.save}
              >
                {importing ? importingText : importText}
              </Button>
            </Box>
          </>
        }
      >
        {/* Children content ด้านในตามโครงสร้างเดิม */}
        {canAddMoreFiles && (
          <Box
            sx={{
              p: 3,
              mb: 2,
              border: 2,
              borderStyle: "dashed",
              borderColor: isDragActive ? "primary.main" : "divider",
              borderRadius: 2,
              backgroundColor: isDragActive
                ? "action.hover"
                : "background.default",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "action.hover",
              },
            }}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={acceptAttribute}
              multiple={mode === "multi"}
              style={{ display: "none" }}
            />
            <CloudUploadIcon
              sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
            />
            <Typography variant="body1" fontWeight={500}>
              ลากไฟล์มาวางที่นี่ หรือ
            </Typography>
            <Button variant="outlined" sx={{ mt: 1 }}>
              {buttonLabel}
            </Button>
          </Box>
        )}

        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              {`${selectedFiles.length} ไฟล์, รวม ${formatFileSize(totalSize)}`}
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {selectedFiles.map((file, idx) => (
                <ListItem
                  key={idx}
                  disableGutters
                  sx={{
                    px: 2,
                    "&:not(:last-child)": { borderBottom: "1px solid" },
                    borderColor: "divider",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getFileIcon(file.name)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontWeight: 500,
                          fontSize: 14,
                          wordBreak: "break-all",
                        }}
                      >
                        {file.name}
                      </Typography>
                    }
                    secondary={formatFileSize(file.size)}
                    sx={{ my: 0 }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={importing}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {importing && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ borderRadius: 1 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              {`กำลังนำเข้า... ${progress.toFixed(0)}%`}
            </Typography>
          </Box>
        )}
      </BSDialog>
    </>
  );
};

export default BSImportFile;
