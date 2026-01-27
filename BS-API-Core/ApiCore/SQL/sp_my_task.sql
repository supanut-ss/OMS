USE [Timesheet]
GO
/****** Object:  StoredProcedure [tmt].[usp_tmt_my_task]    Script Date: 27/01/2026 14:20:34 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [tmt].[usp_tmt_my_task]
    -- Operation parameters
    @in_vchOperation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters (for SELECT)
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,

    -- Filter parameters
    @in_vchTaskStatus NVARCHAR(50) = NULL,
    -- Open, In Process, Close
    @in_vchUserId VARCHAR(50) = NULL,
    -- Current logged in user

    -- Output parameters (Enhanced SP pattern - must have all 3)
    @out_intRowCount INT = 0 OUTPUT,
    @out_vchMessage NVARCHAR(4000) = '' OUTPUT,
    @out_intErrorCode INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Initialize output parameters
    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation with Advanced Filtering
        -- ==========================================
        IF @in_vchOperation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @OrderByClause NVARCHAR(500);
        DECLARE @Offset INT = (@in_intPage - 1) * @in_intPageSize;

        -- Default sorting based on status (ตาม requirement)
        -- Open/In Process: Priority High ก่อน, due date วันถัดไป, due date ที่ครบกำหนด
        -- Close: Task No, Due date
        IF @in_vchOrderBy IS NOT NULL AND @in_vchOrderBy != ''
                SET @OrderByClause = @in_vchOrderBy;
            ELSE IF @in_vchTaskStatus = 'Close'
                SET @OrderByClause = 'task_no ASC, end_date ASC';
            ELSE IF @in_vchTaskStatus = 'OverDue'
                SET @OrderByClause = 'end_date ASC, priority_order ASC';
            ELSE
                SET @OrderByClause = 'priority_order ASC, end_date ASC';

        -- Filter by Task Status (case-insensitive, handle various status formats)
        IF @in_vchTaskStatus IS NOT NULL AND @in_vchTaskStatus != ''
        BEGIN
            -- Special handling for OverDue: Get OPEN and IN_PROCESS where end_date < today
            IF @in_vchTaskStatus = 'OverDue'
            BEGIN
                SET @WhereClause = @WhereClause + ' AND (
                    t.task_status IN (''Open'', ''In Process'')
                    AND t.end_date < CAST(GETDATE() AS DATE)
                )';
            END
            ELSE
            BEGIN
                -- Try exact match first, then partial match for flexibility
                SET @WhereClause = @WhereClause + ' AND (
                    t.task_status = ''' + REPLACE(@in_vchTaskStatus, '''', '''''') + '''
                    OR UPPER(t.task_status) = UPPER(''' + REPLACE(@in_vchTaskStatus, '''', '''''') + ''')
                )';
            END
        END

        -- Filter by User (member of task) - only if provided (use EXISTS subquery)
        IF @in_vchUserId IS NOT NULL AND @in_vchUserId != ''
                SET @WhereClause = @WhereClause + ' AND EXISTS (SELECT 1 FROM tmt.t_tmt_project_task_member tm WHERE tm.project_task_id = t.project_task_id AND tm.user_id = ''' + REPLACE(@in_vchUserId, '''', '''''') + ''')';

        -- Quick filter for search across multiple fields
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                    prjHD.project_no LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR prjHD.project_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR t.task_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR t.task_no LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                )';
        END

        -- Build count query
        SET @CountSQL = '
                SELECT COUNT(t.project_task_id)
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id and prjHD.is_active = ''YES''
                ' + @WhereClause;

        -- Build main query (use subquery with STRING_AGG to combine all members)
        SET @SQL = '
                SELECT 
                    t.project_task_id,
                    t.task_no,
                    t.task_name,
                    t.task_status,
                    t.task_description,
                    t.start_date,
                    t.end_date,
					t.end_date_extend,
                    t.priority,
                    CASE t.priority WHEN ''High'' THEN 1 WHEN ''Medium'' THEN 2 WHEN ''Low'' THEN 3 ELSE 4 END AS priority_order,
                    t.manday,
                    t.issue_type,
                    t.remark,
                    prjHD.project_header_id,
                    prjHD.project_no,
                    prjHD.project_name,
                    prjHD.project_type,
                    prjHD.application_type,
                    cust.customer_name,
                    ''' + ISNULL(@in_vchUserId, '') + ''' AS assignee,
                    ISNULL((SELECT STRING_AGG(LTRIM(RTRIM(ISNULL(tm2.first_name, ''''))) + '' '' + LTRIM(RTRIM(ISNULL(tm2.last_name, ''''))), '','') FROM tmt.t_tmt_project_task_member tm2 WHERE tm2.project_task_id = t.project_task_id), '''') AS assignee_list,
                    ISNULL((SELECT COUNT(*) FROM tmt.t_tmt_project_task_tracking trk WHERE trk.project_task_id = t.project_task_id AND trk.assignee = ''' + ISNULL(@in_vchUserId, '') + '''), 0) AS task_tracking_count,
                    u.first_name+'' ''+u.last_name as create_by,
                    t.create_date,
                    t.update_by,
                    t.update_date
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id and prjHD.is_active = ''YES''
                LEFT JOIN tmt.t_tmt_customer cust ON prjHD.customer_id = cust.customer_id
                LEFT JOIN [sec].[t_com_user] u WITH (NOLOCK) on u.user_id = t.create_by
                ' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        DECLARE @TotalRows INT;
        DECLARE @CountParams NVARCHAR(100) = N'@TotalRowsOut INT OUTPUT';
        SET @CountSQL = 'SELECT @TotalRowsOut = (' + @CountSQL + ')';
        EXEC sp_executesql @CountSQL, @CountParams, @TotalRowsOut = @TotalRows OUTPUT;

        -- Create temp table to ensure column schema is always returned even when no data
        CREATE TABLE #TaskResults
        (
            project_task_id INT,
            task_no NVARCHAR(50),
            task_name NVARCHAR(255),
            task_status NVARCHAR(50),
            task_description NVARCHAR(MAX),
            start_date DATETIME,
            end_date DATETIME,
            end_date_extend DATETIME,
            priority NVARCHAR(50),
            priority_order INT,
            manday DECIMAL(18,2),
            issue_type NVARCHAR(50),
            remark NVARCHAR(MAX),
            project_header_id INT,
            project_no NVARCHAR(50),
            project_name NVARCHAR(255),
            project_type NVARCHAR(50),
            application_type NVARCHAR(50),
            customer_name NVARCHAR(255),
            assignee NVARCHAR(100),
            assignee_list NVARCHAR(MAX),
            task_tracking_count INT,
            create_by NVARCHAR(100),
            create_date DATETIME,
            update_by NVARCHAR(50),
            update_date DATETIME
        );

        -- Execute main query into temp table
        INSERT INTO #TaskResults
        EXEC sp_executesql @SQL;

        -- Return data (with column schema even if empty)
        SELECT *
        FROM #TaskResults;

        DROP TABLE #TaskResults;

        -- Return pagination metadata
        SELECT @TotalRows AS TotalRows,
            @in_intPage AS CurrentPage,
            @in_intPageSize AS PageSize,
            CEILING(CAST(ISNULL(@TotalRows, 0) AS FLOAT) / @in_intPageSize) AS TotalPages;

        SET @out_intRowCount = ISNULL(@TotalRows, 0);
        SET @out_vchMessage = 'My tasks retrieved successfully';
        SET @out_intErrorCode = 0;
    END

    END TRY
    BEGIN CATCH
        SET @out_intErrorCode = ERROR_NUMBER();
        SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
