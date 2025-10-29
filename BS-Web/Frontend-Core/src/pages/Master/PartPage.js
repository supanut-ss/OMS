import React from "react";
import { Typography, Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const PartPage = () => {
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
            Total :
            {/* {totals.qty.toLocaleString()} */}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default PartPage;
