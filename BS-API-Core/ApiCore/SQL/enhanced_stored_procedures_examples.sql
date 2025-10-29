USE [AMS_KPMT_COUNT_TAG]
GO

/****** Object:  StoredProcedure [ams].[usp_tbm_method]    Script Date: 29/10/2025 17:20:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [ams].[usp_tbm_method]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',
    -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'method_id ASC',
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,
    -- Quick search across multiple fields

    -- Method data parameters (for INSERT/UPDATE/DELETE)
    @MethodId INT = NULL,
    @Method NVARCHAR(100) = NULL,

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
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'method_id ASC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Process FilterModel JSON from Frontend (Compatible with older SQL Server versions)
        IF @FilterModel IS NOT NULL AND @FilterModel != ''
            BEGIN
            -- Debug: Print FilterModel
            PRINT 'FilterModel received: ' + @FilterModel;

            -- Simple JSON parsing for FilterModel without OPENJSON
            DECLARE @FieldName NVARCHAR(100);
            DECLARE @Operator NVARCHAR(50);
            DECLARE @FilterValue NVARCHAR(500);

            -- Extract first filter item from Items array using string manipulation
            -- Look for Items array first, then extract the first item
            IF CHARINDEX('"Items":[{', @FilterModel) > 0
                BEGIN
                DECLARE @StartPos INT, @EndPos INT;
                DECLARE @FilterConditions NVARCHAR(MAX) = '';
                DECLARE @ItemsStart INT;
                DECLARE @FirstItem NVARCHAR(MAX);

                -- Find the start of the first item in Items array
                SET @ItemsStart = CHARINDEX('"Items":[{', @FilterModel) + 10;
                -- Skip '"Items":[{'
                SET @EndPos = CHARINDEX('}]', @FilterModel, @ItemsStart);
                -- Find end of first item

                -- Extract the first item content
                SET @FirstItem = SUBSTRING(@FilterModel, @ItemsStart, @EndPos - @ItemsStart);
                PRINT 'First Item extracted: ' + ISNULL(@FirstItem, 'NULL');

                -- Extract Field name
                SET @StartPos = CHARINDEX('"Field":"', @FirstItem);
                IF @StartPos > 0
                    BEGIN
                    SET @StartPos = @StartPos + 8;
                    -- Skip '"Field":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    SET @FieldName = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted Field: ' + ISNULL(@FieldName, 'NULL');
                END

                -- Extract Operator
                SET @StartPos = CHARINDEX('"Operator":"', @FirstItem);
                IF @StartPos > 0
                    BEGIN
                    SET @StartPos = @StartPos + 12;
                    -- Skip '"Operator":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    SET @Operator = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted Operator: ' + ISNULL(@Operator, 'NULL');
                END

                -- Extract Value
                SET @StartPos = CHARINDEX('"Value":"', @FirstItem);
                IF @StartPos > 0
                    BEGIN
                    SET @StartPos = @StartPos + 9;
                    -- Skip '"Value":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    SET @FilterValue = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted Value: ' + ISNULL(@FilterValue, 'NULL');
                END

                -- Validate field name against tbm_method table columns
                IF @FieldName IN ('method_id', 'method', 'create_by', 'create_date', 'update_by', 'update_date')
                    BEGIN
                    -- Apply filter based on operator
                    IF @Operator = 'contains'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '%''';
                        ELSE IF @Operator = 'equals'
                            SET @FilterConditions = '[' + @FieldName + '] = ''' + REPLACE(@FilterValue, '''', '''''') + '''';
                        ELSE IF @Operator = 'startsWith'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''' + REPLACE(@FilterValue, '''', '''''') + '%''';
                        ELSE IF @Operator = 'endsWith'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '''';
                        ELSE IF @Operator = 'isEmpty'
                            SET @FilterConditions = '([' + @FieldName + '] IS NULL OR [' + @FieldName + '] = '''')';
                        ELSE IF @Operator = 'isNotEmpty'
                            SET @FilterConditions = '[' + @FieldName + '] IS NOT NULL AND [' + @FieldName + '] != ''''';
                        ELSE
                            -- Default to contains for unsupported operators
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '%''';

                    PRINT 'Generated FilterConditions: ' + ISNULL(@FilterConditions, 'NULL');

                    -- Add filter conditions to WHERE clause
                    IF @FilterConditions != ''
                            SET @WhereClause = @WhereClause + ' AND (' + @FilterConditions + ')';
                END
                    ELSE
                    BEGIN
                    -- Invalid field name - skip this filter
                    PRINT 'Warning: Invalid field name in filter: ' + ISNULL(@FieldName, 'NULL');
                END
            END
        END

        -- Debug: Print final WHERE clause
        PRINT 'Final WHERE clause: ' + ISNULL(@WhereClause, 'NULL');

        -- Quick filter for search across multiple fields (fallback)
        IF @QuickFilter IS NOT NULL AND @QuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                        method LIKE ''%' + @QuickFilter + '%''
                        OR create_by LIKE ''%' + @QuickFilter + '%''
                    )';
        END

        -- Build count query for pagination
        SET @CountSQL = 'SELECT COUNT(*) FROM [ams].[tbm_method] ' + @WhereClause;

        -- Build main query with pagination
        SET @SQL = 'SELECT * FROM [ams].[tbm_method] ' + @WhereClause + 
                      ' ORDER BY ' + @OrderByClause + 
                      ' OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS ' +
                      ' FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Debug: Print the SQL queries
        PRINT 'Count SQL: ' + @CountSQL;
        PRINT 'Main SQL: ' + @SQL;

        -- Execute count query
        DECLARE @TotalRows INT;
        EXEC sp_executesql @CountSQL, N'', @TotalRows OUTPUT;

        -- Execute main query and return data
        EXEC sp_executesql @SQL;

        -- Return pagination metadata in second result set
        SELECT @TotalRows AS TotalRows, @Page AS CurrentPage, @PageSize AS PageSize,
            CEILING(CAST(@TotalRows AS FLOAT) / @PageSize) AS TotalPages;

        SET @OutputRowCount = @TotalRows;
        SET @OutputMessage = 'Methods retrieved successfully';
    END
        -- ==========================================
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        IF @Method IS NULL OR @Method = ''
            BEGIN
            SET @OutputMessage = 'Method name is required for INSERT operation';
            RETURN;
        END

        INSERT INTO [ams].[tbm_method]
            (method, create_by, create_date)
        VALUES
            (@Method, @UserId, GETDATE());

        SET @OutputRowCount = @@ROWCOUNT;
        SET @OutputMessage = 'Method created successfully';

        -- Return the inserted record
        SELECT *
        FROM [ams].[tbm_method]
        WHERE method_id = SCOPE_IDENTITY();
    END
        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @MethodId IS NULL
            BEGIN
            SET @OutputMessage = 'Method ID is required for UPDATE operation';
            RETURN;
        END

        UPDATE [ams].[tbm_method]
            SET method = ISNULL(@Method, method),
                update_by = @UserId,
                update_date = GETDATE()
            WHERE method_id = @MethodId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount = 0
                SET @OutputMessage = 'No method found with the specified ID';
            ELSE
                SET @OutputMessage = 'Method updated successfully';

        -- Return the updated record
        SELECT *
        FROM [ams].[tbm_method]
        WHERE method_id = @MethodId;
    END
        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @MethodId IS NULL
            BEGIN
            SET @OutputMessage = 'Method ID is required for DELETE operation';
            RETURN;
        END

        DELETE FROM [ams].[tbm_method] WHERE method_id = @MethodId;

        SET @OutputRowCount = @@ROWCOUNT;

        IF @OutputRowCount = 0
                SET @OutputMessage = 'No method found with the specified ID';
            ELSE
                SET @OutputMessage = 'Method deleted successfully';

        -- Return success confirmation
        SELECT @OutputRowCount AS DeletedRows, @OutputMessage AS Message;
    END
        ELSE
        BEGIN
        SET @OutputMessage = 'Invalid operation. Supported operations: SELECT, INSERT, UPDATE, DELETE';
    END

    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        SET @OutputRowCount = 0;
        
        -- Return error information
        SELECT
        ERROR_NUMBER() AS ErrorNumber,
        ERROR_MESSAGE() AS ErrorMessage,
        ERROR_LINE() AS ErrorLine;
    END CATCH
END
GO

/****** Object:  StoredProcedure [ams].[usp_tbm_part]    Script Date: 29/10/2025 14:10:04 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



ALTER PROCEDURE [ams].[usp_tbm_part]
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
    --SET FMTONLY ON;

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

        -- Process FilterModel JSON from Frontend (Compatible with older SQL Server versions)
        IF @FilterModel IS NOT NULL AND @FilterModel != ''
        BEGIN
            -- Debug: Print FilterModel
            PRINT 'FilterModel received: ' + @FilterModel;

            -- Simple JSON parsing for FilterModel without OPENJSON
            DECLARE @FieldName NVARCHAR(100);
            DECLARE @Operator NVARCHAR(50);
            DECLARE @FilterValue NVARCHAR(500);

            -- Extract first filter item from Items array using string manipulation
            -- Look for Items array first, then extract the first item
            IF CHARINDEX('"Items":[{', @FilterModel) > 0
            BEGIN
                DECLARE @StartPos INT, @EndPos INT;
                DECLARE @FilterConditions NVARCHAR(MAX) = '';
                DECLARE @ItemsStart INT;
                DECLARE @FirstItem NVARCHAR(MAX);

                -- Find the start of the first item in Items array
                SET @ItemsStart = CHARINDEX('"Items":[{', @FilterModel) + 10;
                -- Skip '"Items":[{'
                SET @EndPos = CHARINDEX('}]', @FilterModel, @ItemsStart);
                -- Find end of first item

                -- Extract the first item content
                SET @FirstItem = SUBSTRING(@FilterModel, @ItemsStart, @EndPos - @ItemsStart);
                PRINT 'First Item extracted: ' + ISNULL(@FirstItem, 'NULL');

                -- Simple parsing using fixed positions based on JSON structure
                -- Pattern: "Field":"part_name","Operator":"contains","Value":"ca","Id":"30843"

                -- Extract Field value
                SET @StartPos = CHARINDEX('"Field":"', @FirstItem);
                IF @StartPos > 0
                BEGIN
                    SET @StartPos = @StartPos + 8;
                    -- Skip '"Field":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    -- Find closing quote
                    SET @FieldName = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted FieldName: ' + ISNULL(@FieldName, 'NULL');
                END

                -- Extract Operator value
                SET @StartPos = CHARINDEX('"Operator":"', @FirstItem);
                IF @StartPos > 0
                BEGIN
                    SET @StartPos = @StartPos + 11;
                    -- Skip '"Operator":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    -- Find closing quote
                    SET @Operator = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted Operator: ' + ISNULL(@Operator, 'NULL');
                END

                -- Extract Value value
                SET @StartPos = CHARINDEX('"Value":"', @FirstItem);
                IF @StartPos > 0
                BEGIN
                    SET @StartPos = @StartPos + 8;
                    -- Skip '"Value":"'
                    SET @EndPos = CHARINDEX('"', @FirstItem, @StartPos);
                    -- Find closing quote
                    SET @FilterValue = SUBSTRING(@FirstItem, @StartPos, @EndPos - @StartPos);
                    PRINT 'Extracted FilterValue: ' + ISNULL(@FilterValue, 'NULL');

                    -- Validate field name (security check)
                    IF @FieldName IN ('part_id', 'part_no', 'part_name', 'supplier_name', 'unit_price', 'snp', 'area_code', 'area_name', 'qty', 'create_by', 'create_date', 'update_by', 'update_date')
                    BEGIN
                        PRINT 'Field name validation: PASSED';

                        -- Build condition based on operator
                        IF @Operator = 'contains'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '%''';
                        ELSE IF @Operator = 'equals'
                            SET @FilterConditions = '[' + @FieldName + '] = ''' + REPLACE(@FilterValue, '''', '''''') + '''';
                        ELSE IF @Operator = 'startsWith'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''' + REPLACE(@FilterValue, '''', '''''') + '%''';
                        ELSE IF @Operator = 'endsWith'
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '''';
                        ELSE IF @Operator = 'isEmpty'
                            SET @FilterConditions = '([' + @FieldName + '] IS NULL OR [' + @FieldName + '] = '''')';
                        ELSE IF @Operator = 'isNotEmpty'
                            SET @FilterConditions = '[' + @FieldName + '] IS NOT NULL AND [' + @FieldName + '] != ''''';
                        ELSE
                            -- Default to contains for unsupported operators
                            SET @FilterConditions = '[' + @FieldName + '] LIKE ''%' + REPLACE(@FilterValue, '''', '''''') + '%''';

                        PRINT 'Generated FilterConditions: ' + ISNULL(@FilterConditions, 'NULL');

                        -- Add filter conditions to WHERE clause
                        IF @FilterConditions != ''
                            SET @WhereClause = @WhereClause + ' AND (' + @FilterConditions + ')';
                    END
                    ELSE
                    BEGIN
                        -- Invalid field name - skip this filter
                        PRINT 'Warning: Invalid field name in filter: ' + ISNULL(@FieldName, 'NULL');
                    END
                END
            END
            ELSE
            BEGIN
                PRINT 'No Items array found in FilterModel';
            END
        END
        ELSE
        BEGIN
            PRINT 'FilterModel is NULL or empty';
        END

        -- Debug: Print final WHERE clause
        PRINT 'Final WHERE clause: ' + ISNULL(@WhereClause, 'NULL');
        -- Quick filter for search across multiple fields (fallback)
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
                    update_date
                FROM [ams].[tbm_part] p' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute meta data
        SELECT *
        FROM [ams].[usf_get_column_metadata](@SQL, 'ams.tbm_part');

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
        WHERE part_no = @PartNo)
            BEGIN
            SET @OutputMessage = 'Cannot delete part. Part is being used in sub-parts. Please remove all related sub-parts first.';
            RETURN;
        END

        -- Check reference in tbt_count_tag
        IF EXISTS (SELECT 1
        FROM [ams].[tbt_count_tag]
        WHERE part_no = @PartNo)
			BEGIN
            SET @OutputMessage = 'Cannot delete: part_no is in use in tbt_count_tag';
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
