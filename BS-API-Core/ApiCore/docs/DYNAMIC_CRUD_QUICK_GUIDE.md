# 🚀 Dynamic CRUD API - Quick Test Guide

## API Endpoints Summary

**Base URL**: `https://localhost:5083/api/dynamic`

### 🔍 Schema Exploration

```http
GET /dynamic/schemas
```

### 📊 Table Metadata

```http
GET /dynamic/metadata/{tableName}
```

### 📋 DataGrid Operations

```http
POST /dynamic/datagrid
Content-Type: application/json

{
  "tableName": "dbo.YourTable",
  "page": 1,
  "pageSize": 25,
  "sortField": "ColumnName",
  "sortDirection": "asc",
  "filters": [
    {
      "field": "Status",
      "operator": "eq",
      "value": "Active"
    }
  ]
}
```

### ✅ CRUD Operations

**Create Record:**

```http
POST /dynamic/create
Content-Type: application/json

{
  "tableName": "dbo.YourTable",
  "data": {
    "Name": "New Record",
    "Status": "Active",
    "CreatedDate": "2025-01-16"
  }
}
```

**Update Record:**

```http
PUT /dynamic/update
Content-Type: application/json

{
  "tableName": "dbo.YourTable",
  "id": 123,
  "data": {
    "Name": "Updated Name",
    "Status": "Inactive"
  }
}
```

**Delete Record:**

```http
DELETE /dynamic/delete
Content-Type: application/json

{
  "tableName": "dbo.YourTable",
  "id": 123
}
```

---

## 🎯 React Frontend Integration

### 1. Install Dependencies

```bash
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled
npm install axios @tanstack/react-query
```

### 2. Basic Usage

```tsx
import { DynamicDataGrid } from "./components/DynamicDataGrid";

function App() {
  return (
    <DynamicDataGrid
      tableName="dbo.Users"
      onEdit={(row) => console.log("Edit:", row)}
      onDelete={(id) => console.log("Delete:", id)}
    />
  );
}
```

### 3. Complete Documentation

📖 **[FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)** - Full React + MUI X integration guide

---

## ⚡ Key Features

- ✅ **Zero Configuration** - No Entity/Controller creation needed
- ✅ **MUI X DataGrid** - Server-side pagination, sorting, filtering
- ✅ **Auto Schema Discovery** - Runtime table/view exploration
- ✅ **Security Protected** - SQL injection prevention, schema restrictions
- ✅ **High Performance** - SqlDataReader optimization
- ✅ **Production Ready** - Comprehensive error handling

## 🔐 Security

- Only allows access to `dbo`, `app`, `data` schemas
- SQL injection protection via parameterized queries
- JWT authentication required for all endpoints

## 📈 Performance

- Server-side DataGrid processing
- SqlDataReader for optimal data retrieval
- Connection pooling and async operations
- Minimal memory footprint

---

**🎉 Result: Auto-generate CRUD for any table/view without writing Entity or Controller code!**
