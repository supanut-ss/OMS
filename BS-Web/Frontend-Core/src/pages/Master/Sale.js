import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";

const SalePage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const dataGridRef = useRef(null); // ref

  // โหลด resource ตามภาษาที่เปลี่ยน
  const getLang = async () => {
    const res = await getResources("MasterSale");
    setResourceData(res);
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Master Sale")}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_sale"
          bsObjBy="create_date desc"
          bsDialogSize="Large"
          bsDialogColumns={3}
        />
      </Paper>
    </Box>
  );
};

export default SalePage;
