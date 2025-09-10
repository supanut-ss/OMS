# BSDataGrid Documentation

## Overview

BSDataGrid เป็น DataGrid component ที่พัฒนาขึ้นจาก MUI X DataGrid Pro เพื่อใช้งานในระบบ BS Platform โดยรองรับ:

- การสร้าง DataGrid อัตโนมัติจาก metadata ของตาราง
- รองรับ properties แบบ BS (Business System) format
- Bulk operations (Add, Edit, Delete) ผ่าน API endpoints เฉพาะ
- Column pinning และ filtering
- Localization (ภาษาไทย/อังกฤษ)
- ComboBox columns พร้อม BS Platform integration
- Required field validation
- **ใหม่**: รองรับ BS Platform API endpoints ที่เพิ่มขึ้น

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

  const handleBulkAdd = async (newData) => {
    // BSDataGrid จะเรียก POST /api/dynamic/bulk-create
    console.log("Bulk add:", newData);
  };

  const handleBulkEdit = async (selectedRows, updates) => {
    // BSDataGrid จะเรียก PUT /api/dynamic/bulk-update
    console.log("Bulk edit:", selectedRows, updates);
  };

  const handleBulkDelete = async (selectedRows) => {
    // BSDataGrid จะเรียก DELETE /api/dynamic/bulk-delete
    console.log("Bulk delete:", selectedRows);
  };

  return (
    <BSDataGrid
      bsObj="t_wms_customer"
      bsBulkEdit={true}
      bsBulkAdd={true}
      onCheckBoxSelected={setSelectedRows}
      onBulkAdd={handleBulkAdd}
      onBulkEdit={handleBulkEdit}
      onBulkDelete={handleBulkDelete}
      height={500}
    />
  );
}
```

### 4. ComboBox with API Integration

```jsx
const comboBoxConfig = [
  {
    Column: "status",
    Display: "name",
    Value: "id",
    Default: "--- Select Status ---",
    PreObj: "default",
    Obj: "t_wms_status", // จะเรียก POST /api/dynamic/combobox
    ObjWh: "active=1",
    ObjBy: "name asc",
  },
];

<BSDataGrid bsObj="t_wms_customer" bsComboBox={comboBoxConfig} />;
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

BSDataGrid ใช้ `useDynamicCrud` hook ในการติดต่อกับ API และจะเลือกใช้ endpoint ที่เหมาะสมอัตโนมัติ:

### Auto-Endpoint Selection

```javascript
// ถ้ามี BS properties จะใช้ BS endpoint
const endpoint =
  request.preObj ||
  request.columns ||
  request.customWhere ||
  request.customOrderBy
    ? "/dynamic/bs-datagrid" // BS Platform optimized
    : "/dynamic/datagrid"; // Standard DataGrid
```

### API Endpoints

#### 1. Standard DataGrid (Legacy)

```
POST /api/dynamic/datagrid
```

#### 2. BS Platform DataGrid (ใหม่)

```
POST /api/dynamic/bs-datagrid
```

ปรับปรุงสำหรับ BS Platform properties:

- รองรับ `preObj`, `columns`, `customWhere`, `customOrderBy`
- Auto-mapping pagination (page/pageSize)
- Parse column list และ ORDER BY
- Inject custom WHERE conditions

#### 3. Bulk Operations (ใหม่)

```
POST /api/dynamic/bulk-create     # Bulk add
PUT  /api/dynamic/bulk-update     # Bulk edit
DELETE /api/dynamic/bulk-delete   # Bulk delete
```

#### 4. ComboBox Data (ใหม่)

```
POST /api/dynamic/combobox        # ComboBox options
```

### API Request Format

**BS DataGrid Request:**

```javascript
{
  tableName: "t_wms_customer",
  schemaName: "dbo",
  page: 1,                        // 1-based pagination
  pageSize: 25,
  sortModel: [{ field: "name", sort: "asc" }],
  filterModel: { items: [...] },
  // BS Platform specific
  preObj: "default",              // Schema prefix
  columns: "id,name,email",       // Selected columns
  customWhere: "status='active'", // Custom WHERE
  customOrderBy: "name asc"       // Custom ORDER BY
}
```

**Bulk Operations:**

```javascript
// Bulk Create
{
  tableName: "t_wms_customer",
  schemaName: "dbo",
  dataItems: [
    { name: "John", email: "john@example.com" },
    { name: "Jane", email: "jane@example.com" }
  ]
}

// Bulk Update
{
  tableName: "t_wms_customer",
  updateItems: [
    {
      data: { name: "John Updated" },
      whereConditions: { id: "123" }
    }
  ]
}

// Bulk Delete
{
  tableName: "t_wms_customer",
  whereConditions: [
    { id: "123" },
    { id: "456" }
  ]
}
```

**ComboBox Request:**

```javascript
{
  tableName: "t_wms_status",
  preObj: "default",
  valueField: "id",
  displayField: "name",
  customWhere: "active=1",
  customOrderBy: "name asc",
  defaultOption: "--- Select Status ---",
  maxItems: 1000
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

### เปลี่ยนจาก Legacy เป็น BS Platform:

```jsx
// เก่า (Legacy) - ยังใช้ได้
<DynamicDataGrid tableName="dbo.Users" />

// ใหม่ (BS Platform) - แนะนำ
<BSDataGrid bsObj="Users" bsPreObj="default" />

// แบบผสม (Backward Compatible)
<BSDataGrid tableName="dbo.Users" />  // จะใช้ standard endpoint
```

### ประโยชน์ของ BS Platform Mode:

✅ **Auto-optimized endpoints** - เลือก API endpoint ที่เหมาะสม  
✅ **BS Properties support** - preObj, customWhere, customOrderBy  
✅ **Bulk operations** - Bulk add/edit/delete ผ่าน dedicated endpoints  
✅ **ComboBox integration** - Load options จาก BS tables  
✅ **Better performance** - Optimized for BS Platform architecture

## Performance Tips

### 1. ใช้ Column Selection

```jsx
// กำหนดเฉพาะคอลัมน์ที่ต้องการเพื่อลด network traffic
<BSDataGrid
  bsObj="t_wms_customer"
  bsCols="id,name,email,status" // เลือกเฉพาะที่ต้องการ
/>
```

### 2. ใช้ Custom WHERE

```jsx
// กรองข้อมูลที่ server เพื่อลดข้อมูลที่ต้อง transfer
<BSDataGrid
  bsObj="t_wms_customer"
  bsObjWh="status='active' AND created_date >= '2024-01-01'"
/>
```

### 3. ปรับ Page Size

```jsx
// ปรับ page size ให้เหมาะสมกับการใช้งาน
<BSDataGrid
  bsObj="t_wms_customer"
  bsRowPerPage={50} // เพิ่มถ้าต้องการดูข้อมูลเยอะ
/>
```

## Browser Support

รองรับเบราว์เซอร์สมัยใหม่ที่รองรับ ES6+ และ React 18+

## License

MIT License - ใช้ร่วมกับ MUI X DataGrid Pro (ต้องมี license)
