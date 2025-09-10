# BS-Platform

Umbrella project ของ BS รวมระบบทั้งหมด:

- BS-API-Core → ระบบหลัก + DynamicController (Enhanced)
- BS-API-Secure → Security API
- BS-Web → React Frontend + BSDataGrid Component

## 🆕 Latest Updates

### BSDataGrid + DynamicController Integration (Sep 2025)

- ✅ **Enhanced DynamicController** รองรับ BS Platform properties
- ✅ **BSDataGrid Component** พร้อม MUI X DataGrid Pro integration
- ✅ **Bulk Operations** API endpoints สำหรับ bulk add/edit/delete
- ✅ **ComboBox Integration** สำหรับ dropdown columns
- ✅ **Auto-endpoint Selection** เลือก API endpoint อัตโนมัติ
- ✅ **Backward Compatible** รองรับ legacy code

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
│   ├── Models/Dynamic/
│   └── docs/
│       └── DynamicController-API.md # 🆕 API Documentation
├── BS-Web/Frontend-Core/     # Frontend React
│   ├── src/components/
│   │   └── BSDataGrid.js           # 🆕 Main DataGrid component
│   ├── src/hooks/
│   │   └── useDynamicCrud.js       # 🆕 Enhanced with BS endpoints
│   ├── src/examples/
│   │   └── BSDataGridExamples.js   # 🆕 Usage examples
│   └── docs/
│       └── BSDataGrid.md           # 🆕 Component documentation
└── docs/
    └── BSDataGrid-Integration.md   # 🆕 Integration guide
```

---

## 🔗 Documentation

### Component Documentation

- [📋 BSDataGrid Component](./BS-Web/Frontend-Core/docs/BSDataGrid.md)
- [📝 BSDataGrid Examples](./BS-Web/Frontend-Core/src/examples/BSDataGridExamples.js)

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
