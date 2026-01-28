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

// Advanced usage with bsBulkMode
<BSDataGrid
  bsObj="t_wms_customer"
  bsPreObj="default"
  bsCols="id,name,email,status"
  bsBulkMode={{
    enable: true,
    add: true,
    edit: true,
    delete: true,
    addInline: false,
    showCheckbox: true
  }}
  bsComboBox={[{
    Column: "status",
    Obj: "t_wms_status",
    Value: "id",
    Display: "name"
  }]}
/>

// Enhanced Stored Procedure usage
<BSDataGrid
  bsStoredProcedure="usp_tmt_my_task"
  bsStoredProcedureSchema="tmt"
  bsStoredProcedureParams={{ TaskStatus: "Open" }}
  bsKeyId="project_task_id"
  bsAutoPermission={true}
  bsCellTooltip={true}
  bsColumnDefs={[
    { field: "assignee_list", type: "stringAvatar", headerName: "Assignees" },
    { field: "priority", width: 100 }
  ]}
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
  severity="success" // success | info | warning | error
  variant="filled" // standard | outlined | filled
  title="บันทึกสำเร็จ"
  message="ข้อมูลถูกบันทึกเรียบร้อยแล้ว"
  onClose={() => console.log("alert closed")}
/>;
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

### BSGanttChart Component

```jsx
import BSGanttChart from "../components/BSGanttChart";
import { useRef } from "react";

function GanttPage() {
  const ganttRef = useRef(null);

  return (
    <BSGanttChart
      ref={ganttRef}
      procedureName="tmt.usp_tmt_dashboard_project_timeline"
      title="Project Timeline"
      height={600}
      showDateFilter={true}
      showEmployeeFilter={true}
      initialScale="day"
      bsLocale="th"
    />
  );
}
```

### BSFilterCustom Component

```jsx
import BSFilterCustom from "../components/BSFilterCustom";
import BSDataGrid from "../components/BSDataGrid";
import { useState } from "react";

function FilteredDataGrid() {
  const [filters, setFilters] = useState([]);

  return (
    <>
      <BSFilterCustom
        bsFilterField={[
          { field: "status", headerName: "Status", type: "string" },
          { field: "priority", headerName: "Priority", type: "string" },
          { field: "created_date", headerName: "Created", type: "date" },
        ]}
        bsFilterValue={filters}
        bsFilterValueOnChanage={setFilters}
        bsSearch={true}
        bsClear={true}
      />
      <BSDataGrid
        bsObj="t_wms_customer"
        bsCustomFilters={filters}
        bsFilterMode="client"
      />
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
│   ├── SQL/                    # 🆕 Stored Procedures
│   └── docs/
│       └── DynamicController-API.md # 🆕 API Documentation
├── BS-Web/Frontend-Core/     # Frontend React
│   ├── src/components/
│   │   └── BSDataGrid/             # 🆕 Main DataGrid component
│   │   └── BSGanttChart/           # 🆕 Gantt Chart component
│   │   └── BsAutoComplete.js       # 🆕 Main AutoComplete component
│   │   └── BSAlert.js              # 🆕 Main BSAlert component
│   │   └── BSAlertSnackbar.js      # 🆕 Main BSAlertSnackbar component
│   │   └── BSAlertSwal2.js         # 🆕 Main BSAlertSwal2  component
│   │   └── BSFilterCustom.js       # 🆕 Custom Filter component
│   │   └── TopLinearProgress.js    # 🆕 Main TopLinearProgress component
│   ├── src/hooks/
│   │   └── useDynamicCrud.js       # 🆕 Enhanced with BS endpoints
│   ├── src/examples/
│   │   └── BSDataGridExamples.js   # 🆕 Usage examples
│   │   └── BSAutoCompleteExamples.js   # 🆕 Usage examples
│   └── docs/
│       └── BSDataGrid.md           # 🆕 Component documentation
│       └── BSGanttChart.md         # 🆕 Gantt Chart documentation
│       └── BsAutoComplete.md       # 🆕 Component documentation
└── docs/
    └── BSDataGrid-Integration.md   # 🆕 Integration guide
```

---

## 🔗 Documentation

### Component Documentation

- [📋 BSDataGrid Component](./BS-Web/Frontend-Core/docs/BSDataGrid.md)
- [📋 BSGanttChart Component](./BS-Web/Frontend-Core/docs/BSGanttChart.md)
- [📋 BsAutoComplete Component](./BS-Web/Frontend-Core/docs/BsAutoComplete.md)
- [📋 BSAlert Component](./BS-Web/Frontend-Core/docs/BSAlert.md)
- [📋 BSFilterCustom Component](./BS-Web/Frontend-Core/docs/BSFilterCustom.md)
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
- 📦 **Bulk operations** (add/edit/delete) with consolidated `bsBulkMode`
- 📌 **Column pinning** and filtering
- 🌍 **Localization** (Thai/English)
- 🔽 **ComboBox columns** with API integration
- ✅ **Required field validation**
- 📱 **Responsive design**
- 🔒 **Auto Permission** from menu settings
- 📝 **Cell Tooltips** for truncated text
- 🗂️ **Enhanced Stored Procedures** support
- 👥 **Master-Detail** hierarchical data

