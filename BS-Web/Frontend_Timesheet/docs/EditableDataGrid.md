# EditableDataGrid Component

## คำอธิบาย

`EditableDataGrid` เป็น component ที่พัฒนาขึ้นบนพื้นฐานของ MUI X DataGrid โดยเพิ่มความสามารถในการแก้ไขข้อมูลแบบ CRUD (Create, Read, Update, Delete) ที่ครบครัน

## ฟีเจอร์หลัก

- ✅ **เพิ่มรายการใหม่** - ปุ่มเพิ่มรายการที่ toolbar
- ✅ **แก้ไขข้อมูล** - แก้ไขข้อมูลแบบ inline editing
- ✅ **ลบรายการ** - ลบรายการพร้อม confirmation
- ✅ **บันทึก/ยกเลิก** - ควบคุมการบันทึกและยกเลิกการแก้ไข
- ✅ **Validation** - รองรับการตรวจสอบข้อมูล
- ✅ **Types Support** - รองรับประเภทข้อมูลต่างๆ (text, number, date, select)

## การติดตั้ง

component นี้ใช้ dependencies ต่อไปนี้:

```bash
npm install @mui/material @mui/x-data-grid @mui/icons-material
```

## การใช้งานพื้นฐาน

```jsx
import React, { useState } from "react";
import EditableDataGrid from "../components/EditableDataGrid";

const MyComponent = () => {
  const [users, setUsers] = useState([
    { id: 1, name: "สมชาย", age: 25, department: "IT" },
    { id: 2, name: "สมศรี", age: 30, department: "HR" },
  ]);

  const columns = [
    { field: "name", headerName: "ชื่อ", width: 200, editable: true },
    {
      field: "age",
      headerName: "อายุ",
      type: "number",
      width: 100,
      editable: true,
    },
    {
      field: "department",
      headerName: "แผนก",
      width: 150,
      editable: true,
      type: "singleSelect",
      valueOptions: ["IT", "HR", "Finance"],
    },
  ];

  return (
    <EditableDataGrid
      rows={users}
      columns={columns}
      paginationModel={{ page: 0, pageSize: 10 }}
    />
  );
};
```

## Props

| Prop              | Type       | Default                    | Description                   |
| ----------------- | ---------- | -------------------------- | ----------------------------- |
| `rows`            | `Array`    | `[]`                       | ข้อมูลที่จะแสดงในตาราง        |
| `columns`         | `Array`    | `[]`                       | การกำหนดคอลัมน์               |
| `paginationModel` | `Object`   | `{ page: 0, pageSize: 5 }` | การตั้งค่า pagination         |
| `onAddRecord`     | `Function` | `undefined`                | callback เมื่อเพิ่มรายการใหม่ |
| `onUpdateRecord`  | `Function` | `undefined`                | callback เมื่ออัพเดทรายการ    |
| `onDeleteRecord`  | `Function` | `undefined`                | callback เมื่อลบรายการ        |

## การจัดการ State ด้วย Custom Callbacks

```jsx
const handleAddRecord = () => {
  const newId = Math.max(...users.map((u) => u.id), 0) + 1;
  const newUser = {
    id: newId,
    name: "",
    age: "",
    department: "",
    isNew: true,
  };
  setUsers((prevUsers) => [...prevUsers, newUser]);
};

const handleUpdateRecord = (updatedRow) => {
  setUsers((prevUsers) =>
    prevUsers.map((user) => (user.id === updatedRow.id ? updatedRow : user))
  );
  console.log("Record updated:", updatedRow);
};

const handleDeleteRecord = (id) => {
  setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
  console.log("Record deleted:", id);
};

<EditableDataGrid
  rows={users}
  columns={columns}
  onAddRecord={handleAddRecord}
  onUpdateRecord={handleUpdateRecord}
  onDeleteRecord={handleDeleteRecord}
/>;
```

## ประเภทคอลัมน์ที่รองรับ

### 1. Text Field

```jsx
{ field: 'name', headerName: 'ชื่อ', editable: true }
```

### 2. Number Field

```jsx
{
  field: 'age',
  headerName: 'อายุ',
  type: 'number',
  editable: true
}
```

### 3. Date Field

```jsx
{
  field: 'joinDate',
  headerName: 'วันที่เข้าทำงาน',
  type: 'date',
  editable: true
}
```

### 4. Select Field

```jsx
{
  field: 'department',
  headerName: 'แผนก',
  type: 'singleSelect',
  valueOptions: ['IT', 'HR', 'Finance'],
  editable: true
}
```

## การใช้งาน Validation

```jsx
const columns = [
  {
    field: "email",
    headerName: "อีเมล",
    editable: true,
    preProcessEditCellProps: (params) => {
      const hasError = !params.props.value.includes("@");
      return { ...params.props, error: hasError };
    },
  },
];
```

## การปรับแต่ง Styling

component รองรับการปรับแต่ง styling ผ่าน `sx` prop:

```jsx
<EditableDataGrid
  rows={users}
  columns={columns}
  sx={{
    height: 600,
    "& .MuiDataGrid-cell": {
      fontSize: "0.9rem",
    },
  }}
/>
```

## การควบคุมโหมดการแก้ไข

component ใช้ `editMode="row"` ซึ่งจะทำให้สามารถแก้ไขทั้งแถวในครั้งเดียว

## เหตุการณ์สำคัญ

- **Double-click** เซลล์เพื่อเข้าสู่โหมดแก้ไข
- **Enter** เพื่อยืนยันการแก้ไข
- **Escape** เพื่อยกเลิกการแก้ไข
- **Tab** เพื่อย้ายไปเซลล์ถัดไปและบันทึกการเปลี่ยนแปลง

## ตัวอย่างการใช้งาน

ดูตัวอย่างการใช้งานเต็มรูปแบบได้ที่หน้า `/editable` ในแอปพลิเคชัน

## หมายเหตุ

- คอลัมน์ `actions` จะถูกเพิ่มอัตโนมัติหากไม่ได้กำหนดไว้
- การแก้ไขจะเป็นแบบ optimistic update (แสดงผลทันทีก่อนส่งไปยังเซิร์ฟเวอร์)
- รองรับ responsive design และ mobile-friendly
