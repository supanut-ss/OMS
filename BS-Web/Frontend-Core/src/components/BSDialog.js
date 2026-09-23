import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Portal,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  OpenInFull as OpenInFullIcon,
} from "@mui/icons-material";

const BSDialog = ({
  open,
  minimized = false,
  title,
  children,
  actions,
  actionsSx,
  titleActions,
  titleSx,
  onClose,
  onMinimize,
  onRestore,
  closeDisabled = false,
  closeOnBackdropClick = false,
  maxWidth = "md",
  fullWidth = true,
  fullScreen = false,
  contentDividers = false,
  contentSx,
  PaperProps,
  localeText = {},
  minimizeLabel,
  restoreLabel,
  closeLabel,
  showMinimize = true,
  titleTypographyProps,
  draggable = true,
  dialogProps,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const paperRef = useRef(null);
  const dragStateRef = useRef(null);
  const previousUserSelectRef = useRef("");

  const resolvedCloseLabel = closeLabel || localeText.bsClose || "Close";
  const resolvedMinimizeLabel =
    minimizeLabel || localeText.bsMinimizeDialog || "Minimize";
  const resolvedRestoreLabel =
    restoreLabel || localeText.bsRestoreDialog || "Restore";
  const isMinimized = minimized || internalMinimized;
  const canDrag = draggable && !fullScreen;

  const handleClose = (event, reason) => {
    if (!closeOnBackdropClick && reason === "backdropClick") return;
    setInternalMinimized(false);
    onClose?.(event, reason);
  };

  const handleMinimize = (event) => {
    if (onMinimize) {
      onMinimize(event);
      return;
    }
    setInternalMinimized(true);
  };

  const handleRestoreClick = (event) => {
    event.stopPropagation();
    if (onRestore) {
      onRestore(event);
      return;
    }
    setInternalMinimized(false);
  };

  const handleMinimizedClose = (event) => {
    event.stopPropagation();
    handleClose(event);
  };

  const setPaperRef = useCallback(
    (node) => {
      paperRef.current = node;

      const paperPropsRef = PaperProps?.ref;
      if (typeof paperPropsRef === "function") {
        paperPropsRef(node);
      } else if (paperPropsRef) {
        paperPropsRef.current = node;
      }
    },
    [PaperProps?.ref],
  );

  const handleTitlePointerDown = useCallback(
    (event) => {
      if (!canDrag || event.button !== 0) return;
      if (event.target.closest("button, [role='button'], input, textarea")) {
        return;
      }

      const paperRect = paperRef.current?.getBoundingClientRect();
      if (!paperRect) return;

      const viewportPadding = 8;
      previousUserSelectRef.current = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: dragOffset.x,
        originY: dragOffset.y,
        minX: dragOffset.x + viewportPadding - paperRect.left,
        maxX:
          dragOffset.x + window.innerWidth - viewportPadding - paperRect.right,
        minY: dragOffset.y + viewportPadding - paperRect.top,
        maxY:
          dragOffset.y +
          window.innerHeight -
          viewportPadding -
          paperRect.bottom,
      };
      setIsDragging(true);
    },
    [canDrag, dragOffset.x, dragOffset.y],
  );

  useEffect(() => {
    if (!open || isMinimized || fullScreen) {
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
    if (!open) {
      setInternalMinimized(false);
    }
  }, [fullScreen, isMinimized, open]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleDragMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const nextX = dragState.originX + event.clientX - dragState.startX;
      const nextY = dragState.originY + event.clientY - dragState.startY;

      setDragOffset({
        x: Math.min(Math.max(nextX, dragState.minX), dragState.maxX),
        y: Math.min(Math.max(nextY, dragState.minY), dragState.maxY),
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);

    return () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      document.body.style.userSelect = previousUserSelectRef.current;
      dragStateRef.current = null;
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      document.body.style.userSelect = previousUserSelectRef.current;
    };
  }, []);

  return (
    <>
      {open && isMinimized && (
        <Portal>
          <Box
            onClick={handleRestoreClick}
            sx={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2.5,
              py: 1,
              minWidth: 280,
              maxWidth: 480,
              borderRadius: 2,
              cursor: "pointer",
              boxShadow: 6,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                boxShadow: 10,
                transform: "translateX(-50%) translateY(-2px)",
                bgcolor: "primary.dark",
              },
            }}
          >
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
            <Tooltip title={resolvedRestoreLabel}>
              <IconButton
                size="small"
                onClick={handleRestoreClick}
                sx={{ color: "inherit" }}
              >
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={resolvedCloseLabel}>
              <IconButton
                size="small"
                onClick={handleMinimizedClose}
                disabled={closeDisabled}
                sx={{ color: "inherit" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Portal>
      )}

      <Dialog
        open={open && !isMinimized}
        onClose={handleClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        fullScreen={fullScreen}
        PaperProps={{
          ...PaperProps,
          ref: setPaperRef,
          sx: {
            borderRadius: fullScreen ? 0 : 1,
            ...PaperProps?.sx,
            ...(canDrag
              ? {
                  transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                }
              : {}),
          },
        }}
        {...dialogProps}
      >
        <DialogTitle
          onPointerDown={handleTitlePointerDown}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
            cursor: canDrag ? "move" : undefined,
            userSelect: canDrag ? "none" : undefined,
            ...titleSx,
          }}
        >
          <Typography
            component="span"
            variant="h6"
            fontWeight={600}
            {...titleTypographyProps}
          >
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {titleActions}
            {showMinimize && (
              <Tooltip title={resolvedMinimizeLabel}>
                <IconButton
                  size="small"
                  onClick={handleMinimize}
                  aria-label="minimize dialog"
                  sx={{
                    color: "text.secondary",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  <MinimizeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={resolvedCloseLabel}>
              <IconButton
                size="small"
                onClick={handleClose}
                disabled={closeDisabled}
                aria-label="close dialog"
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "error.main" },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent dividers={contentDividers} sx={contentSx}>
          {children}
        </DialogContent>
        {actions && <DialogActions sx={actionsSx}>{actions}</DialogActions>}
      </Dialog>
    </>
  );
};

export default BSDialog;
