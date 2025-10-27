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
    -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'

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
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        -- Validate required fields for INSERT
        IF @CustomerName IS NULL OR @CustomerName = ''
            BEGIN
            SET @OutputMessage = 'Customer Name is required for INSERT operation';
            RETURN;
        END

        IF @Email IS NULL OR @Email = ''
            BEGIN
            SET @OutputMessage = 'Email is required for INSERT operation';
            RETURN;
        END

        -- Check for duplicate email
        IF EXISTS (SELECT 1
        FROM t_customers
        WHERE email = @Email AND status != 'Deleted')
            BEGIN
            SET @OutputMessage = 'Email already exists: ' + @Email;
            RETURN;
        END

        -- Insert new customer record
        INSERT INTO t_customers
            (
            customer_name,
            email,
            phone,
            address,
            status,
            created_date,
            updated_date,
            created_by,
            updated_by
            )
        VALUES
            (
                @CustomerName,
                @Email,
                @Phone,
                @Address,
                ISNULL(@Status, 'Active'),
                GETDATE(),
                GETDATE(),
                ISNULL(@UserId, 'system'),
                ISNULL(@UserId, 'system')
        );

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Customer created successfully';

            -- Return newly created record
            DECLARE @NewCustomerId INT = SCOPE_IDENTITY();
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
            WHERE customer_id = @NewCustomerId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'Failed to create customer';
        END
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
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
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
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        -- Validate required fields for INSERT
        IF @ProductName IS NULL OR @ProductName = ''
            BEGIN
            SET @OutputMessage = 'Product Name is required for INSERT operation';
            RETURN;
        END

        IF @ProductCode IS NULL OR @ProductCode = ''
            BEGIN
            SET @OutputMessage = 'Product Code is required for INSERT operation';
            RETURN;
        END

        -- Check for duplicate product code
        IF EXISTS (SELECT 1
        FROM t_products
        WHERE product_code = @ProductCode AND status != 'Deleted')
            BEGIN
            SET @OutputMessage = 'Product Code already exists: ' + @ProductCode;
            RETURN;
        END

        -- Insert new product record
        INSERT INTO t_products
            (
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
            )
        VALUES
            (
                @ProductCode,
                @ProductName,
                @Description,
                ISNULL(@UnitPrice, 0.00),
                @Category,
                ISNULL(@Status, 'Active'),
                GETDATE(),
                GETDATE(),
                ISNULL(@UserId, 'system'),
                ISNULL(@UserId, 'system')
        );

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Product created successfully';

            -- Return newly created record
            DECLARE @NewProductId INT = SCOPE_IDENTITY();
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
            WHERE product_id = @NewProductId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'Failed to create product';
        END
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
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
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
        
        -- ==========================================
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        -- Validate required fields for INSERT
        IF @CustomerId IS NULL
            BEGIN
            SET @OutputMessage = 'Customer ID is required for INSERT operation';
            RETURN;
        END

        -- Validate customer exists
        IF NOT EXISTS (SELECT 1
        FROM t_customers
        WHERE customer_id = @CustomerId AND status != 'Deleted')
            BEGIN
            SET @OutputMessage = 'Customer not found with ID: ' + CAST(@CustomerId AS NVARCHAR(10));
            RETURN;
        END

        -- Generate order number if not provided
        DECLARE @OrderNumber NVARCHAR(50);
        IF @OrderNumber IS NULL
            BEGIN
            SET @OrderNumber = 'ORD' + FORMAT(GETDATE(), 'yyyyMMdd') + FORMAT(NEXT VALUE FOR seq_order_number, '0000');
        END

        -- Insert new order record
        INSERT INTO t_orders
            (
            order_number,
            customer_id,
            order_date,
            total_amount,
            status,
            notes,
            created_date,
            updated_date,
            created_by,
            updated_by
            )
        VALUES
            (
                @OrderNumber,
                @CustomerId,
                ISNULL(@OrderDate, GETDATE()),
                ISNULL(@TotalAmount, 0.00),
                ISNULL(@Status, 'Pending'),
                @Notes,
                GETDATE(),
                GETDATE(),
                ISNULL(@UserId, 'system'),
                ISNULL(@UserId, 'system')
        );

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Order created successfully';

            -- Return newly created record with customer info
            DECLARE @NewOrderId INT = SCOPE_IDENTITY();
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
            WHERE o.order_id = @NewOrderId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'Failed to create order';
        END
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
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
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

-- 2. INSERT new customer
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'INSERT',
    @CustomerName = 'New Customer Name',
    @Email = 'newcustomer@email.com',
    @Phone = '0123456789',
    @Address = '123 Main Street',
    @UserId = 'admin';

