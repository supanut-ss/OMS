import React, { useState, useCallback, useRef, useEffect } from "react";
import { Typography, Box, Paper, Chip } from "@mui/material";
import { Inventory } from "@mui/icons-material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const PartPage = (props) => {
  const dataGridRef = useRef();

  // 🌐 Lang / Resource
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  const getLang = async () => {
    try {
      // group resource: "Part" (ตั้งให้ตรงกับของฝั่งคุณ)
      const res = await getResources("Part");
      setResourceData(res);
    } catch (error) {
      console.error("getResources(Part) error:", error);
    }
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // ===============================
  // 📊 State สำหรับเก็บข้อมูล summary
  // ===============================
  const [totals, setTotals] = useState({ qty: 0 });

  // ===============================
  // 📦 รับข้อมูลจาก BSDataGrid แล้วคำนวณผลรวม
  // ===============================
  const handleDataBind = useCallback((data) => {
    const totalQty = data.reduce((sum, row) => {
      const qty = parseFloat(row.qty) || 0;
      return sum + qty;
    }, 0);

    setTotals({ qty: totalQty });
  }, []);

  // ===============================
  // 🧩 UI
  // ===============================
  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Master Part") || "Master Part"}
        </Typography>

        {/* ตารางข้อมูล */}
        <BSDataGrid
          ref={dataGridRef}
          bsStoredProcedure="usp_tbm_part"
          bsStoredProcedureSchema="ams"
          bsShowRowNumber={true}
          showAdd={false}
          bsCols="part_no,part_name,supplier_name,unit_price,snp,area_code,area_name,qty,create_by,create_date,update_by,update_date"
          bsLocale={props.lang || "en"}
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsRowPerPage={20}
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          bsFilterMode="client"
          bsVisibleDelete={false}
          onDataBind={handleDataBind}
          bsColumnDefs={[
            {
              field: "part_no",
              readOnly: true,
            },
            {
              field: "area_code",
              readOnly: true,
            },
            {
              field: "area_name",
              readOnly: true,
            },
          ]}
        />

        {/* สรุปผลรวม */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            mt: 2,
          }}
        >
          <Chip
            icon={<Inventory />}
            label={`${getResource(resourceData, "Total Qty") || "Total Qty"}: ${totals.qty.toLocaleString()}`}
            color="primary"
            variant="outlined"
            sx={{
              fontSize: "0.95rem",
              color: "black",
              px: 1,
              py: 2,
            }}
          />
        </Box>
      </Paper>
    </>
  );
};

export default PartPage;
