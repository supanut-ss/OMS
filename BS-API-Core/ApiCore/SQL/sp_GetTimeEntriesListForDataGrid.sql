-- สร้าง Stored Procedure สำหรับ TimeEntry DataGrid
-- sp_GetTimeEntriesListForDataGrid
IF EXISTS (SELECT *
FROM sys.objects
WHERE type = 'P' AND name = 'sp_GetTimeEntriesListForDataGrid')
    DROP PROCEDURE sp_GetTimeEntriesListForDataGrid
GO

CREATE PROCEDURE sp_GetTimeEntriesListForDataGrid
    @PageNumber INT = 1,
    @PageSize INT = 100,
    @Search NVARCHAR(255) = NULL,
    @WhereClause NVARCHAR(MAX) = '1=1',
    @OrderByClause NVARCHAR(MAX) = 'WorkDate DESC',
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
        SET @BaseWhere = @BaseWhere + ' AND (te.TaskName LIKE ''%' + @Search + '%'' OR te.TaskDescription LIKE ''%' + @Search + '%'' OR te.Status LIKE ''%' + @Search + '%'' OR te.AssignedTo LIKE ''%' + @Search + '%'')';

    -- Add custom WHERE clause from MUI DataGrid FilterModel
    IF @WhereClause IS NOT NULL AND @WhereClause != '' AND @WhereClause != '1=1'
        SET @BaseWhere = @BaseWhere + ' AND (' + @WhereClause + ')';

    -- Get total count
    SET @CountSQL = 'SELECT @Total = COUNT(*) FROM timeentries te ' + @BaseWhere;
    EXEC sp_executesql @CountSQL, N'@Total INT OUTPUT', @Total = @TotalRecords OUTPUT;

    -- Get paginated data
    SET @SQL = '
        SELECT 
            te.Id,
            te.ProjectId,
            ISNULL(p.ProjectNo, '''') as ProjectNo,
            ISNULL(p.Title, '''') as ProjectTitle,
            te.WorkDate,
            te.Hours,
            te.TaskName,
            te.TaskDescription,
            te.TaskType,
            te.Status,
            te.AssignedTo,
            te.CreateBy,
            te.CreateDate,
            te.UpdateBy,
            te.UpdateDate
        FROM timeentries te
        LEFT JOIN [VProjectMaster] p ON te.ProjectId = p.Id ' 
        + @BaseWhere + ' 
        ORDER BY ' + @OrderByClause + ' 
        OFFSET ' + CAST(@Offset AS NVARCHAR) + ' ROWS 
        FETCH NEXT ' + CAST(@PageSize AS NVARCHAR) + ' ROWS ONLY';

    EXEC sp_executesql @SQL;
END
GO

-- Test query
-- EXEC sp_GetTimeEntriesListForDataGrid @PageNumber=1, @PageSize=10, @Search='', @WhereClause='1=1', @OrderByClause='WorkDate DESC'