-- 3. UPDATE customer
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'UPDATE',
    @CustomerId = 1,
    @CustomerName = 'Updated Customer Name',
    @Email = 'updated@email.com',
    @UserId = 'admin';

-- 4. DELETE customer (soft delete)
EXEC [dbo].[sp_enhanced_customer_management] 
    @Operation = 'DELETE',
    @CustomerId = 1,
    @UserId = 'admin';

-- 5. INSERT new product
EXEC [dbo].[sp_enhanced_product_management] 
    @Operation = 'INSERT',
    @ProductCode = 'LAP001',
    @ProductName = 'Gaming Laptop',
    @Description = 'High-performance gaming laptop',
    @UnitPrice = 45000.00,
    @Category = 'Electronics',
    @UserId = 'admin';

-- 6. Product search with quick filter
EXEC [dbo].[sp_enhanced_product_management] 
    @Operation = 'SELECT',
    @QuickFilter = 'laptop',
    @Page = 1,
    @PageSize = 20;

-- 7. INSERT new order
EXEC [dbo].[sp_enhanced_order_management] 
    @Operation = 'INSERT',
    @CustomerId = 1,
    @TotalAmount = 1500.00,
    @Notes = 'Rush order for customer',
    @UserId = 'admin';

-- 8. Order management with date range
EXEC [dbo].[sp_enhanced_order_management] 
    @Operation = 'SELECT',
    @DateFrom = '2024-01-01',
    @DateTo = '2024-12-31',
    @Page = 1,
    @PageSize = 25;
*/

-- =====================================================================================
-- Example 4: Part Management Enhanced Stored Procedure for AMS System
-- สำหรับจัดการข้อมูลชิ้นส่วน (Parts) ในระบบ AMS
-- =====================================================================================
IF OBJECT_ID('[ams].[usp_tbm_part]', 'P') IS NOT NULL
    DROP PROCEDURE [ams].[usp_tbm_part];
GO

