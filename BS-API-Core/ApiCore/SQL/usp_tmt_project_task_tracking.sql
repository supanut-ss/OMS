USE [Timesheet]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [tmt].[usp_tmt_project_task_tracking]
    -- Operation parameters
    @Operation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters (for SELECT)
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'actual_date DESC, create_date DESC',
    @SortModel NVARCHAR(MAX) = NULL,
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
    @ActualDate NVARCHAR(50) = NULL,
    -- Changed from DATETIME to NVARCHAR to handle various date formats
    @ProcessUpdate NVARCHAR(MAX) = NULL,
    -- Description

    -- Audit parameters
    @AssigneeUserId VARCHAR(50) = NULL,
    -- Who the task is assigned to (can be different from @UserId)
    @UserId VARCHAR(50) = 'system',
    -- Who is creating/updating the record (logged-in user)

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

    -- Convert ActualDate string to DATE (handles various formats including milliseconds)
    DECLARE @ActualDateConverted DATE = NULL;
    IF @ActualDate IS NOT NULL AND @ActualDate != ''
    BEGIN
        -- Try to convert the date string, taking only the date part
        SET @ActualDateConverted = TRY_CONVERT(DATE, LEFT(@ActualDate, 10));
        IF @ActualDateConverted IS NULL
        BEGIN
            -- Fallback: try full datetime conversion then cast to date
            SET @ActualDateConverted = TRY_CAST(TRY_CONVERT(DATETIME2, @ActualDate) AS DATE);
        END
    END

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

        -- Build main query with user display names
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
                    ISNULL(cu.first_name + '' '' + cu.last_name, tt.create_by) AS create_by_display,
                    tt.create_date,
                    tt.update_by,
                    ISNULL(uu.first_name + '' '' + uu.last_name, tt.update_by) AS update_by_display,
                    CAST(tt.update_date AS DATETIME) AS update_date
                FROM tmt.t_tmt_project_task_tracking tt
                INNER JOIN tmt.t_tmt_project_header header ON header.project_header_id = tt.project_header_id and header.is_active = ''YES''
                LEFT JOIN sec.t_com_user cu ON tt.create_by = cu.user_id
                LEFT JOIN sec.t_com_user uu ON tt.update_by = uu.user_id
                ' + @WhereClause + '
                ORDER BY ' + @OrderByClause + '
                OFFSET ' + CAST(@Offset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@PageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        DECLARE @TotalRows INT;
        DECLARE @CountParams NVARCHAR(100) = N'@TotalRowsOut INT OUTPUT';
        SET @CountSQL = 'SELECT @TotalRowsOut = (' + @CountSQL + ')';
        EXEC sp_executesql @CountSQL, @CountParams, @TotalRowsOut = @TotalRows OUTPUT;

        -- Create temp table to ensure column schema is always returned correctly
        CREATE TABLE #TrackingResults
        (
            project_task_tracking_id INT,
            project_task_id INT,
            project_header_id INT,
            issue_type NVARCHAR(25),
            actual_work DECIMAL(18,5),
            actual_date DATETIME,
            process_update NVARCHAR(MAX),
            assignee NVARCHAR(50),
            assignee_first_name NVARCHAR(200),
            assignee_last_name NVARCHAR(200),
            assignee_list NVARCHAR(500),
            create_by NVARCHAR(50),
            create_by_display NVARCHAR(500),
            create_date DATETIME,
            update_by NVARCHAR(50),
            update_by_display NVARCHAR(500),
            update_date DATETIME
        );

        -- Execute main query into temp table
        INSERT INTO #TrackingResults
        EXEC sp_executesql @SQL;

        -- Return data (with correct column schema)
        SELECT *
        FROM #TrackingResults;

        DROP TABLE #TrackingResults;

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

        IF @ActualDateConverted IS NULL
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date is required or invalid format';
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

        IF @ActualDateConverted < @TaskStartDate OR @ActualDateConverted > @TaskEndDate
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @TaskStartDate, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @TaskEndDate, 103) + ')';
            RETURN;
        END

        -- Get user info for assignee (use @AssigneeUserId if provided, otherwise @UserId)
        DECLARE @EffectiveAssignee VARCHAR(50) = ISNULL(NULLIF(@AssigneeUserId, ''), @UserId);
        DECLARE @AssigneeFirstName NVARCHAR(200), @AssigneeLastName NVARCHAR(200);
        SELECT @AssigneeFirstName = first_name, @AssigneeLastName = last_name
        FROM sec.t_com_user
        WHERE user_id = @EffectiveAssignee;

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
                @ActualDateConverted, -- Use converted date
                @ProcessUpdate,
                @EffectiveAssignee,
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
        IF @ActualDateConverted IS NOT NULL AND (@ActualDateConverted < @TaskStartDate2 OR @ActualDateConverted > @TaskEndDate2)
            BEGIN
            SET @OutputErrorCode = 1;
            SET @OutputMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @TaskStartDate2, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @TaskEndDate2, 103) + ')';
            RETURN;
        END

        -- Get assignee info if @AssigneeUserId is provided
        DECLARE @UpdateAssignee VARCHAR(50) = NULL;
        DECLARE @UpdateAssigneeFirstName NVARCHAR(200) = NULL;
        DECLARE @UpdateAssigneeLastName NVARCHAR(200) = NULL;
        IF @AssigneeUserId IS NOT NULL AND @AssigneeUserId != ''
            BEGIN
            SET @UpdateAssignee = @AssigneeUserId;
            SELECT @UpdateAssigneeFirstName = first_name, @UpdateAssigneeLastName = last_name
            FROM sec.t_com_user
            WHERE user_id = @AssigneeUserId;
        END

        -- Update tracking record
        UPDATE tmt.t_tmt_project_task_tracking
            SET 
                issue_type = ISNULL(@IssueType, issue_type),
                actual_work = ISNULL(@ActualWork, actual_work),
                actual_date = ISNULL(@ActualDateConverted, actual_date),  -- Use converted date
                process_update = ISNULL(@ProcessUpdate, process_update),
                assignee = ISNULL(@UpdateAssignee, assignee),
                assignee_first_name = ISNULL(@UpdateAssigneeFirstName, assignee_first_name),
                assignee_last_name = ISNULL(@UpdateAssigneeLastName, assignee_last_name),
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
