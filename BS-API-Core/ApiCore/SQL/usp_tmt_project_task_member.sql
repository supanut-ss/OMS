USE [Timesheet]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [tmt].[usp_tmt_project_task_member]
    (
    @Operation NVARCHAR(10) = 'SELECT',
    @Page INT = 1,
    @PageSize INT = 25,
    @OrderBy NVARCHAR(500) = 'project_task_member_id ASC',
    @SortModel NVARCHAR(MAX) = NULL,
    @FilterModel NVARCHAR(MAX) = NULL,
    @QuickFilter NVARCHAR(255) = NULL,

    @ProjectTaskMemberId INT = NULL,
    @ProjectTaskId INT = NULL,
    @ProjectHeaderId INT = NULL,
    @TaskMemberUserId VARCHAR(40) = NULL,
    @Manday DECIMAL(18, 5) = NULL,
    @Description NVARCHAR(500) = NULL,
    @UserID NVARCHAR(50) = NULL,
    @LoginUserId NVARCHAR(50) = 'system',
    @OutputRowCount INT OUTPUT,
    @OutputMessage NVARCHAR(4000) OUTPUT,
    @OutputErrorCode INT OUTPUT
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @Operation = 'SELECT'
BEGIN
        DECLARE @SQL NVARCHAR(MAX) = '
    SELECT 
        m.project_task_member_id,
        m.project_task_id,
        m.project_header_id,
        m.user_id as task_member_user_id,
        pm.first_name + '' '' + pm.last_name as fullname,
        m.manday,
        m.description,
        u.first_name as create_by,
        m.create_date,
        uu.first_name as update_by,
        m.update_date
    FROM tmt.t_tmt_project_task_member m
    LEFT JOIN tmt.v_tmt_project_member pm ON pm.user_id = m.user_id 
        AND pm.project_header_id = m.project_header_id
    LEFT JOIN sec.t_com_user u ON u.user_id = m.create_by
    LEFT JOIN sec.t_com_user uu ON uu.user_id = m.update_by
    WHERE 1 = 1 ';

        -- QUICK FILTER
        IF @QuickFilter IS NOT NULL AND @QuickFilter <> ''
    BEGIN
            SET @SQL += '
            AND (
                pm.first_name LIKE ''%' + @QuickFilter + '%'' OR
                pm.last_name LIKE ''%' + @QuickFilter + '%'' OR
                m.description LIKE ''%' + @QuickFilter + '%''
            )';
        END

        IF @ProjectTaskId IS NOT NULL
    BEGIN
            SET @SQL += '
            AND m.project_task_id = ' + CAST(@ProjectTaskId AS NVARCHAR(10));
        END

        -- ORDER
        SET @SQL += ' ORDER BY ' + @OrderBy;

        -- PAGING
        SET @SQL += '
        OFFSET (' + CAST(@Page AS NVARCHAR) + ' - 1) * ' + CAST(@PageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@PageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC (@SQL);

        SET @OutputMessage = 'Project assign task member list retrieved successfully.';
        SET @OutputErrorCode = 0;
        RETURN;
    END

/* ============================================
   INSERT
============================================ */
ELSE IF @Operation = 'INSERT'
BEGIN
        -- Check for duplicate: same user_id in same project_task_id
        IF EXISTS (
        SELECT 1
        FROM tmt.t_tmt_project_task_member
        WHERE project_task_id = @ProjectTaskId
            AND user_id = @TaskMemberUserId
    )
    BEGIN
            SET @OutputRowCount = 0;
            SET @OutputMessage = 'This member is already assigned to this task.';
            SET @OutputErrorCode = 409;
            -- Conflict
            RETURN;
        END

        -- Lookup first_name, last_name from t_tmt_project_member
        DECLARE @FirstName NVARCHAR(200), @LastName NVARCHAR(200);

        SELECT @FirstName = first_name, @LastName = last_name
        FROM tmt.t_tmt_project_member
        WHERE user_id = @TaskMemberUserId AND project_header_id = @ProjectHeaderId;

        INSERT INTO tmt.t_tmt_project_task_member
            (
            project_task_id,
            project_header_id,
            user_id,
            first_name,
            last_name,
            manday,
            description,
            create_by,
            create_date
            )
        VALUES
            (
                @ProjectTaskId,
                @ProjectHeaderId,
                @TaskMemberUserId,
                @FirstName,
                @LastName,
                @Manday,
                @Description,
                @LoginUserId,
                GETDATE()
    );

        SET @OutputRowCount = @@ROWCOUNT;
        SET @OutputMessage = 'Project task member inserted successfully';
        SET @OutputErrorCode = 0;
        RETURN;
    END

/* ============================================
   UPDATE
============================================ */
ELSE IF @Operation = 'UPDATE'
BEGIN
        IF @ProjectTaskMemberId IS NULL
    BEGIN
            SET @OutputMessage = 'ProjectTaskMemberId is required for update';
            SET @OutputErrorCode = 999;
            RETURN;
        END

        -- Check for duplicate: same user_id in same project_task_id (excluding current record)
        IF @TaskMemberUserId IS NOT NULL
    BEGIN
            DECLARE @CurrentProjectTaskId INT;
            SELECT @CurrentProjectTaskId = project_task_id
            FROM tmt.t_tmt_project_task_member
            WHERE project_task_member_id = @ProjectTaskMemberId;

            IF EXISTS (
            SELECT 1
            FROM tmt.t_tmt_project_task_member
            WHERE project_task_id = @CurrentProjectTaskId
                AND user_id = @TaskMemberUserId
                AND project_task_member_id <> @ProjectTaskMemberId  -- Exclude current record
        )
        BEGIN
                SET @OutputRowCount = 0;
                SET @OutputMessage = 'This member is already assigned to this task.';
                SET @OutputErrorCode = 409;
                -- Conflict
                RETURN;
            END
        END

        -- Lookup first_name, last_name from t_tmt_project_member if user_id is being updated
        DECLARE @UpdateFirstName NVARCHAR(200), @UpdateLastName NVARCHAR(200);
        DECLARE @CurrentProjectHeaderId INT;

        -- Get current project_header_id for the record
        SELECT @CurrentProjectHeaderId = project_header_id
        FROM tmt.t_tmt_project_task_member
        WHERE project_task_member_id = @ProjectTaskMemberId;

        IF @TaskMemberUserId IS NOT NULL
    BEGIN
            SELECT @UpdateFirstName = first_name, @UpdateLastName = last_name
            FROM tmt.t_tmt_project_member
            WHERE user_id = @TaskMemberUserId AND project_header_id = ISNULL(@ProjectHeaderId, @CurrentProjectHeaderId);
        END

        UPDATE tmt.t_tmt_project_task_member
    SET 
        user_id = ISNULL(@TaskMemberUserId, user_id),
        first_name = ISNULL(@UpdateFirstName, first_name),
        last_name = ISNULL(@UpdateLastName, last_name),
        manday = ISNULL(@Manday, manday),
        description = ISNULL(@Description, description),
        update_by = @LoginUserId,
        update_date = GETDATE()
    WHERE project_task_member_id = @ProjectTaskMemberId;

        SET @OutputRowCount = @@ROWCOUNT;
        SET @OutputMessage = 'Project task member updated successfully';
        SET @OutputErrorCode = 0;
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @Operation = 'DELETE'
BEGIN
        IF @ProjectTaskMemberId IS NULL
    BEGIN
            SET @OutputMessage = 'ProjectTaskMemberId is required for delete';
            SET @OutputErrorCode = 999;
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_task_member 
    WHERE project_task_member_id = @ProjectTaskMemberId;

        SET @OutputRowCount = @@ROWCOUNT;
        SET @OutputMessage = 'Project assign task member deleted successfully';
        SET @OutputErrorCode = 0;
        RETURN;
    END

ELSE
BEGIN
        SET @OutputMessage = 'Invalid operation. Use SELECT, INSERT, UPDATE, DELETE.';
        SET @OutputErrorCode = 999;
        RETURN;
    END

    END TRY
    BEGIN CATCH
        SET @OutputMessage = 'Error: ' + ERROR_MESSAGE();
        SET @OutputErrorCode = 999;
    END CATCH
END
