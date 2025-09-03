# คู่มือการใช้งาน Custom GridView Components

## สารบัญ

1. [ภาพรวม Custom GridView Components](#ภาพรวม-custom-gridview-components)
2. [CustomDataGrid - แบบอ่านอย่างเดียว](#customdatagrid---แบบอ่านอย่างเดียว)
3. [EditableDataGrid - แบบแก้ไขได้](#editabledatagrid---แบบแก้ไขได้)
4. [การเลือกใช้งาน Component ที่เหมาะสม](#การเลือกใช้งาน-component-ที่เหมาะสม)
5. [ตัวอย่างการใช้งานในสถานการณ์จริง](#ตัวอย่างการใช้งานในสถานการณ์จริง)
6. [Best Practices](#best-practices)

## ภาพรวม Custom GridView Components

ในโปรเจคนี้มี GridView Components หลัก 2 ตัวที่พัฒนาขึ้นเพื่อใช้งานในสถานการณ์ที่แตกต่างกัน:

### 🔍 CustomDataGrid

- **จุดประสงค์**: แสดงข้อมูลแบบอ่านอย่างเดียว (Read-only)
- **เหมาะสำหรับ**: Dashboard, รายงาน, การแสดงผลข้อมูล
- **ฟีเจอร์**: Export, การกรอง, การเรียงลำดับ, Pagination

### ✏️ EditableDataGrid

- **จุดประสงค์**: จัดการข้อมูลแบบครบครัน CRUD
- **เหมาะสำหรับ**: ฟอร์มจัดการข้อมูล, ระบบบริหารจัดการ
- **ฟีเจอร์**: เพิ่ม, แก้ไข, ลบ, Validation

---

## CustomDataGrid - แบบอ่านอย่างเดียว

### 📋 คำอธิบาย

`CustomDataGrid` เป็น component ที่ปรับแต่งจาก MUI X DataGrid สำหรับการแสดงข้อมูลแบบอ่านอย่างเดียว มีการออกแบบ UI ที่สวยงามและ responsive

### ✨ ฟีเจอร์หลัก

- ✅ **Export ข้อมูล** - ส่งออกเป็น CSV, Excel
- ✅ **การกรองข้อมูล** - กรองตามคอลัมน์
- ✅ **การเรียงลำดับ** - เรียงจากน้อยไปมาก/มากไปน้อย
- ✅ **Pagination** - แบ่งหน้าข้อมูล
- ✅ **Responsive Design** - ปรับตัวตามขนาดหน้าจอ
- ✅ **Zebra Striping** - แถวสลับสี
- ✅ **Hover Effects** - เอฟเฟคเมื่อ hover

### 🚀 การใช้งานพื้นฐาน

```jsx
import React from "react";
import CustomDataGrid from "../components/CustomDataGrid";

const ReportPage = () => {
  const rows = [
    { id: 1, name: "สมชาย", department: "IT", salary: 30000 },
    { id: 2, name: "สมศรี", department: "HR", salary: 35000 },
  ];

  const columns = [
    { field: "name", headerName: "ชื่อ", width: 200 },
    { field: "department", headerName: "แผนก", width: 150 },
    { field: "salary", headerName: "เงินเดือน", width: 150, type: "number" },
  ];

  return (
    <CustomDataGrid
      rows={rows}
      columns={columns}
      paginationModel={{ page: 0, pageSize: 10 }}
    />
  );
};
```

### ⚙️ Props ที่รองรับ

| Prop              | Type     | Default                    | Description                  |
| ----------------- | -------- | -------------------------- | ---------------------------- |
| `rows`            | `Array`  | `[]`                       | ข้อมูลที่จะแสดง              |
| `columns`         | `Array`  | `[]`                       | การกำหนดคอลัมน์              |
| `paginationModel` | `Object` | `{ page: 0, pageSize: 5 }` | การตั้งค่า pagination        |
| `...props`        | `Object` | -                          | Props อื่นๆ ของ MUI DataGrid |

### 🎨 การปรับแต่ง Styling

```jsx
<CustomDataGrid
  rows={rows}
  columns={columns}
  sx={{
    height: 500,
    "& .MuiDataGrid-cell": {
      fontSize: "0.9rem",
      padding: "8px 12px",
    },
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: "#f0f0f0",
      fontWeight: "bold",
    },
  }}
/>
```

---

## EditableDataGrid - แบบแก้ไขได้

### 📋 คำอธิบาย

`EditableDataGrid` เป็น component ที่รองรับการจัดการข้อมูลแบบ CRUD (Create, Read, Update, Delete) สามารถแก้ไขข้อมูลได้แบบ inline

### ✨ ฟีเจอร์หลัก

- ✅ **เพิ่มรายการใหม่** - ปุ่มเพิ่มใน toolbar
- ✅ **แก้ไขข้อมูล** - inline editing
- ✅ **ลบรายการ** - ปุ่มลบในแต่ละแถว
- ✅ **บันทึก/ยกเลิก** - ควบคุมการแก้ไข
- ✅ **Validation** - ตรวจสอบความถูกต้อง
- ✅ **Row Mode Editing** - แก้ไขทั้งแถว

### 🚀 การใช้งานพื้นฐาน

```jsx
import React, { useState } from "react";
import EditableDataGrid from "../components/EditableDataGrid";

const ManagementPage = () => {
  const [employees, setEmployees] = useState([
    { id: 1, name: "สมชาย", position: "Developer", salary: 30000 },
    { id: 2, name: "สมศรี", position: "Designer", salary: 28000 },
  ]);

  const columns = [
    { field: "name", headerName: "ชื่อ", width: 200, editable: true },
    {
      field: "position",
      headerName: "ตำแหน่ง",
      width: 150,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Developer", "Designer", "Manager"],
    },
    {
      field: "salary",
      headerName: "เงินเดือน",
      width: 150,
      editable: true,
      type: "number",
    },
  ];

  const handleAddRecord = () => {
    const newId = Math.max(...employees.map((e) => e.id), 0) + 1;
    setEmployees((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        position: "",
        salary: 0,
        isNew: true,
      },
    ]);
  };

  const handleUpdateRecord = (updatedRow) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedRow.id ? updatedRow : emp))
    );
  };

  const handleDeleteRecord = (id) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  return (
    <EditableDataGrid
      rows={employees}
      columns={columns}
      onAddRecord={handleAddRecord}
      onUpdateRecord={handleUpdateRecord}
      onDeleteRecord={handleDeleteRecord}
      paginationModel={{ page: 0, pageSize: 10 }}
    />
  );
};
```

### ⚙️ Props ที่รองรับ

| Prop              | Type       | Default                    | Description                             |
| ----------------- | ---------- | -------------------------- | --------------------------------------- |
| `rows`            | `Array`    | `[]`                       | ข้อมูลที่จะแสดง                         |
| `columns`         | `Array`    | `[]`                       | การกำหนดคอลัมน์ (ต้องมี editable: true) |
| `onAddRecord`     | `Function` | `undefined`                | Callback เมื่อเพิ่มรายการ               |
| `onUpdateRecord`  | `Function` | `undefined`                | Callback เมื่อแก้ไขรายการ               |
| `onDeleteRecord`  | `Function` | `undefined`                | Callback เมื่อลบรายการ                  |
| `paginationModel` | `Object`   | `{ page: 0, pageSize: 5 }` | การตั้งค่า pagination                   |

---

## การเลือกใช้งาน Component ที่เหมาะสม

### 🤔 เมื่อไหร่ควรใช้ CustomDataGrid?

- ✅ หน้าแดชบอร์ดที่แสดงสถิติ
- ✅ รายงานต่างๆ
- ✅ การแสดงผลข้อมูลจากฐานข้อมูล
- ✅ ตารางข้อมูลที่ไม่ต้องการให้แก้ไข
- ✅ เมื่อต้องการ export ข้อมูล

### 🤔 เมื่อไหร่ควรใช้ EditableDataGrid?

- ✅ ระบบจัดการพนักงาน
- ✅ ระบบจัดการผลิตภัณฑ์
- ✅ ฟอร์มที่มีข้อมูลหลายรายการ
- ✅ เมื่อต้องการ CRUD operations
- ✅ ระบบ admin panel

### 📊 ตารางเปรียบเทียบ

| ฟีเจอร์       | CustomDataGrid | EditableDataGrid |
| ------------- | -------------- | ---------------- |
| แสดงข้อมูล    | ✅             | ✅               |
| Export        | ✅             | ❌               |
| การกรอง       | ✅             | ✅               |
| การเรียงลำดับ | ✅             | ✅               |
| เพิ่มข้อมูล   | ❌             | ✅               |
| แก้ไขข้อมูล   | ❌             | ✅               |
| ลบข้อมูล      | ❌             | ✅               |
| Validation    | ❌             | ✅               |
| Performance   | ⚡ เร็ว        | 🐌 ปานกลาง       |

---

## ตัวอย่างการใช้งานในสถานการณ์จริง

### 🏢 ระบบ HR - หน้าแสดงรายชื่อพนักงาน

```jsx
// ใช้ CustomDataGrid สำหรับแสดงข้อมูลอย่างเดียว
const EmployeeListPage = () => {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  const columns = [
    { field: "employeeId", headerName: "รหัสพนักงาน", width: 120 },
    { field: "fullName", headerName: "ชื่อ-นามสกุล", width: 200 },
    { field: "department", headerName: "แผนก", width: 150 },
    { field: "position", headerName: "ตำแหน่ง", width: 150 },
    {
      field: "startDate",
      headerName: "วันที่เริ่มงาน",
      width: 120,
      type: "date",
    },
    { field: "salary", headerName: "เงินเดือน", width: 120, type: "number" },
  ];

  return (
    <CustomDataGrid
      rows={employees}
      columns={columns}
      paginationModel={{ page: 0, pageSize: 25 }}
    />
  );
};
```

### ⚙️ ระบบ Admin - จัดการผู้ใช้

```jsx
// ใช้ EditableDataGrid สำหรับจัดการข้อมูล
const UserManagementPage = () => {
  const [users, setUsers] = useState([]);

  const columns = [
    { field: "username", headerName: "ชื่อผู้ใช้", width: 150, editable: true },
    { field: "email", headerName: "อีเมล", width: 200, editable: true },
    {
      field: "role",
      headerName: "บทบาท",
      width: 120,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Admin", "User", "Manager"],
    },
    {
      field: "status",
      headerName: "สถานะ",
      width: 100,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Active", "Inactive"],
    },
  ];

  const handleAddUser = async () => {
    const newUser = {
      id: Date.now(),
      username: "",
      email: "",
      role: "User",
      status: "Active",
      isNew: true,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      await updateUserAPI(updatedUser);
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      toast.success("อัปเดตผู้ใช้สำเร็จ");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm("คุณต้องการลบผู้ใช้นี้หรือไม่?")) {
      try {
        await deleteUserAPI(userId);
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        toast.success("ลบผู้ใช้สำเร็จ");
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการลบ");
      }
    }
  };

  return (
    <EditableDataGrid
      rows={users}
      columns={columns}
      onAddRecord={handleAddUser}
      onUpdateRecord={handleUpdateUser}
      onDeleteRecord={handleDeleteUser}
      paginationModel={{ page: 0, pageSize: 15 }}
    />
  );
};
```

---

## Best Practices

### 🎯 ข้อแนะนำทั่วไป

#### 1. **การจัดการ State**

```jsx
// ✅ ดี - ใช้ functional updates
setUsers((prev) => prev.filter((user) => user.id !== id));

// ❌ หลีกเลี่ยง - mutation โดยตรง
users.push(newUser);
setUsers(users);
```

#### 2. **การจัดการ Loading**

```jsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);

useEffect(() => {
  fetchData()
    .then(setData)
    .finally(() => setLoading(false));
}, []);

if (loading) return <CircularProgress />;

return <CustomDataGrid rows={data} columns={columns} />;
```

#### 3. **การจัดการ Error**

```jsx
const [error, setError] = useState(null);

const handleUpdateRecord = async (updatedRow) => {
  try {
    await updateAPI(updatedRow);
    setData(prev => /* update logic */);
  } catch (err) {
    setError(err.message);
    toast.error('เกิดข้อผิดพลาด');
  }
};
```

### 🔧 การ Optimize Performance

#### 1. **ใช้ React.memo สำหรับ components**

```jsx
const OptimizedDataGrid = React.memo(CustomDataGrid);
```

#### 2. **ใช้ useMemo สำหรับ columns**

```jsx
const columns = useMemo(
  () => [
    { field: "name", headerName: "ชื่อ", width: 200 },
    // ... other columns
  ],
  []
);
```

#### 3. **ใช้ useCallback สำหรับ handlers**

```jsx
const handleUpdate = useCallback((row) => {
  // update logic
}, []);
```

### 🎨 การปรับแต่ง UI

#### 1. **Custom Cell Renderer**

```jsx
const columns = [
  {
    field: "status",
    headerName: "สถานะ",
    renderCell: (params) => (
      <Chip
        label={params.value}
        color={params.value === "Active" ? "success" : "error"}
        variant="outlined"
      />
    ),
  },
];
```

#### 2. **Custom Styling**

```jsx
<EditableDataGrid
  sx={{
    "& .MuiDataGrid-row--editing": {
      backgroundColor: "#fff3e0",
    },
    "& .MuiDataGrid-cell--editing": {
      border: "2px solid #ff9800",
    },
  }}
/>
```

### 🛡️ Security & Validation

#### 1. **Input Validation**

```jsx
const columns = [
  {
    field: "email",
    headerName: "อีเมล",
    editable: true,
    preProcessEditCellProps: (params) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const hasError = !emailRegex.test(params.props.value);
      return { ...params.props, error: hasError };
    },
  },
];
```

#### 2. **Permission-based Editing**

```jsx
const columns = [
  {
    field: "salary",
    headerName: "เงินเดือน",
    editable: user.role === "admin", // เฉพาะ admin เท่านั้น
  },
];
```

---

## 📞 การขอความช่วยเหลือ

หากมีคำถามหรือต้องการความช่วยเหลือเพิ่มเติม:

1. **ดูตัวอย่างในแอป**: เข้าไปที่หน้า `/editable` สำหรับ EditableDataGrid
2. **อ่านเอกสาร MUI**: [MUI X DataGrid Documentation](https://mui.com/x/react-data-grid/)
3. **ติดต่อทีมพัฒนา**: สำหรับการปรับแต่งเพิ่มเติม

---

_อัปเดตล่าสุด: สิงหาคม 2025_
