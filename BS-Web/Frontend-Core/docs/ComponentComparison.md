# 🔄 เปรียบเทียบ Custom GridView Components

## 📊 ตารางเปรียบเทียบแบบละเอียด

| ฟีเจอร์               | CustomDataGrid | EditableDataGrid | คำอธิบาย                           |
| --------------------- | -------------- | ---------------- | ---------------------------------- |
| **การแสดงข้อมูล**     | ✅             | ✅               | แสดงข้อมูลในรูปแบบตาราง            |
| **Pagination**        | ✅             | ✅               | แบ่งหน้าข้อมูล                     |
| **การเรียงลำดับ**     | ✅             | ✅               | คลิกหัวคอลัมน์เพื่อเรียงลำดับ      |
| **การกรองข้อมูล**     | ✅             | ✅               | กรองข้อมูลตามเงื่อนไข              |
| **การค้นหา**          | ✅             | ✅               | ค้นหาข้อมูลใน grid                 |
| **Export ข้อมูล**     | ✅             | ❌               | ส่งออกเป็น CSV, Excel              |
| **Print**             | ✅             | ❌               | พิมพ์ข้อมูล                        |
| **Column Management** | ✅             | ✅               | แสดง/ซ่อนคอลัมน์                   |
| **Dense Mode**        | ✅             | ✅               | โหมดแสดงข้อมูลแบบหนาแน่น           |
| **เพิ่มรายการใหม่**   | ❌             | ✅               | เพิ่มแถวใหม่ผ่าน toolbar           |
| **แก้ไขข้อมูล**       | ❌             | ✅               | Inline editing                     |
| **ลบรายการ**          | ❌             | ✅               | ลบแถวผ่าน action buttons           |
| **บันทึก/ยกเลิก**     | ❌             | ✅               | ควบคุมการแก้ไข                     |
| **Validation**        | ❌             | ✅               | ตรวจสอบข้อมูลก่อนบันทึก            |
| **Action Buttons**    | ❌             | ✅               | ปุ่ม Edit, Save, Cancel, Delete    |
| **Row Selection**     | ✅             | ✅               | เลือกแถว (แต่ไม่แนะนำใน edit mode) |
| **Cell Focus**        | ✅             | ✅               | Focus ที่เซลล์                     |

## 🎯 การใช้งานตาม Scenario

### 📈 สำหรับ Dashboard และ Reporting

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

**เหมาะสำหรับ:**

- การแสดงผลยอดขาย
- รายงานสถิติ
- Dashboard metrics
- Historical data

### ⚙️ สำหรับ Management System

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

**เหมาะสำหรับ:**

- จัดการข้อมูลผลิตภัณฑ์
- ระบบ CRM
- Admin panel
- Master data management

## 🔄 Migration Path

### จาก CustomDataGrid ไป EditableDataGrid

```jsx
// Before: CustomDataGrid
<CustomDataGrid
  rows={data}
  columns={columns}
/>

// After: EditableDataGrid
<EditableDataGrid
  rows={data}
  columns={columns.map(col => ({ ...col, editable: true }))}
  onAddRecord={handleAdd}
  onUpdateRecord={handleUpdate}
  onDeleteRecord={handleDelete}
/>
```

### จาก EditableDataGrid ไป CustomDataGrid

```jsx
// Before: EditableDataGrid
<EditableDataGrid
  rows={data}
  columns={editableColumns}
  onAddRecord={handleAdd}
  // ... other handlers
/>

// After: CustomDataGrid
<CustomDataGrid
  rows={data}
  columns={columns} // ไม่ต้องมี editable property
/>
```

## ⚡ Performance Comparison

| Metric           | CustomDataGrid | EditableDataGrid |
| ---------------- | -------------- | ---------------- |
| **Initial Load** | 🟢 เร็ว        | 🟡 ปานกลาง       |
| **Memory Usage** | 🟢 น้อย        | 🟡 ปานกลาง       |
| **Re-render**    | 🟢 น้อย        | 🟠 มาก           |
| **Bundle Size**  | 🟢 เล็ก        | 🟡 ใหญ่กว่า      |

### เหตุผลด้าน Performance

**CustomDataGrid เร็วกว่าเพราะ:**

- ไม่มี editing state management
- ไม่มี action buttons rendering
- ไม่มี validation logic
- Read-only operations only

**EditableDataGrid ช้ากว่าเพราะ:**

- จัดการ editing state
- Render action buttons ทุกแถว
- Validation on every change
- Complex event handling

## 🎨 UI/UX Differences

### CustomDataGrid UI Features

