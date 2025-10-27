# Enhanced Stored Procedures สำหรับ BSDataGrid - Complete Guide

## Overview

Enhanced Stored Procedures เป็นระบบที่ช่วยให้คุณสามารถใช้ Stored Procedure เดียวสำหรับการจัดการ CRUD operations ทั้งหมด (SELECT, INSERT, UPDATE, DELETE) ใน BSDataGrid โดยที่สามารถเขียนเงื่อนไขและ business logic ได้โดยตรงใน Stored Procedure

## ฟีเจอร์ที่รองรับ

### ✅ CRUD Operations ครบครัน

- **SELECT**: รองรับ pagination, sorting, filtering, และ search
- **INSERT**: สร้างข้อมูลใหม่พร้อม validation และ duplicate checking
- **UPDATE**: แก้ไขข้อมูลพร้อม business rule validation
- **DELETE**: ลบข้อมูลพร้อมการตรวจสอบ foreign key constraints

### ✅ Advanced Features

- Data validation และ duplicate checking
- Audit trail พร้อม user tracking
- Auto-generated values (GUID, Order Number, Timestamps)
- Error handling และ descriptive error messages
- Foreign key validation และ relational integrity
- Performance optimization พร้อม proper indexing

## การติดตั้งและใช้งาน

### 1. Backend Setup (.NET Core)

#### 1.1 เพิ่ม Models ใน `DynamicModels.cs`

```csharp
public class EnhancedStoredProcedureRequest
{
    public string ProcedureName { get; set; }
    public string SchemaName { get; set; } = "dbo";
    public string Operation { get; set; } // SELECT, INSERT, UPDATE, DELETE
    public Dictionary<string, object> Parameters { get; set; } = new();
    public string UserId { get; set; }
}

public class EnhancedStoredProcedureResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public List<Dictionary<string, object>> Data { get; set; } = new();
    public int TotalCount { get; set; }
    public Dictionary<string, object> OutputParameters { get; set; } = new();
}
```

#### 1.2 เพิ่ม Service Method ใน `DynamicCrudService.cs`

```csharp
public async Task<EnhancedStoredProcedureResponse> ExecuteEnhancedStoredProcedureAsync(
    EnhancedStoredProcedureRequest request)
{
    var response = new EnhancedStoredProcedureResponse();

    try
    {
        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand($"[{request.SchemaName}].[{request.ProcedureName}]", connection);

        command.CommandType = CommandType.StoredProcedure;
        command.CommandTimeout = 120;

        // เพิ่ม parameters
        command.Parameters.AddWithValue("@Operation", request.Operation);
        command.Parameters.AddWithValue("@UserId", request.UserId ?? "system");

        // เพิ่ม output parameters
        var outputRowCount = new SqlParameter("@OutputRowCount", SqlDbType.Int) { Direction = ParameterDirection.Output };
        var outputMessage = new SqlParameter("@OutputMessage", SqlDbType.NVarChar, 500) { Direction = ParameterDirection.Output };
        command.Parameters.Add(outputRowCount);
        command.Parameters.Add(outputMessage);

        // เพิ่ม custom parameters
        foreach (var param in request.Parameters)
        {
            command.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
        }

        await connection.OpenAsync();

        using var reader = await command.ExecuteReaderAsync();
        var data = new List<Dictionary<string, object>>();

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            }
            data.Add(row);
        }

        response.Data = data;
        response.TotalCount = outputRowCount.Value as int? ?? 0;
        response.Message = outputMessage.Value?.ToString() ?? "";
        response.Success = true;
    }
    catch (Exception ex)
    {
        response.Success = false;
        response.Message = ex.Message;
    }

    return response;
}
```

#### 1.3 เพิ่ม Controller Endpoint ใน `DynamicController.cs`

```csharp
[HttpPost("enhanced-procedure")]
public async Task<IActionResult> ExecuteEnhancedStoredProcedure([FromBody] EnhancedStoredProcedureRequest request)
{
    try
    {
        var result = await _dynamicCrudService.ExecuteEnhancedStoredProcedureAsync(request);
        return Ok(result);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = ex.Message });
    }
}
```

### 2. Frontend Setup (React)

#### 2.1 เพิ่ม Function ใน `useDynamicCrud.js`

