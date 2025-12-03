import React from "react";
import BSDataGrid from "./components/BSDataGrid";

// ตัวอย่างการใช้งาน BSDataGrid พร้อม bsCols
const App = () => {
  return (
    <div style={{ padding: 20 }}>
      <h1>BS DataGrid Column Filtering Test</h1>

      {/* ตัวอย่างที่ 1: แสดงเฉพาะคอลัมน์ id, name, email */}
      <div style={{ height: 400, marginBottom: 20 }}>
        <h3>แสดงเฉพาะ id, name, email:</h3>
        <BSDataGrid
          bsObj="customers"
          bsCols="id,name,email"
          bsRowPerPage={10}
          height={350}
        />
      </div>

      {/* ตัวอย่างที่ 2: แสดงเฉพาะคอลัมน์ name, phone */}
      <div style={{ height: 400, marginBottom: 20 }}>
        <h3>แสดงเฉพาะ name, phone:</h3>
        <BSDataGrid
          bsObj="customers"
          bsCols="name,phone"
          bsRowPerPage={10}
          height={350}
        />
      </div>
    </div>
  );
};

export default App;
