import React, { useState, useCallback } from "react";
import { Typography, Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const PartPage = () => {
  // State สำหรับเก็บข้อมูล summary
  const [totals, setTotals] = useState({
    qty: 0,
  });

  // Callback function สำหรับรับข้อมูลจาก BSDataGrid
  const handleDataBind = useCallback((data) => {
    // คำนวณ total qty จากข้อมูลที่ได้รับ
    const totalQty = data.reduce((sum, row) => {
      const qty = parseFloat(row.qty) || 0; // แปลง qty เป็น number, default เป็น 0 ถ้าไม่ใช่ตัวเลข
      return sum + qty;
    }, 0);

    // อัปเดต state
    setTotals({
      qty: totalQty,
    });

    // console.log("📊 Data Summary:", {
    //   totalRows: data.length,
    //   totalQty: totalQty,
    //   sampleData: data.slice(0, 3).map((row) => ({
    //     part_no: row.part_no,
    //     qty: row.qty,
    //     qty_type: typeof row.qty,
    //   })),
    // });
  }, []);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Master Part
      </Typography>
      {/* ตารางข้อมูล */}
      <BSDataGrid
        // Enhanced Stored Procedure Configuration
        bsStoredProcedure="usp_tbm_part"
        bsStoredProcedureSchema="ams"
        bsShowRowNumber={true}
        showAdd={false}
        bsCols="part_no,part_name,supplier_name,unit_price,snp,area_code,area_name,qty,create_by,create_date,update_by,update_date"
        // bsStoredProcedureParams={
        //     {
        // เพิ่มพารามิเตอร์เพิ่มเติมได้ตามต้องการ
        // AreaCodeFilter: 'A01',
        // SupplierFilter: 'Toyota',
        //     }
        // }
        // Standard Configuration
        bsLocale="en"
        bsAllowAdd={true}
        bsAllowEdit={true}
        bsAllowDelete={true}
        bsPageSize={25}
        bsFilterMode="client"
        // Data binding callback for totals calculation
        onDataBind={handleDataBind}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end", // ✅ ชิดขวาสุด
          textAlign: "right",
          px: 2,
          fontWeight: "bold",
        }}
      >
        <Box>
          <Typography variant="body1">
            Total Qty: {totals.qty.toLocaleString()}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default PartPage;
