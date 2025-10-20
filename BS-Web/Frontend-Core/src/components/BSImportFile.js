import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
/**
 * BSImportFile component
 * @param {Object} props
 * @param {'single'|'multi'} [props.mode='multi'] - Allow single or multiple file selection
 * @param {string[]} [props.accept=['.xlsx', '.xls', 'image/*']] - Accepted file types
 * @param {string} [props.dialogTitle='Import File(s)'] - Dialog title
 * @param {string} [props.buttonLabel='Select File(s)'] - Select button label
 * @param {function} [props.onImport] - Callback when import is clicked
 */
const BSImportFile = ({
  mode = "multi",
  accept = [".xlsx", ".xls", "image/*"],
  dialogTitle = "Import File(s)",
  buttonLabel = "Select File(s)",
  onImport,
  ...otherProps
}) => {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [open, setOpen] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const thumbSize = useMediaQuery(theme.breakpoints.down("sm")) ? 32 : 40;

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    let files = Array.from(event.target.files);
    if (mode === "single") {
      setSelectedFiles(files.length > 1 ? [files[0]] : files);
    } else {
      // Prevent duplicates by name (optional)
      const existingNames = selectedFiles.map((f) => f.name);
      const newFiles = files.filter((f) => !existingNames.includes(f.name));
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    let files = Array.from(event.dataTransfer.files);

    // Build a regex from accept prop for validation
    const acceptPattern = accept
      .map((type) =>
        type.startsWith(".")
          ? `\\${type}$`
          : type.replace("*", ".*").replace("/", "\\/")
      )
      .join("|");
    const acceptRegex = new RegExp(acceptPattern, "i");

    const validFiles = files.filter((file) =>
      accept.some((type) =>
        type.startsWith(".")
          ? file.name.toLowerCase().endsWith(type.toLowerCase())
          : file.type.match(type.replace("*", ".*"))
      )
    );
    const invalidFiles = files.filter((file) => !validFiles.includes(file));

    if (invalidFiles.length > 0) {
      alert(
        `Some files are not allowed: ${invalidFiles
          .map((f) => f.name)
          .join(", ")}`
      );
    }

    if (mode === "single") {
      setSelectedFiles(validFiles.length > 1 ? [validFiles[0]] : validFiles);
    } else {
      const existingNames = selectedFiles.map((f) => f.name);
      const newFiles = validFiles.filter(
        (f) => !existingNames.includes(f.name)
      );
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setSelectedFiles([]);
    setIsDragActive(false);
  };

  const handleImport = () => {
    if (onImport) {
      onImport(selectedFiles);
    } else {
      alert("Importing files: " + selectedFiles.map((f) => f.name).join(", "));
    }
    handleClose();
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Button variant="contained" onClick={handleOpen} {...otherProps}>
        {mode === "single" ? "CHOOSE FILE" : "CHOOSE FILES"}
      </Button>

      {/* Use fullScreen on small devices for responsive dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: "2px dashed #1976d2",
              borderColor: isDragActive ? "primary.main" : "grey.400",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: isDragActive ? "grey.100" : "inherit",
              transition: "background-color 0.2s",
              position: "relative",
              minHeight: { xs: 240, sm: 180 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFiles.length === 0 && (
              <>
                <CloudUploadIcon
                  sx={{ fontSize: { xs: 44, sm: 48 }, color: "#1976d2", mb: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Drag and drop files here, or click the button to select.
                </Typography>
              </>
            )}

            <input
              type="file"
              accept={accept.join(",")}
              multiple={mode === "multi"}
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2, width: "100%" }}>
                <List dense>
                  {selectedFiles.map((file, idx) => (
                    <ListItem
                      key={idx}
                      sx={{
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                        py: { xs: 0.5, sm: 1 },
                      }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveFile(idx)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          style={{
                            width: thumbSize,
                            height: thumbSize,
                            objectFit: "cover",
                            marginRight: 8,
                            borderRadius: 4,
                            border: "1px solid #ccc",
                          }}
                          onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                        />
                      ) : null}
                      <Box
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: { xs: "60%", sm: "80%" },
                        }}
                      >
                        {file.name}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Box
            sx={{
              flex: fullScreen ? "0 1 100%" : 1,
              display: "flex",
              justifyContent: fullScreen ? "center" : "flex-start",
            }}
          >
            <Button variant="contained" onClick={handleButtonClick}>
              {buttonLabel}
            </Button>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={selectedFiles.length === 0}
            >
              Import
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BSImportFile;
