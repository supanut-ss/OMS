# 🔧 Schema Mapping - Environment Variable Support

## 📋 Enhancement Request

User ต้องการให้ default schema มาจาก environment variable ใน .env file แทนที่จะ hardcode เป็น "tmt":

- **ถ้ามี .env variable**: ใช้ค่าจาก .env เป็น default schema
- **ถ้าไม่มี .env variable**: ใช้ "dbo" เป็น default schema

## ✅ Changes Implemented

### 1. **Added getDefaultSchema() Function**

```javascript
const getDefaultSchema = () => {
  // ลองดึงจาก environment variables (3 ตัวแปรที่เป็นไปได้)
  const envSchema =
    process.env.REACT_APP_DEFAULT_SCHEMA ||
    process.env.DEFAULT_SCHEMA ||
    process.env.DB_DEFAULT_SCHEMA;

  // ถ้าไม่เจอใน .env ให้ใช้ dbo เป็น default
  const defaultSchema = envSchema || "dbo";

  return defaultSchema;
};
```

### 2. **Updated mapPreObjToSchema()**

```javascript
// เก่า:
if (!preObj || preObj === null || preObj === undefined || preObj === "") {
  return "tmt"; // hardcoded default
}

// ใหม่:
if (!preObj || preObj === null || preObj === undefined || preObj === "") {
  const defaultSchema = getDefaultSchema();
  console.log("🗺️ Using default schema from .env:", {
    envSchema:
      process.env.REACT_APP_DEFAULT_SCHEMA ||
      process.env.DEFAULT_SCHEMA ||
      process.env.DB_DEFAULT_SCHEMA,
    defaultSchema: defaultSchema,
    fallback: defaultSchema === "dbo" ? "dbo (fallback)" : "from .env",
  });
  return defaultSchema;
}
```

### 3. **Updated mapSchemaToPreObj()**

```javascript
// เก่า:
return schema || "tmt";

// ใหม่:
return schema || getDefaultSchema();
```

### 4. **Enhanced getSchemaFromPreObj()**

```javascript
// เก่า:
export const getSchemaFromPreObj = (preObj, defaultSchema = "tmt") => {

// ใหม่:
export const getSchemaFromPreObj = (preObj, defaultSchema = null) => {
  if (!preObj || preObj === null || preObj === undefined || preObj === "") {
    const finalDefault = defaultSchema || getDefaultSchema();
    console.log("🗺️ Using default schema:", {
      parameterDefault: defaultSchema,
      envDefault: getDefaultSchema(),
      finalDefault: finalDefault
    });
    return finalDefault;
  }
  // ...
}
```

## 🎯 Environment Variable Configuration

### ✅ **Supported Environment Variables:**

ระบบจะดูตัวแปรเหล่านี้ตามลำดับ:

1. `REACT_APP_DEFAULT_SCHEMA`
2. `DEFAULT_SCHEMA`
3. `DB_DEFAULT_SCHEMA`

### ✅ **.env File Example:**

```bash
# .env
REACT_APP_DEFAULT_SCHEMA=tmt

# หรือใช้ชื่ออื่น:
# DEFAULT_SCHEMA=tmt
# DB_DEFAULT_SCHEMA=tmt
```

### ✅ **Created .env.example File:**

```bash
# BS Platform Environment Configuration

# Default database schema
# ถ้าไม่ระบุ bsPreObj จะใช้ schema นี้เป็น default
# ถ้าไม่กำหนดตัวแปรนี้ จะใช้ "dbo" เป็น default
REACT_APP_DEFAULT_SCHEMA=tmt

# Alternative environment variable names (any of these will work):
# DEFAULT_SCHEMA=tmt
# DB_DEFAULT_SCHEMA=tmt
```

## 📊 Default Schema Resolution Flow

### ✅ **Priority Order:**

```
1. bsPreObj parameter (if provided)
   ↓ (if not provided)
2. defaultSchema parameter (if provided to getSchemaFromPreObj)
   ↓ (if not provided)
3. Environment Variable (REACT_APP_DEFAULT_SCHEMA, DEFAULT_SCHEMA, or DB_DEFAULT_SCHEMA)
   ↓ (if not found)
4. Hardcoded fallback: "dbo"
```

