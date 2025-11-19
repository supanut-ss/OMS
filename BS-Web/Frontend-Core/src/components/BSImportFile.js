import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import BSAlertSwal2 from "../components/BSAlertSwal2";
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
          `${f.name} มีขนาดเกิน ${(maxFileSize / 1024 / 1024).toFixed(1)} MB`
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

  return (
    <>
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
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">{dialogTitle}</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsDragActive(true)}
          onDragLeave={() => setIsDragActive(false)}
          sx={{
            border: "2px dashed",
            borderColor: isDragActive ? "primary.main" : "grey.400",
            borderRadius: 2,
            textAlign: "center",
            backgroundColor: isDragActive
              ? "action.hover"
              : "background.default",
            transition: "0.2s",
            py: 2,
            mx: 2,
          }}
        >
          <CloudUploadIcon
            sx={{ fontSize: 56, color: "primary.main", mb: 1 }}
          />
          <Typography variant="body1" fontWeight={500}>
            ลากไฟล์มาวางที่นี่ หรือ
          </Typography>

          <Button
            variant="outlined"
            onClick={() => fileInputRef.current.click()}
            sx={{ mt: 1 }}
          >
            {buttonLabel}
          </Button>

          <input
            type="file"
            accept={accept.join(",")}
            multiple={mode === "multi"}
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                {`${selectedFiles.length} ไฟล์, รวม ${(
                  totalSize / 1024
                ).toFixed(1)} KB`}
              </Typography>

              <List sx={{ maxHeight: 240, overflowY: "auto" }}>
                {selectedFiles.map((file, idx) => {
                  const isImage = file.type.startsWith("image/");
                  return (
                    <ListItem
                      key={idx}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                        px: 2,
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        {isImage ? (
                          <Avatar
                            variant="rounded"
                            src={URL.createObjectURL(file)}
                            sx={{ width: 48, height: 48 }}
                          />
                        ) : (
                          <Avatar sx={{ bgcolor: "grey.200" }}>
                            <InsertDriveFileIcon />
                          </Avatar>
                        )}
                        <Box>
                          <Typography sx={{ fontWeight: 500, fontSize: 15 }}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                      </Stack>

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveFile(idx)}
                        disabled={importing}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>

        {importing && (
          <Box sx={{ px: 3, mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {`กำลังนำเข้า... ${progress.toFixed(0)}%`}
            </Typography>
          </Box>
        )}

        <DialogActions sx={{ p: 2 }}>
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
