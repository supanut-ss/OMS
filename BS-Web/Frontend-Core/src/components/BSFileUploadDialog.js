/**
 * BSFileUploadDialog - Dialog wrapper for BSFileUpload component
 *
 * This is a Dialog wrapper that uses the reusable BSFileUpload component.
 * For standalone usage without a dialog, use BSFileUpload directly.
 *
 * Usage:
 * <BSFileUploadDialog
 *   open={true}
 *   onClose={() => {}}
 *   attachConfig={{
 *     preObj: "tmt",
 *     attachTable: "t_tmt_project_attach",
 *     foreignKey: "project_id",
 *     foreignKeyValue: 123,
 *   }}
 * />
 */

import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
} from "@mui/icons-material";
import BSFileUpload from "./BSFileUpload";
import { getLocaleText } from "./BSDataGrid/locales";

/**
 * BSFileUploadDialog Component
 */
const BSFileUploadDialog = ({
  open,
  onClose,
  rowData,
  attachConfig,
  localeText: propsLocaleText = {},
  locale = "th",
  onFilesChanged,
}) => {
  // Merge locale from getLocaleText() with props (props takes priority)
  const localeText = useMemo(
    () => ({ ...getLocaleText(locale), ...propsLocaleText }),
    [locale, propsLocaleText]
  );

  // Get max files from config for display
  const maxFiles = attachConfig?.maxFiles || 10;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AttachFileIcon color="primary" />
          <Typography variant="h6">
            {localeText.bsAttachFiles || "Attach Files"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <BSFileUpload
          attachConfig={attachConfig}
          localeText={localeText}
          locale={locale}
          onFilesChanged={onFilesChanged}
          showUploadArea={true}
          showFileList={true}
        />
      </DialogContent>

      <DialogActions
        sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}
      >
        <Button onClick={onClose} variant="outlined">
          {localeText.bsClose || "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BSFileUploadDialog;
