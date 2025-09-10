# DynamicController API Documentation

## Overview

DynamicController เป็น API Controller ที่รองรับการจัดการข้อมูลแบบ dynamic สำหรับตารางใดๆ ใน database โดยรองรับทั้ง standard DataGrid และ BS Platform integration

## Base URL

```
/api/dynamic
```

## Authentication

ต้องมี JWT token ใน Authorization header:

```
Authorization: Bearer <jwt-token>
```

---

## Standard DataGrid Endpoints

### 1. Get Table Metadata

```http
GET /metadata/{tableName}?schemaName={schema}
```

**Parameters:**

- `tableName` (required): ชื่อตาราง
- `schemaName` (optional): Schema name (default: "dbo")

**Response:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "tableType": "Table",
  "columns": [
    {
      "columnName": "id",
      "dataType": "int",
      "isNullable": false,
      "isPrimaryKey": true,
      "isIdentity": true
    }
  ],
  "primaryKeys": ["id"],
  "totalRows": 1500
}
```

### 2. Get DataGrid Data (Standard)

```http
POST /datagrid
```

**Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "start": 0,
  "end": 25,
  "sortModel": [
    {
      "field": "name",
      "sort": "asc"
    }
  ],
  "filterModel": {
    "items": [
      {
        "field": "status",
        "operator": "equals",
        "value": "active"
      }
    ],
    "logicOperator": "and"
  }
}
```

**Response:**

```json
{
  "rows": [
    {
      "data": {
        "id": 1,
        "name": "Customer 1",
        "email": "customer1@example.com"
      }
    }
  ],
  "rowCount": 100,
  "tableMetadata": {...},
  "columnDefinitions": [...]
}
```

---

## BS Platform Enhanced Endpoints

### 3. Get BSDataGrid Data (Enhanced)

```http
POST /bs-datagrid
```

**Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "page": 1,
  "pageSize": 25,
  "sortModel": [
    {
      "field": "name",
      "sort": "asc"
    }
  ],
  "filterModel": {
    "items": [],
    "logicOperator": "and"
  },
  // BS Platform specific properties
  "preObj": "default",
  "columns": "id,name,email,status",
  "customWhere": "status='active' AND created_date >= '2024-01-01'",
  "customOrderBy": "name asc, created_date desc"
}
```

**Features:**

- Auto-mapping: `page`/`pageSize` → `start`/`end`
- Parse `columns` string to `selectColumns` array
- Parse `customOrderBy` to `sortModel`
- Inject `customWhere` to `filterModel`

---

## Bulk Operations

### 4. Bulk Create

```http
POST /bulk-create
```

**Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "createBy": "user123",
  "dataItems": [
    {
      "name": "Customer A",
      "email": "a@example.com"
    },
    {
      "name": "Customer B",
      "email": "b@example.com"
    }
  ]
}
```

**Response:**

```json
{
  "message": "Bulk create completed: 2 successful, 0 failed",
  "successful": 2,
  "failed": 0,
  "results": [...],
  "errors": []
}
```

### 5. Bulk Update

```http
PUT /bulk-update
```

**Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "updateBy": "user123",
  "updateItems": [
    {
      "data": {
        "name": "Updated Name"
      },
      "whereConditions": {
        "id": 1
      }
    }
  ]
}
```

### 6. Bulk Delete

```http
DELETE /bulk-delete
```

**Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "schemaName": "dbo",
  "whereConditions": [{ "id": 1 }, { "id": 2 }]
}
```

---

## ComboBox Support

### 7. Get ComboBox Data

```http
POST /combobox
```

**Request Body:**

```json
{
  "tableName": "t_wms_status",
  "schemaName": "dbo",
  "preObj": "default",
  "valueField": "id",
  "displayField": "name",
  "customWhere": "active=1",
  "customOrderBy": "name asc",
  "defaultOption": "--- Select Status ---",
  "maxItems": 1000
}
```

**Response:**

```json
[
  {
    "value": "",
    "display": "--- Select Status ---",
    "data": {}
  },
  {
    "value": 1,
    "display": "Active",
    "data": {
      "id": 1,
      "name": "Active",
      "active": 1
    }
  },
  {
    "value": 2,
    "display": "Inactive",
    "data": {
      "id": 2,
      "name": "Inactive",
      "active": 0
    }
  }
]
```

---

## Standard CRUD Operations

### 8. Get Single Record

```http
POST /record/{tableName}?schemaName={schema}
```

### 9. Create Record

```http
POST /create
```

### 10. Update Record

```http
PUT /update
```

### 11. Delete Record

```http
DELETE /delete
```

---

## Schema Exploration

### 12. Get Database Schema

```http
POST /schema
```

### 13. Check Table Exists

```http
GET /exists/{tableName}?schemaName={schema}
```

---

## Stored Procedures

### 14. Execute Stored Procedure

```http
POST /procedure/{procedureName}?schemaName={schema}
```

### 15. Get Procedure Metadata

```http
GET /procedure-metadata/{procedureName}?schemaName={schema}
```

---

## Custom Queries

### 16. Execute Custom Query

```http
POST /query
```

**Request Body:**

```json
"SELECT id, name FROM t_wms_customer WHERE status = @status"
```

**Query Parameters:**

```
?parameters[status]=active
```

---

## Error Responses

**400 Bad Request:**

```json
{
  "message": "Table 'dbo.invalid_table' not found"
}
```

**401 Unauthorized:**

```json
{
  "message": "Unauthorized access"
}
```

**404 Not Found:**

```json
{
  "message": "Record not found"
}
```

**500 Internal Server Error:**

```json
{
  "message": "Error retrieving data: {error details}"
}
```

---

## Usage with BSDataGrid

### Auto-Endpoint Selection

BSDataGrid จะเลือกใช้ endpoint อัตโนมัติ:

```javascript
// ถ้ามี BS properties → /bs-datagrid
<BSDataGrid
  bsObj="t_wms_customer"
  bsPreObj="default"
  bsCols="id,name"
/>

// ถ้าไม่มี BS properties → /datagrid
<BSDataGrid tableName="dbo.Users" />
```

### Performance Optimization

1. **Use Column Selection:**

   ```jsx
   bsCols = "id,name,email"; // ลด network traffic
   ```

2. **Use Custom WHERE:**

   ```jsx
   bsObjWh = "status='active'"; // กรองที่ server
   ```

3. **Appropriate Page Size:**
   ```jsx
   bsRowPerPage={50}  // ปรับตามความต้องการ
   ```

---

## Security Notes

1. **SQL Injection Protection:** ใช้ parameterized queries
2. **Authorization:** ตรวจสอบ JWT token
3. **Input Validation:** ตรวจสอบ input ทุก parameter
4. **Query Limitations:** Custom queries รองรับเฉพาะ SELECT
5. **Schema Restrictions:** จำกัดการเข้าถึง schema ตาม permissions

---

## Rate Limiting

- **Standard operations:** 100 requests/minute
- **Bulk operations:** 10 requests/minute
- **Schema exploration:** 20 requests/minute

---

## Monitoring & Logging

API จะ log ข้อมูลสำคัญ:

- Request parameters
- Query execution time
- Error details
- Performance metrics

---

## Version Information

- **API Version:** 1.0
- **Compatible with:** BSDataGrid v1.0+, MUI X DataGrid Pro
- **Last Updated:** September 2025
