# BSDataGrid Documentation

## Overview

BSDataGrid เป็น DataGrid component ที่พัฒนาขึ้นจาก MUI X DataGrid Pro เพื่อใช้งานในระบบ BS Platform โดยรองรับ:

- การสร้าง DataGrid อัตโนมัติจาก metadata ของตาราง
- รองรับ properties แบบ BS (Business System) format
- รองรับ Enhanced Stored Procedures
- Bulk operations (Add, Edit, Delete) ผ่าน API endpoints เฉพาะ
- Column pinning และ filtering
- Localization (ภาษาไทย/อังกฤษ)
- ComboBox columns พร้อม BS Platform integration
- Required field validation
- Custom Column Definitions
- Hierarchical Data (Master-Detail)
- File Attachments
- Custom Filtering

## Installation

```bash
npm install @mui/x-data-grid-pro
```

## Basic Usage

```jsx
import BSDataGrid from "../components/BSDataGrid";

// แบบ Table (Metadata mode)
function TableMode() {
  return <BSDataGrid bsObj="t_wms_customer" height={600} />;
}

// แบบ Enhanced Stored Procedure
function StoredProcedureMode() {
  return (
    <BSDataGrid
      bsStoredProcedure="usp_tmt_my_task"
      bsStoredProcedureSchema="tmt"
      bsStoredProcedureParams={{ TaskStatus: "Open" }}
      bsKeyId="project_task_id"
    />
  );
}
```

## Properties

### Core Properties

| Property    | Type          | Default   | Description                                             |
| ----------- | ------------- | --------- | ------------------------------------------------------- |
| `bsLocale`  | string        | "en"      | ภาษาที่ใช้ในการแสดงผล ("en", "th")                      |
| `bsPreObj`  | string        | "default" | Schema prefix                                           |
| `bsObj`     | string        | -         | ชื่อตารางที่ต้องการแสดง (Required)                      |
| `bsSaveObj` | string        | -         | ชื่อตารางสำหรับการบันทึก (ถ้าต่างจาก bsObj)             |
| `bsCols`    | string        | -         | คอลัมน์ที่ต้องการแสดง (comma-separated)                 |
| `bsObjBy`   | string        | -         | การเรียงลำดับคอลัมน์ (SQL ORDER BY format)              |
| `bsObjWh`   | string        | -         | เงื่อนไขการกรอง (SQL WHERE format)                      |
| `bsKeyId`   | string        | -         | กำหนด Primary Key field name (จำเป็นสำหรับ Enhanced SP) |
| `height`    | number/string | "auto"    | ความสูงของ DataGrid                                     |
| `autoLoad`  | boolean       | true      | โหลดข้อมูลอัตโนมัติ                                     |
| `readOnly`  | boolean       | false     | โหมดอ่านอย่างเดียว                                      |

### Enhanced Stored Procedure Properties

| Property                  | Type   | Default | Description                                          |
| ------------------------- | ------ | ------- | ---------------------------------------------------- |
| `bsStoredProcedure`       | string | -       | ชื่อ Stored Procedure (เช่น "usp_tmt_my_task")       |
| `bsStoredProcedureSchema` | string | "dbo"   | Schema ของ SP (เช่น "tmt", "dbo")                    |
| `bsStoredProcedureParams` | object | {}      | Parameters ที่ส่งไป SP (เช่น { TaskStatus: "Open" }) |

### Display Properties

| Property               | Type    | Default               | Description                     |
| ---------------------- | ------- | --------------------- | ------------------------------- |
| `bsShowRowNumber`      | boolean | true                  | แสดงคอลัมน์ลำดับแถว             |
| `bsShowDescColumn`     | boolean | true                  | แสดงคอลัมน์ description         |
| `bsShowCheckbox`       | boolean | false                 | แสดง checkbox สำหรับเลือกแถว    |
| `bsShowCharacterCount` | boolean | false                 | แสดงจำนวนตัวอักษรใน text fields |
| `bsRowPerPage`         | number  | 25                    | จำนวนแถวต่อหน้า                 |
| `bsPageSizeOptions`    | array   | [20,100,200,500,1000] | ตัวเลือกจำนวนแถวต่อหน้า         |
| `showToolbar`          | boolean | true                  | แสดง toolbar                    |
| `showAdd`              | boolean | true                  | แสดงปุ่ม Add                    |