CREATE PROCEDURE [ams].[usp_tbm_part]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',
    -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'part_id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,
    -- Quick search across multiple fields

    -- Part data parameters (for INSERT/UPDATE/DELETE)
    @PartId INT = NULL,
    @PartNo VARCHAR(50) = NULL,
    @PartName NVARCHAR(100) = NULL,
    @SupplierName NVARCHAR(100) = NULL,
    @UnitPrice DECIMAL(18,2) = NULL,
    @Snp INT = NULL,
    @AreaCode VARCHAR(10) = NULL,
    @AreaName VARCHAR(20) = NULL,
    @Qty INT = NULL,

    -- Filtering parameters
    @AreaCodeFilter VARCHAR(10) = NULL,
    @SupplierFilter NVARCHAR(100) = NULL,
    @PriceFrom DECIMAL(18,2) = NULL,
    @PriceTo DECIMAL(18,2) = NULL,

    -- Audit parameters
    @UserId VARCHAR(50) = 'system',

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
        -- SELECT Operation with Advanced Filtering
        -- ==========================================
        IF @Operation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'part_id ASC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Quick filter for search across multiple fields
        IF @QuickFilter IS NOT NULL AND @QuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                    part_no LIKE ''%' + @QuickFilter + '%'' 
                    OR part_name LIKE ''%' + @QuickFilter + '%''
                    OR supplier_name LIKE ''%' + @QuickFilter + '%''
                    OR area_code LIKE ''%' + @QuickFilter + '%''
                    OR area_name LIKE ''%' + @QuickFilter + '%''
                )';
        END

        -- Area code filter
        IF @AreaCodeFilter IS NOT NULL AND @AreaCodeFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND area_code = ''' + @AreaCodeFilter + '''';
        END

        -- Supplier filter
        IF @SupplierFilter IS NOT NULL AND @SupplierFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND supplier_name LIKE ''%' + @SupplierFilter + '%''';
        END

        -- Price range filter
        IF @PriceFrom IS NOT NULL
            BEGIN
            SET @WhereClause = @WhereClause + ' AND unit_price >= ' + CAST(@PriceFrom AS VARCHAR(20));
        END

        IF @PriceTo IS NOT NULL
            BEGIN
            SET @WhereClause = @WhereClause + ' AND unit_price <= ' + CAST(@PriceTo AS VARCHAR(20));
        END

        -- Count total records
        SET @CountSQL = '
                SELECT COUNT(*) as TotalCount
                FROM [ams].[tbm_part] p' + @WhereClause;

        -- Main data query with pagination
        SET @SQL = '
                SELECT 
                    part_id,
                    part_no,
                    part_name,
                    supplier_name,
                    unit_price,
                    snp,
                    area_code,
                    area_name,
                    qty,
                    create_by,
                    create_date,
                    update_by,
                    update_date,
                    rowversion
                FROM [ams].[tbm_part] p' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        EXEC sp_executesql @CountSQL;

        -- Execute main query
        EXEC sp_executesql @SQL;

        SET @OutputMessage = 'Parts retrieved successfully';
        SET @OutputRowCount = @@ROWCOUNT;
    END
        
        -- ==========================================
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        -- Validate required fields for INSERT
        IF @PartNo IS NULL OR @PartNo = ''
            BEGIN
            SET @OutputMessage = 'Part Number is required for INSERT operation';
            RETURN;
        END

        IF @PartName IS NULL OR @PartName = ''
            BEGIN
            SET @OutputMessage = 'Part Name is required for INSERT operation';
            RETURN;
        END

        IF @SupplierName IS NULL OR @SupplierName = ''
            BEGIN
            SET @OutputMessage = 'Supplier Name is required for INSERT operation';
            RETURN;
        END

        IF @UnitPrice IS NULL OR @UnitPrice < 0
            BEGIN
            SET @OutputMessage = 'Unit Price is required and must be >= 0 for INSERT operation';
            RETURN;
        END

        IF @AreaCode IS NULL OR @AreaCode = ''
            BEGIN
            SET @OutputMessage = 'Area Code is required for INSERT operation';
            RETURN;
        END

        IF @AreaName IS NULL OR @AreaName = ''
            BEGIN
            SET @OutputMessage = 'Area Name is required for INSERT operation';
            RETURN;
        END

        IF @Qty IS NULL OR @Qty < 0
            BEGIN
            SET @OutputMessage = 'Quantity is required and must be >= 0 for INSERT operation';
            RETURN;
        END

        -- Check for duplicate part number
        IF EXISTS (SELECT 1
        FROM [ams].[tbm_part]
        WHERE part_no = @PartNo)
            BEGIN
            SET @OutputMessage = 'Part Number already exists: ' + @PartNo;
            RETURN;
        END

        -- Insert new part record
        INSERT INTO [ams].[tbm_part]
            (
            part_no,
            part_name,
            supplier_name,
            unit_price,
            snp,
            area_code,
            area_name,
            qty,
            create_by,
            create_date
            )
        VALUES
            (
                @PartNo,
                @PartName,
                @SupplierName,
                @UnitPrice,
                @Snp,
                @AreaCode,
                @AreaName,
                @Qty,
                @UserId,
                GETDATE()
            );

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Part created successfully';

            -- Return newly created record
            DECLARE @NewPartId INT = SCOPE_IDENTITY();
            SELECT
                part_id,
                part_no,
                part_name,
                supplier_name,
                unit_price,
                snp,
                area_code,
                area_name,
                qty,
                create_by,
                create_date,
                update_by,
                update_date,
                rowversion
            FROM [ams].[tbm_part]
            WHERE part_id = @NewPartId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'Failed to create part';
        END
    END
        
        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @PartId IS NULL
            BEGIN
            SET @OutputMessage = 'Part ID is required for UPDATE operation';
            RETURN;
        END

        -- Check if part exists
        IF NOT EXISTS (SELECT 1
        FROM [ams].[tbm_part]
        WHERE part_id = @PartId)
            BEGIN
            SET @OutputMessage = 'Part not found with ID: ' + CAST(@PartId AS NVARCHAR(10));
            RETURN;
        END

        -- Check for duplicate part number (excluding current record)
        IF @PartNo IS NOT NULL AND EXISTS (
                SELECT 1
            FROM [ams].[tbm_part]
            WHERE part_no = @PartNo AND part_id != @PartId
            )
            BEGIN
            SET @OutputMessage = 'Part Number already exists: ' + @PartNo;
            RETURN;
        END

        -- Validate unit price if provided
        IF @UnitPrice IS NOT NULL AND @UnitPrice < 0
            BEGIN
            SET @OutputMessage = 'Unit Price must be >= 0';
            RETURN;
        END

        -- Validate quantity if provided
        IF @Qty IS NOT NULL AND @Qty < 0
            BEGIN
            SET @OutputMessage = 'Quantity must be >= 0';
            RETURN;
        END

        UPDATE [ams].[tbm_part] 
            SET 
                part_no = ISNULL(@PartNo, part_no),
                part_name = ISNULL(@PartName, part_name),
                supplier_name = ISNULL(@SupplierName, supplier_name),
                unit_price = ISNULL(@UnitPrice, unit_price),
                snp = ISNULL(@Snp, snp),
                area_code = ISNULL(@AreaCode, area_code),
                area_name = ISNULL(@AreaName, area_name),
                qty = ISNULL(@Qty, qty),
                update_by = @UserId,
                update_date = GETDATE()
            WHERE part_id = @PartId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Part updated successfully';

            -- Return updated record
            SELECT
                part_id,
                part_no,
                part_name,
                supplier_name,
                unit_price,
                snp,
                area_code,
                area_name,
                qty,
                create_by,
                create_date,
                update_by,
                update_date,
                rowversion
            FROM [ams].[tbm_part]
            WHERE part_id = @PartId;
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No part found with ID: ' + CAST(@PartId AS NVARCHAR(10));
        END
    END
        
        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @PartId IS NULL
            BEGIN
            SET @OutputMessage = 'Part ID is required for DELETE operation';
            RETURN;
        END

        -- Check if part exists
        IF NOT EXISTS (SELECT 1
        FROM [ams].[tbm_part]
        WHERE part_id = @PartId)
            BEGIN
            SET @OutputMessage = 'Part not found with ID: ' + CAST(@PartId AS NVARCHAR(10));
            RETURN;
        END

        -- Check if part is referenced in tbm_sub (foreign key constraint)
        IF EXISTS (SELECT 1
        FROM [ams].[tbm_sub]
        WHERE part_id = @PartId)
            BEGIN
            SET @OutputMessage = 'Cannot delete part. Part is being used in sub-parts (tbm_sub). Please remove all related sub-parts first.';
            RETURN;
        END

        -- Physical delete (no soft delete in this table structure)
        DELETE FROM [ams].[tbm_part] 
            WHERE part_id = @PartId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount > 0
            BEGIN
            SET @OutputMessage = 'Part deleted successfully';
        END
            ELSE
            BEGIN
            SET @OutputMessage = 'No part found with ID: ' + CAST(@PartId AS NVARCHAR(10));
        END
    END
        
        -- ==========================================
        -- Invalid Operation
        -- ==========================================
        ELSE
        BEGIN
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
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
-- Part Management Usage Examples / ตัวอย่างการใช้งาน
-- =====================================================================================

/*
-- 1. SELECT all parts with pagination
EXEC [ams].[usp_tbm_part] 
    @Operation = 'SELECT',
    @Page = 1,
    @PageSize = 20,
    @OrderBy = 'part_no ASC';

-- 2. Search parts with quick filter
EXEC [ams].[usp_tbm_part] 
    @Operation = 'SELECT',
    @QuickFilter = 'motor',
    @Page = 1,
    @PageSize = 10;

-- 3. Filter parts by area code
EXEC [ams].[usp_tbm_part] 
    @Operation = 'SELECT',
    @AreaCodeFilter = 'A01',
    @Page = 1,
    @PageSize = 15;

-- 4. Filter parts by supplier and price range
EXEC [ams].[usp_tbm_part] 
    @Operation = 'SELECT',
    @SupplierFilter = 'Toyota',
    @PriceFrom = 100.00,
    @PriceTo = 1000.00;

-- 5. INSERT new part
EXEC [ams].[usp_tbm_part] 
    @Operation = 'INSERT',
    @PartNo = 'PT001',
    @PartName = 'Engine Motor',
    @SupplierName = 'Toyota Parts Co.',
    @UnitPrice = 1500.00,
    @Snp = 12345,
    @AreaCode = 'A01',
    @AreaName = 'Engine Area',
    @Qty = 50,
    @UserId = 'admin';

-- 6. UPDATE part information
EXEC [ams].[usp_tbm_part] 
    @Operation = 'UPDATE',
    @PartId = 1,
    @PartName = 'Updated Engine Motor',
    @UnitPrice = 1600.00,
    @Qty = 45,
    @UserId = 'admin';

-- 7. DELETE part
EXEC [ams].[usp_tbm_part] 
    @Operation = 'DELETE',
    @PartId = 1,
    @UserId = 'admin';
*/

PRINT '✅ Enhanced Stored Procedures created successfully!';
PRINT '📋 Available procedures:';
PRINT '   - sp_enhanced_customer_management';
PRINT '   - sp_enhanced_product_management';
PRINT '   - sp_enhanced_order_management';
PRINT '   - usp_tbm_part (AMS System)';
PRINT '';
PRINT '🔧 Each procedure supports:';
PRINT '   - SELECT with pagination, sorting, filtering';
PRINT '   - INSERT with data validation and duplicate checking';
PRINT '   - UPDATE with data validation';
PRINT '   - DELETE with constraint checking';
PRINT '   - Audit trail support';
PRINT '   - Error handling';
PRINT '';
PRINT '🏭 Part Management Features:';
PRINT '   - Quick search across part_no, part_name, supplier_name, area';
PRINT '   - Filter by area_code, supplier_name, price range';
PRINT '   - Part number duplicate checking';
PRINT '   - Price and quantity validation';
PRINT '   - Automatic audit trail (create_by, create_date, update_by, update_date)';