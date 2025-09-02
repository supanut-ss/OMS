# 🚀 React Timesheet System

ระบบ Timesheet ที่พัฒนาด้วย React 19 และ Material-UI พร้อมด้วย Custom GridView Components ที่มีความสามารถในการจัดการข้อมูลแบบครบครัน

## 📋 สารบัญ

- [🛠️ การติดตั้งและเริ่มต้น](#️-การติดตั้งและเริ่มต้น)
- [📊 Custom GridView Components](#-custom-gridview-components)
- [⚡ Quick Reference](#-quick-reference)
- [🔄 เปรียบเทียบ Components](#-เปรียบเทียบ-components)
- [📚 คู่มือการใช้งานเต็มรูปแบบ](#-คู่มือการใช้งานเต็มรูปแบบ)
- [📝 Changelog](#-changelog)

---

## 🛠️ การติดตั้งและเริ่มต้น

### สร้างโปรเจคใหม่

```bash
npx create-react-app@latest my-app
cd my-app
```

### ติดตั้ง Dependencies

```bash
npm install secure-ls crypto-js axios @mui/material @emotion/react @emotion/styled @mui/styled-engine-sc styled-components @fontsource/roboto @mui/icons-material @mui/x-data-grid react-router-dom env-cmd papaparse --save-dev
```

### เริ่มต้นใช้งาน

```bash
npm install && npm start
```

### โครงสร้างโปรเจค

```
src/
├── components/
│   ├── CustomDataGrid.js          # Grid แบบอ่านอย่างเดียว
│   ├── EditableDataGrid.js        # Grid แบบแก้ไขได้
│   └── DataGridErrorBoundary.js   # Error handling
├── pages/
│   ├── EditablePage.js           # ตัวอย่างการใช้งาน
│   ├── ItemPage.js               # CustomDataGrid example
│   └── ProjectPage.js            # Tree view + Grid
└── docs/                         # เอกสารทั้งหมด
```

---

## 📊 Custom GridView Components

ในโปรเจคนี้มี GridView Components หลัก 2 ตัว:

### 🔍 CustomDataGrid - แบบอ่านอย่างเดียว

- **จุดประสงค์**: แสดงข้อมูลแบบอ่านอย่างเดียว (Read-only)
- **เหมาะสำหรับ**: Dashboard, รายงาน, การแสดงผลข้อมูล
- **ฟีเจอร์**: Export, การกรอง, การเรียงลำดับ, Pagination

### ✏️ EditableDataGrid - แบบแก้ไขได้

- **จุดประสงค์**: จัดการข้อมูลแบบครบครัน CRUD
- **เหมาะสำหรับ**: ฟอร์มจัดการข้อมูล, ระบบบริหารจัดการ
- **ฟีเจอร์**: เพิ่ม, แก้ไข, ลบ, Validation

### 📊 ตารางเปรียบเทียบแบบย่อ

| ฟีเจอร์     | CustomDataGrid | EditableDataGrid |
| ----------- | -------------- | ---------------- |
| แสดงข้อมูล  | ✅             | ✅               |
| Export      | ✅             | ❌               |
| เพิ่มข้อมูล | ❌             | ✅               |
| แก้ไขข้อมูล | ❌             | ✅               |
| ลบข้อมูล    | ❌             | ✅               |
| Performance | ⚡ เร็ว        | 🐌 ปานกลาง       |

---

## ⚡ Quick Reference

### 🚀 การเลือกใช้งาน (30 วินาที)

| ความต้องการ         | Component          | เหตุผล             |
| ------------------- | ------------------ | ------------------ |
| แสดงข้อมูล + Export | `CustomDataGrid`   | มี export built-in |
| แสดงข้อมูล + แก้ไข  | `EditableDataGrid` | มี CRUD operations |
| Dashboard/Report    | `CustomDataGrid`   | Performance ดี     |
| Admin Panel         | `EditableDataGrid` | จัดการข้อมูลได้    |

### 📋 Template Code

#### CustomDataGrid (Read-Only)

```jsx
import CustomDataGrid from "../components/CustomDataGrid";

const MyPage = () => {
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Name", width: 200 },
  ];

  return (
    <CustomDataGrid
      rows={data}
      columns={columns}
      paginationModel={{ page: 0, pageSize: 10 }}
    />
  );
};
```

#### EditableDataGrid (CRUD)

```jsx
import EditableDataGrid from "../components/EditableDataGrid";

const MyPage = () => {
  const [data, setData] = useState([]);

  const columns = [
    { field: "name", headerName: "Name", width: 200, editable: true },
    { field: "email", headerName: "Email", width: 200, editable: true },
  ];

  const handleAdd = () => {
    setData((prev) => [...prev, { id: Date.now(), name: "", email: "" }]);
  };

  const handleUpdate = (row) => {
    setData((prev) => prev.map((item) => (item.id === row.id ? row : item)));
  };

  const handleDelete = (id) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <EditableDataGrid
      rows={data}
      columns={columns}
      onAddRecord={handleAdd}
      onUpdateRecord={handleUpdate}
      onDeleteRecord={handleDelete}
    />
  );
};
```

### 🔧 Column Types Cheat Sheet

```jsx
const columnTypes = [
  // Text (default)
  { field: "name", headerName: "Name", editable: true },

  // Number
  { field: "age", headerName: "Age", type: "number", editable: true },

  // Date
  { field: "birthday", headerName: "Birthday", type: "date", editable: true },

  // Select
  {
    field: "status",
    headerName: "Status",
    type: "singleSelect",
    valueOptions: ["Active", "Inactive"],
    editable: true,
  },

  // Boolean
  { field: "isActive", headerName: "Active", type: "boolean", editable: true },
];
```

---

## 🔄 เปรียบเทียบ Components

### 📊 ตารางเปรียบเทียบแบบละเอียด

| ฟีเจอร์             | CustomDataGrid | EditableDataGrid | คำอธิบาย                      |
| ------------------- | -------------- | ---------------- | ----------------------------- |
| **การแสดงข้อมูล**   | ✅             | ✅               | แสดงข้อมูลในรูปแบบตาราง       |
| **Pagination**      | ✅             | ✅               | แบ่งหน้าข้อมูล                |
| **การเรียงลำดับ**   | ✅             | ✅               | คลิกหัวคอลัมน์เพื่อเรียงลำดับ |
| **การกรองข้อมูล**   | ✅             | ✅               | กรองข้อมูลตามเงื่อนไข         |
| **Export ข้อมูล**   | ✅             | ❌               | ส่งออกเป็น CSV, Excel         |
| **เพิ่มรายการใหม่** | ❌             | ✅               | เพิ่มแถวใหม่ผ่าน toolbar      |
| **แก้ไขข้อมูล**     | ❌             | ✅               | Inline editing                |
| **ลบรายการ**        | ❌             | ✅               | ลบแถวผ่าน action buttons      |
| **Validation**      | ❌             | ✅               | ตรวจสอบข้อมูลก่อนบันทึก       |

### 🎯 การใช้งานตาม Scenario

#### 📈 สำหรับ Dashboard และ Reporting

```jsx
// ✅ ใช้ CustomDataGrid
const DashboardPage = () => {
  return (
    <CustomDataGrid
      rows={salesData}
      columns={reportColumns}
      // Export toolbar จะแสดงอัตโนมัติ
    />
  );
};
```

#### ⚙️ สำหรับ Management System

```jsx
// ✅ ใช้ EditableDataGrid
const ProductManagementPage = () => {
  return (
    <EditableDataGrid
      rows={products}
      columns={editableColumns}
      onAddRecord={handleAddProduct}
      onUpdateRecord={handleUpdateProduct}
      onDeleteRecord={handleDeleteProduct}
    />
  );
};
```

### ⚠️ Common Mistakes

#### ❌ Wrong

```jsx
// ใช้ EditableDataGrid แต่ไม่ให้แก้ไข
<EditableDataGrid
  rows={data}
  columns={[{ field: 'name' }]} // ลืม editable: true
/>

// ใช้ CustomDataGrid แต่ต้องการแก้ไข
<CustomDataGrid
  rows={data}
  columns={[{ field: 'name', editable: true }]} // ไม่มีผล
  onRowClick={handleEdit} // ไม่ทำงาน
/>
```

#### ✅ Correct

```jsx
// Read-only
<CustomDataGrid rows={data} columns={readOnlyColumns} />

// Editable
<EditableDataGrid
  rows={data}
  columns={editableColumns}
  onUpdateRecord={handleUpdate}
/>
```

---

## 📚 คู่มือการใช้งานเต็มรูปแบบ

### 🔍 CustomDataGrid - คู่มือละเอียด

#### ✨ ฟีเจอร์หลัก

- ✅ **Export ข้อมูล** - ส่งออกเป็น CSV, Excel
- ✅ **การกรองข้อมูล** - กรองตามคอลัมน์
- ✅ **การเรียงลำดับ** - เรียงจากน้อยไปมาก/มากไปน้อย
- ✅ **Pagination** - แบ่งหน้าข้อมูล
- ✅ **Responsive Design** - ปรับตัวตามขนาดหน้าจอ
- ✅ **Zebra Striping** - แถวสลับสี
- ✅ **Hover Effects** - เอฟเฟคเมื่อ hover

#### ⚙️ Props ที่รองรับ

| Prop              | Type     | Default                    | Description           |
| ----------------- | -------- | -------------------------- | --------------------- |
| `rows`            | `Array`  | `[]`                       | ข้อมูลที่จะแสดง       |
| `columns`         | `Array`  | `[]`                       | การกำหนดคอลัมน์       |
| `paginationModel` | `Object` | `{ page: 0, pageSize: 5 }` | การตั้งค่า pagination |

### ✏️ EditableDataGrid - คู่มือละเอียด

#### ✨ ฟีเจอร์หลัก

- ✅ **เพิ่มรายการใหม่** - ปุ่มเพิ่มใน toolbar
- ✅ **แก้ไขข้อมูล** - inline editing
- ✅ **ลบรายการ** - ปุ่มลบในแต่ละแถว
- ✅ **บันทึก/ยกเลิก** - ควบคุมการแก้ไข
- ✅ **Validation** - ตรวจสอบความถูกต้อง
- ✅ **Row Mode Editing** - แก้ไขทั้งแถว

#### ⚙️ Props ที่รองรับ

| Prop             | Type       | Default     | Description                             |
| ---------------- | ---------- | ----------- | --------------------------------------- |
| `rows`           | `Array`    | `[]`        | ข้อมูลที่จะแสดง                         |
| `columns`        | `Array`    | `[]`        | การกำหนดคอลัมน์ (ต้องมี editable: true) |
| `onAddRecord`    | `Function` | `undefined` | Callback เมื่อเพิ่มรายการ               |
| `onUpdateRecord` | `Function` | `undefined` | Callback เมื่อแก้ไขรายการ               |
| `onDeleteRecord` | `Function` | `undefined` | Callback เมื่อลบรายการ                  |

#### 🔐 Validation Examples

```jsx
// Email validation
{
  field: 'email',
  editable: true,
  preProcessEditCellProps: (params) => {
    const isValid = /\S+@\S+\.\S+/.test(params.props.value);
    return { ...params.props, error: !isValid };
  }
}

// Required field
{
  field: 'name',
  editable: true,
  preProcessEditCellProps: (params) => {
    const hasError = !params.props.value;
    return { ...params.props, error: hasError };
  }
}
```

### 🎨 การปรับแต่ง Styling

#### Quick Styling

```jsx
// Zebra striping (มีใน default แล้ว)
sx={{
  '& .MuiDataGrid-row:nth-of-type(even)': {
    backgroundColor: '#fafafa',
  }
}}

// Custom cell colors
sx={{
  '& .MuiDataGrid-cell': {
    borderColor: '#e0e0e0',
  },
  '& .MuiDataGrid-columnHeader': {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  }
}}

// Edit mode highlighting
sx={{
  '& .MuiDataGrid-row--editing': {
    backgroundColor: '#fff3e0',
  }
}}
```

### 🚀 Performance Optimization

```jsx
// Memoized components
const MemoizedCustomGrid = React.memo(CustomDataGrid);
const MemoizedEditableGrid = React.memo(EditableDataGrid);

// Memoized columns
const columns = useMemo(
  () => [
    // column definitions
  ],
  []
);

// Memoized handlers
const handleUpdate = useCallback((row) => {
  // update logic
}, []);
```

### 🔍 Debugging Checklist

#### ข้อมูลไม่แสดง

- [ ] ตรวจสอบ `rows` มี `id` field หรือไม่
- [ ] ตรวจสอบ `columns` มี `field` ถูกต้องหรือไม่
- [ ] เช็ค console errors

#### แก้ไขไม่ได้

- [ ] คอลัมน์มี `editable: true` หรือไม่
- [ ] มี `onUpdateRecord` handler หรือไม่
- [ ] เช็ค validation errors

#### Performance ช้า

- [ ] ใช้ `useMemo` สำหรับ columns
- [ ] ใช้ `useCallback` สำหรับ handlers
- [ ] ลด re-renders ที่ไม่จำเป็น

---

## 📝 Changelog

### [1.0.0] - 2025-08-04

#### 🎉 Initial Release

##### ✨ Added

- **CustomDataGrid Component** - Read-only data grid with export functionality
- **EditableDataGrid Component** - Full CRUD operations data grid
- **DataGridErrorBoundary** - Error handling wrapper component
- **EditablePage** - Example implementation page
- **Comprehensive Documentation** - Complete guides and references

##### 📊 CustomDataGrid Features

- Export to CSV and Excel
- Built-in toolbar with export options
- Responsive design with zebra striping
- Hover effects and professional styling
- Advanced filtering and sorting
- Pagination support

##### ✏️ EditableDataGrid Features

- Inline row editing
- Add new records via toolbar button
- Edit/Save/Cancel/Delete actions
- Data validation support
- Multiple column types (text, number, date, select, boolean)
- Custom validation rules
- Error handling and user feedback

##### 🛠️ Technical Stack

- React 19.x
- Material-UI 7.x
- MUI X DataGrid (latest)
- MUI Icons Material

##### 🔮 Future Roadmap v1.1.0

- [ ] Advanced filtering UI
- [ ] Column resizing and reordering
- [ ] Bulk operations (multi-select edit/delete)
- [ ] Import from CSV/Excel
- [ ] Custom cell editors

---

## 🎯 ตัวอย่างการใช้งานในแอป

### ดูตัวอย่างการใช้งาน

1. **EditableDataGrid**: เข้าไปที่หน้า `/editable` ในแอปพลิเคชัน
2. **CustomDataGrid**: ดูในหน้า `/items` และ `/projects`

### การเข้าถึงแอปพลิเคชัน

```bash
npm start
# แล้วเปิด http://localhost:3000
# หรือ http://localhost:3001 (ถ้า port 3000 ถูกใช้แล้ว)
```

---

## 📞 การสนับสนุนและความช่วยเหลือ

### 🐛 รายงานปัญหา

หากพบปัญหาการใช้งาน กรุณาระบุ:

- Component version
- Browser และ version
- ขั้นตอนการทำซ้ำปัญหา
- ผลลัพธ์ที่คาดหวัง vs ที่เกิดขึ้นจริง
- ตัวอย่างโค้ด (ถ้ามี)

### 🔗 ลิงก์ที่เป็นประโยชน์

- [MUI X DataGrid Documentation](https://mui.com/x/react-data-grid/)
- [Material-UI Documentation](https://mui.com/material-ui/)
- [React Documentation](https://reactjs.org/)

### 💡 การขอ Feature ใหม่

ติดต่อทีมพัฒนาหรือสร้าง issue ใน repository

---

## 📄 License

MIT License - ดูรายละเอียดในไฟล์ LICENSE

---

## 🙏 ขอบคุณ

- Material-UI team สำหรับ component library ที่ยอดเยี่ยม
- MUI X DataGrid team สำหรับ data grid foundation ที่แข็งแรง
- React team สำหรับ framework ที่น่าทึ่ง
- ผู้ร่วมพัฒนาและทดสอบทุกท่าน

---

_🚀 พร้อมเริ่มต้นแล้วหรือยัง? ลองดูตัวอย่างในแอปพลิเคชันหรือ copy template code ข้างต้นไปใช้เลย!_
