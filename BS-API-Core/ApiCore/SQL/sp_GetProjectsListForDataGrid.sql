-- สร้าง Stored Procedure สำหรับ Projects DataGrid
-- sp_GetProjectsListForDataGrid
IF EXISTS (SELECT *
FROM sys.objects
WHERE type = 'P' AND name = 'sp_GetProjectsListForDataGrid')
    DROP PROCEDURE sp_GetProjectsListForDataGrid
GO

CREATE PROCEDURE sp_GetProjectsListForDataGrid
    @Start INT = 0,
    @End INT = 100,
    @Search NVARCHAR(500) = NULL,
    @WhereClause NVARCHAR(MAX) = '1=1',
    @SortField NVARCHAR(100) = 'Id',
    @SortOrder NVARCHAR(10) = 'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @DynamicWhere NVARCHAR(MAX) = '';
    DECLARE @OrderByClause NVARCHAR(200);
    DECLARE @CountSQL NVARCHAR(MAX);

    -- สร้าง WHERE clause แบบ dynamic
    IF @Search IS NOT NULL AND @Search != ''
    BEGIN
        SET @DynamicWhere = @DynamicWhere + ' AND (p.Name LIKE ''%' + @Search + '%'' 
            OR p.Description LIKE ''%' + @Search + '%'' 
            OR c.Name LIKE ''%' + @Search + '%''
            OR p.ProjectManager LIKE ''%' + @Search + '%''
            OR p.Status LIKE ''%' + @Search + '%'')';
    END

    -- Add custom WHERE clause from MUI DataGrid FilterModel  
    IF @WhereClause IS NOT NULL AND @WhereClause != '' AND @WhereClause != '1=1'
    BEGIN
        SET @DynamicWhere = 'WHERE ' + @WhereClause + @DynamicWhere;
    END
    ELSE
    BEGIN
        SET @DynamicWhere = CASE WHEN @DynamicWhere != '' THEN 'WHERE ' + SUBSTRING(@DynamicWhere, 6, LEN(@DynamicWhere)) ELSE '' END;
    END
    -- สร้าง ORDER BY clause
    SET @OrderByClause = 'ORDER BY ';
    IF @SortField = 'name'
        SET @OrderByClause = @OrderByClause + 'p.Name';
    ELSE IF @SortField = 'customerName'
        SET @OrderByClause = @OrderByClause + 'c.Name';
    ELSE IF @SortField = 'status'
        SET @OrderByClause = @OrderByClause + 'p.Status';
    ELSE IF @SortField = 'startDate'
        SET @OrderByClause = @OrderByClause + 'p.StartDate';
    ELSE IF @SortField = 'endDate'
        SET @OrderByClause = @OrderByClause + 'p.EndDate';
    ELSE IF @SortField = 'budget'
        SET @OrderByClause = @OrderByClause + 'p.Budget';
    ELSE IF @SortField = 'projectManager'
        SET @OrderByClause = @OrderByClause + 'p.ProjectManager';
    ELSE
        SET @OrderByClause = @OrderByClause + 'p.Id';

    SET @OrderByClause = @OrderByClause + ' ' + @SortOrder;

    -- Query สำหรับนับจำนวนทั้งหมด
    SET @CountSQL = 'SELECT COUNT(*) as TotalCount 
                     FROM [VProjectMaster] p 
                     LEFT JOIN [VCustomerMaster] c ON p.CustomerId = c.Id ' + @DynamicWhere;

    -- Query สำหรับดึงข้อมูล
    SET @SQL = 'SELECT p.Id, p.Name, p.Description, p.CustomerId, 
                       ISNULL(c.Name, '''') as CustomerName,
                       p.StartDate, p.EndDate, p.Status, p.Budget, 
                       p.EstimatedHours, p.ProjectManager,
                       p.CreateBy, p.CreateDate, p.UpdateBy, p.UpdateDate
                FROM [VProjectMaster] p 
                LEFT JOIN [VCustomerMaster] c ON p.CustomerId = c.Id ' 
                + @DynamicWhere + ' ' 
                + @OrderByClause + ' 
                OFFSET ' + CAST(@Start AS NVARCHAR) + ' ROWS 
                FETCH NEXT ' + CAST(@End - @Start AS NVARCHAR) + ' ROWS ONLY';

    -- ส่งผลลัพธ์ทั้งสองชุด
    EXEC sp_executesql @CountSQL;
    EXEC sp_executesql @SQL;
END
GO

-- Test query
-- EXEC sp_GetProjectsListForDataGrid @Start=0, @End=10, @Search='', @WhereClause='1=1', @SortField='name', @SortOrder='ASC'