### Action Button Visibility

| Property          | Type    | Default | Description                       |
| ----------------- | ------- | ------- | --------------------------------- |
| `bsVisibleView`   | boolean | false   | แสดงปุ่ม View ในคอลัมน์ actions   |
| `bsVisibleEdit`   | boolean | true    | แสดงปุ่ม Edit ในคอลัมน์ actions   |
| `bsVisibleDelete` | boolean | true    | แสดงปุ่ม Delete ในคอลัมน์ actions |

### Bulk Operations

| Property                | Type    | Default | Description                              |
| ----------------------- | ------- | ------- | ---------------------------------------- |
| `bsBulkEdit`            | boolean | false   | เปิดใช้งาน bulk edit                     |
| `bsBulkAdd`             | boolean | false   | เปิดใช้งาน bulk add                      |
| `bsBulkDelete`          | boolean | false   | เปิดใช้งาน bulk delete                   |
| `bsBulkAddInline`       | boolean | false   | เพิ่มแถวใน grid แทน dialog               |
| `bsEnableBulkMode`      | boolean | false   | เปิดโหมด bulk edit เมื่อเลือกแถว         |
| `bsShowBulkSplitButton` | boolean | false   | แสดง split button สำหรับ bulk operations |

### Column Configuration

| Property          | Type   | Default | Description                                      |
| ----------------- | ------ | ------- | ------------------------------------------------ |
| `bsPinColsLeft`   | string | -       | คอลัมน์ที่ pin ทางซ้าย (comma-separated)         |
| `bsPinColsRight`  | string | -       | คอลัมน์ที่ pin ทางขวา (comma-separated)          |
| `bsColumnDefs`    | array  | []      | Custom column definitions (ดูรายละเอียดด้านล่าง) |
| `bsHiddenColumns` | array  | []      | คอลัมน์ที่ซ่อนจาก grid และ form                  |

### Dialog Configuration

| Property              | Type   | Default   | Description                                             |
| --------------------- | ------ | --------- | ------------------------------------------------------- |
| `bsDialogSize`        | string | "Default" | ขนาด dialog ("Small", "Default", "Large", "FullScreen") |
| `bsDialogColumns`     | number | 4         | จำนวน columns ต่อแถวใน form (1,2,3,4,6,12)              |
| `bsDialogTab`         | array  | -         | Tab configuration สำหรับ form                           |
| `bsParentRecordLabel` | string | -         | Label สำหรับ accordion ของ parent record                |

### Filtering

| Property          | Type   | Default  | Description                         |
| ----------------- | ------ | -------- | ----------------------------------- |
| `bsFilterMode`    | string | "server" | โหมดการ filter ("server", "client") |
| `bsCustomFilters` | array  | []       | Custom filters จาก BSFilterCustom   |

### Hierarchical Data (Master-Detail)

| Property              | Type   | Default | Description                    |
| --------------------- | ------ | ------- | ------------------------------ |
| `bsChildGrids`        | array  | []      | Child grid configurations      |
| `bsPrimaryKeys`       | array  | []      | Primary key columns ของ parent |
| `bsDefaultFormValues` | object | {}      | ค่า default สำหรับ form fields |

### Export

| Property           | Type   | Default | Description                     |
| ------------------ | ------ | ------- | ------------------------------- |
| `bsExportFileName` | string | -       | ชื่อไฟล์ export (ไม่รวมนามสกุล) |

### Validation

| Property         | Type  | Default | Description                    |
| ---------------- | ----- | ------- | ------------------------------ |
| `bsUniqueFields` | array | []      | Fields ที่ต้อง validate unique |

### Lookup

| Property       | Type   | Default | Description                            |
| -------------- | ------ | ------- | -------------------------------------- |
| `bsUserLookup` | object | -       | Configuration สำหรับ user lookup field |
| `bsComboBox`   | array  | []      | ComboBox configurations                |

### Event Callbacks

