import React, { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import BSFilterCustom from "../components/BSFilterCustom";
import BSDataGrid from "../components/BSDataGrid";

/**
 * ตัวอย่างการใช้งาน BSDataGrid ร่วมกับ BSFilterCustom
 *
 * BSFilterCustom จะส่งค่า filter ให้ BSDataGrid ผ่าน bsCustomFilters prop
 * โดยรองรับทั้ง client-side และ server-side filtering
 */
export default function BSDataGridWithCustomFilterExample() {
  const [filterValues, setFilterValues] = useState([]);

  // กำหนด filter fields สำหรับ BSFilterCustom
  const filterFields = [
    {
      field: "method",
      component: "BSTextField",
      bsTitle: "Method Name",
      type: "string",
      defaultOperator: "contains",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "create_date",
      component: "BSDatepicker",
      bsTitle: "วันที่สร้าง",
      type: "date",
      defaultOperator: "is",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "create_by",
      component: "BSTextField",
      bsTitle: "สร้างโดย",
      type: "string",
      defaultOperator: "contains",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
    {
      field: "update_date",
      component: "BSDatepicker",
      bsTitle: "วันที่แก้ไข",
      type: "date",
      defaultOperator: "isBetween",
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        BSDataGrid with Custom Filter Example
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        ตัวอย่างการใช้ BSFilterCustom ร่วมกับ BSDataGrid แบบ client-side
        filtering
      </Typography>

      {/* Custom Filter Component */}
      <Box sx={{ mb: 0 }}>
        <BSFilterCustom
          bsFilterField={filterFields}
          bsFilterValue={filterValues}
          bsFilterValueOnChanage={(values) => {
            console.log("🔍 Custom Filter Values:", values);
            setFilterValues(values);
          }}
          bsSearch={true}
          bsClear={true}
          spacing={2}
        />
      </Box>

      {/* DataGrid with Custom Filters */}
      <Paper sx={{ height: 600, width: "100%" }}>
        <BSDataGrid
          // Enhanced Stored Procedure Configuration
          bsKeyId="method_id"
          bsStoredProcedure="usp_tbm_method"
          bsStoredProcedureSchema="ams"
          // Display Configuration
          bsShowRowNumber={true}
          bsCols="method,create_by,create_date,update_by,update_date"
          bsLocale="en"
          // CRUD Configuration
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          // Filtering Configuration
          bsFilterMode="client" // ใช้ client-side filtering
          bsCustomFilters={filterValues} // ส่งค่า filter จาก BSFilterCustom
          // Pagination
          bsRowPerPage={25}
          // Callbacks
          onDataBind={(data) => {
            console.log("📊 Data loaded:", {
              totalRows: data.length,
              sampleData: data.slice(0, 3),
            });
          }}
        />
      </Paper>

      {/* Filter Values Debug */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Current Filter Values (Debug)
        </Typography>
        <pre
          style={{
            backgroundColor: "#f5f5f5",
            padding: "16px",
            borderRadius: "4px",
            overflow: "auto",
            fontSize: "12px",
          }}
        >
          {JSON.stringify(filterValues, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
}
