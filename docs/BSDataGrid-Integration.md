# BSDataGrid + DynamicController Integration Guide

## Overview

คู่มือการใช้งาน BSDataGrid ร่วมกับ DynamicController ที่ได้รับการปรับปรุงให้รองรับ BS Platform เต็มรูปแบบ

## Architecture Overview

```mermaid
graph TB
    A[BSDataGrid Component] --> B[useDynamicCrud Hook]
    B --> C{Auto-Detect BS Properties}
    C -->|Has BS Props| D[/api/dynamic/bs-datagrid]
    C -->|Legacy Mode| E[/api/dynamic/datagrid]
    D --> F[DynamicController]
    E --> F
    F --> G[Database]

    H[Bulk Operations] --> I[/api/dynamic/bulk-*]
    J[ComboBox Data] --> K[/api/dynamic/combobox]
    I --> F
    K --> F
```

---

## Quick Start

### 1. Basic Usage

```jsx
import BSDataGrid from "../components/BSDataGrid";

function CustomerList() {
  return (
    <BSDataGrid
      bsObj="t_wms_customer" // Table name
      bsPreObj="default" // Schema prefix
      height={600}
    />
  );
}
```

**API Calls Generated:**

1. `GET /api/dynamic/metadata/t_wms_customer?schemaName=dbo`
2. `POST /api/dynamic/bs-datagrid` (with BS properties)

### 2. With Column Selection

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsCols="id,name,email,phone,status"
  bsObjBy="name asc"
  bsObjWh="status='active'"
/>
```

**API Request Body:**

```json
{
  "tableName": "t_wms_customer",
  "preObj": "default",
  "columns": "id,name,email,phone,status",
  "customOrderBy": "name asc",
  "customWhere": "status='active'",
  "page": 1,
  "pageSize": 25
}
```

---

## Advanced Features

### 3. Bulk Operations

```jsx
function BulkExample() {
  return (
    <BSDataGrid
      bsObj="t_wms_customer"
      bsBulkEdit={true}
      bsBulkAdd={true}
      onCheckBoxSelected={(rows) => console.log("Selected:", rows)}
    />
  );
}
```

**Generated API Calls:**

- **Bulk Add:** `POST /api/dynamic/bulk-create`
- **Bulk Edit:** `PUT /api/dynamic/bulk-update`
- **Bulk Delete:** `DELETE /api/dynamic/bulk-delete`

### 4. ComboBox Integration

```jsx
const statusComboBox = [
  {
    Column: "status",
    Display: "name",
    Value: "id",
    Default: "--- Select Status ---",
    PreObj: "default",
    Obj: "t_wms_status",
    ObjWh: "active=1",
    ObjBy: "name asc",
  },
];

<BSDataGrid bsObj="t_wms_customer" bsComboBox={statusComboBox} />;
```

**ComboBox API Call:**

```http
POST /api/dynamic/combobox
{
  "tableName": "t_wms_status",
  "preObj": "default",
  "valueField": "id",
  "displayField": "name",
  "customWhere": "active=1",
  "customOrderBy": "name asc",
  "defaultOption": "--- Select Status ---"
}
```

### 5. Column Pinning

```jsx
<BSDataGrid
  bsObj="t_wms_customer"
  bsPinColsLeft="id,name" // Pin left
  bsPinColsRight="actions" // Pin right
/>
```

---

## Migration Scenarios

### Scenario 1: Simple Migration

```jsx
// Before (Legacy)
<DynamicDataGrid tableName="dbo.Users" />

// After (BS Platform)
<BSDataGrid bsObj="Users" bsPreObj="default" />
```

### Scenario 2: Gradual Migration

```jsx
// Hybrid approach - still works
<BSDataGrid tableName="dbo.Users" />
// Uses: /api/dynamic/datagrid (standard endpoint)

// Full BS Platform
<BSDataGrid bsObj="Users" bsPreObj="default" />
// Uses: /api/dynamic/bs-datagrid (enhanced endpoint)
```

### Scenario 3: Feature Enhancement

```jsx
// Add BS features gradually
<BSDataGrid
  tableName="dbo.Users" // Legacy table format
  bsBulkEdit={true} // New bulk feature
  bsComboBox={comboConfig} // New ComboBox feature
/>
```

---

## Performance Optimization

### 1. Column Selection

```jsx
// ❌ Load all columns (slower)
<BSDataGrid bsObj="t_wms_customer" />

// ✅ Select only needed columns (faster)
<BSDataGrid
  bsObj="t_wms_customer"
  bsCols="id,name,email,status"
/>
```

### 2. Server-side Filtering

```jsx
// ❌ Load all data then filter (slower)
<BSDataGrid bsObj="t_wms_customer" />

// ✅ Filter at database level (faster)
<BSDataGrid
  bsObj="t_wms_customer"
  bsObjWh="status='active' AND created_date >= '2024-01-01'"
/>
```

### 3. Pagination Tuning

```jsx
// ✅ Adjust page size based on usage
<BSDataGrid
  bsObj="t_wms_customer"
  bsRowPerPage={50} // Increase for desktop
  // bsRowPerPage={10} // Decrease for mobile
