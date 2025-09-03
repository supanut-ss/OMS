import { LinearProgress, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const TopLinearProgress = ({ open }) => {
  const theme = useTheme();

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: theme.mixins.toolbar.minHeight, // อยู่ใต้ AppBar
        left: 0,
        width: "100%",
        zIndex: theme.zIndex.appBar, // อยู่เหนือเนื้อหา แต่ใต้ AppBar
      }}
    >
      <LinearProgress color="primary" />
    </Box>
  );
}
export default TopLinearProgress;