```javascript
const executeEnhancedStoredProcedure = useCallback(async (request) => {
  try {
    Logger.log("🚀 Executing Enhanced Stored Procedure:", request);

    const response = await AxiosMaster.post(
      "/dynamic/enhanced-procedure",
      request
    );
    Logger.log(
      "✅ Enhanced Stored Procedure executed successfully:",
      response.data
    );
    return response.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to execute enhanced stored procedure";
    Logger.error("❌ Failed to execute enhanced stored procedure:", errorMsg);
    throw new Error(errorMsg);
  }
}, []);
```

#### 2.2 อัพเดต BSDataGrid.js

```javascript
// ใน handleSave function สำหรับ INSERT
if (bsStoredProcedure) {
  const insertRequest = {
    procedureName: bsStoredProcedure,
    schemaName: bsStoredProcedureSchema,
    operation: "INSERT",
    parameters: {
      ...saveData,
      ...bsStoredProcedureParams,
    },
    userId: user?.id || user?.userId || user?.user_id || "system",
  };

  const result = await executeEnhancedStoredProcedure(insertRequest);
  if (!result.success) {
    throw new Error(result.message || "Insert operation failed");
  }
} else {
  await createRecord(saveData, bsPreObj);
}

// ใน handleSave function สำหรับ UPDATE
if (bsStoredProcedure) {
  const updateRequest = {
    procedureName: bsStoredProcedure,
    schemaName: bsStoredProcedureSchema,
    operation: "UPDATE",
    parameters: {
      [primaryKey]: id,
      ...formData,
      ...bsStoredProcedureParams,
    },
    userId: user?.id || user?.userId || user?.user_id || "system",
  };

  const result = await executeEnhancedStoredProcedure(updateRequest);
  if (!result.success) {
    throw new Error(result.message || "Update operation failed");
  }
} else {
  await updateRecord(id, formData, bsPreObj);
}

// ใน handleDeleteClick function สำหรับ DELETE
if (bsStoredProcedure) {
  const deleteRequest = {
    procedureName: bsStoredProcedure,
    schemaName: bsStoredProcedureSchema,
    operation: "DELETE",
    parameters: {
      [primaryKey]: id,
      ...bsStoredProcedureParams,
    },
    userId: user?.id || user?.userId || user?.user_id || "system",
  };

  const result = await executeEnhancedStoredProcedure(deleteRequest);
  if (!result.success) {
    throw new Error(result.message || "Delete operation failed");
  }
} else {
  await deleteRecord(id);
}
```

### 3. Database Setup (SQL Server)

#### 3.1 ตัวอย่าง Enhanced Stored Procedure สำหรับ Customer Management

