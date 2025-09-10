-- Stored Procedures for Master Data with MUI X DataGrid Support
-- Created: August 2025
-- Description: MUI X DataGrid compatible stored procedures with server-side filtering, sorting, and pagination

USE [TimesheetDB]
GO

-- =============================================
-- Stored Procedure: sp_GetCustomersListForDataGrid  
-- Description: Get customers for MUI X DataGrid with advanced filtering and sorting
-- =============================================
IF OBJECT_ID('sp_GetCustomersListForDataGrid', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetCustomersListForDataGrid
GO

CREATE PROCEDURE sp_GetCustomersListForDataGrid
    @PageNumber INT = 1,
    @PageSize INT = 100,
    @Search NVARCHAR(255) = NULL,
    @WhereClause NVARCHAR(MAX) = '1=1',
    @OrderByClause NVARCHAR(MAX) = 'Name ASC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @CountSQL NVARCHAR(MAX);

    -- Base WHERE clause
    DECLARE @BaseWhere NVARCHAR(MAX) = 'WHERE IsActive = ''YES''';

    -- Add QuickFilterValues for global search (MUI X DataGrid standard)
    IF @Search IS NOT NULL AND @Search != ''
        SET @BaseWhere = @BaseWhere + ' AND (Name LIKE ''%' + @Search + '%'' OR Code LIKE ''%' + @Search + '%'' OR Email LIKE ''%' + @Search + '%'')';

    -- Add custom WHERE clause from MUI DataGrid FilterModel
    IF @WhereClause IS NOT NULL AND @WhereClause != '' AND @WhereClause != '1=1'
        SET @BaseWhere = @BaseWhere + ' AND (' + @WhereClause + ')';

    -- Get total count (first result set)
    SET @CountSQL = 'SELECT COUNT(*) as TotalCount FROM customers ' + @BaseWhere;

    -- Get paginated data (second result set)
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

    -- Return both result sets (like Projects stored procedure)
    EXEC sp_executesql @CountSQL;
    EXEC sp_executesql @SQL;
END
GO

PRINT 'sp_GetCustomersListForDataGrid created successfully'
GO

PRINT 'All MUI X DataGrid compatible stored procedures created successfully!'
PRINT 'Legacy stored procedures (sp_GetCustomersList, sp_GetProjectsList, sp_GetTimeEntriesList) have been removed.'
PRINT 'Use cleanup_old_stored_procedures.sql to drop any remaining legacy procedures from database.'
GO
