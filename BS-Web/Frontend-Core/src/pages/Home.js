import { Box, useTheme } from "@mui/material";
//import bgImage from "../assets/images/BG.png";
const Home = () => {
    const theme = useTheme();
    return (<Box
        sx={{
            width: "100%",                // กินเต็มความกว้าง
            height: `calc(95vh - ${theme.spacing(8)})`,              // สูงเต็มหน้าจอ
      //      backgroundImage: `url(${bgImage})`, // แทรกภาพพื้นหลัง
            backgroundRepeat: "no-repeat",      // ไม่ให้ภาพซ้ำ
            backgroundSize: "contain",          // แสดงภาพครบทั้งหมด (อาจมีพื้นที่ว่าง)
            backgroundPosition: "top",          // จัดให้อยู่ด้านบน
        }}
    >
        {/* เนื้อหาภายใน */}
    </Box>
    );
}
export default Home;