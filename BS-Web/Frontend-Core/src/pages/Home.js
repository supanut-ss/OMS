import { Box, useTheme } from "@mui/material";
import { useOutletContext } from "react-router-dom";
import Incentive from "./Incentive";
import Performance from "./Performance";
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
      <Performance lang={lang} permission={permission} />
      {/* <Incentive lang={lang} permission={permission} /> */}
      {/* <MyTaskPage lang={lang} permission={permission} /> */}
    </Box>
  );
};

export default Home;
