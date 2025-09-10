# BS-Platform

Umbrella project ของ BS รวมระบบทั้งหมด:

- BS-API-Core → ระบบหลัก
- BS-API-Secure → Security API
- BS-Web → React Frontend

---

## Git Workflow

- `main` → production
- `develop` → integration
- `feature/*` → พัฒนา feature ใหม่
- `hotfix/*` → แก้ปัญหาด่วน

```bash
git clone https://github.com/phayungsakp/bs-platform.git
cd bs-platform
git checkout -b feature/ชื่อฟีเจอร์
```

---

## 🚀 Quick Start

### BSDataGrid Component

```jsx
import BSDataGrid from "../components/BSDataGrid";

// Basic usage
<BSDataGrid bsObj="t_wms_customer" height={600} />

// Advanced usage
<BSDataGrid
  bsObj="t_wms_customer"
  bsPreObj="default"
  bsCols="id,name,email,status"
  bsBulkEdit={true}
  bsBulkAdd={true}
  bsComboBox={[{
    Column: "status",
    Obj: "t_wms_status",
    Value: "id",
    Display: "name"
  }]}
/>
```
### BsAutoComplete Component

```jsx
import BsAutoComplete from "../components/BsAutoComplete";

// Select
<BsAutoComplete
  bsModel="select"
  bsTitle="เลือก Platform"
  bsPreObj="combo_box_id"
  bsObj="sec.t_com_combobox_item"
  bsColumes={[
    { field: "combo_box_id", display: false },
    { field: "value_member", display: true, order_by: "ASC" },
    { field: "group_name", display: false }
  ]}
  bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
  bsValue="1" // ค่าเริ่มต้น = code ของ option
  cacheKey="comboBoxItemsCache"
  loadOnOpen={true}
  bsOnChange={(val) => console.log("เลือก platform:", val)} 
/>
// Single
<BsAutoComplete
  bsModel="single"
  bsTitle="เลือก Item เดียว"
  bsPreObj="combo_box_id"
  bsObj="sec.t_com_combobox_item"
  bsColumes={[
    { field: "combo_box_id", display: false },
    { field: "value_member", display: true, order_by: "ASC" },
    { field: "group_name", display: false }
  ]}
  bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
  bsValue="2"
  cacheKey="comboBoxItemsCache"
  bsOnChange={(val) => console.log("เลือก item:", val)}
/>
// multi
<BsAutoComplete
  bsModel="multi"
  bsTitle="เลือกหลายค่า"
  bsPreObj="combo_box_id"
  bsObj="sec.t_com_combobox_item"
  bsColumes={[
    { field: "combo_box_id", display: false },
    { field: "value_member", display: true, order_by: "ASC" },
    { field: "group_name", display: false }
  ]}
  bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
  bsValue={["1", "3"]} 
  cacheKey="comboBoxItemsCache"
  bsOnChange={(val) => console.log("เลือกหลายค่า:", val)}
/>

```
### BSAlert Components

1.BSAlert

```jsx
import BSAlert from "./BSAlert";

<BSAlert
  open={true}
  severity="success"   // success | info | warning | error
  variant="filled"     // standard | outlined | filled
  title="บันทึกสำเร็จ"
  message="ข้อมูลถูกบันทึกเรียบร้อยแล้ว"
  onClose={() => console.log("alert closed")}
/>

```
2.BSAlertSnackbar

```jsx
import BSAlertSnackbar from "./BSAlertSnackbar";
import { useState } from "react";

function DemoSnackbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Show Snackbar</button>
      <BSAlertSnackbar
        open={open}
        message="เซฟข้อมูลเรียบร้อยแล้ว!"
        severity="success"
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

```
3.BSAlertSwal2

```jsx
import BSAlertSwal2 from "./BSAlertSwal2";

// แบบกำหนด options เอง
BSAlertSwal2.fire({
  title: "ลบข้อมูล?",
  text: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "ใช่, ลบเลย",
});

// แบบใช้ shortcut
BSAlertSwal2.show("success", "บันทึกเรียบร้อยแล้ว!");

```
### TopLinearProgress
```jsx
import TopLinearProgress from "./TopLinearProgress";
import { useState } from "react";

function DemoTopProgress() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <button onClick={() => setLoading(true)}>Start Loading</button>
      <button onClick={() => setLoading(false)}>Stop Loading</button>
      <TopLinearProgress open={loading} />
    </>
  );
}

```
### DynamicController API

```http
# Enhanced BS Platform endpoint
POST /api/dynamic/bs-datagrid
{
  "tableName": "t_wms_customer",
  "preObj": "default",
  "columns": "id,name,email",
  "customWhere": "status='active'",
  "page": 1,
  "pageSize": 25
}

# Bulk operations
POST /api/dynamic/bulk-create
PUT /api/dynamic/bulk-update
DELETE /api/dynamic/bulk-delete

# ComboBox data
POST /api/dynamic/combobox
```

---

## 📁 Project Structure

