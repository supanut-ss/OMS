# BSDataGrid Documentation

## Overview

BSDataGrid เป็น DataGrid component ที่พัฒนาขึ้นจาก MUI X DataGrid Pro เพื่อใช้งานในระบบ BS Platform โดยรองรับ:

- การสร้าง DataGrid อัตโนมัติจาก metadata ของตาราง
- รองรับ properties แบบ BS (Business System) format
- Bulk operations (Add, Edit, Delete)
- Column pinning และ filtering
- Localization (ภาษาไทย/อังกฤษ)
- ComboBox columns
- Required field validation

## Installation

```bash
npm install @mui/x-data-grid-pro
```

## Basic Usage

```jsx
import BSDataGrid from "../components/BSDataGrid";

function MyComponent() {
  return <BSDataGrid bsObj="t_wms_customer" height={600} />;
}
```

## Properties

### BS Properties (ใหม่)

| Property             | Type     | Default   | Description                                 |
| -------------------- | -------- | --------- | ------------------------------------------- |
| `bsLocale`           | string   | "en"      | ภาษาที่ใช้ในการแสดงผล ("en", "th")          |
| `bsPreObj`           | string   | "default" | Schema prefix                               |
| `bsObj`              | string   | -         | ชื่อตารางที่ต้องการแสดง (Required)          |
| `bsSaveObj`          | string   | -         | ชื่อตารางสำหรับการบันทึก (ถ้าต่างจาก bsObj) |
| `bsCols`             | string   | -         | คอลัมน์ที่ต้องการแสดง (comma-separated)     |
| `bsObjBy`            | string   | -         | การเรียงลำดับคอลัมน์ (SQL ORDER BY format)  |
| `bsObjWh`            | string   | -         | เงื่อนไขการกรอง (SQL WHERE format)          |
| `bsBulkEdit`         | boolean  | false     | เปิดใช้งาน bulk edit                        |
| `bsBulkAdd`          | boolean  | false     | เปิดใช้งาน bulk add                         |
| `bsShowDescColumn`   | boolean  | true      | แสดงคอลัมน์ description                     |
| `bsPinColsLeft`      | string   | -         | คอลัมน์ที่ pin ทางซ้าย (comma-separated)    |
| `bsPinColsRight`     | string   | -         | คอลัมน์ที่ pin ทางขวา (comma-separated)     |
| `bsRowPerPage`       | number   | 25        | จำนวนแถวต่อหน้า                             |
| `bsComboBox`         | array    | []        | การกำหนด ComboBox สำหรับคอลัมน์             |
| `onCheckBoxSelected` | function | -         | Callback เมื่อมีการเลือกแถว                 |

### Legacy Properties (เก่า - ยังใช้ได้)

| Property      | Type     | Default | Description            |
| ------------- | -------- | ------- | ---------------------- |
| `tableName`   | string   | -       | ชื่อตาราง (รูปแบบเก่า) |
| `onEdit`      | function | -       | Callback สำหรับ edit   |
| `onDelete`    | function | -       | Callback สำหรับ delete |
| `onAdd`       | function | -       | Callback สำหรับ add    |
| `onView`      | function | -       | Callback สำหรับ view   |
| `readOnly`    | boolean  | false   | โหมดอ่านอย่างเดียว     |
| `showToolbar` | boolean  | true    | แสดง toolbar           |
| `showAdd`     | boolean  | true    | แสดงปุ่ม Add           |
| `height`      | number   | 600     | ความสูงของ DataGrid    |
| `autoLoad`    | boolean  | true    | โหลดข้อมูลอัตโนมัติ    |

## ComboBox Configuration

```jsx
const comboBoxConfig = [
  {
    Column: "status", // ชื่อคอลัมน์
    Display: "name", // field สำหรับแสดงผล
    Value: "id", // field สำหรับค่า
    Default: "--- Select ---", // ข้อความเริ่มต้น
    PreObj: "default", // schema prefix
    Obj: "t_wms_status", // ตารางข้อมูล
    ObjWh: "active=1", // เงื่อนไขการกรอง
    ObjBy: "name asc", // การเรียงลำดับ
    valueOptions: [
      // ตัวเลือก (ถ้าไม่ต้องการ fetch จาก API)
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

<BSDataGrid bsObj="t_wms_customer" bsComboBox={comboBoxConfig} />;
```

