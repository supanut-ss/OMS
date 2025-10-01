import React from "react";
import BSDataGrid from "../components/BSDataGrid";

// Test component สำหรับทดสอบ column filtering
const BSDataGridTest = () => {
  return (
    <div style={{ padding: 20 }}>
      <h2>BS DataGrid Column Filtering Test</h2>

      {/* Test 1: User Groups - แสดงเฉพาะ group_code, group_name */}
      <h3>Test 1: User Groups - Show only group_code, group_name columns</h3>
      <div style={{ height: 400, marginBottom: 20 }}>
        <BSDataGrid
          bsObj="sec.t_com_user_group"
          bsCols="group_code,group_name"
          bsRowPerPage={10}
          height={350}
        />
      </div>

      {/* Test 2: Customer - แสดงเฉพาะ customer_name, email, phone */}
      <h3>Test 2: Customer - Show only customer_name, email, phone columns</h3>
      <div style={{ height: 400, marginBottom: 20 }}>
        <BSDataGrid
          bsObj="t_tmt_customer"
          bsCols="customer_name,email,phone"
          bsRowPerPage={10}
          height={350}
        />
      </div>

      {/* Test 3: User Groups - ไม่กำหนด bsCols (แสดงทุกคอลัมน์) */}
      <h3>Test 3: User Groups - Show all columns (no bsCols specified)</h3>
      <div style={{ height: 400 }}>
        <BSDataGrid
          bsObj="sec.t_com_user_group"
          bsRowPerPage={10}
          height={350}
        />
      </div>
    </div>
  );
};

export default BSDataGridTest;