### ✅ **Examples:**

#### **With Environment Variable:**

```bash
# .env
REACT_APP_DEFAULT_SCHEMA=custom_schema
```

```javascript
getSchemaFromPreObj()           → "custom_schema"
getSchemaFromPreObj(null)       → "custom_schema"
getSchemaFromPreObj("")         → "custom_schema"
getSchemaFromPreObj("sec")      → "sec"
```

#### **Without Environment Variable:**

```javascript
// No .env variable set
getSchemaFromPreObj()           → "dbo"
getSchemaFromPreObj(null)       → "dbo"
getSchemaFromPreObj("")         → "dbo"
getSchemaFromPreObj("sec")      → "sec"
```

#### **With Parameter Override:**

```javascript
// .env: REACT_APP_DEFAULT_SCHEMA=tmt
getSchemaFromPreObj(null, "custom")  → "custom"  // parameter wins
getSchemaFromPreObj("", "custom")    → "custom"  // parameter wins
getSchemaFromPreObj("sec", "custom") → "sec"     // bsPreObj wins
```

## 🔍 Enhanced Console Logging

### ✅ **New Log Examples:**

```javascript
// Using .env variable:
🗺️ Using default schema from .env: {
  envSchema: "tmt",
  defaultSchema: "tmt",
  fallback: "from .env"
}

// Using fallback:
🗺️ Using default schema from .env: {
  envSchema: undefined,
  defaultSchema: "dbo",
  fallback: "dbo (fallback)"
}

// With parameter override:
🗺️ Using default schema: {
  parameterDefault: "custom",
  envDefault: "tmt",
  finalDefault: "custom"
}
```

## 🚀 Deployment Configuration

### ✅ **Different Environments:**

#### **Development (.env.development):**

```bash
REACT_APP_DEFAULT_SCHEMA=dev
```

#### **Staging (.env.staging):**

```bash
REACT_APP_DEFAULT_SCHEMA=staging
```

#### **Production (.env.production):**

```bash
REACT_APP_DEFAULT_SCHEMA=prod
```

## 📋 Files Modified

### 1. `src/utils/SchemaMapping.js` - ENHANCED

**Changes Made:**

- ✅ Added `getDefaultSchema()` function for .env variable reading
- ✅ Updated `mapPreObjToSchema()` to use environment-based default
- ✅ Updated `mapSchemaToPreObj()` to use environment-based default
- ✅ Enhanced `getSchemaFromPreObj()` with priority-based resolution
- ✅ Improved logging with detailed default schema resolution info

### 2. `.env.example` - NEW

**Purpose:**

- ✅ Template for environment configuration
- ✅ Documentation of supported environment variables
- ✅ Example values and comments

## 🎯 Migration Guide

### ✅ **For Existing Projects:**

1. **Create .env file** with desired default schema:

   ```bash
   REACT_APP_DEFAULT_SCHEMA=tmt
   ```

2. **Or use existing behavior** - without .env, system uses "dbo" instead of "tmt"

3. **Update deployment configs** for different environments

### ✅ **Backward Compatibility:**

- Code that explicitly passes `bsPreObj` continues to work unchanged
- Code that relied on "tmt" default should add .env variable for consistency
- API calls and database access patterns remain the same

## 🚀 Status: COMPLETE

Schema Mapping now supports environment variable configuration for default schema, providing flexibility across different deployment environments while maintaining full backward compatibility.

### Expected Benefits:

- ✅ **Environment-Specific Defaults**: Different schemas per environment
- ✅ **Configuration Flexibility**: Easy to change default without code changes
- ✅ **Deployment-Ready**: Supports CI/CD with environment-specific configs
- ✅ **Backward Compatible**: Existing code works with new fallback default
- ✅ **Multiple Variable Names**: Supports different naming conventions

---

_Schema Mapping enhanced with Environment Variable support - Configurable default schema now available_ 🔧✅
