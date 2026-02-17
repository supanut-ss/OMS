# BSDataGrid Documentation

**Version:** 1.4.0  
**Last Updated:** February 17, 2026

BSDataGrid เป็น React component ที่สร้างขึ้นบน MUI X DataGrid Pro โดยเพิ่มความสามารถในการทำงานกับ metadata ของตารางอัตโนมัติ รองรับ CRUD operations, Bulk Mode, Stored Procedures และ features มากมาย

---

## 📚 Table of Contents

1. [Basic Usage](#basic-usage)
2. [Props Reference](#props-reference)
3. [Bulk Mode Configuration](#bulk-mode-configuration)
4. [Column Definitions (bsColumnDefs)](#column-definitions-bscolumndefs)
5. [ComboBox Configuration](#combobox-configuration)
6. [Hierarchy ComboBox (ParentColumn)](#hierarchy-combobox-parentcolumn)
7. [Unique Field Validation](#unique-field-validation)
8. [Dialog Configuration](#dialog-configuration)
9. [Hierarchical Data (Parent-Child)](#hierarchical-data-parent-child)
10. [Stored Procedure Support](#stored-procedure-support)
11. [Permission Configuration](#permission-configuration)
12. [Callbacks & Events](#callbacks--events)
13. [Examples](#examples)

---

## Basic Usage

```jsx
import BSDataGrid from "../../components/BSDataGrid";

// การใช้งานพื้นฐาน
<BSDataGrid
  bsObj="t_wms_customer"
/>

// การใช้งานแบบเต็ม
<BSDataGrid
  bsLocale="th"
  bsPreObj="tmt"
  bsObj="t_tmt_holiday"
  bsCols="holiday_id, holiday_date, description"
  bsObjBy="holiday_date desc"
  bsObjWh="is_active='YES'"
/>
```

---

## Props Reference

### Core Props

| Prop        | Type   | Default     | Description                                      |
| ----------- | ------ | ----------- | ------------------------------------------------ |
| `bsObj`     | string | -           | **Required.** ชื่อ Table/View ที่ต้องการแสดง     |
| `bsPreObj`  | string | `"default"` | Schema prefix (เช่น "tmt", "sec")                |
| `bsSaveObj` | string | -           | Table สำหรับ save (ถ้าต่างจาก bsObj)             |
| `bsCols`    | string | -           | Columns ที่ต้องการแสดง (comma-separated)         |
| `bsObjBy`   | string | -           | ORDER BY clause (เช่น "name asc")                |
| `bsObjWh`   | string | -           | WHERE clause เพิ่มเติม                           |
| `bsLocale`  | string | `"en"`      | Locale สำหรับ i18n ("en", "th")                  |
| `bsKeyId`   | string | -           | ระบุ Primary Key field (ใช้เมื่อ metadata ไม่มี) |

### Display Props

| Prop                   | Type          | Default  | Description                                |
| ---------------------- | ------------- | -------- | ------------------------------------------ |
| `bsShowRowNumber`      | boolean       | `true`   | แสดง row number column                     |
| `bsShowDescColumn`     | boolean       | `true`   | แสดง description column                    |
| `bsShowCharacterCount` | boolean       | `false`  | แสดงจำนวน characters ใน form fields        |
| `bsPinColsLeft`        | string        | -        | Columns ที่ pin ด้านซ้าย (comma-separated) |
| `bsPinColsRight`       | string        | -        | Columns ที่ pin ด้านขวา (comma-separated)  |
| `bsHiddenColumns`      | string[]      | `[]`     | Columns ที่ซ่อนจาก grid และ form           |
| `height`               | string/number | `"auto"` | ความสูงของ grid                            |

### Action Button Props

| Prop              | Type    | Default | Description     |
| ----------------- | ------- | ------- | --------------- |
| `bsVisibleView`   | boolean | `false` | แสดงปุ่ม View   |
| `bsVisibleEdit`   | boolean | `true`  | แสดงปุ่ม Edit   |
| `bsVisibleDelete` | boolean | `true`  | แสดงปุ่ม Delete |
| `showAdd`         | boolean | `true`  | แสดงปุ่ม Add    |
| `showToolbar`     | boolean | `true`  | แสดง toolbar    |
| `readOnly`        | boolean | `false` | Read-only mode  |

### Pagination Props

| Prop                | Type     | Default                     | Description        |
| ------------------- | -------- | --------------------------- | ------------------ |
| `bsRowPerPage`      | number   | `20`                        | จำนวน rows ต่อหน้า |
| `bsPageSizeOptions` | number[] | `[20, 100, 200, 500, 1000]` | ตัวเลือก page size |

### Filter Props

| Prop              | Type   | Default    | Description                                 |
| ----------------- | ------ | ---------- | ------------------------------------------- |
| `bsFilterMode`    | string | `"server"` | Filter mode: "server" หรือ "client"         |
| `bsCustomFilters` | array  | `[]`       | Custom filters จาก BSFilterCustom component |

---

## Bulk Mode Configuration

### วิธีใหม่ (Recommended) - ใช้ bsBulkMode object

```jsx
<BSDataGrid
  bsObj="t_tmt_holiday"
  bsBulkMode={{
    enable: true, // เปิดใช้งาน bulk mode ทั้งหมด
    addInline: true, // เพิ่ม row ใหม่แบบ inline (ไม่ต้องเปิด dialog)
    edit: true, // เปิดใช้ bulk edit
    delete: true, // เปิดใช้ bulk delete
    add: true, // เปิดใช้ bulk add
    showCheckbox: true, // แสดง checkbox selection
    showSplitButton: false, // แสดง split button สำหรับ bulk actions
  }}
/>
```

### วิธีเก่า (Legacy - ยังใช้ได้)

```jsx
<BSDataGrid
  bsObj="t_tmt_holiday"
  bsBulkEdit={true}
  bsBulkAdd={true}
  bsBulkDelete={true}
  bsBulkAddInline={true}
  bsEnableBulkMode={true}
  bsShowCheckbox={true}
  bsShowBulkSplitButton={false}
/>
```

### Bulk Mode Props

| Prop                         | Type    | Default | Description                        |
| ---------------------------- | ------- | ------- | ---------------------------------- |
| `bsBulkMode`                 | object  | `null`  | Consolidated bulk mode settings    |
| `bsBulkMode.enable`          | boolean | `false` | Enable all bulk operations         |
| `bsBulkMode.addInline`       | boolean | `false` | Add rows inline instead of dialog  |
| `bsBulkMode.edit`            | boolean | `false` | Enable bulk edit                   |
| `bsBulkMode.delete`          | boolean | `false` | Enable bulk delete                 |
| `bsBulkMode.add`             | boolean | `false` | Enable bulk add                    |
| `bsBulkMode.showCheckbox`    | boolean | `false` | Show checkbox selection            |
| `bsBulkMode.showSplitButton` | boolean | `false` | Show split button for bulk actions |

---

## Column Definitions (bsColumnDefs)

ใช้สำหรับ customize หรือ override column settings จาก metadata

### Basic Properties

| Property      | Type    | Default      | Description                               |
| ------------- | ------- | ------------ | ----------------------------------------- |
| `field`       | string  | **Required** | Column field name                         |
| `headerName`  | string  | auto         | Display name in header                    |
| `width`       | number  | auto         | Column width in pixels                    |
| `type`        | string  | `"string"`   | Column type (see below)                   |
| `editable`    | boolean | `true`       | Allow inline editing                      |
| `readOnly`    | boolean | `false`      | Disable editing in forms                  |
| `required`    | boolean | auto         | Force required validation                 |
| `description` | string  | -            | Tooltip text in forms                     |
| `align`       | string  | `"left"`     | Cell alignment: "left", "center", "right" |
| `headerAlign` | string  | `"left"`     | Header alignment                          |
| `sortable`    | boolean | `true`       | Allow sorting                             |
| `filterable`  | boolean | `true`       | Allow filtering                           |
| `hideable`    | boolean | `true`       | Allow hiding column                       |
| `hide`        | boolean | `false`      | Initially hide column                     |

### Column Types

| Type             | Description                            |
| ---------------- | -------------------------------------- |
| `"string"`       | Text field                             |
| `"number"`       | Numeric field                          |
| `"boolean"`      | Yes/No checkbox/switch                 |
| `"date"`         | Date picker (date only)                |
| `"dateTime"`     | DateTime picker                        |
| `"singleSelect"` | Dropdown select                        |
| `"currency"`     | Currency formatted number              |
| `"stringAvatar"` | Avatar list from comma-separated names |
| `"attachFile"`   | File attachment column                 |

### Type-specific Properties

#### Number/Currency

```jsx
{
  field: "salary",
  type: "number",
  format: "currency",      // "number" | "currency" | "percent"
  currencySymbol: "฿",
  decimals: 2,
  thousandSeparator: true,
  min: 0,
  max: 1000000
}
```

#### Date/DateTime

```jsx
{
  field: "startDate",
  type: "date",
  dateFormat: "dd/MM/yyyy",
  dateTimeFormat: "dd/MM/yyyy HH:mm:ss",
  timeFormat: "HH:mm",
  minDate: new Date("2020-01-01"),
  maxDate: new Date("2030-12-31")
}
```

#### Boolean

```jsx
{
  field: "isActive",
  type: "boolean",
  trueLabel: "Active",
  falseLabel: "Inactive",
  trueColor: "success",
  falseColor: "error"
}
```

#### SingleSelect

```jsx
{
  field: "status",
  type: "singleSelect",
  valueOptions: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" }
  ]
}
```

#### StringAvatar

```jsx
{
  field: "assignees",
  type: "stringAvatar",
  maxAvatars: 4,
  avatarSize: 32,
  showTooltip: true
}
// Data: "John Doe,Jane Smith,Bob Johnson" -> displays 3 avatars
```

#### AttachFile

```jsx
{
  field: "attachments",
  type: "attachFile",
  attachConfig: {
    preObj: "tmt",
    attachTable: "t_tmt_project_attach_file",
    foreignKey: "project_id",
    fileNameColumn: "file_name",
    pathColumn: "path_file",
    allowedTypes: ["image/*", ".pdf", ".docx"],
    maxFileSize: 10 * 1024 * 1024,  // 10MB
    maxFiles: 5
  }
}
```

---

## ComboBox Configuration

ใช้สำหรับสร้าง dropdown ที่ดึงข้อมูลจาก table อื่น

```jsx
<BSDataGrid
  bsObj="t_tmt_project"
  bsComboBox={[
    {
      Column: "status_id", // Column ที่จะเป็น dropdown
      Display: "status_name", // Column ที่แสดง
      Value: "status_id", // Column ที่เก็บค่า
      Default: "--- Select ---", // ตัวเลือกเริ่มต้น
      PreObj: "sec", // Schema ของ lookup table
      Obj: "t_com_status", // Lookup table
      ObjWh: "is_active='YES'", // WHERE condition
      ObjBy: "name asc", // ORDER BY
      ObjGrp: "id, name", // GROUP BY (optional)
    },
  ]}
/>
```

### ComboBox Properties

| Property       | Type   | Description                                                              |
| -------------- | ------ | ------------------------------------------------------------------------ |
| `Column`       | string | Column name ที่จะเป็น dropdown                                           |
| `Display`      | string | Column ที่แสดงใน dropdown                                                |
| `Value`        | string | Column ที่เก็บค่า                                                        |
| `Default`      | string | ข้อความตัวเลือกเริ่มต้น                                                  |
| `PreObj`       | string | Schema ของ lookup table                                                  |
| `Obj`          | string | Lookup table name                                                        |
| `ObjWh`        | string | WHERE condition (รองรับ `{placeholder}` สำหรับ hierarchy)                |
| `ObjBy`        | string | ORDER BY clause                                                          |
| `ObjGrp`       | string | GROUP BY clause (optional)                                               |
| `ParentColumn` | string | Column ของ parent ComboBox ที่ต้องเลือกก่อน (สำหรับ hierarchy, optional) |

---

## Hierarchy ComboBox (ParentColumn)

รองรับ ComboBox แบบ **cascading/hierarchy** — เลือก ComboBox แม่แล้ว ComboBox ลูกจะกรองข้อมูลตามค่าที่เลือก

### คุณสมบัติ

- ✅ Child ComboBox จะ **disabled** จนกว่า parent จะถูกเลือก
- ✅ Child options จะ **reload อัตโนมัติ** เมื่อ parent เปลี่ยนค่า
- ✅ Child value จะ **ถูก clear อัตโนมัติ** เมื่อ parent เปลี่ยน (รวม grandchildren)
- ✅ รองรับ **multi-level** hierarchy (3+ ระดับ)
- ✅ ทำงานทั้ง **Form Dialog** (Add/Edit) และ **Bulk Add**

### วิธีใช้งาน

เพิ่ม `ParentColumn` ใน config ของ child ComboBox และใช้ `{placeholder}` ใน `ObjWh`:

```jsx
bsComboBox={[
  // Parent ComboBox (ไม่มี ParentColumn)
  {
    Column: "province_id",
    Display: "province_name",
    Value: "province_id",
    Default: "--- เลือกจังหวัด ---",
    Obj: "t_province",
    ObjBy: "province_name asc"
  },
  // Child ComboBox (มี ParentColumn)
  {
    Column: "district_id",
    Display: "district_name",
    Value: "district_id",
    Default: "--- เลือกอำเภอ ---",
    Obj: "t_district",
    ObjBy: "district_name asc",
    ParentColumn: "province_id",         // ← ชี้ไปที่ Column ของ parent
    ObjWh: "province_id={province_id}"   // ← {province_id} จะถูกแทนที่ด้วยค่าจริง
  }
]}
```

### ตัวอย่าง: 2 ระดับ (จังหวัด → อำเภอ)

```jsx
<BSDataGrid
  bsObj="t_customer_address"
  bsComboBox={[
    {
      Column: "province_id",
      Display: "province_name",
      Value: "province_id",
      Default: "--- เลือกจังหวัด ---",
      PreObj: "default",
      Obj: "t_province",
      ObjBy: "province_name asc",
    },
    {
      Column: "district_id",
      Display: "district_name",
      Value: "district_id",
      Default: "--- เลือกอำเภอ ---",
      PreObj: "default",
      Obj: "t_district",
      ObjBy: "district_name asc",
      ParentColumn: "province_id",
      ObjWh: "province_id={province_id}",
    },
  ]}
/>
```

### ตัวอย่าง: 3 ระดับ (จังหวัด → อำเภอ → ตำบล)

```jsx
<BSDataGrid
  bsObj="t_customer_address"
  bsComboBox={[
    {
      Column: "province_id",
      Display: "province_name",
      Value: "province_id",
      Default: "--- เลือกจังหวัด ---",
      Obj: "t_province",
      ObjBy: "province_name asc",
    },
    {
      Column: "district_id",
      Display: "district_name",
      Value: "district_id",
      Default: "--- เลือกอำเภอ ---",
      Obj: "t_district",
      ObjBy: "district_name asc",
      ParentColumn: "province_id",
      ObjWh: "province_id={province_id}",
    },
    {
      Column: "sub_district_id",
      Display: "sub_district_name",
      Value: "sub_district_id",
      Default: "--- เลือกตำบล ---",
      Obj: "t_sub_district",
      ObjBy: "sub_district_name asc",
      ParentColumn: "district_id",
      ObjWh: "district_id={district_id}",
    },
  ]}
/>
```

### ตัวอย่าง: Company → Department → Position

```jsx
<BSDataGrid
  bsObj="t_employee"
  bsComboBox={[
    {
      Column: "company_id",
      Display: "company_name",
      Value: "company_id",
      Default: "--- Select Company ---",
      Obj: "t_company",
    },
    {
      Column: "department_id",
      Display: "department_name",
      Value: "department_id",
      Default: "--- Select Department ---",
      Obj: "t_department",
      ParentColumn: "company_id",
      ObjWh: "company_id={company_id}",
    },
    {
      Column: "position_id",
      Display: "position_name",
      Value: "position_id",
      Default: "--- Select Position ---",
      Obj: "t_position",
      ParentColumn: "department_id",
      ObjWh: "department_id={department_id}",
    },
  ]}
/>
```

### ข้อกำหนดสำคัญ

| #   | ข้อกำหนด                           | รายละเอียด                                                                           |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | **ประกาศ Parent ก่อน Child**       | ใน `bsComboBox` array ต้องประกาศ parent ComboBox ก่อน child เสมอ                     |
| 2   | **ParentColumn ต้องตรงกับ Column** | ค่า `ParentColumn` ของ child ต้องตรงกับ `Column` ของ parent                          |
| 3   | **ใช้ {placeholder} ใน ObjWh**     | ใช้ `{column_name}` ใน ObjWh เพื่อแทนที่ด้วยค่าจริง เช่น `province_id={province_id}` |
| 4   | **Database FK**                    | ตาราง child ต้องมี FK column ที่ชี้ไปหา parent table                                 |

### กลไกการทำงาน

```
┌─────────────────┐     เลือก "กรุงเทพ"      ┌──────────────────────┐
│  จังหวัด (Parent)│  ───────────────────────▶ │  อำเภอ (Child)        │
│  [กรุงเทพ    ▼] │     1. Clear ค่าอำเภอ     │  [เลือกอำเภอ     ▼]  │
└─────────────────┘     2. Reload options       └──────────────────────┘
                           WHERE province_id=10
                        3. Enable dropdown
```

1. **เลือก Parent** → ระบบ clear ค่า child (และ grandchild) ทั้งหมด
2. **Reload child options** → ส่ง API request พร้อม WHERE condition ที่แทนค่า `{placeholder}` แล้ว
3. **Enable child dropdown** → child ComboBox พร้อมให้เลือก
4. **เปลี่ยน Parent** → วนกลับไปข้อ 1

---

## Unique Field Validation

ใช้ `bsUniqueFields` เพื่อตรวจสอบว่าค่าซ้ำหรือไม่ก่อนบันทึก

### Single Field Unique

```jsx
// แต่ละ field ต้อง unique แยกกัน
<BSDataGrid
  bsObj="t_tmt_holiday"
  bsUniqueFields={["holiday_date"]}
/>

// หลาย fields (แต่ละ field ต้อง unique แยกกัน)
bsUniqueFields={["code", "email"]}

// พร้อม custom error message
bsUniqueFields={[
  { field: "code", message: "รหัสนี้มีอยู่แล้ว" },
  { field: "email", message: "อีเมลนี้มีอยู่แล้ว" }
]}
```

### Composite Unique Key (หลาย fields รวมกัน)

```jsx
// document_type + document_no ต้องไม่ซ้ำกัน
<BSDataGrid
  bsObj="t_tmt_project_invoice"
  bsUniqueFields={[
    { fields: ["document_type", "document_no"] }
  ]}
/>

// พร้อม custom message
bsUniqueFields={[
  {
    fields: ["project_id", "document_type", "document_no"],
    message: "เอกสารนี้มีอยู่แล้วใน project นี้"
  }
]}
```

---

## Dialog Configuration

### Dialog Size

```jsx
<BSDataGrid
  bsObj="t_tmt_project"
  bsDialogSize="Large" // "Small" | "Default" | "Large" | "FullScreen"
/>
```

| Size           | Max Width |
| -------------- | --------- |
| `"Small"`      | 600px     |
| `"Default"`    | 900px     |
| `"Large"`      | 1200px    |
| `"FullScreen"` | 100%      |

### Dialog Columns

```jsx
<BSDataGrid
  bsObj="t_tmt_project"
  bsDialogColumns={2} // จำนวน columns ต่อ row: 1, 2, 3, 4, 6, หรือ 12
/>
```

### Dialog Tabs

```jsx
<BSDataGrid
  bsObj="t_tmt_project"
  bsDialogTab={[
    { Column: "name,code,status", name: "General Info" },
    { Column: "address,city,country", name: "Address" },
    { Column: "notes,description", name: "Additional" },
  ]}
/>
```

---

## Hierarchical Data (Parent-Child)

สร้าง Master-Detail relationships ใน dialog เดียว

```jsx
<BSDataGrid
  bsPreObj="tmt"
  bsObj="t_tmt_iso_type"
  bsPrimaryKeys={["iso_type_id"]}
  bsParentRecordLabel="ข้อมูลหลัก"
  bsDialogSize="Large"
  bsChildGrids={[
    {
      name: "Documents",
      bsPreObj: "tmt",
      bsObj: "t_tmt_iso_type_doc",
      foreignKeys: ["iso_type_id"],
      bsObjBy: "create_date desc",
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
/>
```

### Hierarchical Props

| Prop                  | Type     | Description                         |
| --------------------- | -------- | ----------------------------------- |
| `bsPrimaryKeys`       | string[] | Primary key columns ของ parent      |
| `bsParentRecordLabel` | string   | Label สำหรับ parent accordion       |
| `bsChildGrids`        | array    | Array ของ child grid configurations |
| `bsDefaultFormValues` | object   | Default values สำหรับ new records   |
| `bsHiddenColumns`     | string[] | Columns ที่ซ่อน (FK columns)        |

### Child Grid Config

| Property       | Type     | Description                    |
| -------------- | -------- | ------------------------------ |
| `name`         | string   | Tab display name               |
| `foreignKeys`  | string[] | FK columns ที่ link กับ parent |
| `...gridProps` | -        | ทุก props ของ BSDataGrid       |

---

## Stored Procedure Support

รองรับ Enhanced Stored Procedures สำหรับ complex queries

```jsx
<BSDataGrid
  bsStoredProcedure="usp_tbm_method"
  bsStoredProcedureSchema="dbo"
  bsStoredProcedureParams={{
    status: "active",
  }}
  bsStoredProcedureCrud={true} // ใช้ SP สำหรับ INSERT/UPDATE/DELETE
  bsKeyId="method_id" // ระบุ primary key
/>
```

### Stored Procedure Props

| Prop                      | Type    | Default | Description           |
| ------------------------- | ------- | ------- | --------------------- |
| `bsStoredProcedure`       | string  | -       | Stored procedure name |
| `bsStoredProcedureSchema` | string  | `"dbo"` | Schema ของ SP         |
| `bsStoredProcedureParams` | object  | `{}`    | Additional parameters |
| `bsStoredProcedureCrud`   | boolean | `false` | ใช้ SP สำหรับ CRUD    |

---

## Permission Configuration

### Auto Permission from Menu

```jsx
<BSDataGrid bsObj="t_tmt_project" bsAutoPermission={true} />
```

เมื่อ `bsAutoPermission={true}`:

- อ่าน permissions จาก menu settings (AssignMenu)
- ควบคุม `showAdd`, `bsVisibleEdit`, `bsVisibleDelete`, `bsVisibleView` อัตโนมัติ
- Props จะถูก AND กับ permissions

### User Lookup

```jsx
<BSDataGrid
  bsObj="t_tmt_project"
  bsUserLookup={{
    table: "sec.t_com_user",
    idField: "user_id",
    displayFields: ["first_name", "last_name"],
    separator: " ",
  }}
/>
```

---

## Callbacks & Events

| Callback               | Parameters       | Description               |
| ---------------------- | ---------------- | ------------------------- |
| `onAdd`                | `()`             | เมื่อกดปุ่ม Add           |
| `onEdit`               | `(row)`          | เมื่อกดปุ่ม Edit          |
| `onDelete`             | `(id)`           | เมื่อกดปุ่ม Delete        |
| `onView`               | `(row)`          | เมื่อกดปุ่ม View          |
| `onCheckBoxSelected`   | `(selectedRows)` | เมื่อเลือก checkbox       |
| `onDataBind`           | `(data)`         | เมื่อโหลดข้อมูลเสร็จ      |
| `onFilteredDataChange` | `(filteredData)` | เมื่อข้อมูลที่แสดงเปลี่ยน |

### Example: Calculate Summary

```jsx
const [totals, setTotals] = useState({ sum: 0 });

<BSDataGrid
  bsObj="t_tmt_invoice"
  onFilteredDataChange={(data) => {
    const sum = data.reduce((acc, row) => acc + (row.amount || 0), 0);
    setTotals({ sum });
  }}
/>

<Typography>Total: {totals.sum.toLocaleString()}</Typography>
```

---

## Examples

### Basic CRUD

```jsx
<BSDataGrid
  bsLocale={props.lang}
  bsPreObj="sec"
  bsObj="t_com_user"
  bsCols="user_id, first_name, last_name, email, is_active"
  bsObjBy="create_date desc"
  bsKeyId="user_id"
/>
```

### Bulk Mode with Inline Add

```jsx
<BSDataGrid
  bsLocale={props.lang}
  bsPreObj="tmt"
  bsObj="t_tmt_holiday"
  bsBulkMode={{
    enable: true,
    addInline: true,
  }}
  bsColumnDefs={[
    { field: "holiday_date", type: "date", dateFormat: "dd/MM/yyyy" },
  ]}
  bsUniqueFields={["holiday_date"]}
/>
```

### Master-Detail with ComboBox

```jsx
<BSDataGrid
  bsPreObj="tmt"
  bsObj="t_tmt_project"
  bsPrimaryKeys={["project_id"]}
  bsDialogSize="Large"
  bsComboBox={[
    {
      Column: "status_id",
      Display: "status_name",
      Value: "status_id",
      Default: "--- Select Status ---",
      PreObj: "sec",
      Obj: "t_com_status",
      ObjWh: "is_active='YES'",
      ObjBy: "name asc"
    }
  ]}
  bsChildGrids={[
    {
      name: "Tasks",
      bsPreObj: "tmt",
      bsObj: "t_tmt_project_task",
      foreignKeys: ["project_id"],
      bsBulkMode={{ enable: true, addInline: true }}
    }
  ]}
/>
```

### Invoice with Summary

```jsx
const [totals, setTotals] = useState({ po: 0, invoice: 0 });

<BSDataGrid
  bsPreObj="tmt"
  bsObj="t_tmt_project_invoice"
  bsObjWh={`project_header_id='${projectId}'`}
  bsDefaultFormValues={{ project_header_id: projectId }}
  bsHiddenColumns={["project_header_id"]}
  bsUniqueFields={[
    { fields: ["project_header_id", "document_type", "document_no"] }
  ]}
  bsBulkMode={{ enable: true, addInline: true }}
  onFilteredDataChange={(data) => {
    const po = data.filter(r => r.document_type === "PO")
                   .reduce((sum, r) => sum + (r.amount || 0), 0);
    const invoice = data.filter(r => r.document_type === "Invoice")
                        .reduce((sum, r) => sum + (r.amount || 0), 0);
    setTotals({ po, invoice });
  }}
/>

<Box>Total PO: {totals.po.toLocaleString()}</Box>
<Box>Total Invoice: {totals.invoice.toLocaleString()}</Box>
```

---

## Ref Methods

ใช้ `ref` เพื่อเรียก methods ของ BSDataGrid

```jsx
const gridRef = useRef();

// เรียก refresh
gridRef.current?.refresh();

// เรียก loadData
gridRef.current?.loadData();

<BSDataGrid ref={gridRef} bsObj="t_tmt_project" />;
```

---

## Notes

1. **bsCols vs Metadata**: ถ้าระบุ `bsCols` จะแสดงเฉพาะ columns ที่ระบุ ถ้าไม่ระบุจะแสดงทุก columns จาก metadata
2. **Primary Key**: ระบุ `bsKeyId` เมื่อใช้ Stored Procedure หรือ metadata ไม่มี primary key
3. **Bulk Mode**: แนะนำใช้ `bsBulkMode` object แทน legacy props
4. **Unique Validation**: รองรับทั้ง single field และ composite key
5. **Date Timezone**: ระบบใช้ local timezone สำหรับ date fields (ไม่ใช่ UTC)
6. **Default Values**: Fields ที่มี default value ใน database จะไม่ถูก validate ว่า required

---

_Documentation generated for BS-Platform BSDataGrid component_
