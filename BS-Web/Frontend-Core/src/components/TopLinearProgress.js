import { LinearProgress, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const TopLinearProgress = ({ open, placement = "fixed" }) => {
  const theme = useTheme();

  if (!open) return null;

  const containerSx =
    placement === "below-appbar"
      ? {
          position: "absolute",
          top: "100%",
          left: 0,
          width: "100%",
          zIndex: theme.zIndex.appBar + 1,
        }
      : {
          position: "fixed",
          top: theme.mixins.toolbar.minHeight,
          left: 0,
          width: "100%",
          zIndex: theme.zIndex.appBar,
        };

  return (
    <Box sx={containerSx}>
      <LinearProgress color="primary" />
    </Box>
  );
}
export default TopLinearProgress;