## Advanced Examples

### 1. Full Configuration

```jsx
<BSDataGrid
  bsLocale="th"
  bsPreObj="default"
  bsObj="t_wms_customer"
  bsCols="id,name,email,phone,status"
  bsObjBy="name asc, created_date desc"
  bsObjWh="status='active'"
  bsPinColsLeft="id,name"
  bsPinColsRight="actions"
  bsRowPerPage={20}
  bsBulkEdit={true}
  bsBulkAdd={true}
  bsComboBox={comboBoxConfig}
  onCheckBoxSelected={(rows) => console.log("Selected:", rows)}
  onEdit={(row) => console.log("Edit:", row)}
  onDelete={(id) => console.log("Delete:", id)}
  onAdd={() => console.log("Add new")}
  height={600}
/>
```

### 2. Read-Only Mode

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  readOnly={true}
  showAdd={false}
  bsCols="name,email,phone"
  height={400}
/>
```

### 3. Bulk Operations

```jsx
function BulkExample() {
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <BSDataGrid
      bsObj="t_wms_customer"
      bsBulkEdit={true}
      bsBulkAdd={true}
      onCheckBoxSelected={setSelectedRows}
      height={500}
    />
  );
}
```

## Localization

BSDataGrid รองรับการแสดงผลเป็นภาษาไทยและอังกฤษ:

```jsx
// ภาษาไทย
<BSDataGrid bsLocale="th" bsObj="t_wms_customer" />

// ภาษาอังกฤษ (default)
<BSDataGrid bsLocale="en" bsObj="t_wms_customer" />
```

## Required Fields

คอลัมน์ที่กำหนดเป็น NOT NULL จะแสดงด้วยสีแดงในหัวคอลัมน์

## Column Pinning

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsPinColsLeft="id,name" // Pin ทางซ้าย
  bsPinColsRight="actions" // Pin ทางขวา
/>
```

## Filtering and Sorting

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsObjWh="status='active' AND created_date >= '2024-01-01'" // WHERE condition
  bsObjBy="name asc, created_date desc" // ORDER BY
/>
```

## API Integration

BSDataGrid ใช้ `useDynamicCrud` hook ในการติดต่อกับ API:

```javascript
// API Request format
{
  tableName: "t_wms_customer",
  page: 1,
  pageSize: 25,
  sortModel: [{ field: "name", sort: "asc" }],
  filterModel: { items: [...] },
  preObj: "default",
  columns: "id,name,email",
  customWhere: "status='active'",
  customOrderBy: "name asc"
}
```

## Event Handlers

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  onCheckBoxSelected={(selectedRows) => {
    console.log("Selected rows:", selectedRows);
  }}
  onEdit={(row) => {
    console.log("Edit row:", row);
  }}
  onDelete={(id) => {
    console.log("Delete row with id:", id);
  }}
  onAdd={() => {
    console.log("Add new row");
  }}
/>
```

## Error Handling

BSDataGrid จัดการ error states อัตโนมัติ:

- Loading state: แสดง CircularProgress
- Error state: แสดง Alert พร้อมปุ่ม Retry
- No data: แสดงข้อความไม่มีข้อมูล
- Offline mode: แสดงโหมดออฟไลน์พร้อม fallback toolbar

## MUI X DataGrid Pro Features

BSDataGrid รองรับ features จาก MUI X DataGrid Pro:

- Column pinning
- Header filters
- Server-side pagination
- Server-side sorting
- Server-side filtering
- Row selection
- Column reordering
- Column resizing
- Export functionality

## Migration from DynamicDataGrid

เปลี่ยนจาก:

```jsx
<DynamicDataGrid tableName="dbo.Users" />
```

เป็น:

```jsx
<BSDataGrid bsObj="Users" />
// หรือ
<BSDataGrid tableName="dbo.Users" />  // ยังใช้ได้
```

## Browser Support

รองรับเบราว์เซอร์สมัยใหม่ที่รองรับ ES6+ และ React 18+

## License

MIT License - ใช้ร่วมกับ MUI X DataGrid Pro (ต้องมี license)