| Property               | Type     | Description                                  |
| ---------------------- | -------- | -------------------------------------------- |
| `onEdit`               | function | Callback เมื่อคลิก Edit (row) => void        |
| `onDelete`             | function | Callback เมื่อคลิก Delete (id) => void       |
| `onAdd`                | function | Callback เมื่อคลิก Add () => void            |
| `onView`               | function | Callback เมื่อคลิก View (row) => void        |
| `onCheckBoxSelected`   | function | Callback เมื่อเลือก checkbox (rows) => void  |
| `onDataBind`           | function | Callback เมื่อโหลดข้อมูล (data) => void      |
| `onDataLoaded`         | function | Callback เมื่อโหลดข้อมูลเสร็จ (data) => void |
| `onFilteredDataChange` | function | Callback เมื่อข้อมูลที่ filter เปลี่ยน       |

### Row Configuration

| Property      | Type     | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `bsRowConfig` | function | Function ที่ return config per row (row) => config |

**bsRowConfig Example:**

```jsx
bsRowConfig={(row) => ({
  showView: row.status !== 'deleted',
  showEdit: row.is_editable === true,
  showDelete: row.status !== 'active',
  disabled: row.is_locked === true,
})}
```

---

## bsColumnDefs Configuration

Custom column definitions สำหรับ override หรือเพิ่มเติม metadata:

### Basic Properties

| Property      | Type    | Description                          |
| ------------- | ------- | ------------------------------------ |
| `field`       | string  | ชื่อ column (required)               |
| `headerName`  | string  | ชื่อที่แสดงใน header                 |
| `width`       | number  | ความกว้าง (pixels)                   |
| `type`        | string  | ประเภท column (ดูด้านล่าง)           |
| `editable`    | boolean | อนุญาตให้แก้ไข inline                |
| `readOnly`    | boolean | ห้ามแก้ไขใน form                     |
| `required`    | boolean | บังคับกรอก                           |
| `description` | string  | Tooltip text                         |
| `tooltip`     | string  | Tooltip text (alias ของ description) |
| `align`       | string  | "left" / "center" / "right"          |
| `headerAlign` | string  | "left" / "center" / "right"          |
| `sortable`    | boolean | อนุญาตให้ sort                       |
| `filterable`  | boolean | อนุญาตให้ filter                     |
| `hideable`    | boolean | อนุญาตให้ซ่อน column                 |
| `hide`        | boolean | ซ่อน column เริ่มต้น                 |

### Column Types

| Type           | Description                                 |
| -------------- | ------------------------------------------- |
| `string`       | ข้อความทั่วไป                               |
| `number`       | ตัวเลข                                      |
| `boolean`      | Yes/No                                      |
| `date`         | วันที่                                      |
| `dateTime`     | วันที่และเวลา                               |
| `currency`     | สกุลเงิน                                    |
| `singleSelect` | Dropdown เลือกค่าเดียว                      |
| `stringAvatar` | แสดง Avatar จากชื่อ (comma-separated names) |
| `attachFile`   | แสดงไอคอนไฟล์แนบ                            |

### Number/Currency Properties

```jsx
{
  field: "salary",
  type: "currency",
  currencySymbol: "฿",      // Default: "$"
  decimals: 2,               // Default: 2
  thousandSeparator: true,   // Default: true
  min: 0,                    // Minimum value
  max: 1000000               // Maximum value
}
```

### Date/DateTime Properties

```jsx
{
  field: "created_date",
  type: "date",
  dateFormat: "dd/MM/yyyy",           // Default: "dd/MM/yyyy"
  dateTimeFormat: "dd/MM/yyyy HH:mm", // สำหรับ dateTime
  timeFormat: "HH:mm",                // สำหรับ time
  minDate: new Date('2024-01-01'),
  maxDate: new Date('2025-12-31')
}
```

### Boolean Properties

```jsx
{
  field: "is_active",
  type: "boolean",
  trueLabel: "Active",       // Default: "Yes"
  falseLabel: "Inactive",    // Default: "No"
  trueColor: "success",      // "success" | "info" | "warning" | "error"
  falseColor: "error"
}
```

### StringAvatar Type

แสดง Avatar จากรายชื่อที่คั่นด้วย comma:

