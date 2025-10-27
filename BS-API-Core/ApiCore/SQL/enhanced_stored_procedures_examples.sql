-- =====================================================================================
-- Enhanced Stored Procedures Examples for BSDataGrid Integration
-- สร้างตัวอย่าง Stored Procedure ที่รองรับ SELECT, UPDATE, DELETE ในตัวเดียวกัน
-- =====================================================================================

-- Example 1: Customer Management Enhanced Stored Procedure
-- สำหรับจัดการข้อมูลลูกค้า พร้อมรองรับ pagination, sorting, filtering
-- =====================================================================================
IF OBJECT_ID('[dbo].[sp_enhanced_customer_management]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[sp_enhanced_customer_management];
GO

CREATE PROCEDURE [dbo].[sp_enhanced_customer_management]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',
    -- 'SELECT', 'UPDATE', 'DELETE'

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'customer_id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,

    -- Customer data parameters (for UPDATE)
    @CustomerId INT = NULL,
    @CustomerName NVARCHAR(255) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Phone NVARCHAR(50) = NULL,
    @Address NVARCHAR(500) = NULL,
    @Status NVARCHAR(20) = 'Active',

    -- Audit parameters
    @UserId NVARCHAR(100) = NULL,

    -- Output parameters
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Initialize output parameters
    SET @OutputRowCount = 0;
    SET @OutputMessage = '';

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation with Pagination
        -- ==========================================
        IF @Operation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = '';
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'customer_id ASC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Build WHERE clause from FilterModel (simplified)
        IF @FilterModel IS NOT NULL AND @FilterModel != ''
            BEGIN
            -- Parse JSON filter model (basic implementation)
            -- In real implementation, you would parse JSON properly
            SET @WhereClause = ' WHERE status = ''Active''';
        -- Default filter
        END
            ELSE
            BEGIN
            SET @WhereClause = ' WHERE 1=1';
        -- No filter
        END

        -- Count total records
        SET @CountSQL = '
                SELECT COUNT(*) as TotalCount
                FROM t_customers c' + @WhereClause;

        -- Main data query with pagination
        SET @SQL = '
                SELECT 
                    customer_id,
                    customer_name,
                    email,
                    phone,
                    address,
                    status,
                    created_date,
                    updated_date,
                    created_by,
                    updated_by
                FROM t_customers c' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        EXEC sp_executesql @CountSQL;

        -- Execute main query
        EXEC sp_executesql @SQL;

        SET @OutputMessage = 'SELECT operation completed successfully';
        SET @OutputRowCount = @@ROWCOUNT;
    END
        
        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @CustomerId IS NULL
            BEGIN
            SET @OutputMessage = 'Customer ID is required for UPDATE operation';
            RETURN;
        END

        UPDATE t_customers 
            SET 
                customer_name = ISNULL(@CustomerName, customer_name),
                email = ISNULL(@Email, email),
                phone = ISNULL(@Phone, phone),
                address = ISNULL(@Address, address),
                status = ISNULL(@Status, status),
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE customer_id = @CustomerId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Customer updated successfully';

            -- Return updated record
            SELECT
                customer_id,
                customer_name,
                email,
                phone,
                address,
                status,
                created_date,
                updated_date,
                created_by,
                updated_by
            FROM t_customers
            WHERE customer_id = @CustomerId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No customer found with ID: ' + CAST(@CustomerId AS NVARCHAR(10));
        END
    END
        
        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @CustomerId IS NULL
            BEGIN
            SET @OutputMessage = 'Customer ID is required for DELETE operation';
            RETURN;
        END

        -- Soft delete (update status instead of physical delete)
        UPDATE t_customers 
            SET 
                status = 'Deleted',
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE customer_id = @CustomerId AND status != 'Deleted';

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Customer deleted successfully';
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No active customer found with ID: ' + CAST(@CustomerId AS NVARCHAR(10));
        END
    END
        
        -- ==========================================
        -- Invalid Operation
        -- ==========================================
        ELSE
        BEGIN
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, UPDATE, DELETE';
        RETURN;
    END
        
    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        SET @OutputRowCount = 0;
        
        -- Re-throw error for proper error handling
        THROW;
    END CATCH
END
GO

-- =====================================================================================
-- Example 2: Product Management Enhanced Stored Procedure
-- สำหรับจัดการข้อมูลสินค้า พร้อมรองรับการค้นหาและกรองข้อมูล
-- =====================================================================================
IF OBJECT_ID('[dbo].[sp_enhanced_product_management]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[sp_enhanced_product_management];
GO

CREATE PROCEDURE [dbo].[sp_enhanced_product_management]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'product_id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,
    -- Quick search

    -- Product data parameters
    @ProductId INT = NULL,
    @ProductName NVARCHAR(255) = NULL,
    @ProductCode NVARCHAR(50) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @UnitPrice DECIMAL(18,2) = NULL,
    @Category NVARCHAR(100) = NULL,
    @Status NVARCHAR(20) = 'Active',

    -- Audit parameters
    @UserId NVARCHAR(100) = NULL,

    -- Output parameters
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @OutputRowCount = 0;
    SET @OutputMessage = '';

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation with Advanced Filtering
        -- ==========================================
        IF @Operation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'product_id ASC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Quick filter for search
        IF @QuickFilter IS NOT NULL AND @QuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                    product_name LIKE ''%' + @QuickFilter + '%'' 
                    OR product_code LIKE ''%' + @QuickFilter + '%''
                    OR description LIKE ''%' + @QuickFilter + '%''
                    OR category LIKE ''%' + @QuickFilter + '%''
                )';
        END

        -- Status filter (exclude deleted by default)
        SET @WhereClause = @WhereClause + ' AND status != ''Deleted''';

        -- Count query
        SET @CountSQL = '
                SELECT COUNT(*) as TotalCount
                FROM t_products p' + @WhereClause;

        -- Main query
        SET @SQL = '
                SELECT 
                    product_id,
                    product_code,
                    product_name,
                    description,
                    unit_price,
                    category,
                    status,
                    created_date,
                    updated_date,
                    created_by,
                    updated_by
                FROM t_products p' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute queries
        EXEC sp_executesql @CountSQL;
        EXEC sp_executesql @SQL;

        SET @OutputMessage = 'Products retrieved successfully';
        SET @OutputRowCount = @@ROWCOUNT;
    END
        
        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @ProductId IS NULL
            BEGIN
            SET @OutputMessage = 'Product ID is required for UPDATE operation';
            RETURN;
        END

        UPDATE t_products 
            SET 
                product_name = ISNULL(@ProductName, product_name),
                product_code = ISNULL(@ProductCode, product_code),
                description = ISNULL(@Description, description),
                unit_price = ISNULL(@UnitPrice, unit_price),
                category = ISNULL(@Category, category),
                status = ISNULL(@Status, status),
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE product_id = @ProductId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Product updated successfully';

            -- Return updated record
            SELECT
                product_id,
                product_code,
                product_name,
                description,
                unit_price,
                category,
                status,
                created_date,
                updated_date,
                created_by,
                updated_by
            FROM t_products
            WHERE product_id = @ProductId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No product found with ID: ' + CAST(@ProductId AS NVARCHAR(10));
        END
    END
        
        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @ProductId IS NULL
            BEGIN
            SET @OutputMessage = 'Product ID is required for DELETE operation';
            RETURN;
        END

        -- Soft delete
        UPDATE t_products 
            SET 
                status = 'Deleted',
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE product_id = @ProductId AND status != 'Deleted';

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Product deleted successfully';
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No active product found with ID: ' + CAST(@ProductId AS NVARCHAR(10));
        END
    END
        
        ELSE
        BEGIN
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, UPDATE, DELETE';
        RETURN;
    END
        
    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        SET @OutputRowCount = 0;
        THROW;
    END CATCH
END
GO

-- =====================================================================================
-- Example 3: Order Management Enhanced Stored Procedure
-- สำหรับจัดการข้อมูลคำสั่งซื้อ พร้อม JOIN กับตารางอื่น
-- =====================================================================================
IF OBJECT_ID('[dbo].[sp_enhanced_order_management]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[sp_enhanced_order_management];
GO

CREATE PROCEDURE [dbo].[sp_enhanced_order_management]
    @Operation NVARCHAR(10) = 'SELECT',

    -- Pagination
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'order_date DESC',
    @FilterModel NVARCHAR(MAX) = NULL,

    -- Order data
    @OrderId INT = NULL,
    @CustomerId INT = NULL,
    @OrderDate DATETIME = NULL,
    @TotalAmount DECIMAL(18,2) = NULL,
    @Status NVARCHAR(20) = 'Pending',
    @Notes NVARCHAR(MAX) = NULL,

    -- Date range filter
    @DateFrom DATETIME = NULL,
    @DateTo DATETIME = NULL,

    -- Audit
    @UserId NVARCHAR(100) = NULL,

    -- Output
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
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE o.status != ''Deleted''';
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'o.order_date DESC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Date range filter
        IF @DateFrom IS NOT NULL
                SET @WhereClause = @WhereClause + ' AND o.order_date >= ''' + CONVERT(NVARCHAR, @DateFrom, 120) + '''';

        IF @DateTo IS NOT NULL
                SET @WhereClause = @WhereClause + ' AND o.order_date <= ''' + CONVERT(NVARCHAR, @DateTo, 120) + '''';

        -- Customer filter
        IF @CustomerId IS NOT NULL
                SET @WhereClause = @WhereClause + ' AND o.customer_id = ' + CAST(@CustomerId AS NVARCHAR(10));

        -- Count query
        DECLARE @CountSQL NVARCHAR(MAX) = '
                SELECT COUNT(*) as TotalCount
                FROM t_orders o
                INNER JOIN t_customers c ON o.customer_id = c.customer_id' + @WhereClause;

        -- Main query with JOIN
        SET @SQL = '
                SELECT 
                    o.order_id,
                    o.order_number,
                    o.customer_id,
                    c.customer_name,
                    c.email as customer_email,
                    o.order_date,
                    o.total_amount,
                    o.status,
                    o.notes,
                    o.created_date,
                    o.updated_date,
                    o.created_by,
                    o.updated_by
                FROM t_orders o
                INNER JOIN t_customers c ON o.customer_id = c.customer_id' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        EXEC sp_executesql @CountSQL;
        EXEC sp_executesql @SQL;

        SET @OutputMessage = 'Orders retrieved successfully';
        SET @OutputRowCount = @@ROWCOUNT;
    END
        
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @OrderId IS NULL
            BEGIN
            SET @OutputMessage = 'Order ID is required for UPDATE operation';
            RETURN;
        END

        UPDATE t_orders 
            SET 
                customer_id = ISNULL(@CustomerId, customer_id),
                order_date = ISNULL(@OrderDate, order_date),
                total_amount = ISNULL(@TotalAmount, total_amount),
                status = ISNULL(@Status, status),
                notes = ISNULL(@Notes, notes),
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE order_id = @OrderId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Order updated successfully';

            -- Return updated record with customer info
            SELECT
                o.order_id,
                o.order_number,
                o.customer_id,
                c.customer_name,
                c.email as customer_email,
                o.order_date,
                o.total_amount,
                o.status,
                o.notes,
                o.created_date,
                o.updated_date,
                o.created_by,
                o.updated_by
            FROM t_orders o
                INNER JOIN t_customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = @OrderId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No order found with ID: ' + CAST(@OrderId AS NVARCHAR(10));
        END
    END
        
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @OrderId IS NULL
            BEGIN
            SET @OutputMessage = 'Order ID is required for DELETE operation';
            RETURN;
        END

        -- Soft delete
        UPDATE t_orders 
            SET 
                status = 'Deleted',
                updated_date = GETDATE(),
                updated_by = ISNULL(@UserId, 'system')
            WHERE order_id = @OrderId AND status != 'Deleted';

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Order deleted successfully';
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No active order found with ID: ' + CAST(@OrderId AS NVARCHAR(10));
        END
    END
        
        ELSE
        BEGIN
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, UPDATE, DELETE';
    END
        
    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        SET @OutputRowCount = 0;
        THROW;
    END CATCH
END
GO

-- =====================================================================================
-- Usage Examples / ตัวอย่างการใช้งาน
-- =====================================================================================

/*
-- 1. SELECT with pagination
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'SELECT',
    @Page = 1,
    @PageSize = 10,
    @OrderBy = 'customer_name ASC';

-- 2. UPDATE customer
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'UPDATE',
    @CustomerId = 1,
    @CustomerName = 'Updated Customer Name',
    @Email = 'updated@email.com',
    @UserId = 'admin';

-- 3. DELETE customer (soft delete)
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'DELETE',
    @CustomerId = 1,
    @UserId = 'admin';

-- 4. Product search with quick filter
EXEC [dbo].[sp_enhanced_product_management] 
    @Operation = 'SELECT',
    @QuickFilter = 'laptop',
    @Page = 1,
    @PageSize = 20;

-- 5. Order management with date range
EXEC [dbo].[sp_enhanced_order_management] 
    @Operation = 'SELECT',
    @DateFrom = '2024-01-01',
    @DateTo = '2024-12-31',
    @Page = 1,
    @PageSize = 25;
*/

PRINT '✅ Enhanced Stored Procedures created successfully!';
PRINT '📋 Available procedures:';
PRINT '   - sp_enhanced_customer_management';
PRINT '   - sp_enhanced_product_management';
PRINT '   - sp_enhanced_order_management';
PRINT '';
PRINT '🔧 Each procedure supports:';
PRINT '   - SELECT with pagination, sorting, filtering';
PRINT '   - UPDATE with data validation';
PRINT '   - DELETE with soft delete';
PRINT '   - Audit trail support';
PRINT '   - Error handling';