```sql
CREATE PROCEDURE [dbo].[sp_enhanced_customer_management]
    @Operation NVARCHAR(10), -- SELECT, INSERT, UPDATE, DELETE
    @UserId NVARCHAR(100) = 'system',

    -- Pagination และ Sorting สำหรับ SELECT
    @Page INT = 1,
    @PageSize INT = 25,
    @SortColumn NVARCHAR(100) = 'customer_id',
    @SortDirection NVARCHAR(4) = 'ASC',
    @SearchTerm NVARCHAR(255) = NULL,

    -- Data Parameters สำหรับ INSERT/UPDATE/DELETE
    @customer_id INT = NULL,
    @first_name NVARCHAR(100) = NULL,
    @last_name NVARCHAR(100) = NULL,
    @email NVARCHAR(255) = NULL,
    @phone NVARCHAR(20) = NULL,
    @date_of_birth DATE = NULL,
    @address NVARCHAR(500) = NULL,
    @city NVARCHAR(100) = NULL,
    @country NVARCHAR(100) = NULL,

    -- Output Parameters
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @offset INT = (@Page - 1) * @PageSize;

    BEGIN TRY
        IF @Operation = 'SELECT'
        BEGIN
            -- SELECT with pagination, sorting, and filtering
            SET @sql = N'
                SELECT customer_id, first_name, last_name, email, phone,
                       date_of_birth, address, city, country,
                       created_at, updated_at, created_by, updated_by
                FROM customers
                WHERE (@SearchTerm IS NULL
                       OR first_name LIKE ''%'' + @SearchTerm + ''%''
                       OR last_name LIKE ''%'' + @SearchTerm + ''%''
                       OR email LIKE ''%'' + @SearchTerm + ''%'')
                ORDER BY ' + QUOTENAME(@SortColumn) + ' ' + @SortDirection + '
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*) as TotalCount
                FROM customers
                WHERE (@SearchTerm IS NULL
                       OR first_name LIKE ''%'' + @SearchTerm + ''%''
                       OR last_name LIKE ''%'' + @SearchTerm + ''%''
                       OR email LIKE ''%'' + @SearchTerm + ''%'');
            ';

            EXEC sp_executesql @sql,
                N'@SearchTerm NVARCHAR(255), @Offset INT, @PageSize INT',
                @SearchTerm, @offset, @PageSize;

            SET @OutputMessage = 'Data retrieved successfully';
        END

        ELSE IF @Operation = 'INSERT'
        BEGIN
            -- Validation สำหรับ INSERT
            IF @first_name IS NULL OR @last_name IS NULL OR @email IS NULL
            BEGIN
                SET @OutputMessage = 'First name, last name, and email are required';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- ตรวจสอบ email ซ้ำ
            IF EXISTS (SELECT 1 FROM customers WHERE email = @email)
            BEGIN
                SET @OutputMessage = 'Email address already exists';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- INSERT ข้อมูลใหม่
            INSERT INTO customers (
                first_name, last_name, email, phone, date_of_birth,
                address, city, country, created_at, created_by
            ) VALUES (
                @first_name, @last_name, @email, @phone, @date_of_birth,
                @address, @city, @country, GETDATE(), @UserId
            );

            -- ส่งคืนข้อมูลที่เพิ่งสร้าง
            SELECT customer_id, first_name, last_name, email, phone,
                   date_of_birth, address, city, country,
                   created_at, updated_at, created_by, updated_by
            FROM customers
            WHERE customer_id = SCOPE_IDENTITY();

            SET @OutputRowCount = 1;
            SET @OutputMessage = 'Customer created successfully';
        END

        ELSE IF @Operation = 'UPDATE'
        BEGIN
            -- Validation สำหรับ UPDATE
            IF @customer_id IS NULL
            BEGIN
                SET @OutputMessage = 'Customer ID is required for update';
                SET @OutputRowCount = 0;
                RETURN;
            END

            IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = @customer_id)
            BEGIN
                SET @OutputMessage = 'Customer not found';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- ตรวจสอบ email ซ้ำ (ยกเว้น record ปัจจุบัน)
            IF @email IS NOT NULL AND EXISTS (
                SELECT 1 FROM customers
                WHERE email = @email AND customer_id != @customer_id
            )
            BEGIN
                SET @OutputMessage = 'Email address already exists';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- UPDATE ข้อมูล
            UPDATE customers SET
                first_name = ISNULL(@first_name, first_name),
                last_name = ISNULL(@last_name, last_name),
                email = ISNULL(@email, email),
                phone = ISNULL(@phone, phone),
                date_of_birth = ISNULL(@date_of_birth, date_of_birth),
                address = ISNULL(@address, address),
                city = ISNULL(@city, city),
                country = ISNULL(@country, country),
                updated_at = GETDATE(),
                updated_by = @UserId
            WHERE customer_id = @customer_id;

            -- ส่งคืนข้อมูลที่อัพเดท
            SELECT customer_id, first_name, last_name, email, phone,
                   date_of_birth, address, city, country,
                   created_at, updated_at, created_by, updated_by
            FROM customers
            WHERE customer_id = @customer_id;

            SET @OutputRowCount = @@ROWCOUNT;
            SET @OutputMessage = 'Customer updated successfully';
        END

        ELSE IF @Operation = 'DELETE'
        BEGIN
            -- Validation สำหรับ DELETE
            IF @customer_id IS NULL
            BEGIN
                SET @OutputMessage = 'Customer ID is required for delete';
                SET @OutputRowCount = 0;
                RETURN;
            END

            IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = @customer_id)
            BEGIN
                SET @OutputMessage = 'Customer not found';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- ตรวจสอบ foreign key constraints
            IF EXISTS (SELECT 1 FROM orders WHERE customer_id = @customer_id)
            BEGIN
                SET @OutputMessage = 'Cannot delete customer with existing orders';
                SET @OutputRowCount = 0;
                RETURN;
            END

            -- DELETE ข้อมูล
            DELETE FROM customers WHERE customer_id = @customer_id;

            SET @OutputRowCount = @@ROWCOUNT;
            SET @OutputMessage = 'Customer deleted successfully';
        END

        ELSE
        BEGIN
            SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
            SET @OutputRowCount = 0;
        END

    END TRY
    BEGIN CATCH
        SET @OutputMessage = ERROR_MESSAGE();
        SET @OutputRowCount = 0;
    END CATCH
END
```

## การใช้งานใน React