```jsx
{
  field: "assignee_list",
  type: "stringAvatar",
  headerName: "Assignees",
  maxAvatars: 4,           // จำนวน avatar สูงสุดก่อนแสดง +X
  avatarSize: 32,          // ขนาด avatar (pixels)
  showTooltip: true        // แสดง tooltip ชื่อ
}
// Data: "John Doe,Jane Smith,Bob Johnson" → แสดง 3 avatars
```

### AttachFile Type

แสดงไอคอนไฟล์แนบ พร้อม dialog จัดการไฟล์:

```jsx
{
  field: "attachments",
  type: "attachFile",
  headerName: "Files",
  width: 80,
  attachConfig: {
    preObj: "tmt",
    attachTable: "t_tmt_project_attach_file",  // Required
    foreignKey: "project_id",                   // Required
    fileNameColumn: "file_name",                // Default
    pathColumn: "path_file",                    // Default
    primaryKey: "id",                           // Default
    uploadEndpoint: "/api/files/upload",
    downloadEndpoint: "/api/files/download",
    allowedTypes: ["image/*", ".pdf", ".docx"],
    maxFileSize: 10 * 1024 * 1024,              // 10MB
    maxFiles: 10
  }
}
```

### Custom Rendering

```jsx
{
  field: "priority",
  renderCell: (params) => (
    <Chip
      label={params.value}
      color={params.value === 'High' ? 'error' : 'default'}
    />
  ),
  valueGetter: (params) => params.row.priority_name,
  valueFormatter: (params) => `Priority: ${params.value}`,
  valueSetter: (params) => ({ ...params.row, priority: params.value })
}
```

---

## bsKeyId Configuration

**สำคัญสำหรับ Enhanced Stored Procedures:**

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tmt_my_task"
  bsStoredProcedureSchema="tmt"
  bsKeyId="project_task_id" // ระบุ Primary Key
/>
```

**Primary Key Resolution Priority:**

1. `bsKeyId` (manual) - **HIGHEST PRIORITY**
2. `metadata.primaryKeys[0]` (from API)
3. Auto-detect (pattern: `*_id` > `*Id` > `*ID` > `id`)
4. Fallback: `"Id"`

---

## bsFilterMode Configuration

### Server-side Filtering (Default)

```jsx
<BSDataGrid
  bsObj="t_customers"
  bsFilterMode="server" // Filters ส่งไป API
/>
```

### Client-side Filtering

```jsx
<BSDataGrid
  bsObj="t_customers"
  bsFilterMode="client" // Filter ใน browser
/>
```

**เลือกใช้:**

- `server`: Dataset ใหญ่ (>1000 rows)
- `client`: Dataset เล็ก, ต้องการ filter ทันที

---

## bsDialogTab Configuration

จัดกลุ่ม form fields เป็น tabs:

```jsx
bsDialogTab={[
  { Column: "name,email,phone", name: "General Info" },
  { Column: "address,city,country", name: "Address" },
  { Column: "notes,description", name: "Additional" }
]}
```

หรือแบบ nested:

```jsx
bsDialogTab={[
  {
    Tabs: [
      { Tab: { Column: "name,email,phone", name: "General Info" } },
      { Tab: { Column: "address,city,country", name: "Address" } }
    ]
  }
]}
```

---

## bsChildGrids Configuration (Hierarchical Data)

Master-Detail relationship ใน dialog เดียว:

```jsx
<BSDataGrid
  bsPreObj="tmt"
  bsObj="t_tmt_iso_type"
  bsPrimaryKeys={["iso_type_id"]}
  bsChildGrids={[
    {
      name: "Documents", // Required: Tab name
      bsPreObj: "tmt",
      bsObj: "t_tmt_iso_type_doc",
      foreignKeys: ["iso_type_id"], // Required: FK columns
      bsObjBy: "create_date desc",
      bsVisibleEdit: true,
      bsVisibleDelete: true,
      height: 350,
    },
    {
      name: "Phases",
      bsPreObj: "tmt",
      bsObj: "t_tmt_iso_type_phase",
      foreignKeys: ["iso_type_id"],
      bsObjBy: "phase_order asc",
    },
  ]}
  bsDialogSize="Large"
