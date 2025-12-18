/**
 * BSFileUpload - Reusable file upload component
 *
 * Features:
 * - Multi-file upload support
 * - Drag & drop file upload
 * - File list display with view/delete actions
 * - Configurable attachment table and foreign key mapping
 *
 * Usage:
 * <BSFileUpload
 *   attachConfig={{
 *     preObj: "tmt",
 *     attachTable: "t_tmt_project_attach",
 *     foreignKey: "project_id",
 *     foreignKeyValue: 123,
 *     fileNameColumn: "file_name",
 *     pathColumn: "path_file",
 *     allowedTypes: ["image/*", "application/pdf"],
 *     maxFileSize: 10 * 1024 * 1024,
 *     maxFiles: 10,
 *   }}
 *   locale="th"
 *   onFilesChanged={() => {}}
 * />
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import BSAlertSwal2 from "./BSAlertSwal2";
import Logger from "../utils/logger";
import AxiosMaster from "../utils/AxiosMaster";
import { getSchemaFromPreObj } from "../utils/SchemaMapping";
import { formatDateTime } from "../utils/dateUtils";
import { getLocaleText } from "./BSDataGrid/locales";
import { useAuth } from "../contexts/AuthContext";

/**
 * Get file icon based on file type/extension
 */
const getFileIcon = (fileName) => {
  if (!fileName) return <FileIcon />;

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
 * Format file size to human readable format
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * BSFileUpload Component
 */
const BSFileUpload = ({
  attachConfig,
  localeText: propsLocaleText = {},
  locale = "th",
  onFilesChanged,
  showUploadArea = true,
  showFileList = true,
  height = "auto",
}) => {
  // Merge locale from getLocaleText() with props (props takes priority)
  const localeText = useMemo(
    () => ({ ...getLocaleText(locale), ...propsLocaleText }),
    [locale, propsLocaleText]
  );

  // Destructure attach configuration with defaults
  const {
    preObj = "default",
    attachTable,
    foreignKey,
    foreignKeyValue,
    fileNameColumn = "file_name",
    pathColumn = "path_file",
    primaryKey = "id",
    allowedTypes = [],
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 10,
    additionalData = {}, // Additional data to include when creating attachment record
  } = attachConfig || {};

  // Get current user from AuthContext
  const { user } = useAuth();

  /**
   * Get user ID from AuthContext for audit fields (create_by, update_by)
   */
  const getUserId = useCallback(() => {
    if (!user) {
      Logger.warn(
        "⚠️ BSFileUpload: No user object available, defaulting to 'system'"
      );
      return "system";
    }

    try {
      const userObj = typeof user === "string" ? JSON.parse(user) : user;
      const userId =
        userObj?.UserId ||
        userObj?.userid ||
        userObj?.user_id ||
        userObj?.id ||
        userObj?.Id ||
        "system";
      return userId;
    } catch (e) {
      Logger.error("❌ BSFileUpload: Failed to parse user object:", e);
      return "system";
    }
  }, [user]);

  // State
  const [files, setFiles] = useState([]); // Existing files from database
  const [uploadingFiles, setUploadingFiles] = useState([]); // Files being uploaded
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef(null);

  // Direct API functions
  const getAttachmentData = useCallback(async (request) => {
    const schema = getSchemaFromPreObj(request.preObj);
    const payload = {
      tableName: request.tableName,
      schemaName: schema,
      start: 0,
      end: 1000,
      sortModel: request.sortModel || [],
      filterModel: request.filterModel || { items: [], logicOperator: "and" },
      customWhere: request.customWhere,
      preObj: request.preObj,
    };

    Logger.log("📡 BSFileUpload: Loading attachment data:", payload);
    const response = await AxiosMaster.post("/dynamic/bs-datagrid", payload);
    return {
      rows: response.data.rows || [],
      rowCount: response.data.rowCount || 0,
    };
  }, []);

  const deleteAttachmentRecord = useCallback(
    async (recordId, table, preObjParam) => {
      const schema = getSchemaFromPreObj(preObjParam);
      const payload = {
        tableName: table,
        schemaName: schema,
        whereConditions: {
          [primaryKey]: recordId,
        },
      };

      Logger.log("🗑️ BSFileUpload: Deleting attachment:", payload);
      const response = await AxiosMaster.post("/dynamic/delete", payload);
      return response.data;
    },
    [primaryKey]
  );

  const createAttachmentRecord = useCallback(
    async (recordData, table, preObjParam) => {
      const schema = getSchemaFromPreObj(preObjParam);
      const payload = {
        tableName: table,
        schemaName: schema,
        data: recordData,
      };

      Logger.log("➕ BSFileUpload: Creating attachment record:", payload);
      const response = await AxiosMaster.post("/dynamic/create", payload);
      return response.data;
    },
    []
  );

  // Determine the foreign key value from config
  const effectiveForeignKeyValue = foreignKeyValue;

  /**
   * Load existing files from database
   */
  const loadFiles = useCallback(async () => {
    if (!attachTable || !effectiveForeignKeyValue) {
      Logger.warn("BSFileUpload: Missing attachTable or foreignKeyValue", {
        attachTable,
        effectiveForeignKeyValue,
      });
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.log("BSFileUpload: Loading files for", {
        attachTable,
        preObj,
        foreignKey,
        effectiveForeignKeyValue,
      });

      const response = await getAttachmentData({
        tableName: attachTable,
        preObj: preObj,
        customWhere: `${foreignKey} = '${effectiveForeignKeyValue}'`,
        sortModel: [],
        filterModel: { items: [], logicOperator: "and" },
      });

      Logger.log("BSFileUpload: Files loaded:", response);

      if (response?.rows) {
        setFiles(response.rows);
      } else if (response?.data) {
        setFiles(response.data);
      } else {
        setFiles([]);
      }
    } catch (err) {
      Logger.error("Failed to load attachment files:", err);
      setError(err.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [
    attachTable,
    effectiveForeignKeyValue,
    foreignKey,
    preObj,
    getAttachmentData,
  ]);

  // Load files when component mounts or foreignKeyValue changes
  useEffect(() => {
    if (effectiveForeignKeyValue) {
      loadFiles();
    }
  }, [effectiveForeignKeyValue, loadFiles]);

  /**
   * Upload files to server
   */
  const uploadFiles = useCallback(
    async (filesToUpload) => {
      for (const fileItem of filesToUpload) {
        try {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, status: "uploading" } : f
            )
          );

          const formData = new FormData();
          formData.append("file", fileItem.file);
          formData.append("foreignKey", foreignKey);
          formData.append("foreignKeyValue", String(effectiveForeignKeyValue));
          formData.append("tableName", attachTable);
          formData.append("preObj", preObj);

          const response = await AxiosMaster.post("/files/upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          const result = response.data;

          const attachmentRecord = {
            [foreignKey]: effectiveForeignKeyValue,
            [fileNameColumn]: fileItem.name,
            [pathColumn]: result.filePath || result.path || fileItem.name,
            file_size: fileItem.size,
            file_type: fileItem.file?.type || "",
            ...additionalData,
            create_date: new Date().toISOString(),
            create_by: getUserId(),
          };

          await createAttachmentRecord(attachmentRecord, attachTable, preObj);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "success", progress: 100 }
                : f
            )
          );

          setTimeout(() => {
            setUploadingFiles((prev) =>
              prev.filter((f) => f.id !== fileItem.id)
            );
            loadFiles();
            if (onFilesChanged) onFilesChanged();
          }, 1000);
        } catch (err) {
          Logger.error("Upload failed:", err);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "error", error: err.message }
                : f
            )
          );
        }
      }
    },
    [
      foreignKey,
      effectiveForeignKeyValue,
      attachTable,
      preObj,
      fileNameColumn,
      pathColumn,
      createAttachmentRecord,
      loadFiles,
      onFilesChanged,
      getUserId,
      additionalData,
    ]
  );

  /**
   * Process and validate selected files
   */
  const processFiles = useCallback(
    (selectedFiles) => {
      const validFiles = [];
      const errors = [];

      const remainingSlots = maxFiles - files.length - uploadingFiles.length;
      if (selectedFiles.length > remainingSlots) {
        errors.push(
          `Maximum ${maxFiles} files allowed. You can add ${remainingSlots} more.`
        );
        selectedFiles = selectedFiles.slice(0, remainingSlots);
      }

      for (const file of selectedFiles) {
        if (file.size > maxFileSize) {
          errors.push(
            `${file.name}: File size exceeds ${formatFileSize(maxFileSize)}`
          );
          continue;
        }

        if (allowedTypes.length > 0) {
          const isAllowed = allowedTypes.some((type) => {
            if (type.startsWith(".")) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            } else if (type.endsWith("/*")) {
              const mimePrefix = type.slice(0, -2);
              return file.type.startsWith(mimePrefix);
            } else {
              return file.type === type;
            }
          });

          if (!isAllowed) {
            errors.push(`${file.name}: File type not allowed`);
            continue;
          }
        }

        validFiles.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: "pending",
          error: null,
        });
      }

      if (errors.length > 0) {
        BSAlertSwal2.show("warning", errors.join("\n"), {
          title: localeText.bsFileValidationError || "Validation Error",
        });
      }

      if (validFiles.length > 0) {
        setUploadingFiles((prev) => [...prev, ...validFiles]);
        uploadFiles(validFiles);
      }
    },
    [
      files,
      uploadingFiles,
      maxFiles,
      maxFileSize,
      allowedTypes,
      localeText,
      uploadFiles,
    ]
  );

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files || []);
      processFiles(selectedFiles);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files || []);
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  /**
   * Handle file deletion
   */
  const handleDeleteFile = useCallback(
    async (file) => {
      const fileData = file.data || file;
      const fileName = fileData[fileNameColumn];
      const fileId = fileData[primaryKey];

      const confirmed = await BSAlertSwal2.confirm(
        localeText.bsConfirmDeleteFile ||
          `Are you sure you want to delete "${fileName}"?`,
        {
          title: localeText.bsConfirmDelete || "Confirm Delete",
          confirmButtonText: localeText.bsYesDelete || "Yes, delete it!",
          cancelButtonText: localeText.bsCancel || "Cancel",
        }
      );

      if (!confirmed) return;

      try {
        await deleteAttachmentRecord(fileId, attachTable, preObj);

        setFiles((prev) =>
          prev.filter((f) => (f.data || f)[primaryKey] !== fileId)
        );

        BSAlertSwal2.show(
          "success",
          localeText.bsFileDeleted || "File deleted successfully",
          { title: localeText.bsSuccess || "Success" }
        );

        if (onFilesChanged) onFilesChanged();
      } catch (err) {
        Logger.error("Failed to delete file:", err);
        BSAlertSwal2.show("error", err.message || "Failed to delete file", {
          title: localeText.bsError || "Error",
        });
      }
    },
    [
      deleteAttachmentRecord,
      attachTable,
      preObj,
      primaryKey,
      fileNameColumn,
      localeText,
      onFilesChanged,
    ]
  );

  /**
   * Handle file view/download
   */
  const handleViewFile = useCallback(
    async (file) => {
      try {
        const fileData = file.data || file;
        const filePath = fileData[pathColumn];
        const fileName = fileData[fileNameColumn];

        const response = await AxiosMaster.get("/files/download", {
          params: { path: filePath, name: fileName },
          responseType: "blob",
        });

        const blob = new Blob([response.data], {
          type: response.headers["content-type"] || "application/octet-stream",
        });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");

        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      } catch (err) {
        Logger.error("Failed to view file:", err);
        BSAlertSwal2.show("error", err.message || "Failed to view file", {
          title: localeText.bsError || "Error",
        });
      }
    },
    [pathColumn, fileNameColumn, localeText]
  );

  /**
   * Handle file download
   */
  const handleDownloadFile = useCallback(
    async (file) => {
      try {
        const fileData = file.data || file;
        const filePath = fileData[pathColumn];
        const fileName = fileData[fileNameColumn];

        const response = await AxiosMaster.get("/files/download", {
          params: { path: filePath, name: fileName, download: true },
          responseType: "blob",
        });

        const blob = new Blob([response.data], {
          type: response.headers["content-type"] || "application/octet-stream",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        Logger.error("Failed to download file:", err);
        BSAlertSwal2.show("error", err.message || "Failed to download file", {
          title: localeText.bsError || "Error",
        });
      }
    },
    [pathColumn, fileNameColumn, localeText]
  );

  /**
   * Remove failed upload from list
   */
  const handleRemoveFailedUpload = useCallback((fileId) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Calculate accept attribute for input
  const acceptAttribute =
    allowedTypes.length > 0 ? allowedTypes.join(",") : "*";

  // Check if we can add more files
  const canAddMoreFiles =
    files.length + uploadingFiles.length < maxFiles && effectiveForeignKeyValue;

  return (
    <Box sx={{ height, display: "flex", flexDirection: "column" }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* No Foreign Key Warning */}
      {!effectiveForeignKeyValue && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {localeText.bsSaveRecordFirst ||
            "Please save the record first before attaching files."}
        </Alert>
      )}

      {/* Upload Area */}
      {showUploadArea && canAddMoreFiles && (
        <Box
          sx={{
            p: 3,
            border: 2,
            borderStyle: "dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            borderRadius: 2,
            backgroundColor: isDragging ? "action.hover" : "background.default",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            mb: 2,
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "action.hover",
            },
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={acceptAttribute}
            multiple
            style={{ display: "none" }}
          />
          <CloudUploadIcon
            sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
          />
          <Typography variant="h6" gutterBottom>
            {localeText.bsDragDropFiles || "Drag & Drop files here"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {localeText.bsOrClickToSelect || "or click to select files"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
          >
            {localeText.bsMaxFileSize || "Max file size"}:{" "}
            {formatFileSize(maxFileSize)}
          </Typography>
          {allowedTypes.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {localeText.bsAllowedTypes || "Allowed types"}:{" "}
              {allowedTypes.join(", ")}
            </Typography>
          )}
        </Box>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {localeText.bsUploading || "Uploading..."}
          </Typography>
          <List dense>
            {uploadingFiles.map((file) => (
              <ListItem key={file.id}>
                <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box sx={{ width: "100%" }}>
                      {file.status === "uploading" && (
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                      {file.status === "success" && (
                        <Typography variant="caption" color="success.main">
                          {localeText.bsUploadComplete || "Upload complete"}
                        </Typography>
                      )}
                      {file.status === "error" && (
                        <Typography variant="caption" color="error">
                          {file.error || "Upload failed"}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {file.status === "uploading" && (
                    <CircularProgress size={20} />
                  )}
                  {file.status === "error" && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFailedUpload(file.id)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      )}

      {/* Existing Files List */}
      {showFileList && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {localeText.bsAttachedFiles || "Attached Files"} ({files.length})
            </Typography>
            <Chip
              label={`${files.length}/${maxFiles}`}
              size="small"
              color={files.length >= maxFiles ? "error" : "default"}
              sx={{ ml: 1 }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : files.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <FolderIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
              <Typography>
                {localeText.bsNoFilesAttached || "No files attached"}
              </Typography>
            </Box>
          ) : (
            <List>
              {files.map((file, index) => (
                <React.Fragment key={(file.data || file)[primaryKey] || index}>
                  <ListItem
                    sx={{
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getFileIcon(
                        file.data?.[fileNameColumn] || file[fileNameColumn]
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        file.data?.[fileNameColumn] || file[fileNameColumn]
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(
                            file.data?.create_date || file.create_date
                          )}
                          {(file.data?.create_by || file.create_by) && (
                            <> • {file.data?.create_by || file.create_by}</>
                          )}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip
                        title={localeText.bsViewFile || "View"}
                        placement="top"
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleViewFile(file)}
                          sx={{ mr: 0.5 }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={localeText.bsDownloadFile || "Download"}
                        placement="top"
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadFile(file)}
                          sx={{ mr: 0.5 }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={localeText.bsDeleteFile || "Delete"}
                        placement="top"
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFile(file)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < files.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BSFileUpload;