### Basic Usage

```jsx
import BSDataGrid from "../components/BSDataGrid";

function CustomerManagement() {
  return (
    <BSDataGrid
      // Enhanced Stored Procedure Configuration
      bsStoredProcedure="sp_enhanced_customer_management"
      bsStoredProcedureSchema="dbo"
      bsStoredProcedureParams={
        {
          // พารามิเตอร์เพิ่มเติมที่จะส่งไปยัง SP
        }
      }
      // Standard Configuration
      bsAllowAdd={true}
      bsAllowEdit={true}
      bsAllowDelete={true}
      bsPageSize={25}
      bsHeight={600}
    />
  );
}
```

### Advanced Usage with Custom Parameters

```jsx
function ProductManagement() {
  const [categoryFilter, setCategoryFilter] = useState("");

  return (
    <div>
      <select onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="">All Categories</option>
        <option value="Electronics">Electronics</option>
        <option value="Clothing">Clothing</option>
      </select>

      <BSDataGrid
        bsStoredProcedure="sp_enhanced_product_management"
        bsStoredProcedureSchema="dbo"
        bsStoredProcedureParams={{
          category_filter: categoryFilter,
        }}
        bsAllowAdd={true}
        bsAllowEdit={true}
        bsAllowDelete={true}
      />
    </div>
  );
}
```

## Props สำหรับ Enhanced Stored Procedure

| Prop                      | Type    | Required | Description                    |
| ------------------------- | ------- | -------- | ------------------------------ |
| `bsStoredProcedure`       | string  | ✅       | ชื่อ Enhanced Stored Procedure |
| `bsStoredProcedureSchema` | string  | ❌       | Schema name (default: "dbo")   |
| `bsStoredProcedureParams` | object  | ❌       | พารามิเตอร์เพิ่มเติมสำหรับ SP  |
| `bsAllowAdd`              | boolean | ❌       | อนุญาตให้เพิ่มข้อมูล (INSERT)  |
| `bsAllowEdit`             | boolean | ❌       | อนุญาตให้แก้ไขข้อมูล (UPDATE)  |
| `bsAllowDelete`           | boolean | ❌       | อนุญาตให้ลบข้อมูล (DELETE)     |

## ข้อดีของ Enhanced Stored Procedure

### 🔒 Security

- Parameterized queries ป้องกัน SQL Injection
- Access control ผ่าน database permissions
- Audit trail พร้อม user tracking

### ⚡ Performance

- Optimized queries พร้อม proper indexing
- Reduced network traffic
- Query plan caching

### 🎯 Business Logic

- Complex validation rules ใน database
- Data consistency และ integrity
- Transaction control

### 🛠️ Maintainability

- Single point of control สำหรับ CRUD operations
- Centralized business rules
- Easy to version control และ deploy

## Best Practices

### 1. Database Design

- ใช้ proper indexing สำหรับ columns ที่ใช้ใน WHERE clause
- ตั้งชื่อ parameters ให้ตรงกับ column names
- ใช้ appropriate data types และ constraints

### 2. Error Handling

- ใช้ TRY-CATCH blocks ใน stored procedures
- ส่งคืน descriptive error messages
- Log errors สำหรับ debugging

### 3. Security

- Validate input parameters
- Use parameterized queries
- Implement proper access control

### 4. Performance

- ใช้ pagination สำหรับ large datasets
- Optimize queries พร้อม proper indexing
- Monitor query performance

## ตัวอย่างเพิ่มเติม

ดูตัวอย่างครบครันได้ที่:

- `enhanced_stored_procedures_examples.sql` - ตัวอย่าง SQL
- `EnhancedStoredProcedureExamples.js` - ตัวอย่าง React Components
- `Enhanced-Stored-Procedures-Guide.md` - เอกสารการใช้งาน

## สรุป

Enhanced Stored Procedures สำหรับ BSDataGrid ช่วยให้คุณสามารถ:

1. ✅ ใช้ stored procedure เดียวสำหรับ CRUD operations ทั้งหมด
2. ✅ เขียน business logic และ validation ใน database
3. ✅ ได้ performance และ security ที่ดีกว่า
4. ✅ มี audit trail และ error handling ที่ครบครัน
5. ✅ ง่ายต่อการ maintenance และ scaling

ระบบนี้เหมาะสำหรับโปรเจคที่ต้องการ:

- Complex business logic และ data validation
- High performance และ security
- Centralized data access control
- Comprehensive audit trail
