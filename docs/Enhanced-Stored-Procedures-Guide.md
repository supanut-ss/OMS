# Enhanced Stored Procedures Guide for BSDataGrid

## 🎯 Overview

Enhanced Stored Procedures provide a powerful way to implement SELECT, UPDATE, and DELETE operations within a single stored procedure. This approach offers better control over business logic, data validation, and performance optimization while maintaining consistency across your application.

## 🏗️ Architecture

### Traditional Approach vs Enhanced Stored Procedures

**Traditional Approach:**

```
Frontend → API → Individual CRUD operations → Database
```

**Enhanced Stored Procedures:**

```
Frontend → API → Single Enhanced SP → Optimized DB Operations
```

### Key Benefits

1. **Single Point of Control**: All operations centralized in one stored procedure
2. **Business Logic in Database**: Complex validation and rules at the data layer
3. **Better Performance**: Optimized queries with proper indexing
4. **Enhanced Security**: Parameterized queries with built-in access control
5. **Audit Trail**: Comprehensive logging and tracking capabilities
6. **Data Consistency**: Transaction control and referential integrity

## 📋 Stored Procedure Structure

### Required Parameters

Every Enhanced Stored Procedure must support these standard parameters:

```sql
CREATE PROCEDURE [schema].[sp_enhanced_table_management]
    -- Operation Control
    @Operation NVARCHAR(10) = 'SELECT',  -- 'SELECT', 'UPDATE', 'DELETE'

    -- Pagination (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,

    -- Data Parameters (for UPDATE)
    @Id INT = NULL,
    @Field1 NVARCHAR(255) = NULL,
    @Field2 NVARCHAR(255) = NULL,
    -- Add your table-specific fields here

    -- Audit
    @UserId NVARCHAR(100) = NULL,

    -- Output Parameters
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    -- Implementation here
END
```

### Implementation Pattern

```sql
BEGIN
    SET NOCOUNT ON;

    -- Initialize outputs
    SET @OutputRowCount = 0;
    SET @OutputMessage = '';

    BEGIN TRY
        IF @Operation = 'SELECT'
        BEGIN
            -- SELECT implementation with pagination
        END
        ELSE IF @Operation = 'UPDATE'
        BEGIN
            -- UPDATE implementation with validation
        END
        ELSE IF @Operation = 'DELETE'
        BEGIN
            -- DELETE implementation (usually soft delete)
        END
        ELSE
        BEGIN
            SET @OutputMessage = 'Invalid operation';
        END
    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
```

## 🔧 BSDataGrid Integration

### Basic Usage

```jsx
import BSDataGrid from "../components/BSDataGrid";

<BSDataGrid
  bsStoredProcedure="sp_enhanced_customer_management"
  bsStoredProcedureSchema="dbo"
  bsRowPerPage={25}
/>;
```

### Advanced Usage

```jsx
<BSDataGrid
  bsStoredProcedure="sp_enhanced_order_management"
  bsStoredProcedureSchema="dbo"
  bsStoredProcedureParams={{
    DateFrom: "2024-01-01",
    DateTo: "2024-12-31",
    Status: "Active",
  }}
  bsRowPerPage={20}
  bsLocale="th"
  bsShowRowNumber={true}
  bsShowCheckbox={true}
  bsBulkEdit={true}
  bsBulkDelete={true}
  bsVisibleEdit={true}
  bsVisibleDelete={true}
  onCheckBoxSelected={(selectedRows) => console.log("Selected:", selectedRows)}
/>
```

### Props Reference

| Prop                      | Type    | Default | Description                                         |
| ------------------------- | ------- | ------- | --------------------------------------------------- |
| `bsStoredProcedure`       | string  | -       | **Required**: Name of the Enhanced Stored Procedure |
| `bsStoredProcedureSchema` | string  | "dbo"   | Schema name for the stored procedure                |
| `bsStoredProcedureParams` | object  | {}      | Additional custom parameters to pass to the SP      |
| `bsRowPerPage`            | number  | 25      | Number of rows per page                             |
| `bsLocale`                | string  | "en"    | Locale for date/number formatting                   |
| `bsShowRowNumber`         | boolean | true    | Show row number column                              |
| `bsShowCheckbox`          | boolean | false   | Show checkbox selection column                      |
| `bsVisibleEdit`           | boolean | true    | Show edit button in actions                         |
| `bsVisibleDelete`         | boolean | true    | Show delete button in actions                       |
| `bsBulkEdit`              | boolean | false   | Enable bulk edit operations                         |
| `bsBulkDelete`            | boolean | false   | Enable bulk delete operations                       |

## 📝 Complete Examples

### 1. Customer Management Stored Procedure