/>
```

**หมายเหตุ:** Child grids ซ่อนใน Add mode จนกว่า parent record จะถูกบันทึก

---

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

---

## Enhanced Stored Procedure Usage

BSDataGrid รองรับการทำงานกับ Enhanced Stored Procedures:

### Basic SP Usage

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tmt_my_task"
  bsStoredProcedureSchema="tmt"
  bsKeyId="project_task_id"
  bsCols="project_no,project_name,task_name,start_date,end_date"
/>
```

### SP with Parameters

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tmt_project_task_tracking"
  bsStoredProcedureSchema="tmt"
  bsStoredProcedureParams={{
    ProjectTaskId: taskId,
    UserId: currentUser.id,
  }}
  bsKeyId="tracking_id"
/>
```

### SP with Custom Column Rendering

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tmt_my_task"
  bsStoredProcedureSchema="tmt"
  bsKeyId="project_task_id"
  bsCols="project_no,project_name,assignee_list,priority,start_date,end_date"
  bsColumnDefs={[
    {
      field: "assignee_list",
      type: "stringAvatar",
      headerName: "Assignee",
      showTooltip: true,
    },
    {
      field: "start_date",
      headerName: "Start Date",
      renderCell: (params) => {
        if (!params.value) return "";
        const date = new Date(params.value);
        return date.toLocaleDateString("th-TH");
      },
    },
    {
      field: "priority",
      headerName: "Priority",
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "Urgent" ? "error" : "default"}
        />
      ),
    },
  ]}
/>
```

### SP Date Formatting Tips

เมื่อต้องการแสดงเฉพาะวันที่ (ไม่แสดงเวลา) สำหรับ column ที่เป็น datetime:

```jsx
// ใช้ renderCell เพื่อ format เอง
bsColumnDefs={[
  {
    field: "start_date",
    headerName: "Start Date",
    renderCell: (params) => {
      if (!params.value) return "";
      const date = new Date(params.value);
      if (isNaN(date.getTime())) return params.value;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    },
  },
]}
```

---

## Complete Examples

### Example 1: Task Management Grid

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tmt_my_task"
  bsStoredProcedureSchema="tmt"
  bsStoredProcedureParams={{ TaskStatus: "Open" }}
  bsKeyId="project_task_id"
  bsCols="project_no,project_name,task_name,assignee_list,start_date,end_date,priority"
  bsShowRowNumber={true}
  bsVisibleView={true}
  bsVisibleEdit={false}
  bsVisibleDelete={false}
  showAdd={false}
  bsFilterMode="client"
  onView={(row) => handleViewTask(row)}
  bsColumnDefs={[
    { field: "assignee_list", type: "stringAvatar", headerName: "Assignee" },
    {
      field: "priority",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FlagIcon sx={{ color: getPriorityColor(params.value) }} />
          <span>{params.value || "-"}</span>
        </Box>
      ),
    },
  ]}
/>
```

### Example 2: Master-Detail with Child Grids

```jsx
<BSDataGrid
  bsPreObj="tmt"
  bsObj="t_tmt_project"
  bsPrimaryKeys={["project_id"]}
  bsDialogSize="Large"
  bsChildGrids={[
    {
      name: "Tasks",
      bsPreObj: "tmt",
      bsObj: "t_tmt_project_task",
      foreignKeys: ["project_id"],
      bsObjBy: "task_order asc",
      bsVisibleEdit: true,
      bsVisibleDelete: true,
    },
    {
      name: "Team Members",
      bsPreObj: "tmt",
      bsObj: "t_tmt_project_team",
      foreignKeys: ["project_id"],
      bsComboBox={[
        {
          Column: "user_id",
          Display: "fullname",
          Value: "user_id",
          PreObj: "sec",
          Obj: "t_com_user",
        }
      ]}
    },
  ]}
/>
```

### Example 3: Custom Filters Integration

```jsx
const [filterValues, setFilterValues] = useState([]);

<BSFilterCustom
  bsFilterField={[
    { field: "status", headerName: "Status", type: "string" },
    { field: "priority", headerName: "Priority", type: "string" },
    { field: "created_date", headerName: "Created", type: "date" },
  ]}
  bsFilterValue={filterValues}
  bsFilterValueOnChanage={setFilterValues}
  bsSearch={true}
  bsClear={true}
/>

<BSDataGrid
  bsObj="t_wms_customer"
  bsCustomFilters={filterValues}
  bsFilterMode="client"
/>
```

---
