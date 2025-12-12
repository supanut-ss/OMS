-- =============================================
-- Stored Procedures for My Task (S0012)
-- Created: December 2025
-- Description: My Task and Task Tracking stored procedures
-- Uses existing table: tmt.t_tmt_project_task_tracking
-- Column mapping: issue_type (Task Tracking Type), actual_work (Work Hour)
-- =============================================

USE [Timesheet]
GO


-- =============================================
-- 1. Stored Procedure: usp_tmt_my_task
-- Description: Get tasks for current user with status filter
-- =============================================
IF OBJECT_ID('tmt.usp_tmt_my_task', 'P') IS NOT NULL
    DROP PROCEDURE tmt.usp_tmt_my_task
GO

CREATE PROCEDURE [tmt].[usp_tmt_my_task]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = NULL,
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,

    -- Filter parameters
    @TaskStatus NVARCHAR(50) = NULL,
    -- Open, In Process, Close
    @UserId VARCHAR(50) = NULL,
    -- Current logged in user

    -- Output parameters (Enhanced SP pattern - must have all 3)
    @OutputRowCount INT = 0 OUTPUT,
    @OutputMessage NVARCHAR(4000) = '' OUTPUT,
    @OutputErrorCode INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Initialize output parameters
    SET @OutputRowCount = 0;
    SET @OutputMessage = '';
    SET @OutputErrorCode = 0;

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation with Advanced Filtering
        -- ==========================================
        IF @Operation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @OrderByClause NVARCHAR(500);
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Default sorting based on status (ตาม requirement)
        -- Open/In Process: Priority High ก่อน, due date วันถัดไป, due date ที่ครบกำหนด
        -- Close: Task No, Due date
        IF @OrderBy IS NOT NULL AND @OrderBy != ''
                SET @OrderByClause = @OrderBy;
            ELSE IF @TaskStatus = 'Close'
                SET @OrderByClause = 'task_no ASC, end_date ASC';
            ELSE
                SET @OrderByClause = 'priority_order ASC, end_date ASC';

        -- Filter by Task Status (case-insensitive, handle various status formats)
        IF @TaskStatus IS NOT NULL AND @TaskStatus != ''
        BEGIN
            -- Try exact match first, then partial match for flexibility
            SET @WhereClause = @WhereClause + ' AND (
                t.task_status = ''' + REPLACE(@TaskStatus, '''', '''''') + '''
                OR UPPER(t.task_status) = UPPER(''' + REPLACE(@TaskStatus, '''', '''''') + ''')
            )';
        END

        -- Filter by User (member of task) - only if provided (use EXISTS subquery)
        IF @UserId IS NOT NULL AND @UserId != ''
                SET @WhereClause = @WhereClause + ' AND EXISTS (SELECT 1 FROM tmt.t_tmt_project_task_member tm WHERE tm.project_task_id = t.project_task_id AND tm.user_id = ''' + REPLACE(@UserId, '''', '''''') + ''')';

        -- Quick filter for search across multiple fields
        IF @QuickFilter IS NOT NULL AND @QuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                    prjHD.project_no LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR prjHD.project_name LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR t.task_name LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR t.task_no LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                )';
        END

        -- Build count query
        SET @CountSQL = '
                SELECT COUNT(t.project_task_id)
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id
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
                    t.priority,
                    CASE t.priority WHEN ''High'' THEN 1 WHEN ''Medium'' THEN 2 WHEN ''Low'' THEN 3 ELSE 4 END AS priority_order,
                    t.manday,
                    t.issue_type,
                    t.remark,
                    prjHD.project_header_id,
                    prjHD.project_no,
                    prjHD.project_name,
                    prjHD.project_type,
                    ''' + ISNULL(@UserId, '') + ''' AS assignee,
                    ISNULL((SELECT STRING_AGG(LTRIM(RTRIM(ISNULL(tm2.first_name, ''''))) + '' '' + LTRIM(RTRIM(ISNULL(tm2.last_name, ''''))), '','') FROM tmt.t_tmt_project_task_member tm2 WHERE tm2.project_task_id = t.project_task_id), '''') AS assignee_list,
                    t.create_by,
                    t.create_date,
                    t.update_by,
                    t.update_date
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id
                ' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

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
            priority NVARCHAR(50),
            priority_order INT,
            manday DECIMAL(18,2),
            issue_type NVARCHAR(50),
            remark NVARCHAR(MAX),
            project_header_id INT,
            project_no NVARCHAR(50),
            project_name NVARCHAR(255),
            project_type NVARCHAR(50),
            assignee NVARCHAR(100),
            assignee_list NVARCHAR(250),
            create_by NVARCHAR(50),
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
            @Page AS CurrentPage,
            @PageSize AS PageSize,
            CEILING(CAST(ISNULL(@TotalRows, 0) AS FLOAT) / @PageSize) AS TotalPages;

        SET @OutputRowCount = ISNULL(@TotalRows, 0);
        SET @OutputMessage = 'My tasks retrieved successfully';
        SET @OutputErrorCode = 0;
    END

    END TRY
    BEGIN CATCH
        SET @OutputErrorCode = ERROR_NUMBER();
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO

PRINT 'tmt.usp_tmt_my_task created successfully'
GO


-- =============================================
-- 2. Stored Procedure: usp_tmt_project_task_tracking
-- Description: Get/Insert/Update/Delete task tracking
-- Table columns: issue_type (Task Tracking Type), actual_work (Work Hour), process_update (Description)
-- =============================================
IF OBJECT_ID('tmt.usp_tmt_project_task_tracking', 'P') IS NOT NULL
    DROP PROCEDURE tmt.usp_tmt_project_task_tracking
GO

CREATE PROCEDURE [tmt].[usp_tmt_project_task_tracking]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'actual_date DESC, create_date DESC',
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,

    -- Filter/Data parameters
    @ProjectTaskTrackingId INT = NULL,
    @ProjectTaskId INT = NULL,
    @ProjectHeaderId INT = NULL,
    @IssueType NVARCHAR(25) = NULL,
    -- Task Tracking Type
    @ActualWork DECIMAL(18,5) = NULL,
    -- Work Hour
    @ActualDate DATETIME = NULL,
    @ProcessUpdate NVARCHAR(MAX) = NULL,
    -- Description

    -- Audit parameters
    @UserId VARCHAR(50) = 'system',

    -- Output parameters (Enhanced SP pattern - must have all 3)
    @OutputRowCount INT = 0 OUTPUT,
    @OutputMessage NVARCHAR(4000) = '' OUTPUT,
    @OutputErrorCode INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Initialize output parameters
    SET @OutputRowCount = 0;
    SET @OutputMessage = '';
    SET @OutputErrorCode = 0;

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation
        -- ==========================================
        IF @Operation = 'SELECT'
        BEGIN
        DECLARE @SQL NVARCHAR(MAX);
        DECLARE @CountSQL NVARCHAR(MAX);
        DECLARE @WhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @OrderByClause NVARCHAR(500) = ISNULL(@OrderBy, 'actual_date DESC, create_date DESC');
        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Filter by ProjectTaskId
        IF @ProjectTaskId IS NOT NULL
                SET @WhereClause = @WhereClause + ' AND tt.project_task_id = ' + CAST(@ProjectTaskId AS NVARCHAR(20));

        -- Filter by specific tracking record
        IF @ProjectTaskTrackingId IS NOT NULL
                SET @WhereClause = @WhereClause + ' AND tt.project_task_tracking_id = ' + CAST(@ProjectTaskTrackingId AS NVARCHAR(20));

        -- Quick filter
        IF @QuickFilter IS NOT NULL AND @QuickFilter != ''
            BEGIN
            SET @WhereClause = @WhereClause + ' AND (
                    tt.issue_type LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR tt.process_update LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR tt.assignee_first_name LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                    OR tt.assignee_last_name LIKE ''%' + REPLACE(@QuickFilter, '''', '''''') + '%''
                )';
        END

        -- Build count query
        SET @CountSQL = '
                SELECT COUNT(*) 
                FROM tmt.t_tmt_project_task_tracking tt
                ' + @WhereClause;

        -- Build main query
        SET @SQL = '
                SELECT 
                    tt.project_task_tracking_id,
                    tt.project_task_id,
                    tt.project_header_id,
                    tt.issue_type,
                    tt.actual_work,
                    tt.actual_date,
                    tt.process_update,
                    tt.assignee,
                    tt.assignee_first_name,
                    tt.assignee_last_name,
                    tt.assignee_first_name + '' '' + tt.assignee_last_name AS assignee_list,
                    tt.create_by,
                    tt.create_date,
                    tt.update_by,
                    tt.update_date
                FROM tmt.t_tmt_project_task_tracking tt
                ' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        DECLARE @TotalRows INT;
        DECLARE @CountParams NVARCHAR(100) = N'@TotalRowsOut INT OUTPUT';
        SET @CountSQL = 'SELECT @TotalRowsOut = (' + @CountSQL + ')';
        EXEC sp_executesql @CountSQL, @CountParams, @TotalRowsOut = @TotalRows OUTPUT;

        -- Execute main query
        EXEC sp_executesql @SQL;

        -- Return pagination metadata
        SELECT @TotalRows AS TotalRows,
            @Page AS CurrentPage,
            @PageSize AS PageSize,
            CEILING(CAST(ISNULL(@TotalRows, 0) AS FLOAT) / @PageSize) AS TotalPages;

        SET @OutputRowCount = ISNULL(@TotalRows, 0);
        SET @OutputMessage = 'Task tracking retrieved successfully';
        SET @OutputErrorCode = 0;
    END

        -- ==========================================
        -- INSERT Operation
        -- ==========================================
        ELSE IF @Operation = 'INSERT'
        BEGIN
        -- Validate required fields
        IF @ProjectTaskId IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Project Task ID is required';
            RETURN;
        END

        IF @IssueType IS NULL OR @IssueType = ''
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Issue Type is required';
            RETURN;
        END

        IF @ActualWork IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Work is required';
            RETURN;
        END

        IF @ActualDate IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date is required';
            RETURN;
        END

        IF @ProcessUpdate IS NULL OR @ProcessUpdate = ''
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Process Update is required';
            RETURN;
        END

        -- Get project_header_id and validate ActualDate is within task date range
        DECLARE @TaskStartDate DATE, @TaskEndDate DATE, @TaskProjectHeaderId INT;
        SELECT @TaskStartDate = start_date, @TaskEndDate = end_date, @TaskProjectHeaderId = project_header_id
        FROM tmt.t_tmt_project_task
        WHERE project_task_id = @ProjectTaskId;

        IF @ActualDate < @TaskStartDate OR @ActualDate > @TaskEndDate
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @TaskStartDate, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @TaskEndDate, 103) + ')';
            RETURN;
        END

        -- Get user info for assignee
        DECLARE @AssigneeFirstName NVARCHAR(200), @AssigneeLastName NVARCHAR(200);
        SELECT @AssigneeFirstName = first_name, @AssigneeLastName = last_name
        FROM sec.t_com_user
        WHERE user_id = @UserId;

        -- Get next ID from sequence
        DECLARE @NewId INT = NEXT VALUE FOR tmt.ProjectTaskTrackingID;

        -- Insert tracking record
        INSERT INTO tmt.t_tmt_project_task_tracking
            (
            project_task_tracking_id,
            project_task_id,
            project_header_id,
            issue_type,
            actual_work,
            actual_date,
            process_update,
            assignee,
            assignee_first_name,
            assignee_last_name,
            create_by,
            create_date
            )
        VALUES
            (
                @NewId,
                @ProjectTaskId,
                @TaskProjectHeaderId,
                @IssueType,
                @ActualWork,
                @ActualDate,
                @ProcessUpdate,
                @UserId,
                @AssigneeFirstName,
                @AssigneeLastName,
                @UserId,
                GETDATE()
            );

        SET @OutputRowCount = 1;
        SET @OutputMessage = 'Task tracking inserted successfully';
        SET @OutputErrorCode = 0;

        -- Return inserted record
        SELECT
            tt.project_task_tracking_id,
            tt.project_task_id,
            tt.project_header_id,
            tt.issue_type,
            tt.actual_work,
            tt.actual_date,
            tt.process_update,
            tt.assignee,
            tt.assignee_first_name,
            tt.assignee_last_name,
            tt.create_by,
            tt.create_date,
            tt.update_by,
            tt.update_date
        FROM tmt.t_tmt_project_task_tracking tt
        WHERE tt.project_task_tracking_id = @NewId;
    END

        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @Operation = 'UPDATE'
        BEGIN
        IF @ProjectTaskTrackingId IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Project Task Tracking ID is required for update';
            RETURN;
        END

        -- Get project task id for date validation
        DECLARE @CurrentProjectTaskId INT;
        SELECT @CurrentProjectTaskId = project_task_id
        FROM tmt.t_tmt_project_task_tracking
        WHERE project_task_tracking_id = @ProjectTaskTrackingId;

        DECLARE @TaskStartDate2 DATE, @TaskEndDate2 DATE;
        SELECT @TaskStartDate2 = start_date, @TaskEndDate2 = end_date
        FROM tmt.t_tmt_project_task
        WHERE project_task_id = @CurrentProjectTaskId;

        -- Validate ActualDate if provided
        IF @ActualDate IS NOT NULL AND (@ActualDate < @TaskStartDate2 OR @ActualDate > @TaskEndDate2)
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @TaskStartDate2, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @TaskEndDate2, 103) + ')';
            RETURN;
        END

        -- Update tracking record
        UPDATE tmt.t_tmt_project_task_tracking
            SET 
                issue_type = ISNULL(@IssueType, issue_type),
                actual_work = ISNULL(@ActualWork, actual_work),
                actual_date = ISNULL(@ActualDate, actual_date),
                process_update = ISNULL(@ProcessUpdate, process_update),
                update_by = @UserId,
                update_date = GETDATE()
            WHERE project_task_tracking_id = @ProjectTaskTrackingId;

        SET @OutputRowCount = 1;
        SET @OutputMessage = 'Task tracking updated successfully';
        SET @OutputErrorCode = 0;

        -- Return updated record
        SELECT
            tt.project_task_tracking_id,
            tt.project_task_id,
            tt.project_header_id,
            tt.issue_type,
            tt.actual_work,
            tt.actual_date,
            tt.process_update,
            tt.assignee,
            tt.assignee_first_name,
            tt.assignee_last_name,
            tt.create_by,
            tt.create_date,
            tt.update_by,
            tt.update_date
        FROM tmt.t_tmt_project_task_tracking tt
        WHERE tt.project_task_tracking_id = @ProjectTaskTrackingId;
    END

        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @Operation = 'DELETE'
        BEGIN
        IF @ProjectTaskTrackingId IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Project Task Tracking ID is required for delete';
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_task_tracking
            WHERE project_task_tracking_id = @ProjectTaskTrackingId;

        IF @@ROWCOUNT > 0
            BEGIN
            SET @OutputRowCount = 1;
            SET @OutputMessage = 'Task tracking deleted successfully';
            SET @OutputErrorCode = 0;
        END
            ELSE
            BEGIN
            SET @OutputRowCount = 0;
            SET @OutputMessage = 'Task tracking not found';
            SET @OutputErrorCode = 1;
        END
    END

    END TRY
    BEGIN CATCH
        SET @OutputErrorCode = ERROR_NUMBER();
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO

PRINT 'tmt.usp_tmt_project_task_tracking created successfully'
GO


-- =============================================
-- Summary
-- =============================================
PRINT ''
PRINT '============================================='
PRINT 'My Task Stored Procedures Installation Complete'
PRINT '============================================='
PRINT 'Created:'
PRINT '  1. tmt.usp_tmt_my_task - Get tasks by status for current user'
PRINT '  2. tmt.usp_tmt_project_task_tracking - CRUD for task tracking'
PRINT ''
PRINT 'Table: tmt.t_tmt_project_task_tracking (existing)'
PRINT 'Column mapping:'
PRINT '  - issue_type = Task Tracking Type'
PRINT '  - actual_work = Work Hour'
PRINT '  - process_update = Description'
PRINT '============================================='
GO