/>
```

---

## Error Handling

### Client-side Error States

```jsx
function ErrorHandlingExample() {
  return (
    <BSDataGrid
      bsObj="t_wms_customer"
      onError={(error) => {
        console.error("DataGrid Error:", error);
        // Custom error handling
      }}
    />
  );
}
```

### Server-side Error Responses

```json
// Table not found
{
  "message": "Table 'dbo.invalid_table' not found"
}

// Bulk operation partial failure
{
  "message": "Bulk create completed: 3 successful, 1 failed",
  "successful": 3,
  "failed": 1,
  "errors": ["Failed to create record: Duplicate key"]
}
```

---

## Security Considerations

### 1. Table Access Control

```jsx
// BSDataGrid respects API-level security
<BSDataGrid
  bsObj="sensitive_table" // Will return 401 if no access
  bsPreObj="restricted" // Schema-level permissions
/>
```

### 2. SQL Injection Prevention

```jsx
// ✅ Safe - parameterized queries
<BSDataGrid
  bsObjWh="status='active'"
/>

// ✅ Safe - API validates input
<BSDataGrid
  bsObjWh="user_id=123"
/>
```

### 3. Custom Query Limitations

```sql
-- ✅ Allowed (SELECT only)
SELECT id, name FROM users WHERE active=1

-- ❌ Blocked (Write operations)
UPDATE users SET name='hacked'
DELETE FROM users
```

---

## Troubleshooting

### Common Issues

#### 1. No Data Displayed

```jsx
// Check table name and schema
<BSDataGrid
  bsObj="t_wms_customer"        // ✅ Correct
  bsPreObj="default"            // ✅ Correct schema
/>

// vs
<BSDataGrid
  bsObj="customer"              // ❌ Missing prefix
  bsPreObj="wrong_schema"       // ❌ Wrong schema
/>
```

#### 2. ComboBox Not Loading

```jsx
// Ensure ComboBox table exists and has data
const comboBox = [
  {
    Column: "status",
    Obj: "t_wms_status", // ✅ Table must exist
    Value: "id", // ✅ Field must exist
    Display: "name", // ✅ Field must exist
  },
];
```

#### 3. Bulk Operations Failing

- Check user permissions for INSERT/UPDATE/DELETE
- Verify table has primary key for updates
- Ensure required fields are provided

### Debug Mode

```jsx
// Enable debug logging
<BSDataGrid
  bsObj="t_wms_customer"
  debug={true} // Logs API calls to console
/>
```

---

## Best Practices

### 1. Component Structure

```jsx
// ✅ Good - Separate concerns
function CustomerManagement() {
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <div>
      <CustomerActions selected={selectedRows} />
      <BSDataGrid bsObj="t_wms_customer" onCheckBoxSelected={setSelectedRows} />
    </div>
  );
}
```

### 2. Configuration Management

```jsx
// ✅ Good - Centralized config
const customerGridConfig = {
  bsObj: "t_wms_customer",
  bsPreObj: "default",
  bsCols: "id,name,email,phone,status",
  bsRowPerPage: 25,
  bsComboBox: [statusComboBox, categoryComboBox],
};

<BSDataGrid {...customerGridConfig} />;
```

### 3. Event Handling

```jsx
// ✅ Good - Specific handlers
<BSDataGrid
  bsObj="t_wms_customer"
  onEdit={(row) => openEditModal(row)}
  onDelete={(id) => confirmDelete(id)}
  onAdd={() => openAddModal()}
  onCheckBoxSelected={(rows) => updateToolbar(rows)}
/>
```

---

## API Rate Limits

### Current Limits

- **Standard operations:** 100 requests/minute
- **Bulk operations:** 10 requests/minute
- **Schema operations:** 20 requests/minute

### Optimization Tips

```jsx
// ✅ Batch operations when possible
const bulkData = [item1, item2, item3];
// Use bulk-create instead of 3 separate creates

// ✅ Cache metadata
// BSDataGrid automatically caches table metadata

// ✅ Use pagination appropriately
<BSDataGrid bsRowPerPage={25} />; // Don't set too high
```

---

## Migration Checklist

### Pre-Migration

- [ ] Verify all tables exist in target database
- [ ] Check user permissions for all required operations
- [ ] Test API endpoints with sample data
- [ ] Backup existing configurations

### During Migration

- [ ] Update component imports
- [ ] Convert `tableName` props to `bsObj`/`bsPreObj`
- [ ] Add BS properties as needed
- [ ] Test functionality in development

### Post-Migration

- [ ] Monitor API performance
- [ ] Verify all features work correctly
- [ ] Update documentation
- [ ] Train users on new features

---

## Support

### Documentation

- [BSDataGrid Component Docs](./BSDataGrid.md)
- [DynamicController API Docs](../BS-API-Core/docs/DynamicController-API.md)

### Contact

- **Technical Issues:** BS Platform Development Team
- **API Questions:** Backend Team
- **UI/UX Issues:** Frontend Team

---

**Last Updated:** September 2025  
**Version:** BSDataGrid v1.0 + DynamicController v1.0