```sql
CREATE PROCEDURE [dbo].[sp_enhanced_customer_management]
    @Operation NVARCHAR(10) = 'SELECT',
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'customer_id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,

    @CustomerId INT = NULL,
    @CustomerName NVARCHAR(255) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Phone NVARCHAR(50) = NULL,
    @Status NVARCHAR(20) = 'Active',

    @UserId NVARCHAR(100) = NULL,
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @OutputRowCount = 0;
    SET @OutputMessage = '';

    BEGIN TRY
        IF @Operation = 'SELECT'
        BEGIN
            DECLARE @Offset INT = (@Page - 1) * @PageSize;
            DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE status != ''Deleted''';

            -- Build dynamic query with pagination
            DECLARE @SQL NVARCHAR(MAX) = '
                SELECT customer_id, customer_name, email, phone, status,
                       created_date, updated_date
                FROM t_customers' + @WhereClause + '
                ORDER BY ' + @OrderBy + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

            EXEC sp_executesql @SQL;
            SET @OutputRowCount = @@ROWCOUNT;
            SET @OutputMessage = 'Data retrieved successfully';
        END

        ELSE IF @Operation = 'UPDATE'
        BEGIN
            UPDATE t_customers
            SET customer_name = ISNULL(@CustomerName, customer_name),
                email = ISNULL(@Email, email),
                phone = ISNULL(@Phone, phone),
                status = ISNULL(@Status, status),
                updated_date = GETDATE(),
                updated_by = @UserId
            WHERE customer_id = @CustomerId;

            SET @OutputRowCount = @@ROWCOUNT;
            SET @OutputMessage = CASE
                WHEN @OutputRowCount > 0 THEN 'Customer updated successfully'
                ELSE 'No customer found with ID: ' + CAST(@CustomerId AS NVARCHAR)
            END;
        END

        ELSE IF @Operation = 'DELETE'
        BEGIN
            UPDATE t_customers
            SET status = 'Deleted',
                updated_date = GETDATE(),
                updated_by = @UserId
            WHERE customer_id = @CustomerId AND status != 'Deleted';

            SET @OutputRowCount = @@ROWCOUNT;
            SET @OutputMessage = CASE
                WHEN @OutputRowCount > 0 THEN 'Customer deleted successfully'
                ELSE 'No active customer found'
            END;
        END

    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
```

### 2. Frontend Integration

```jsx
import React from "react";
import BSDataGrid from "../components/BSDataGrid";

const CustomerManagement = () => {
  return (
    <div style={{ height: 600, width: "100%" }}>
      <BSDataGrid
        bsStoredProcedure="sp_enhanced_customer_management"
        bsStoredProcedureSchema="dbo"
        bsStoredProcedureParams={{
          Status: "Active", // Only show active customers
        }}
        bsRowPerPage={15}
        bsLocale="th"
        bsShowRowNumber={true}
        bsShowCheckbox={true}
        bsBulkEdit={true}
        bsBulkDelete={true}
        bsVisibleEdit={true}
        bsVisibleDelete={true}
        onCheckBoxSelected={(selectedRows) => {
          console.log("Selected customers:", selectedRows);
        }}
      />
    </div>
  );
};

export default CustomerManagement;
```

## 🔄 Operation Flow

### SELECT Operation

1. Frontend sends pagination, sorting, and filtering parameters
2. Stored procedure builds dynamic query with proper WHERE and ORDER BY clauses
3. Returns paginated results with total count
4. BSDataGrid displays data with pagination controls

### UPDATE Operation

1. User edits record in BSDataGrid dialog
2. Frontend sends UPDATE operation with record ID and changed fields
3. Stored procedure validates and updates the record
4. Returns success/failure message and affected row count
5. BSDataGrid refreshes data automatically

### DELETE Operation

1. User clicks delete button for a record
2. Frontend sends DELETE operation with record ID
3. Stored procedure performs soft delete (updates status to 'Deleted')
4. Returns success/failure message
5. BSDataGrid refreshes data to reflect changes

## 🛡️ Security Considerations

### Access Control

```sql
-- Check user permissions
IF NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = @UserId AND permission = 'CUSTOMER_MANAGE'
)
BEGIN
    SET @OutputMessage = 'Access denied';
    RETURN;
END
```

### Input Validation

```sql
-- Validate required fields
IF @Operation = 'UPDATE' AND @CustomerId IS NULL
BEGIN
    SET @OutputMessage = 'Customer ID is required';
    RETURN;
END

-- Validate data formats
IF @Email IS NOT NULL AND @Email NOT LIKE '%@%.%'
BEGIN
    SET @OutputMessage = 'Invalid email format';
    RETURN;
END
```

### SQL Injection Prevention

- Always use parameterized queries
- Validate input parameters
- Use QUOTENAME() for dynamic identifiers
- Limit dynamic SQL construction

## 📊 Performance Optimization

