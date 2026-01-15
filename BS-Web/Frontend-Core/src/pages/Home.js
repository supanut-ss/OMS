import { Box, useTheme } from "@mui/material";
import MyTaskPage from "./Projects/MyTask";
import { useOutletContext } from "react-router-dom";

const Home = (props) => {
  const { lang, } = props;
  const theme = useTheme();
  const { permission } = useOutletContext();
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: `calc(95vh - ${theme.spacing(8)})`,
      }}
    >
      <MyTaskPage lang={lang} permission={permission} />
    </Box>
  );
};

export default Home;