### BSGanttChart Component

- 📅 **SVAR React Gantt** (MIT License) integration
- 📈 **Hierarchical Display** (User → Project → Task)
- 🗓️ **Date Range Filtering** with multi-user support
- 🔍 **Configurable Scales** (Day/Week/Month)
- 🔎 **Zoom Support**
- 🏖️ **Holiday Highlighting** (purple color)
- 🖥️ **Fullscreen Mode**
- 🌙 **Dark Mode Support**
- 🌍 **Localization** (Thai/English)

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

## 📋 Changelog

### v1.3.0 (January 2026)

#### BSDataGrid

- ✨ **NEW:** `bsBulkMode` - Consolidated bulk mode configuration object
- ✨ **NEW:** `bsAutoPermission` - Auto-apply permissions from menu settings (default: true)
- ✨ **NEW:** `bsCellTooltip` - Show tooltip when cell text overflows (default: true)
- ✨ **NEW:** `bsStoredProcedureCrud` - Use stored procedure for CRUD operations
- ✨ **NEW:** `bsRowConfig` - Function to configure each row dynamically
- 🐛 **FIX:** `quickFilterValues` array to string conversion for API compatibility
- 🐛 **FIX:** Column width calculation issue when grid is initially collapsed

#### BSGanttChart

- ✨ **NEW:** Holiday highlighting (purple color)
- ✨ **NEW:** Fullscreen mode support
- ✨ **NEW:** Expand/Collapse all functionality
- ✨ **NEW:** Sticky headers on scroll
- ✨ **NEW:** Original date tracking (`originalStartDate`, `originalEndDate`)
- 🐛 **FIX:** Multi-user filter in stored procedure (XML parsing fix)
- 📝 **DOC:** Complete documentation update

#### Stored Procedures

- 🐛 **FIX:** `usp_tmt_dashboard_project_timeline` - Changed from Temp Table to Table Variable for better query optimization
- 🐛 **FIX:** XML XPath query changed from `.nodes('/XMLData')` to `.nodes('//data_read')`
- ✨ **NEW:** Added `OPTION(RECOMPILE)` for consistent query execution

### v1.2.0 (December 2025)

#### BSDataGrid

- ✨ **NEW:** Enhanced Stored Procedure support with `bsStoredProcedure`, `bsStoredProcedureSchema`, `bsStoredProcedureParams`
- ✨ **NEW:** `bsKeyId` for manual primary key specification
- ✨ **NEW:** `bsChildGrids` for Master-Detail hierarchical data
- ✨ **NEW:** `bsDialogTab` for organized form tabs
- ✨ **NEW:** `stringAvatar` column type for displaying avatars from names
- ✨ **NEW:** `attachFile` column type with file management dialog
- 🔧 **IMPROVE:** Bulk operations performance

#### BSGanttChart

- ✨ **NEW:** Initial release with SVAR React Gantt integration
- ✨ **NEW:** Hierarchical display (User → Project → Task)
- ✨ **NEW:** Date range and employee filtering
- ✨ **NEW:** Configurable scales (Day/Week/Month)

### v1.1.0 (October 2025)

#### BSDataGrid

- ✨ **NEW:** `bsFilterMode` - Server/Client side filtering
- ✨ **NEW:** `bsCustomFilters` integration with BSFilterCustom
- ✨ **NEW:** `bsComboBox` for dropdown columns
- ✨ **NEW:** `bsColumnDefs` for custom column definitions
- ✨ **NEW:** Export functionality with `bsExportFileName`

### v1.0.0 (September 2025)

#### Initial Release

- ✨ BSDataGrid component with MUI X DataGrid Pro
- ✨ BsAutoComplete component
- ✨ BSAlert components (Alert, Snackbar, Swal2)
- ✨ TopLinearProgress component
- ✨ DynamicController API with BS Platform support
- ✨ Bulk operations (Add, Edit, Delete)
- ✨ Localization (Thai/English)

---

**Version:** 1.3.0  
**Last Updated:** January 2026  
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

---

## Docker

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

### คำสั่ง

- `docker-compose up -d` # จะ build และ run container ทั้งหมดที่ถูกเขียนไว้ใน docker-compose.yml
- `docker-compose build <ชื่อ container>` # จะ build container ตามที่กำหนด แต่ container จะไม่ถูก run
