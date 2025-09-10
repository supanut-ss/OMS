-- =============================================
-- Stored Procedure: sp_GetCustomersListForDataGrid  
-- Description: Get customers for MUI X DataGrid with advanced filtering and sorting
-- =============================================

USE [TimesheetDB]
GO

IF OBJECT_ID('sp_GetCustomersListForDataGrid', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetCustomersListForDataGrid
GO

CREATE PROCEDURE sp_GetCustomersListForDataGrid
    @PageNumber INT = 1,
    @PageSize INT = 100,
    @Search NVARCHAR(255) = NULL,
    @WhereClause NVARCHAR(MAX) = '1=1',
    @OrderByClause NVARCHAR(MAX) = 'Name ASC',
    @TotalRecords INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @CountSQL NVARCHAR(MAX);

    -- Base WHERE clause
    DECLARE @BaseWhere NVARCHAR(MAX) = 'WHERE 1=1';

    -- Add QuickFilterValues for global search (MUI X DataGrid standard)
    IF @Search IS NOT NULL AND @Search != ''
        SET @BaseWhere = @BaseWhere + ' AND (Name LIKE ''%' + @Search + '%'' OR Code LIKE ''%' + @Search + '%'' OR Email LIKE ''%' + @Search + '%'')';

    -- Add custom WHERE clause from MUI DataGrid FilterModel
    IF @WhereClause IS NOT NULL AND @WhereClause != '' AND @WhereClause != '1=1'
        SET @BaseWhere = @BaseWhere + ' AND (' + @WhereClause + ')';

    -- Get total count
    SET @CountSQL = 'SELECT @Total = COUNT(*) FROM customers ' + @BaseWhere;
    EXEC sp_executesql @CountSQL, N'@Total INT OUTPUT', @Total = @TotalRecords OUTPUT;

    -- Get paginated data
    SET @SQL = '
        SELECT 
            Id,
            Code,
            Name,
            Description,
            Email,
            Phone,
            Address,
            City,
            Province,
            PostalCode,
            IsActive,
            CreateBy,
            CreateDate,
            UpdateBy,
            UpdateDate
        FROM customers ' + @BaseWhere + '
        ORDER BY ' + @OrderByClause + '
        OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS 
        FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

    EXEC sp_executesql @SQL;
END
GO

PRINT 'sp_GetCustomersListForDataGrid created successfully!'
GO
