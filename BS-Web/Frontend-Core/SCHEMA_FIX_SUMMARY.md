# 🎯 Schema Mapping Fix - Summary Report

## 📋 Overview

แก้ไขปัญหา BSDataGrid ที่ส่ง `bsPreObj="sec"` แต่ API ยังใช้ `schemaName=tmt` แทนที่จะใช้ `schemaName=sec`

## 🔧 Changes Made

### 1. Created SchemaMapping Utility (`src/utils/SchemaMapping.js`)

```javascript
// Core utility for mapping bsPreObj to actual database schema names
export const mapPreObjToSchema = (preObj) => {
  const schemaMap = {
    default: "tmt", // Default maps to tmt
    sec: "sec", // Security maps to sec
    dbo: "dbo", // DBO maps to dbo
    tmt: "tmt", // TMT maps to tmt
  };
  return schemaMap[preObj] || schemaMap.default;
};

export const getSchemaFromPreObj = (preObj) => {
  const schema = mapPreObjToSchema(preObj);
  Logger.log("🗺️ Schema mapping:", { preObj, schema });
  return schema;
};
```

### 2. Enhanced useDynamicCrud Hook (`src/hooks/useDynamicCrud.js`)

#### ✅ Updated Functions:

- **`loadMetadata(preObj)`** - Added preObj parameter for schema mapping
- **`getTableData(params = {})`** - Uses preObj from params for schema resolution
- **`createRecord(recordData, preObj)`** - Added preObj parameter support
- **`updateRecord(id, updates, preObj)`** - Added preObj parameter support
- **`deleteRecord(id, preObj)`** - Added preObj parameter support
- **`executeStoredProcedure(procedureName, params, preObj)`** - Added preObj parameter support
- **`bulkCreate(records, preObj)`** - Added preObj parameter support
- **`bulkUpdate(updates, preObj)`** - Added preObj parameter support
- **`bulkDelete(conditions, preObj)`** - Added preObj parameter support

#### 🔍 Schema Resolution Logic:

```javascript
// Pattern used in all CRUD functions:
let schema, table;
if (preObj) {
  // Use schema mapping from preObj
  schema = getSchemaFromPreObj(preObj);
  table = tableName; // tableName should be just table name when preObj is used
  Logger.log("🗺️ Using preObj schema mapping for [OPERATION]:", {
    preObj,
    schema,
    table,
  });
} else {
  // Parse tableName for schema.table format
  const parsed = parseTableName(tableName);
  schema = parsed.schema;
  table = parsed.table;
  Logger.log("📊 Using parsed tableName for [OPERATION]:", { schema, table });
}
```

### 3. Updated BSDataGrid Component (`src/components/BSDataGrid.js`)

- **`loadMetadata(bsPreObj)`** - Passes bsPreObj parameter to hook
- **Refresh functions** - Updated to pass bsPreObj when reloading metadata

### 4. Created Test Components

#### 🧪 SchemaTestPage.js

- Tests metadata loading with different preObj values
- Shows API calls and schema mapping in console

#### 🧪 SchemaMappingDemo.js

- Interactive demo showing schema mapping behavior
- Tests different bsPreObj values

#### 🧪 CRUDTestPage.js

- Comprehensive test of all CRUD operations with schema mapping
- Tests both preObj and default schema parsing
- Validates create, update, delete, bulk operations, and stored procedures

## 📊 Schema Mapping Rules

| bsPreObj Value   | Maps to Schema | Use Case                |
| ---------------- | -------------- | ----------------------- |
| `"sec"`          | `"sec"`        | Security-related tables |
| `"dbo"`          | `"dbo"`        | Database owner schema   |
| `"tmt"`          | `"tmt"`        | TMT schema tables       |
| `null/undefined` | `"tmt"`        | Default fallback        |

## 🔍 How to Verify the Fix

### 1. Check Console Logs

Look for these log patterns:

```
🗺️ Using preObj schema mapping for [OPERATION]: { preObj: "sec", schema: "sec", table: "t_com_user" }
📊 Using parsed tableName for [OPERATION]: { schema: "tmt", table: "t_com_user" }
```

### 2. Monitor Network Requests

API calls should now show:

- **With bsPreObj="sec"**: `schemaName=sec`
- **Without bsPreObj**: `schemaName=tmt`

### 3. Test Pages

- `/test/schema-test` - Basic schema mapping test
- `/test/schema-demo` - Interactive demo
- `/test/crud-test` - Complete CRUD operations test

## 🐛 Before vs After

### ❌ Before (Bug):

```javascript
// BSDataGrid with bsPreObj="sec"
<BSDataGrid tableName="t_com_user" bsPreObj="sec" />

// API Call Made:
GET /dynamic/metadata/t_com_user?schemaName=tmt  // Wrong!
```

### ✅ After (Fixed):

```javascript
// BSDataGrid with bsPreObj="sec"
<BSDataGrid tableName="t_com_user" bsPreObj="sec" />

// API Call Made:
GET /dynamic/metadata/t_com_user?schemaName=sec  // Correct!
```

## 🚀 Implementation Status

### ✅ Completed:

- [x] Schema mapping utility
- [x] Metadata loading with preObj
- [x] Data loading with preObj
- [x] All CRUD operations (create, update, delete)
- [x] Bulk operations (bulkCreate, bulkUpdate, bulkDelete)
- [x] Stored procedure execution
- [x] BSDataGrid integration
- [x] Test components and validation

### 📋 Usage Examples:

```javascript
// Direct hook usage with preObj
const { createRecord } = useDynamicCrud("t_com_user");
await createRecord(userData, "sec"); // Uses schema "sec"

// BSDataGrid usage
<BSDataGrid tableName="t_com_user" bsPreObj="sec" />;
// Automatically maps "sec" -> "sec" schema for all operations
```

## 🎯 Expected Results:

1. **Schema Resolution**: `bsPreObj="sec"` → `schemaName=sec` in API calls
2. **CRUD Operations**: All database operations use correct schema
3. **Error Prevention**: No more "Table 'tmt.t_com_user' not found" errors
4. **Backward Compatibility**: Existing code without preObj still works with default parsing

## 🔧 Files Modified:

1. `src/utils/SchemaMapping.js` - NEW
2. `src/hooks/useDynamicCrud.js` - ENHANCED
3. `src/components/BSDataGrid.js` - UPDATED
4. `src/components/CRUDTestPage.js` - NEW (test)
5. `src/test/SchemaTestPage.js` - NEW (test)
6. `src/test/SchemaMappingDemo.js` - NEW (test)

---

_Schema mapping fix completed - All CRUD operations now properly respect bsPreObj parameter_ 🎉
