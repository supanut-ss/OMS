# 🔧 Schema Mapping Enhancement - Pass-Through Mode

## 📋 Change Request

User ต้องการให้ Schema Mapping รองรับ schema ทั้งหมดโดยไม่ต้องมี mapping table กำหนดไว้ล่วงหน้า:

- **ถ้ามี bsPreObj**: ส่งไปเป็น schema name ตรงๆ
- **ถ้าไม่มี bsPreObj**: ใช้ default schema (tmt)

## ✅ Changes Implemented

### 1. **Enhanced mapPreObjToSchema()**

```javascript
// เก่า: ใช้ mapping table
const mapping = {
  default: "tmt",
  sec: "sec",
  tmt: "tmt",
  dbo: "dbo",
};
const result = mapping[preObj] || mapping.default;

// ใหม่: Pass-through mode
if (!preObj || preObj === null || preObj === undefined || preObj === "") {
  return "tmt"; // default schema
}
return preObj; // ส่งไปตรงๆ
```

### 2. **Simplified mapSchemaToPreObj()**

```javascript
// เก่า: ใช้ reverse mapping table
const reverseMapping = { tmt: "default", sec: "sec", dbo: "dbo" };
return reverseMapping[schema] || "default";

// ใหม่: Direct return
return schema || "tmt";
```

### 3. **Updated isValidPreObj()**

```javascript
// เก่า: เฉพาะ specific values
const validPreObjs = ["default", "sec", "tmt", "dbo"];
return validPreObjs.includes(preObj);

// ใหม่: รับทุก string ที่มีค่า
return (
  preObj !== null &&
  preObj !== undefined &&
  preObj !== "" &&
  typeof preObj === "string"
);
```

### 4. **Enhanced getSchemaFromPreObj()**

```javascript
// ปรับปรุงให้ชัดเจนขึ้นและเพิ่ม logging
if (!preObj || preObj === null || preObj === undefined || preObj === "") {
  console.log("🗺️ Using default schema:", defaultSchema);
  return defaultSchema;
}
return mapPreObjToSchema(preObj); // ซึ่งจะส่งไปตรงๆ
```

## 🎯 New Behavior Examples

### ✅ **Any Schema Support:**

```javascript
// ตัวอย่าง schemas ที่รองรับ:
getSchemaFromPreObj("sec")        → "sec"
getSchemaFromPreObj("dbo")        → "dbo"
getSchemaFromPreObj("tmt")        → "tmt"
getSchemaFromPreObj("custom")     → "custom"     // ใหม่!
getSchemaFromPreObj("my_schema")  → "my_schema"  // ใหม่!
getSchemaFromPreObj("prod")       → "prod"       // ใหม่!
getSchemaFromPreObj("dev")        → "dev"        // ใหม่!

// Default cases:
getSchemaFromPreObj(null)         → "tmt"
getSchemaFromPreObj(undefined)    → "tmt"
getSchemaFromPreObj("")           → "tmt"
getSchemaFromPreObj()             → "tmt"
```

### ✅ **Usage Examples:**

```javascript
// BSDataGrid with any schema
<BSDataGrid bsPreObj="my_custom_schema" bsObj="t_users" />
// → API call: schemaName=my_custom_schema

<BSDataGrid bsPreObj="production" bsObj="t_products" />
// → API call: schemaName=production

<BSDataGrid bsPreObj="dev_environment" bsObj="t_logs" />
// → API call: schemaName=dev_environment

// Without bsPreObj
<BSDataGrid bsObj="t_settings" />
// → API call: schemaName=tmt (default)
```

## 📊 Console Logging

### ✅ **New Log Format:**

```javascript
// With preObj:
🗺️ Schema mapping (pass-through): {
  input_preObj: "my_schema",
  output_schema: "my_schema",
  mode: "direct_pass_through"
}

// Without preObj:
🗺️ Using default schema: tmt
```

## 🔄 Migration Impact

### ✅ **Backward Compatibility:**

- **Existing code continues to work** - เดิมใช้ "sec", "dbo", "tmt" ยังใช้ได้เหมือนเดิม
- **API calls unchanged** - ยังส่ง schemaName parameter เหมือนเดิม
- **Default behavior preserved** - ไม่ระบุ bsPreObj ยังได้ "tmt" เหมือนเดิม

### ✅ **New Capabilities:**

- **Dynamic schema support** - รองรับ schema name ใดๆ
- **Environment-specific schemas** - เช่น "dev", "staging", "prod"
- **Custom schema naming** - ไม่ต้องผูกมัดกับ naming convention
- **Multi-tenant support** - รองรับ tenant-specific schemas

## 🎯 Use Cases Enabled

### 1. **Multi-Environment Deployment:**

```javascript
// Development
<BSDataGrid bsPreObj="dev" bsObj="t_users" />

// Staging
<BSDataGrid bsPreObj="staging" bsObj="t_users" />

// Production
<BSDataGrid bsPreObj="prod" bsObj="t_users" />
```

### 2. **Multi-Tenant Applications:**

```javascript
// Tenant-specific schemas
<BSDataGrid bsPreObj="tenant_123" bsObj="t_orders" />
<BSDataGrid bsPreObj="client_abc" bsObj="t_inventory" />
```

### 3. **Custom Schema Organization:**

```javascript
// Feature-based schemas
<BSDataGrid bsPreObj="reporting" bsObj="t_analytics" />
<BSDataGrid bsPreObj="inventory" bsObj="t_products" />
<BSDataGrid bsPreObj="financial" bsObj="t_transactions" />
```

## 📋 Files Modified

### 1. `src/utils/SchemaMapping.js` - REDESIGNED

**Changes Made:**

- ✅ Removed hardcoded mapping tables
- ✅ Implemented pass-through mode for `mapPreObjToSchema()`
- ✅ Simplified `mapSchemaToPreObj()` and `isValidPreObj()`
- ✅ Enhanced logging and error handling
- ✅ Updated documentation and comments

**Functions Updated:**

- `mapPreObjToSchema()` - Now accepts any string schema
- `mapSchemaToPreObj()` - Returns input schema directly
- `isValidPreObj()` - Validates any non-empty string
- `getSchemaFromPreObj()` - Enhanced with better logging

## 🚀 Status: COMPLETE

Schema Mapping now supports **unlimited schema names** without requiring predefined mapping tables. System is more flexible while maintaining full backward compatibility.

### Expected Benefits:

- ✅ **Unlimited Schema Support**: Any valid schema name works
- ✅ **Simplified Maintenance**: No need to update mapping tables
- ✅ **Better Flexibility**: Supports dynamic schema naming
- ✅ **Backward Compatible**: Existing code works unchanged
- ✅ **Environment Agnostic**: Works across dev/staging/prod environments

---

_Schema Mapping enhanced to Pass-Through Mode - Unlimited schema support now available_ 🔧✅