### Indexing Strategy

```sql
-- Primary indexes for pagination
CREATE INDEX IX_customers_status_id ON t_customers (status, customer_id);

-- Search indexes for filtering
CREATE INDEX IX_customers_name_email ON t_customers (customer_name, email);

-- Date range indexes
CREATE INDEX IX_orders_date_status ON t_orders (order_date, status);
```

### Query Optimization

```sql
-- Use EXISTS instead of IN for better performance
IF EXISTS (SELECT 1 FROM t_orders WHERE customer_id = @CustomerId)
BEGIN
    -- Cannot delete customer with orders
    SET @OutputMessage = 'Cannot delete customer with existing orders';
    RETURN;
END

-- Use appropriate data types and avoid implicit conversions
-- Use NOLOCK hint for read-only operations (with caution)
```

## 🧪 Testing

### Unit Testing Stored Procedures

```sql
-- Test SELECT operation
DECLARE @RowCount INT, @Message NVARCHAR(4000);
EXEC sp_enhanced_customer_management
    @Operation = 'SELECT',
    @Page = 1,
    @PageSize = 10,
    @OutputRowCount = @RowCount OUTPUT,
    @OutputMessage = @Message OUTPUT;

SELECT @RowCount as RowCount, @Message as Message;

-- Test UPDATE operation
EXEC sp_enhanced_customer_management
    @Operation = 'UPDATE',
    @CustomerId = 1,
    @CustomerName = 'Updated Name',
    @UserId = 'test_user',
    @OutputRowCount = @RowCount OUTPUT,
    @OutputMessage = @Message OUTPUT;

-- Test DELETE operation
EXEC sp_enhanced_customer_management
    @Operation = 'DELETE',
    @CustomerId = 1,
    @UserId = 'test_user',
    @OutputRowCount = @RowCount OUTPUT,
    @OutputMessage = @Message OUTPUT;
```

### Frontend Testing

```jsx
// Test component rendering
import { render, screen } from "@testing-library/react";
import CustomerManagement from "./CustomerManagement";

test("renders customer grid", () => {
  render(<CustomerManagement />);
  expect(screen.getByRole("grid")).toBeInTheDocument();
});

// Test stored procedure integration
test("calls stored procedure with correct parameters", async () => {
  const mockExecute = jest.fn();
  // Mock implementation and assertions
});
```

## 🚀 Deployment

### Database Deployment

1. Create stored procedures in development environment
2. Test thoroughly with sample data
3. Deploy to staging environment
4. Run integration tests
5. Deploy to production with rollback plan

### Frontend Deployment

1. Update BSDataGrid components to use new stored procedures
2. Test all CRUD operations
3. Verify pagination and filtering
4. Deploy with feature flags if needed

## 📚 Best Practices

### Stored Procedure Design

- ✅ Always use output parameters for status and messages
- ✅ Implement comprehensive error handling
- ✅ Use consistent naming conventions
- ✅ Document all parameters and business rules
- ✅ Implement audit trail for all operations
- ✅ Use soft delete instead of hard delete
- ✅ Validate all input parameters

### Frontend Integration

- ✅ Handle loading states appropriately
- ✅ Display meaningful error messages
- ✅ Implement proper error boundaries
- ✅ Use consistent component props
- ✅ Add proper TypeScript types
- ✅ Implement proper testing coverage

### Performance

- ✅ Create appropriate database indexes
- ✅ Use pagination for large datasets
- ✅ Implement efficient filtering logic
- ✅ Monitor query execution plans
- ✅ Use connection pooling
- ✅ Implement caching where appropriate

## 🐛 Troubleshooting

### Common Issues

**Issue**: Stored procedure not found

```
Solution: Verify procedure name and schema in BSDataGrid props
```

**Issue**: Pagination not working

```
Solution: Ensure @Page and @PageSize parameters are implemented correctly
```

**Issue**: Updates not reflecting

```
Solution: Check if UPDATE operation returns affected row count
```

**Issue**: Performance problems

```
Solution: Add appropriate indexes and optimize WHERE clauses
```

### Debugging Tips

1. **Enable SQL Server Profiler** to monitor stored procedure calls
2. **Add logging** to stored procedures for debugging
3. **Use browser developer tools** to inspect API calls
4. **Check BSDataGrid console logs** for detailed operation information
5. **Verify output parameters** are properly set and returned

## 📞 Support

For additional support and examples:

- Check the `examples/EnhancedStoredProcedureExamples.js` file
- Review the SQL examples in `SQL/enhanced_stored_procedures_examples.sql`
- Consult the BSDataGrid documentation for additional props and configurations

---

_This guide covers the complete implementation of Enhanced Stored Procedures with BSDataGrid. Follow these patterns for consistent, maintainable, and high-performance data management solutions._
