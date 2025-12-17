import React, { useRef, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
  Avatar,
  ListItemIcon, // เพิ่มเข้ามาเพื่อรองรับ getFileIcon
} from "@mui/material";
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  // Folder as FolderIcon, ไม่ได้ใช้
} from "@mui/icons-material";
// สมมติว่า BSAlertSwal2 ยังคงอยู่ในตำแหน่งเดิม
import BSAlertSwal2 from "../components/BSAlertSwal2";

/**
 * Get file icon based on file type/extension (คัดลอก/ปรับปรุงจาก BSFileUploadDialog)
 */
const getFileIcon = (fileName) => {
  if (!fileName) return <FileIcon />;

  // ลบส่วนที่จัดการประเภทไฟล์จาก Mime Type ออก (file.type) เนื่องจากใน BSImportFile เดิมใช้ fileName เท่านั้น
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Image files
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
    return <ImageIcon sx={{ color: "success.main" }} />;
  }

  // PDF files
  if (ext === "pdf") {
    return <PdfIcon sx={{ color: "error.main" }} />;
  }

  // Word documents
  if (["doc", "docx", "odt", "rtf"].includes(ext)) {
    return <DocIcon sx={{ color: "primary.main" }} />;
  }

  // Excel files
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) {
    return <ExcelIcon sx={{ color: "success.dark" }} />;
  }

  // Default file icon
  return <FileIcon sx={{ color: "action.active" }} />;
};

/**
 * Format file size to human readable format (คัดลอกมาจาก BSFileUploadDialog)
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Enhanced BSImportFile
 */
const BSImportFile = ({
  mode = "multi",
  accept = [".xlsx", ".xls", "image/*"],
  dialogTitle = "Import File(s)",
  buttonLabel = "Browse File(s)",
  maxFileSize = 10 * 1024 * 1024, // 10 MB
  onImport,
  beforeOpen,
}) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const acceptAttribute = useMemo(
    () => (Array.isArray(accept) ? accept.join(",") : accept),
    [accept]
  );

  const handleOpen = async () => {
    if (beforeOpen && (await beforeOpen()) === false) return;
    setOpen(true);
  };

  const handleClose = () => {
    if (importing) return; // ปิดไม่ได้ระหว่าง import
    setSelectedFiles([]);
    setProgress(0);
    setOpen(false);
  };

  const showAlert = (icon, text) =>
    BSAlertSwal2.show(icon, text, {
      timer: 1500,
      showConfirmButton: false,
    });

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter((f) => {
      // Logic การตรวจสอบไฟล์ยังคงเดิม
      const isAccepted = accept.some((type) =>
        type.startsWith(".")
          ? f.name.toLowerCase().endsWith(type.toLowerCase())
          : f.type.match(type.replace("*", ".*"))
      );
      if (!isAccepted) {
        showAlert("error", `ไม่รองรับชนิดไฟล์ ${f.name}`);
        return false;
      }
      if (f.size > maxFileSize) {
        showAlert(
          "warning",
          `${f.name} มีขนาดเกิน ${formatFileSize(maxFileSize)}`
        ); // ใช้ formatFileSize ใหม่
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
      // simulate progress animation (หรือใช้จริงจาก onImport)
      const timer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 10 : p));
      }, 200);

      await onImport(selectedFiles, setProgress); // onImport สามารถอัปเดต progress ได้เอง

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

  // Check if we can add more files (ใน BSImportFile ไม่มีการจำกัด maxFiles)
  const canAddMoreFiles = true; // เปิดใช้งานพื้นที่ลากไฟล์เสมอ

  return (
    <>
      {/* ปุ่มเปิด Dialog ยังคงเหมือนเดิม */}
      <Button
        variant="contained"
        startIcon={<CloudUploadIcon />}
        onClick={handleOpen}
      >
        {dialogTitle}
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md" // เปลี่ยนเป็น md เพื่อให้คล้ายกับ BSFileUploadDialog
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: { minHeight: 400 }, // เพิ่ม minHeight
        }}
      >
        {/* DialogTitle - ปรับ Style ให้เหมือน BSFileUploadDialog */}
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1, // เพิ่มเส้นแบ่ง
            borderColor: "divider",
            p: 2, // เพิ่ม padding
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudUploadIcon color="primary" />
            <Typography variant="h6">{dialogTitle}</Typography>
            {/* Chip แสดงจำนวนไฟล์ที่เลือก */}
            <Chip
              label={`${selectedFiles.length}`}
              size="small"
              color={selectedFiles.length > 0 ? "info" : "default"}
            />
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={importing}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Upload Area - ใช้เงื่อนไข canAddMoreFiles เพื่อความเข้ากัน */}
          {canAddMoreFiles && (
            <Box
              sx={{
                m: 2,
                p: 3,
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

          {/* List of Selected Files - แสดงไฟล์ที่เลือกแล้ว */}
          {selectedFiles.length > 0 && (
            <Box sx={{ mx: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                {`${selectedFiles.length} ไฟล์, รวม ${formatFileSize(
                  totalSize
                )}`}
              </Typography>
              <List
                dense
                sx={{
                  maxHeight: 240,
                  overflowY: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {selectedFiles.map((file, idx) => {
                  return (
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
                  );
                })}
              </List>
            </Box>
          )}

          {/* Linear Progress - แสดงสถานะการ Import */}
          {importing && (
            <Box sx={{ px: 3, mt: 1, mb: 2 }}>
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
        </DialogContent>

        {/* DialogActions */}
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={importing}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            fullWidth
            disabled={selectedFiles.length === 0 || importing}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BSImportFile;
