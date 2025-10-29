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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import BSAlertSwal2 from "../components/BSAlertSwal2";
/**
 * BSImportFile component
 * @param {Object} props
 * @param {'single'|'multi'} [props.mode='multi'] - Allow single or multiple file selection
 * @param {string[]} [props.accept=['.xlsx', '.xls', 'image/*']] - Accepted file types
 * @param {string} [props.dialogTitle='Import File(s)'] - Dialog title
 * @param {string} [props.buttonLabel='Browse File(s)'] - Select button label
 * @param {function} [props.onImport] - Callback when import is clicked
 * @param {function} [props.beforeOpen] - Function to validate or confirm before opening dialog
 */
const BSImportFile = ({
  mode = "multi",
  accept = [".xlsx", ".xls", "image/*"],
  dialogTitle = "Import File(s)",
  buttonLabel = "Browse File(s)",
  onImport,
  beforeOpen,
  ...otherProps
}) => {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [open, setOpen] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (mode === "single") setSelectedFiles([files[0]]);
    else setSelectedFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      BSAlertSwal2.show("warning", "ไม่พบไฟล์ที่ลากเข้ามา");
      return;
    }

    // ตรวจสอบชนิดไฟล์ตาม accept ที่กำหนด
    const validFiles = files.filter((file) =>
      accept.some((type) =>
        type.startsWith(".")
          ? file.name.toLowerCase().endsWith(type.toLowerCase())
          : file.type.match(type.replace("*", ".*"))
      )
    );

    const invalidFiles = files.filter((file) => !validFiles.includes(file));

    if (invalidFiles.length > 0) {
      BSAlertSwal2.show("error", `รองรับเฉพาะไฟล์ ${accept.join(", ")}`);
      return;
    }

    if (validFiles.length === 0) {
      return; // ถ้าไม่มีไฟล์ที่ถูกต้อง ไม่ต้อง set state
    }

    // จำกัดโหมด single/multi
    if (mode === "single") {
      setSelectedFiles([validFiles[0]]);
    } else {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleOpen = async () => {
    if (beforeOpen && (await beforeOpen()) === false) return;
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFiles([]);
  };

  const handleImport = () => {
    if (onImport) onImport(selectedFiles);
    handleClose();
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Button variant="contained" onClick={handleOpen}>
        Import Products
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <Typography variant="h6">{dialogTitle}</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Content */}
        <DialogContent>
          <Box
            sx={{
              mt: 2,
              p: 4,
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "grey.400",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: isDragActive
                ? "action.hover"
                : "background.paper",
              transition: "0.2s",
              position: "relative",
              maxWidth: 500,
              mx: "auto",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <CloudUploadIcon
              sx={{ fontSize: 56, color: "primary.main", mb: 2 }}
            />
            <Typography variant="body1" fontWeight={500}>
              Drag and drop files here,
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              or click the button to select.
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => fileInputRef.current.click()}
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
          </Box>

          {/* File info */}
          {selectedFiles.length > 0 && (
            <List sx={{ mt: 3, maxWidth: 500, mx: "auto" }}>
              {selectedFiles.map((file, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveFile(idx)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        {/* ⚙️ ปุ่มล่างสุด */}
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{ flex: 1, mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            sx={{ flex: 1 }}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BSImportFile;