```
BS-Platform/
├── BS-API-Core/              # Backend API
│   ├── Controllers/
│   │   └── DynamicController.cs    # 🆕 Enhanced with BS support
│   │   └── AutoCompleteController.cs    # 🆕 Enhanced with BS support
│   ├── Models/Dynamic/
│   └── docs/
│       └── DynamicController-API.md # 🆕 API Documentation
├── BS-Web/Frontend-Core/     # Frontend React
│   ├── src/components/
│   │   └── BSDataGrid.js           # 🆕 Main DataGrid component
│   │   └── BsAutoComplete.js       # 🆕 Main AutoComplete component
│   │   └── BSAlert.js              # 🆕 Main BSAlert component
│   │   └── BSAlertSnackbar.js      # 🆕 Main BSAlertSnackbar component
│   │   └── BSAlertSwal2.js         # 🆕 Main BSAlertSwal2  component
│   │   └── TopLinearProgress.js    # 🆕 Main TopLinearProgress component
│   ├── src/hooks/
│   │   └── useDynamicCrud.js       # 🆕 Enhanced with BS endpoints
│   ├── src/examples/
│   │   └── BSDataGridExamples.js   # 🆕 Usage examples
│   │   └── BSAutoCompleteExamples.js   # 🆕 Usage examples
│   └── docs/
│       └── BSDataGrid.md           # 🆕 Component documentation
│       └── BsAutoComplete.md           # 🆕 Component documentation
└── docs/
    └── BSDataGrid-Integration.md   # 🆕 Integration guide
```

---

## 🔗 Documentation

### Component Documentation

- [📋 BSDataGrid Component](./BS-Web/Frontend-Core/docs/BSDataGrid.md)
- [📋 BsAutoComplete Component](./BS-Web/Frontend-Core/docs/BsAutoComplete.md)
- [📋 BSAlert Component](./BS-Web/Frontend-Core/docs/BSAlert.md)
- [📋 TopLinearProgress Component](./BS-Web/Frontend-Core/docs/TopLinearProgress.md)
- [📝 BSDataGrid Examples](./BS-Web/Frontend-Core/src/examples/BSDataGridExamples.js)
- [📝 BsAutoComplete Examples](./BS-Web/Frontend-Core/src/examples/BSAutoCompleteExamples.js)
### API Documentation

- [🔌 DynamicController API](./BS-API-Core/docs/DynamicController-API.md)
- [🔗 Integration Guide](./docs/BSDataGrid-Integration.md)

---

## ⚡ Features

### BSDataGrid Component

- 🎛️ **MUI X DataGrid Pro** integration
- 📊 **Dynamic table generation** from metadata
- 🌐 **BS Platform properties** support
- 📦 **Bulk operations** (add/edit/delete)
- 📌 **Column pinning** and filtering
- 🌍 **Localization** (Thai/English)
- 🔽 **ComboBox columns** with API integration
- ✅ **Required field validation**
- 📱 **Responsive design**

### DynamicController API

- 🚀 **Auto-endpoint selection** (BS vs Standard)
- 📡 **BS Platform optimized** endpoints
- 📦 **Bulk CRUD operations**
- 🔽 **ComboBox data** endpoints
- 🔒 **Security & validation**
- 📊 **Performance optimized**
- 🔄 **Backward compatible**

---

## 🛠️ Development

### Prerequisites

- .NET 9.0+
- React 18+
- MUI X DataGrid Pro License
- SQL Server Database

### Setup

```bash
# Clone repository
git clone https://github.com/phayungsakp/bs-platform.git
cd bs-platform

# Backend setup
cd BS-API-Core/ApiCore
dotnet restore
dotnet build

# Frontend setup
cd ../../BS-Web/Frontend-Core
npm install
npm start
```

### Testing

```bash
# Backend tests
cd BS-API-Core/ApiCore
dotnet test

# Frontend tests
cd BS-Web/Frontend-Core
npm test
```

---

## 📝 Migration Guide

### From Legacy DataGrid

```jsx
// Before
<DynamicDataGrid tableName="dbo.Users" />

// After
<BSDataGrid bsObj="Users" bsPreObj="default" />
```

### Key Benefits

1. **Better Performance** - Optimized API endpoints
2. **More Features** - Bulk operations, ComboBox, etc.
3. **BS Integration** - Native BS Platform support
4. **Future-proof** - Built on latest MUI X DataGrid Pro

---

## 🚨 Breaking Changes

### None for existing code

- Legacy `tableName` prop still works
- Existing API endpoints remain functional
- Gradual migration possible

---

## 📞 Support

### Team Contacts

- **Backend API:** Backend Development Team
- **Frontend UI:** Frontend Development Team
- **Documentation:** Technical Writing Team

### Resources

- [Component Documentation](./BS-Web/Frontend-Core/docs/)
- [API Documentation](./BS-API-Core/docs/)
- [Integration Examples](./docs/)

---

**Version:** 1.0.0  
**Last Updated:** September 2025  
**License:** Internal BS Platform Project

## Git Workflow

- `main` → production
- `develop` → integration
- `feature/*` → พัฒนา feature ใหม่
- `hotfix/*` → แก้ปัญหาด่วน

```bash
git clone https://github.com/phayungsakp/bs-platform.git
cd bs-platform
git checkout -b feature/ชื่อฟีเจอร์
```
### Docker
- `Dockerfile` คือ file ที่กำหนดให้ container ที่จะสร้างมีลักษณะเป็นอย่างไร
- `docker-compose.yml` คือ file ที่รวมคำสั่งต่างๆที่ใช้สั่ง สร้าง container จาก Dockerfile

```
BS-Platform/
├── BS-API-Core/                # Backend API
│   └── Dockerfile              # Dockerfile bs api core
├── BS-API-Secure/              # Backend API
│   ├── ApiGateway/
│   |   ├── ocelot.js           # config url
│   │   └── Dockerfile          # Dockerfile api gateway
│   └── Authentication
│       └── Dockerfile          # Dockerfile api authen
└── docker-compose.yml         

```
คำสั่ง
docker-compose up -d                   # จะ build และ run container ทั้งหมดที่ถูกเขียนไว้ใน docker-compose.yml
docker-compose build <ชื่อ container>    # จะ build container ตามที่กำหนด แต่ container จะไม่ถูก run