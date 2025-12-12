import { Box, useTheme } from "@mui/material";
import MyTaskPage from "./Projects/MyTask";
import secureStorage from "../utils/SecureStorage";

const Home = () => {
  const theme = useTheme();
  const lang = secureStorage.get("lang") || "th";

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: `calc(95vh - ${theme.spacing(8)})`,
        p: 2,
      }}
    >
      <MyTaskPage lang={lang} />
    </Box>
  );
};

export default Home;
