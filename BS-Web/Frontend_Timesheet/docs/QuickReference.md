# ⚡ Quick Reference - Custom GridView Components

## 🚀 การเลือกใช้งาน (30 วินาที)

### ❓ คุณต้องการทำอะไร?

| ความต้องการ         | Component          | เหตุผล             |
| ------------------- | ------------------ | ------------------ |
| แสดงข้อมูล + Export | `CustomDataGrid`   | มี export built-in |
| แสดงข้อมูล + แก้ไข  | `EditableDataGrid` | มี CRUD operations |
| Dashboard/Report    | `CustomDataGrid`   | Performance ดี     |
| Admin Panel         | `EditableDataGrid` | จัดการข้อมูลได้    |

## 📋 Template Code

### CustomDataGrid (Read-Only)

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

### EditableDataGrid (CRUD)

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

## 🔧 Column Types Cheat Sheet

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

  // Custom Render
  {
    field: "avatar",
    headerName: "Avatar",
    renderCell: (params) => <Avatar src={params.value} />,
    editable: false,
  },
];
```

## ⚠️ Common Mistakes

### ❌ Wrong

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

### ✅ Correct

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

## 🎨 Quick Styling

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

## 🔍 Debugging Checklist

### ข้อมูลไม่แสดง

- [ ] ตรวจสอบ `rows` มี `id` field หรือไม่
- [ ] ตรวจสอบ `columns` มี `field` ถูกต้องหรือไม่
- [ ] เช็ค console errors

### แก้ไขไม่ได้

- [ ] คอลัมน์มี `editable: true` หรือไม่
- [ ] มี `onUpdateRecord` handler หรือไม่
- [ ] เช็ค validation errors

### Performance ช้า

- [ ] ใช้ `useMemo` สำหรับ columns
- [ ] ใช้ `useCallback` สำหรับ handlers
- [ ] ลด re-renders ที่ไม่จำเป็น

## 📱 Responsive Tips

```jsx
// Mobile-friendly columns
const columns = [
  { field: "name", headerName: "Name", minWidth: 150, flex: 1 },
  { field: "email", headerName: "Email", minWidth: 200, flex: 1 },
  {
    field: "actions",
    headerName: "Actions",
    width: 120,
    hideable: false, // ไม่ให้ซ่อนได้
  },
];

// Auto height for mobile
<CustomDataGrid
  autoHeight
  disableVirtualization // เปิดถ้ามีปัญหาใน mobile
/>;
```

## 🔐 Validation Examples

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

// Custom validation
{
  field: 'age',
  type: 'number',
  editable: true,
  preProcessEditCellProps: (params) => {
    const value = params.props.value;
    const hasError = value < 0 || value > 120;
    return { ...params.props, error: hasError };
  }
}
```

## 🚀 Performance Optimization

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

// Virtual scrolling for large datasets
<CustomDataGrid
  virtualScrollerProps={{
    itemSize: 52, // row height
  }}
/>;
```

## 📞 Help & Resources

- 📖 [Full Documentation](./README.md)
- 🔍 [Detailed Guide](./CustomGridViewGuide.md)
- 🔄 [Component Comparison](./ComponentComparison.md)
- 🌐 [MUI DataGrid Docs](https://mui.com/x/react-data-grid/)

---

_Keep this page bookmarked for quick reference! 🔖_
