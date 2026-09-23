export const getReportViewerRootSx = (embedded) => ({
  position: "relative",
  width: "100%",
  height: embedded ? "100%" : "auto",
  minHeight: embedded ? 0 : "100%",
  boxSizing: "border-box",
  p: embedded ? 0 : { xs: 1.5, md: 2 },
  display: "flex",
  flexDirection: "column",
  gap: 1.5,
  overflow: embedded ? "hidden" : "visible",
});

export const getReportPreviewSx = (embedded) => ({
  flex: embedded ? 1 : "0 0 auto",
  height: embedded
    ? "auto"
    : "clamp(680px, calc(100dvh - 80px), 1000px)",
  minHeight: embedded ? 0 : 680,
});