```jsx
// Toolbar with export options
<CustomDataGrid
// Automatic toolbar with:
// - Export CSV
// - Export Excel
// - Print
// - Column management
// - Density toggle
// - Filter panel
/>
```

### EditableDataGrid UI Features

```jsx
// Toolbar with add button + action columns
<EditableDataGrid
// Automatic toolbar with:
// - Add new record button
// Action columns with:
// - Edit button (when not editing)
// - Save button (when editing)
// - Cancel button (when editing)
// - Delete button (when not editing)
/>
```

## 🔧 Customization Options

### CustomDataGrid Customizations

```jsx
<CustomDataGrid
  // Export customization
  slots={{
    toolbar: CustomToolbar,
  }}
  slotProps={{
    toolbar: {
      showQuickFilter: true,
      showExport: true,
    },
  }}
  // Display customization
  density="compact"
  disableColumnMenu={false}
  disableColumnFilter={false}
/>
```

### EditableDataGrid Customizations

```jsx
<EditableDataGrid
  // CRUD customization
  onAddRecord={customAddHandler}
  onUpdateRecord={customUpdateHandler}
  onDeleteRecord={customDeleteHandler}
  // Validation customization
  columns={[
    {
      field: "email",
      editable: true,
      preProcessEditCellProps: validateEmail,
    },
  ]}
  // Edit behavior
  editMode="row" // หรือ "cell"
/>
```

## 💡 Best Practice Guidelines

### เมื่อใช้ CustomDataGrid

```jsx
// ✅ Good
const ReportGrid = () => {
  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "name", headerName: "Name", width: 200 },
      // Static columns definition
    ],
    []
  );

  return (
    <CustomDataGrid
      rows={data}
      columns={columns}
      autoHeight
      disableRowSelectionOnClick
    />
  );
};

// ❌ Avoid
const BadReportGrid = () => {
  return (
    <CustomDataGrid
      rows={data}
      columns={[
        { field: "name", editable: true }, // ไม่ควรมี editable ใน CustomDataGrid
      ]}
      onRowClick={handleEdit} // ไม่ควรให้แก้ไขใน read-only grid
    />
  );
};
```

### เมื่อใช้ EditableDataGrid

```jsx
// ✅ Good
const ManagementGrid = () => {
  const handleUpdate = useCallback((row) => {
    // Async update with error handling
    updateRecord(row).catch(handleError);
  }, []);

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Name", editable: true },
      { field: "email", headerName: "Email", editable: true },
    ],
    []
  );

  return (
    <EditableDataGrid
      rows={data}
      columns={columns}
      onUpdateRecord={handleUpdate}
    />
  );
};

// ❌ Avoid
const BadManagementGrid = () => {
  return (
    <EditableDataGrid
      rows={data}
      columns={[
        { field: "name" }, // ลืม editable: true
      ]}
      // ลืม onUpdateRecord handler
    />
  );
};
```

## 🚨 Common Pitfalls

### 1. ใช้ Component ผิด Purpose

```jsx
// ❌ Wrong: ใช้ EditableDataGrid เพื่อแสดงข้อมูลอย่างเดียว
<EditableDataGrid
  rows={reportData}
  columns={readOnlyColumns}
  // ไม่มี onAddRecord, onUpdateRecord, onDeleteRecord
/>

// ✅ Correct: ใช้ CustomDataGrid
<CustomDataGrid
  rows={reportData}
  columns={readOnlyColumns}
/>
```

### 2. Performance Issues

```jsx
// ❌ Wrong: Re-creating columns ทุก render
const BadComponent = () => {
  return (
    <EditableDataGrid
      rows={data}
      columns={[
        { field: "name", editable: true }, // สร้างใหม่ทุก render
      ]}
    />
  );
};

// ✅ Correct: Memoized columns
const GoodComponent = () => {
  const columns = useMemo(() => [{ field: "name", editable: true }], []);

  return <EditableDataGrid rows={data} columns={columns} />;
};
```

### 3. Missing Error Handling

```jsx
// ❌ Wrong: ไม่มี error handling
const handleUpdate = (row) => {
  updateAPI(row); // อาจจะ error
};

// ✅ Correct: มี error handling
const handleUpdate = async (row) => {
  try {
    await updateAPI(row);
    toast.success("อัปเดตสำเร็จ");
  } catch (error) {
    toast.error("เกิดข้อผิดพลาด: " + error.message);
  }
};
```

---

_คู่มือนี้จะช่วยให้คุณเลือกใช้ component ที่เหมาะสมและหลีกเลี่ยงปัญหาที่พบบ่อย_
