-- ============================================================================
-- Database Object Coding Standards - Parameter Migration Script
-- ============================================================================
-- This script updates stored procedure parameters to follow naming conventions:
-- 
-- Parameter Prefixes:
--   @in_  = Input parameter
--   @out_ = Output parameter
--   @v_   = Variable
--
-- Data Type Prefixes:
--   int   = INT, SMALLINT, TINYINT, BIGINT
--   vch   = NVARCHAR, VARCHAR, UNIQUEIDENTIFIER
--   nch   = NCHAR
--   ch    = CHAR
--   dt    = DATETIME, DATE
--   flt   = FLOAT
--   rea   = REAL
--   dec   = DECIMAL
--   bit   = BIT
--   bn    = BINARY
--   vbn   = VARBINARY
--   img   = IMAGE
--   tbl   = TABLE
--
-- Example: @in_intProjectId, @out_vchErrorMessage, @v_dtCreateDate
-- ============================================================================

USE [Timesheet]
GO

-- ============================================================================
-- 1. usp_invoice
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_invoice]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(200) = 'i.due_date DESC',
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    -- Member fields
    @in_intProjectHeaderId INT = NULL,
    @in_intProjectInvoiceId INT = NULL,
    @in_vchUserId NVARCHAR(50) = NULL,

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = '
        SELECT [project_invoice_id]
          ,[project_header_id]
          ,[document_type]
          ,[document_no]
          ,CAST([document_date] AS DATETIME) as document_date
          ,CAST([due_date] AS DATETIME) as due_date
          ,[amount]
          ,[description]
          ,[is_incentive_requested]
          ,[is_cancel]
        FROM [tmt].[t_tmt_project_invoice] i
        WHERE 1 = 1 ';

        -- FILTER BY PROJECT HEADER
        IF @in_intProjectHeaderId IS NOT NULL
        SET @v_vchSQL += ' AND i.project_header_id = ' + CAST(@in_intProjectHeaderId AS NVARCHAR);

        -- QUICK FILTER
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
            AND (
                i.document_type LIKE ''%' + @in_vchQuickFilter + '%'' OR
                i.document_no LIKE ''%' + @in_vchQuickFilter + '%'' OR
                i.document_date = ''%' + @in_vchQuickFilter + '%'' OR
                i.due_date = ''%' + @in_vchQuickFilter + '%'' OR
                i.amount = ''%' + @in_vchQuickFilter + '%'' OR
                i.description LIKE ''%' + @in_vchQuickFilter + '%'' OR
                i.is_incentive_requested = ''%' + @in_vchQuickFilter + '%'' OR
                i.is_cancel = ''%' + @in_vchQuickFilter + '%''
            )';
        END

        -- Sort Model
        DECLARE @v_vchOrderBy NVARCHAR(200) = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);

        -- ORDER BY
        SET @v_vchSQL += ' ORDER BY ' + @v_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC(@v_vchSQL);

        SET @out_vchMessage = 'Invoice list retrieved successfully';
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectInvoiceId IS NULL
    BEGIN
            SET @out_vchMessage = 'Project Invoice Id is required';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_invoice
    WHERE project_invoice_id = @in_intProjectInvoiceId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Invoice deleted successfully';
        RETURN;
    END

/* Invalid */
ELSE
BEGIN
        SET @out_vchMessage = 'Invalid operation';
        SET @out_intErrorCode = 999;
        RETURN;
    END

END TRY
BEGIN CATCH
    SET @out_intErrorCode = 999;
    SET @out_vchMessage = ERROR_MESSAGE();
END CATCH
END
GO

-- ============================================================================
-- 2. usp_project_history
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_project_history]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(200) = 'create_date asc',
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_intProjectHeaderId INT,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    @in_vchUserId NVARCHAR(40) = 'system',

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY
    
    IF @in_vchOperation = 'SELECT'
    BEGIN
        DECLARE @v_intMasterProjectId INT;
        DECLARE @v_vchSQL NVARCHAR(MAX) = '';

        SELECT @v_intMasterProjectId = master_project_id
        FROM tmt.t_tmt_project_header
        WHERE project_header_id = @in_intProjectHeaderId;

        IF @v_intMasterProjectId IS NOT NULL
        BEGIN
            SET @v_vchSQL = '
            SELECT [project_header_id]
              ,[master_project_id]
              ,[project_no]
              ,[project_name]
              ,[project_status]
              ,[application_type]
              ,[project_type]
              ,[iso_type_id]
              ,[po_number]
              ,[sale_id]
              ,[customer_id]
              ,[manday]
              ,[management_cost]
              ,[travel_cost]
              ,[plan_project_start]
              ,[plan_project_end]
              ,[revise_project_start]
              ,[revise_project_end]
              ,[actual_project_start]
              ,[actual_project_end]
              ,[remark]
              ,[record_type]
              ,ISNULL([year],'''') year
              ,[is_active]
              ,[create_by]
              ,[create_date]
              ,[update_by]
              ,[update_date] 
            FROM tmt.t_tmt_project_header m 
            WHERE is_active = ''YES'' and project_header_id = ' + CAST(@v_intMasterProjectId AS NVARCHAR) + '
            UNION  
            SELECT 
              [project_header_id]
              ,[master_project_id]
              ,[project_no]
              ,[project_name]
              ,[project_status]
              ,[application_type]
              ,[project_type]
              ,[iso_type_id]
              ,[po_number]
              ,[sale_id]
              ,[customer_id]
              ,[manday]
              ,[management_cost]
              ,[travel_cost]
              ,[plan_project_start]
              ,[plan_project_end]
              ,[revise_project_start]
              ,[revise_project_end]
              ,[actual_project_start]
              ,[actual_project_end]
              ,[remark]
              ,[record_type]
              ,ISNULL([year],'''') year
              ,[is_active]
              ,[create_by]
              ,[create_date]
              ,[update_by]
              ,[update_date]
            FROM tmt.t_tmt_project_header m
            WHERE m.is_active = ''YES'' AND m.master_project_id = ' + CAST(@v_intMasterProjectId AS NVARCHAR) + ' AND project_header_id <> ' + CAST(@in_intProjectHeaderId AS NVARCHAR);
        END
        ELSE
        BEGIN
            SET @v_vchSQL = 'SELECT 
              [project_header_id]
              ,[master_project_id]
              ,[project_no]
              ,[project_name]
              ,[project_status]
              ,[application_type]
              ,[project_type]
              ,[iso_type_id]
              ,[po_number]
              ,[sale_id]
              ,[customer_id]
              ,[manday]
              ,[management_cost]
              ,[travel_cost]
              ,[plan_project_start]
              ,[plan_project_end]
              ,[revise_project_start]
              ,[revise_project_end]
              ,[actual_project_start]
              ,[actual_project_end]
              ,[remark]
              ,[record_type]
              ,ISNULL([year],'''') year
              ,[is_active]
              ,[create_by]
              ,[create_date]
              ,[update_by]
              ,[update_date]
            FROM tmt.t_tmt_project_header m
            WHERE is_active = ''YES'' and m.master_project_id = ' + CAST(@in_intProjectHeaderId AS NVARCHAR);
        END

        -- FILTER BY PROJECT HEADER
        IF @in_intProjectHeaderId IS NULL
        BEGIN
            SET @out_vchMessage = 'Project history list retrieved failed !!';
            RETURN;
        END

        -- QUICK FILTER
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
        BEGIN
            SET @v_vchSQL += '
                AND (
                    project_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                    project_no LIKE ''%' + @in_vchQuickFilter + '%'' 
                )';
        END

        SET @v_vchSQL += ' AND record_type = ''PROJECT'' AND project_type in (''Project'',''Change Request'')';

        -- Sort Model
        DECLARE @v_vchOrderBy NVARCHAR(200) = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        SET @v_vchSQL += ' ORDER BY ' + @v_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
            OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
            FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
        ';

        EXEC(@v_vchSQL);

        SET @out_vchMessage = 'Project history list retrieved successfully';
        RETURN;
    END
    ELSE
    BEGIN
        SET @out_vchMessage = 'Project history list retrieved failed';
    END;

    END TRY
    BEGIN CATCH
        SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
        SET @out_intErrorCode = 999;
    END CATCH
END;
GO

-- ============================================================================
-- 3. usp_project_teams
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_project_teams]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(200) = 'pm.project_member_id ASC',
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    -- Member fields
    @in_intProjectId INT = NULL,
    @in_intProjectMemberId INT = NULL,
    @in_vchAssignUserId NVARCHAR(50) = NULL,
    @in_vchRole NVARCHAR(255) = NULL,
    @in_vchDescription NVARCHAR(255) = NULL,
    @in_vchUserId NVARCHAR(50) = 'system',
    @in_vchLoginUserId NVARCHAR(50) = NULL,

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = '
        SELECT
            pm.project_member_id,
            pm.project_header_id,
            pm.user_id as assign_user_id,
            pm.role,
            pm.description
        FROM tmt.t_tmt_project_member pm
        LEFT JOIN sec.t_com_user u ON u.user_id = pm.user_id
        WHERE 1 = 1 ';

        -- FILTER BY PROJECT HEADER
        IF @in_intProjectId IS NOT NULL
        SET @v_vchSQL += ' AND pm.project_header_id = ' + CAST(@in_intProjectId AS NVARCHAR);

        -- QUICK FILTER
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
            AND (
                u.first_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                u.last_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                pm.role LIKE ''%' + @in_vchQuickFilter + '%''
            )';
        END

        -- Sort Model
        DECLARE @v_vchOrderBy NVARCHAR(200) = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        SET @v_vchSQL += ' ORDER BY ' + @v_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC(@v_vchSQL);

        SET @out_vchMessage = 'Project team list retrieved successfully';
        RETURN;
    END

/* ============================================
   INSERT
============================================ */
ELSE IF @in_vchOperation = 'INSERT'
BEGIN
        IF @in_intProjectId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectHeaderId is required';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        -- CHECK DUPLICATE USER
        IF (EXISTS (
        SELECT 1
        FROM tmt.t_tmt_project_member
        WHERE user_id = @in_vchAssignUserId
            AND role = @in_vchRole
            AND project_header_id = @in_intProjectId
    ))
    BEGIN
            SET @out_intRowCount = -1;
            SET @out_vchMessage = 'Duplicate User Project Team';
            SET @out_intErrorCode = 409;
            RETURN;
        END

        DECLARE @v_vchFirstName NVARCHAR(200) = NULL;
        DECLARE @v_vchLastName NVARCHAR(200) = NULL;

        SELECT
            @v_vchFirstName = first_name,
            @v_vchLastName = last_name
        FROM sec.t_com_user
        WHERE user_id = @in_vchAssignUserId;

        INSERT INTO tmt.t_tmt_project_member
            (
            project_header_id,
            user_id,
            first_name,
            last_name,
            role,
            description,
            create_by,
            create_date
            )
        VALUES
            (
                @in_intProjectId,
                @in_vchAssignUserId,
                @v_vchFirstName,
                @v_vchLastName,
                @in_vchRole,
                @in_vchDescription,
                @in_vchUserId,
                GETDATE()
    );

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project member inserted successfully';
        RETURN;
    END

/* ============================================
   UPDATE
============================================ */
ELSE IF @in_vchOperation = 'UPDATE'
BEGIN
        IF @in_intProjectMemberId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectMemberId is required';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        DECLARE @v_vchExistingRole NVARCHAR(50);
        SELECT @v_vchExistingRole = role
        FROM tmt.t_tmt_project_member
        WHERE project_member_id = @in_intProjectMemberId;

        IF (EXISTS (
        SELECT 1
        FROM tmt.t_tmt_project_member
        WHERE user_id = @in_vchAssignUserId
            AND project_header_id = @in_intProjectId
            AND role <> @v_vchExistingRole
    ))
    BEGIN
            SET @out_intRowCount = -1;
            SET @out_vchMessage = 'Duplicate User Role Project Team';
            SET @out_intErrorCode = 409;
            RETURN;
        END

        UPDATE tmt.t_tmt_project_member
    SET
        project_header_id = ISNULL(@in_intProjectId, project_header_id),
        user_id = ISNULL(@in_vchAssignUserId, user_id),
        role = ISNULL(@in_vchRole, role),
        description = ISNULL(@in_vchDescription, description),
        update_by = @in_vchLoginUserId,
        update_date = GETDATE()
    WHERE project_member_id = @in_intProjectMemberId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project member updated successfully';
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectMemberId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectMemberId is required';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_member
    WHERE project_member_id = @in_intProjectMemberId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project member deleted successfully';
        RETURN;
    END

/* Invalid */
ELSE
BEGIN
        SET @out_vchMessage = 'Invalid operation';
        SET @out_intErrorCode = 999;
        RETURN;
    END

END TRY
BEGIN CATCH
    SET @out_intErrorCode = 999;
    SET @out_vchMessage = ERROR_MESSAGE();
END CATCH
END
GO

-- ============================================================================
-- 4. usp_tmt_project_task_member (Parameters Migration)
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_tmt_project_task_member]
    (
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = 'project_task_member_id ASC',
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,

    @in_intProjectTaskMemberId INT = NULL,
    @in_intProjectTaskId INT = NULL,
    @in_intProjectHeaderId INT = NULL,
    @in_vchTaskMemberUserId VARCHAR(40) = NULL,
    @in_decManday DECIMAL(18, 5) = NULL,
    @in_vchDescription NVARCHAR(500) = NULL,
    @in_vchUserId NVARCHAR(50) = NULL,
    @in_vchLoginUserId NVARCHAR(50) = 'system',

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
)
AS
BEGIN
    SET NOCOUNT ON;

    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = '
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
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
            AND (
                pm.first_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                pm.last_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                m.description LIKE ''%' + @in_vchQuickFilter + '%''
            )';
        END

        IF @in_intProjectTaskId IS NOT NULL
    BEGIN
            SET @v_vchSQL += ' AND m.project_task_id = ' + CAST(@in_intProjectTaskId AS NVARCHAR(10));
        END

        -- Sort Model
        DECLARE @v_vchOrderBy NVARCHAR(500) = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        SET @v_vchSQL += ' ORDER BY ' + @v_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC (@v_vchSQL);

        SET @out_vchMessage = 'Project assign task member list retrieved successfully.';
        SET @out_intErrorCode = 0;
        RETURN;
    END

/* ============================================
   INSERT
============================================ */
ELSE IF @in_vchOperation = 'INSERT'
BEGIN
        -- Check for duplicate
        IF EXISTS (
        SELECT 1
        FROM tmt.t_tmt_project_task_member
        WHERE project_task_id = @in_intProjectTaskId
            AND user_id = @in_vchTaskMemberUserId
    )
    BEGIN
            SET @out_intRowCount = 0;
            SET @out_vchMessage = 'This member is already assigned to this task.';
            SET @out_intErrorCode = 409;
            RETURN;
        END

        -- Lookup first_name, last_name
        DECLARE @v_vchFirstName NVARCHAR(200), @v_vchLastName NVARCHAR(200);

        SELECT @v_vchFirstName = first_name, @v_vchLastName = last_name
        FROM tmt.t_tmt_project_member
        WHERE user_id = @in_vchTaskMemberUserId AND project_header_id = @in_intProjectHeaderId;

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
                @in_intProjectTaskId,
                @in_intProjectHeaderId,
                @in_vchTaskMemberUserId,
                @v_vchFirstName,
                @v_vchLastName,
                @in_decManday,
                @in_vchDescription,
                @in_vchLoginUserId,
                GETDATE()
    );

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project task member inserted successfully';
        SET @out_intErrorCode = 0;
        RETURN;
    END

/* ============================================
   UPDATE
============================================ */
ELSE IF @in_vchOperation = 'UPDATE'
BEGIN
        IF @in_intProjectTaskMemberId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectTaskMemberId is required for update';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        -- Check for duplicate (excluding current record)
        IF @in_vchTaskMemberUserId IS NOT NULL
    BEGIN
            DECLARE @v_intCurrentProjectTaskId INT;
            SELECT @v_intCurrentProjectTaskId = project_task_id
            FROM tmt.t_tmt_project_task_member
            WHERE project_task_member_id = @in_intProjectTaskMemberId;

            IF EXISTS (
            SELECT 1
            FROM tmt.t_tmt_project_task_member
            WHERE project_task_id = @v_intCurrentProjectTaskId
                AND user_id = @in_vchTaskMemberUserId
                AND project_task_member_id <> @in_intProjectTaskMemberId
        )
        BEGIN
                SET @out_intRowCount = 0;
                SET @out_vchMessage = 'This member is already assigned to this task.';
                SET @out_intErrorCode = 409;
                RETURN;
            END
        END

        -- Lookup first_name, last_name if user_id is being updated
        DECLARE @v_vchUpdateFirstName NVARCHAR(200), @v_vchUpdateLastName NVARCHAR(200);
        DECLARE @v_intCurrentProjectHeaderId INT;

        SELECT @v_intCurrentProjectHeaderId = project_header_id
        FROM tmt.t_tmt_project_task_member
        WHERE project_task_member_id = @in_intProjectTaskMemberId;

        IF @in_vchTaskMemberUserId IS NOT NULL
    BEGIN
            SELECT @v_vchUpdateFirstName = first_name, @v_vchUpdateLastName = last_name
            FROM tmt.t_tmt_project_member
            WHERE user_id = @in_vchTaskMemberUserId
                AND project_header_id = ISNULL(@in_intProjectHeaderId, @v_intCurrentProjectHeaderId);
        END

        UPDATE tmt.t_tmt_project_task_member
    SET 
        user_id = ISNULL(@in_vchTaskMemberUserId, user_id),
        first_name = ISNULL(@v_vchUpdateFirstName, first_name),
        last_name = ISNULL(@v_vchUpdateLastName, last_name),
        manday = ISNULL(@in_decManday, manday),
        description = ISNULL(@in_vchDescription, description),
        update_by = @in_vchLoginUserId,
        update_date = GETDATE()
    WHERE project_task_member_id = @in_intProjectTaskMemberId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project task member updated successfully';
        SET @out_intErrorCode = 0;
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectTaskMemberId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectTaskMemberId is required for delete';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_task_member 
    WHERE project_task_member_id = @in_intProjectTaskMemberId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project assign task member deleted successfully';
        SET @out_intErrorCode = 0;
        RETURN;
    END

ELSE
BEGIN
        SET @out_vchMessage = 'Invalid operation. Use SELECT, INSERT, UPDATE, DELETE.';
        SET @out_intErrorCode = 999;
        RETURN;
    END

END TRY
BEGIN CATCH
    SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
    SET @out_intErrorCode = 999;
END CATCH
END
GO

-- ============================================================================
-- 5. usp_tmt_my_task
-- ============================================================================
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
    @in_vchUserId VARCHAR(50) = NULL,

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
        DECLARE @v_vchSQL NVARCHAR(MAX);
        DECLARE @v_vchCountSQL NVARCHAR(MAX);
        DECLARE @v_vchWhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @v_vchOrderByClause NVARCHAR(500);
        DECLARE @v_intOffset INT = (@in_intPage - 1) * @in_intPageSize;

        -- Default sorting based on status
        IF @in_vchOrderBy IS NOT NULL AND @in_vchOrderBy != ''
                SET @v_vchOrderByClause = @in_vchOrderBy;
            ELSE IF @in_vchTaskStatus = 'Close'
                SET @v_vchOrderByClause = 'task_no ASC, end_date ASC';
            ELSE
                SET @v_vchOrderByClause = 'priority_order ASC, end_date ASC';

        -- Filter by Task Status
        IF @in_vchTaskStatus IS NOT NULL AND @in_vchTaskStatus != ''
            BEGIN
            SET @v_vchWhereClause = @v_vchWhereClause + ' AND (
                    t.task_status = ''' + REPLACE(@in_vchTaskStatus, '''', '''''') + '''
                    OR UPPER(t.task_status) = UPPER(''' + REPLACE(@in_vchTaskStatus, '''', '''''') + ''')
                )';
        END

        -- Filter by User
        IF @in_vchUserId IS NOT NULL AND @in_vchUserId != ''
                SET @v_vchWhereClause = @v_vchWhereClause + ' AND EXISTS (SELECT 1 FROM tmt.t_tmt_project_task_member tm WHERE tm.project_task_id = t.project_task_id AND tm.user_id = ''' + REPLACE(@in_vchUserId, '''', '''''') + ''')';

        -- Quick filter
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter != ''
            BEGIN
            SET @v_vchWhereClause = @v_vchWhereClause + ' AND (
                    prjHD.project_no LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR prjHD.project_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR t.task_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR t.task_no LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                )';
        END

        -- Build count query
        SET @v_vchCountSQL = '
                SELECT COUNT(t.project_task_id)
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id and prjHD.is_active = ''YES''
                ' + @v_vchWhereClause;

        -- Build main query
        SET @v_vchSQL = '
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
                    ''' + ISNULL(@in_vchUserId, '') + ''' AS assignee,
                    ISNULL((SELECT STRING_AGG(LTRIM(RTRIM(ISNULL(tm2.first_name, ''''))) + '' '' + LTRIM(RTRIM(ISNULL(tm2.last_name, ''''))), '','') FROM tmt.t_tmt_project_task_member tm2 WHERE tm2.project_task_id = t.project_task_id), '''') AS assignee_list,
                    t.create_by,
                    t.create_date,
                    t.update_by,
                    t.update_date
                FROM tmt.t_tmt_project_task t
                INNER JOIN tmt.t_tmt_project_header prjHD ON t.project_header_id = prjHD.project_header_id and prjHD.is_active = ''YES''
                ' + @v_vchWhereClause + '
                ORDER BY ' + @v_vchOrderByClause + '
                OFFSET ' + CAST(@v_intOffset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        DECLARE @v_intTotalRows INT;
        DECLARE @v_vchCountParams NVARCHAR(100) = N'@TotalRowsOut INT OUTPUT';
        SET @v_vchCountSQL = 'SELECT @TotalRowsOut = (' + @v_vchCountSQL + ')';
        EXEC sp_executesql @v_vchCountSQL, @v_vchCountParams, @TotalRowsOut = @v_intTotalRows OUTPUT;

        -- Create temp table
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

        INSERT INTO #TaskResults
        EXEC sp_executesql @v_vchSQL;

        SELECT *
        FROM #TaskResults;
        DROP TABLE #TaskResults;

        -- Return pagination metadata
        SELECT @v_intTotalRows AS TotalRows,
            @in_intPage AS CurrentPage,
            @in_intPageSize AS PageSize,
            CEILING(CAST(ISNULL(@v_intTotalRows, 0) AS FLOAT) / @in_intPageSize) AS TotalPages;

        SET @out_intRowCount = ISNULL(@v_intTotalRows, 0);
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
GO

-- ============================================================================
-- 6. usp_tmt_project_header
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_tmt_project_header]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = 'project_no ASC',
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    -- Project fields
    @in_intProjectHeaderId INT = NULL,
    @in_intMasterProjectId INT = NULL,
    @in_vchProjectNo NVARCHAR(50) = NULL,
    @in_vchProjectName NVARCHAR(255) = NULL,
    @in_vchProjectStatus NVARCHAR(50) = NULL,
    @in_vchApplicationType NVARCHAR(50) = NULL,
    @in_vchProjectType NVARCHAR(50) = NULL,
    @in_intIsoTypeId INT = NULL,
    @in_vchPoNumber NVARCHAR(50) = NULL,
    @in_intSaleId INT = NULL,
    @in_intCustomerId INT = NULL,
    @in_decManday DECIMAL(18,2) = NULL,
    @in_decManagementCost DECIMAL(18,2) = NULL,
    @in_decTravelCost DECIMAL(18,2) = NULL,
    @in_dtPlanProjectStart DATE = NULL,
    @in_dtPlanProjectEnd DATE = NULL,
    @in_dtReviseProjectStart DATE = NULL,
    @in_dtReviseProjectEnd DATE = NULL,
    @in_dtActualProjectStart DATE = NULL,
    @in_dtActualProjectEnd DATE = NULL,
    @in_vchRemark NVARCHAR(255) = NULL,
    @in_bitIsActive BIT = NULL,
    @in_vchUserId NVARCHAR(50) = 'system',

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = '
        SELECT 
        project_header_id,
           project_no,
           project_name,
           project_status,
           c.customer_name,
           plan_project_start,
           plan_project_end,
           s.sale_name,
           u.first_name +'' ''+u.last_name as create_by,
           p.create_date,
           uu.first_name+'' ''+uu.last_name as update_by,
           p.update_date
        FROM [tmt].[t_tmt_project_header] p
        LEFT JOIN [tmt].[t_tmt_customer] c on c.customer_id = p.customer_id
        LEFT JOIN [tmt].[t_tmt_sale] s on s.sale_id = p.sale_id
        LEFT JOIN [sec].[t_com_user] u on u.user_id = p.create_by
        LEFT JOIN [sec].[t_com_user] uu on uu.user_id = p.update_by
        WHERE 1 = 1 AND p.is_active = ''YES'' and record_type=''PROJECT'' ';

        -- QUICK FILTER
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
            AND (
                project_no LIKE ''%' + @in_vchQuickFilter + '%'' OR
                project_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                po_number LIKE ''%' + @in_vchQuickFilter + '%''
            )';
        END
        --Sort Model
        SET @in_vchOrderBy = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        -- ORDER
        SET @v_vchSQL += ' ORDER BY ' + @in_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC (@v_vchSQL);

        SET @out_vchMessage = 'Project header list retrieved successfully.';
        SET @out_intErrorCode = 0;
        RETURN;
    END

/* ============================================
   INSERT
============================================ */
ELSE IF @in_vchOperation = 'INSERT'
BEGIN
        INSERT INTO [Timesheet].[tmt].[t_tmt_project_header]
            (
            master_project_id,
            project_no,
            project_name,
            project_status,
            application_type,
            project_type,
            iso_type_id,
            po_number,
            sale_id,
            customer_id,
            manday,
            management_cost,
            travel_cost,
            plan_project_start,
            plan_project_end,
            revise_project_start,
            revise_project_end,
            actual_project_start,
            actual_project_end,
            remark,
            is_active,
            create_by,
            create_date
            )
        VALUES
            (
                @in_intMasterProjectId,
                @in_vchProjectNo,
                @in_vchProjectName,
                @in_vchProjectStatus,
                @in_vchApplicationType,
                @in_vchProjectType,
                @in_intIsoTypeId,
                @in_vchPoNumber,
                @in_intSaleId,
                @in_intCustomerId,
                @in_decManday,
                @in_decManagementCost,
                @in_decTravelCost,
                @in_dtPlanProjectStart,
                @in_dtPlanProjectEnd,
                @in_dtReviseProjectStart,
                @in_dtReviseProjectEnd,
                @in_dtActualProjectStart,
                @in_dtActualProjectEnd,
                @in_vchRemark,
                ISNULL(@in_bitIsActive, 1),
                @in_vchUserId,
                GETDATE()
    );

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header inserted successfully';
        RETURN;
    END

/* ============================================
   UPDATE
============================================ */
ELSE IF @in_vchOperation = 'UPDATE'
BEGIN
        IF @in_intProjectHeaderId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectHeaderId is required for update';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        UPDATE [Timesheet].[tmt].[t_tmt_project_header]
    SET
        master_project_id = ISNULL(@in_intMasterProjectId, master_project_id),
        project_no = ISNULL(@in_vchProjectNo, project_no),
        project_name = ISNULL(@in_vchProjectName, project_name),
        project_status = ISNULL(@in_vchProjectStatus, project_status),
        application_type = ISNULL(@in_vchApplicationType, application_type),
        project_type = ISNULL(@in_vchProjectType, project_type),
        iso_type_id = ISNULL(@in_intIsoTypeId, iso_type_id),
        po_number = ISNULL(@in_vchPoNumber, po_number),
        sale_id = ISNULL(@in_intSaleId, sale_id),
        customer_id = ISNULL(@in_intCustomerId, customer_id),
        manday = ISNULL(@in_decManday, manday),
        management_cost = ISNULL(@in_decManagementCost, management_cost),
        travel_cost = ISNULL(@in_decTravelCost, travel_cost),
        plan_project_start = ISNULL(@in_dtPlanProjectStart, plan_project_start),
        plan_project_end = ISNULL(@in_dtPlanProjectEnd, plan_project_end),
        revise_project_start = ISNULL(@in_dtReviseProjectStart, revise_project_start),
        revise_project_end = ISNULL(@in_dtReviseProjectEnd, revise_project_end),
        actual_project_start = ISNULL(@in_dtActualProjectStart, actual_project_start),
        actual_project_end = ISNULL(@in_dtActualProjectEnd, actual_project_end),
        remark = ISNULL(@in_vchRemark, remark),
        is_active = ISNULL(@in_bitIsActive, is_active),
        update_by = @in_vchUserId,
        update_date = GETDATE()
    WHERE project_header_id = @in_intProjectHeaderId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header updated successfully';
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectHeaderId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectHeaderId is required for delete';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        UPDATE [tmt].[t_tmt_project_header] set is_active = 'NO',
    update_date = GETDATE(),
    update_by = @in_vchUserId
    WHERE project_header_id = @in_intProjectHeaderId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header deleted successfully';
        RETURN;
    END

ELSE
BEGIN
        SET @out_vchMessage = 'Invalid operation. Use SELECT, INSERT, UPDATE, DELETE.';
        SET @out_intErrorCode = 999;
        RETURN;
    END

    END TRY
    BEGIN CATCH
        SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
        SET @out_intErrorCode = 999;
    END CATCH
END
GO

-- ============================================================================
-- 7. usp_tmt_project_header_ma
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_tmt_project_header_ma]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = 'project_no ASC',
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    -- Project fields
    @in_intProjectHeaderId INT = NULL,
    @in_intMasterProjectId INT = NULL,
    @in_vchProjectNo NVARCHAR(50) = NULL,
    @in_vchProjectName NVARCHAR(255) = NULL,
    @in_vchProjectStatus NVARCHAR(50) = NULL,
    @in_vchApplicationType NVARCHAR(50) = NULL,
    @in_vchProjectType NVARCHAR(50) = NULL,
    @in_intIsoTypeId INT = NULL,
    @in_vchPoNumber NVARCHAR(50) = NULL,
    @in_intSaleId INT = NULL,
    @in_intCustomerId INT = NULL,
    @in_decManday DECIMAL(18,2) = NULL,
    @in_decManagementCost DECIMAL(18,2) = NULL,
    @in_decTravelCost DECIMAL(18,2) = NULL,
    @in_dtPlanProjectStart DATETIME = NULL,
    @in_dtPlanProjectEnd DATETIME = NULL,
    @in_dtReviseProjectStart DATETIME = NULL,
    @in_dtReviseProjectEnd DATETIME = NULL,
    @in_dtActualProjectStart DATETIME = NULL,
    @in_dtActualProjectEnd DATETIME = NULL,
    @in_vchRemark NVARCHAR(255) = NULL,
    @in_bitIsActive BIT = NULL,
    @in_vchUserId NVARCHAR(50) = 'system',

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* ============================================
   SELECT
============================================ */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = '
        SELECT 
        project_header_id,
           project_no,
           project_name,
           project_status,
           c.customer_name,
           plan_project_start,
           plan_project_end,
           s.sale_name,
           u.first_name +'' ''+u.last_name as create_by,
           p.create_date,
           uu.first_name+'' ''+uu.last_name as update_by,
           p.update_date
        FROM [tmt].[t_tmt_project_header] p
        LEFT JOIN [tmt].[t_tmt_customer] c on c.customer_id = p.customer_id
        LEFT JOIN [tmt].[t_tmt_sale] s on s.sale_id = p.sale_id
        LEFT JOIN [sec].[t_com_user] u on u.user_id = p.create_by
        LEFT JOIN [sec].[t_com_user] uu on uu.user_id = p.update_by
        WHERE 1 = 1 AND p.is_active = ''YES'' and record_type=''MA'' ';

        -- QUICK FILTER
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
            AND (
                project_no LIKE ''%' + @in_vchQuickFilter + '%'' OR
                project_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
                po_number LIKE ''%' + @in_vchQuickFilter + '%''
            )';
        END
        --Sort Model
        SET @in_vchOrderBy = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        -- ORDER
        SET @v_vchSQL += ' ORDER BY ' + @in_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC (@v_vchSQL);

        SET @out_vchMessage = 'Project header list retrieved successfully.';
        SET @out_intErrorCode = 0;
        RETURN;
    END

/* ============================================
   INSERT
============================================ */
ELSE IF @in_vchOperation = 'INSERT'
BEGIN
        INSERT INTO [Timesheet].[tmt].[t_tmt_project_header]
            (
            master_project_id,
            project_no,
            project_name,
            project_status,
            application_type,
            project_type,
            iso_type_id,
            po_number,
            sale_id,
            customer_id,
            manday,
            management_cost,
            travel_cost,
            plan_project_start,
            plan_project_end,
            revise_project_start,
            revise_project_end,
            actual_project_start,
            actual_project_end,
            remark,
            is_active,
            create_by,
            create_date
            )
        VALUES
            (
                @in_intMasterProjectId,
                @in_vchProjectNo,
                @in_vchProjectName,
                @in_vchProjectStatus,
                @in_vchApplicationType,
                @in_vchProjectType,
                @in_intIsoTypeId,
                @in_vchPoNumber,
                @in_intSaleId,
                @in_intCustomerId,
                @in_decManday,
                @in_decManagementCost,
                @in_decTravelCost,
                @in_dtPlanProjectStart,
                @in_dtPlanProjectEnd,
                @in_dtReviseProjectStart,
                @in_dtReviseProjectEnd,
                @in_dtActualProjectStart,
                @in_dtActualProjectEnd,
                @in_vchRemark,
                ISNULL(@in_bitIsActive, 1),
                @in_vchUserId,
                GETDATE()
    );

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header inserted successfully';
        RETURN;
    END

/* ============================================
   UPDATE
============================================ */
ELSE IF @in_vchOperation = 'UPDATE'
BEGIN
        IF @in_intProjectHeaderId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectHeaderId is required for update';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        UPDATE [Timesheet].[tmt].[t_tmt_project_header]
    SET
        master_project_id = ISNULL(@in_intMasterProjectId, master_project_id),
        project_no = ISNULL(@in_vchProjectNo, project_no),
        project_name = ISNULL(@in_vchProjectName, project_name),
        project_status = ISNULL(@in_vchProjectStatus, project_status),
        application_type = ISNULL(@in_vchApplicationType, application_type),
        project_type = ISNULL(@in_vchProjectType, project_type),
        iso_type_id = ISNULL(@in_intIsoTypeId, iso_type_id),
        po_number = ISNULL(@in_vchPoNumber, po_number),
        sale_id = ISNULL(@in_intSaleId, sale_id),
        customer_id = ISNULL(@in_intCustomerId, customer_id),
        manday = ISNULL(@in_decManday, manday),
        management_cost = ISNULL(@in_decManagementCost, management_cost),
        travel_cost = ISNULL(@in_decTravelCost, travel_cost),
        plan_project_start = ISNULL(@in_dtPlanProjectStart, plan_project_start),
        plan_project_end = ISNULL(@in_dtPlanProjectEnd, plan_project_end),
        revise_project_start = ISNULL(@in_dtReviseProjectStart, revise_project_start),
        revise_project_end = ISNULL(@in_dtReviseProjectEnd, revise_project_end),
        actual_project_start = ISNULL(@in_dtActualProjectStart, actual_project_start),
        actual_project_end = ISNULL(@in_dtActualProjectEnd, actual_project_end),
        remark = ISNULL(@in_vchRemark, remark),
        is_active = ISNULL(@in_bitIsActive, is_active),
        update_by = @in_vchUserId,
        update_date = GETDATE()
    WHERE project_header_id = @in_intProjectHeaderId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header updated successfully';
        RETURN;
    END

/* ============================================
   DELETE
============================================ */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectHeaderId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectHeaderId is required for delete';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        UPDATE [tmt].[t_tmt_project_header] set is_active = 'NO',
    update_date = GETDATE(),
    update_by = @in_vchUserId
    WHERE project_header_id = @in_intProjectHeaderId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project header deleted successfully';
        RETURN;
    END

ELSE
BEGIN
        SET @out_vchMessage = 'Invalid operation. Use SELECT, INSERT, UPDATE, DELETE.';
        SET @out_intErrorCode = 999;
        RETURN;
    END

    END TRY
    BEGIN CATCH
        SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
        SET @out_intErrorCode = 999;
    END CATCH
END
GO

-- ============================================================================
-- 8. usp_tmt_project_task
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_tmt_project_task]
    @in_vchOperation NVARCHAR(10) = 'SELECT',
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = 'task_no ASC',
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    -- Fields of task
    @in_intProjectTaskId INT = NULL,
    @in_intProjectTaskPhaseId INT = NULL,
    @in_intProjectHeaderId INT = NULL,
    @in_vchTaskNo NVARCHAR(25) = NULL,
    @in_vchTaskName NVARCHAR(255) = NULL,
    @in_vchTaskDescription NVARCHAR(MAX) = NULL,
    @in_vchTaskStatus VARCHAR(25) = NULL,
    @in_vchIssueType VARCHAR(30) = NULL,
    @in_vchPriority VARCHAR(25) = NULL,
    @in_decManday DECIMAL(18, 5) = NULL,
    @in_dtStartDate DATETIME = NULL,
    @in_dtEndDate DATETIME = NULL,
    @in_intSequence INT = NULL,
    @in_vchRemark NVARCHAR(500) = NULL,
    @in_vchCloseBy NVARCHAR(40) = NULL,
    @in_vchCloseRemark NVARCHAR(255) = NULL,
    @in_vchUserId NVARCHAR(40) = 'system',

    @out_intRowCount INT OUTPUT,
    @out_vchMessage NVARCHAR(4000) OUTPUT,
    @out_intErrorCode INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @out_intRowCount = 0;
    SET @out_vchMessage = '';
    SET @out_intErrorCode = 0;

    BEGIN TRY

/* =========================================
   SELECT
========================================= */
IF @in_vchOperation = 'SELECT'
BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX) = ' SELECT * FROM (
        SELECT 
          t.project_task_id,
            t.project_header_id,
            t.project_task_phase_id,
            task_no,
            task_name,
            (
                SELECT STUFF((
                    SELECT '','' + LTRIM(RTRIM(ISNULL(m.first_name, ''''))) + '' '' + 
                     LTRIM(RTRIM(ISNULL(m.last_name, '''')))
                    FROM tmt.t_tmt_project_task_member m
                    WHERE m.project_task_id = t.project_task_id
                    ORDER BY m.create_date desc
                    FOR XML PATH(''''), TYPE
                ).value(''.'', ''NVARCHAR(MAX)''), 1, 1, '''')
            ) AS assignee,
            CONVERT(VARCHAR(10), t.start_date, 103) + '' - '' + CONVERT(VARCHAR(10), t.end_date, 103) AS due_date,
            t.priority,
            t.manday,
            t.task_status,
            u.first_name AS create_by,
            t.create_date,
            uu.first_name AS update_by,
            t.update_date
        FROM tmt.t_tmt_project_task t
        INNER JOIN tmt.t_tmt_project_header p 
            ON p.project_header_id = t.project_header_id
        INNER JOIN tmt.t_tmt_project_task_phase tp 
            ON tp.project_task_phase_id = t.project_task_phase_id
        LEFT JOIN sec.t_com_user u ON u.user_id = t.create_by
        LEFT JOIN sec.t_com_user uu ON uu.user_id = t.update_by ) t 
        WHERE 1 = 1  
    ';

        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter <> ''
    BEGIN
            SET @v_vchSQL += '
        AND (
            t.task_no LIKE ''%' + @in_vchQuickFilter + '%'' OR
            t.task_name LIKE ''%' + @in_vchQuickFilter + '%'' OR
            t.task_status LIKE ''%' + @in_vchQuickFilter + '%''
        )';
        END
        IF @in_intProjectTaskPhaseId IS NOT NULL
    BEGIN
            SET @v_vchSQL += '
            AND (
               t.project_task_phase_id = ' + CAST(@in_intProjectTaskPhaseId AS NVARCHAR(10)) + '
            )';
        END
        --Sort Model
        SET @in_vchOrderBy = dbo.fn_BuildOrderBy(@in_vchSortModel, @in_vchOrderBy);
        -- ORDER
        SET @v_vchSQL += ' ORDER BY ' + @in_vchOrderBy;

        -- PAGING
        SET @v_vchSQL += '
        OFFSET (' + CAST(@in_intPage AS NVARCHAR) + ' - 1) * ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS
        FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR) + ' ROWS ONLY;
    ';

        EXEC (@v_vchSQL);

        SET @out_vchMessage = 'Project task list retrieved successfully.';
        RETURN;
    END

/* =========================================
   INSERT
========================================= */
ELSE IF @in_vchOperation = 'INSERT'
BEGIN
        INSERT INTO tmt.t_tmt_project_task
            (
            project_task_phase_id,
            project_header_id,
            task_no,
            task_name,
            task_description,
            task_status,
            issue_type,
            priority,
            manday,
            start_date,
            end_date,
            sequence,
            remark,
            create_by,
            create_date
            )
        VALUES
            (
                @in_intProjectTaskPhaseId,
                @in_intProjectHeaderId,
                @in_vchTaskNo,
                @in_vchTaskName,
                @in_vchTaskDescription,
                @in_vchTaskStatus,
                @in_vchIssueType,
                @in_vchPriority,
                @in_decManday,
                @in_dtStartDate,
                @in_dtEndDate,
                ISNULL(@in_intSequence, 1),
                @in_vchRemark,
                @in_vchUserId,
                GETDATE()
    );

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project task inserted successfully';
        RETURN;
    END

/* =========================================
   UPDATE
========================================= */
ELSE IF @in_vchOperation = 'UPDATE'
BEGIN
        IF @in_intProjectTaskId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectTaskId is required for update';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        UPDATE tmt.t_tmt_project_task
    SET
        project_task_phase_id = ISNULL(@in_intProjectTaskPhaseId, project_task_phase_id),
        project_header_id = ISNULL(@in_intProjectHeaderId, project_header_id),
        task_no = ISNULL(@in_vchTaskNo, task_no),
        task_name = ISNULL(@in_vchTaskName, task_name),
        task_description = ISNULL(@in_vchTaskDescription, task_description),
        task_status = ISNULL(@in_vchTaskStatus, task_status),
        issue_type = ISNULL(@in_vchIssueType, issue_type),
        priority = ISNULL(@in_vchPriority, priority),
        manday = ISNULL(@in_decManday, manday),
        start_date = ISNULL(@in_dtStartDate, start_date),
        end_date = ISNULL(@in_dtEndDate, end_date),
        sequence = ISNULL(@in_intSequence, sequence),
        remark = ISNULL(@in_vchRemark, remark),
        close_by = ISNULL(@in_vchCloseBy, close_by),
        close_remark = ISNULL(@in_vchCloseRemark, close_remark),
        update_by = @in_vchUserId,
        update_date = GETDATE()
    WHERE project_task_id = @in_intProjectTaskId;

        SET @out_intRowCount = @@ROWCOUNT;
        SET @out_vchMessage = 'Project task updated successfully';
        RETURN;
    END

/* =========================================
   DELETE → Convert to CLOSED
========================================= */
ELSE IF @in_vchOperation = 'DELETE'
BEGIN
        IF @in_intProjectTaskId IS NULL
    BEGIN
            SET @out_vchMessage = 'ProjectTaskId is required for delete';
            SET @out_intErrorCode = 999;
            RETURN;
        END

        DECLARE @v_vchTaskStatus NVARCHAR(20);

        SELECT @v_vchTaskStatus = task_status
        FROM tmt.t_tmt_project_task
        WHERE project_task_id = @in_intProjectTaskId;

        IF @v_vchTaskStatus = 'OPEN'
    BEGIN
            DELETE FROM tmt.t_tmt_project_task 
        WHERE project_task_id = @in_intProjectTaskId;

            SET @out_intRowCount = @@ROWCOUNT;
            SET @out_vchMessage = 'Project task deleted successfully (was OPEN)';
        END
    ELSE
    BEGIN
            SET @out_vchMessage = 'Project task status is not OPEN. Cannot delete.';
            SET @out_intErrorCode = 998;
        END

        RETURN;
    END
BEGIN
        SET @out_vchMessage = 'Invalid operation. Use SELECT, INSERT, UPDATE, DELETE.';
        SET @out_intErrorCode = 999;
    END

END TRY
BEGIN CATCH
    SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
    SET @out_intErrorCode = 999;
END CATCH
END
GO

-- ============================================================================
-- 9. usp_tmt_project_task_tracking
-- ============================================================================
ALTER PROCEDURE [tmt].[usp_tmt_project_task_tracking]
    -- Operation parameters
    @in_vchOperation NVARCHAR(10) = 'SELECT',

    -- Pagination parameters (for SELECT)
    @in_intPage INT = 1,
    @in_intPageSize INT = 25,
    @in_vchOrderBy NVARCHAR(500) = 'actual_date DESC, create_date DESC',
    @in_vchSortModel NVARCHAR(MAX) = NULL,
    @in_vchFilterModel NVARCHAR(MAX) = NULL,
    @in_vchQuickFilter NVARCHAR(255) = NULL,

    -- Filter/Data parameters
    @in_intProjectTaskTrackingId INT = NULL,
    @in_intProjectTaskId INT = NULL,
    @in_intProjectHeaderId INT = NULL,
    @in_vchIssueType NVARCHAR(25) = NULL,
    @in_decActualWork DECIMAL(18,5) = NULL,
    @in_vchActualDate NVARCHAR(50) = NULL,
    @in_vchProcessUpdate NVARCHAR(MAX) = NULL,

    -- Audit parameters
    @in_vchAssigneeUserId VARCHAR(50) = NULL,
    @in_vchUserId VARCHAR(50) = 'system',

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

    -- Convert ActualDate string to DATE
    DECLARE @v_dtActualDateConverted DATE = NULL;
    IF @in_vchActualDate IS NOT NULL AND @in_vchActualDate != ''
    BEGIN
        SET @v_dtActualDateConverted = TRY_CONVERT(DATE, LEFT(@in_vchActualDate, 10));
        IF @v_dtActualDateConverted IS NULL
        BEGIN
            SET @v_dtActualDateConverted = TRY_CAST(TRY_CONVERT(DATETIME2, @in_vchActualDate) AS DATE);
        END
    END

    BEGIN TRY
        -- ==========================================
        -- SELECT Operation
        -- ==========================================
        IF @in_vchOperation = 'SELECT'
        BEGIN
        DECLARE @v_vchSQL NVARCHAR(MAX);
        DECLARE @v_vchCountSQL NVARCHAR(MAX);
        DECLARE @v_vchWhereClause NVARCHAR(MAX) = ' WHERE 1=1';
        DECLARE @v_vchOrderByClause NVARCHAR(500) = ISNULL(@in_vchOrderBy, 'actual_date DESC, create_date DESC');
        DECLARE @v_intOffset INT = (@in_intPage - 1) * @in_intPageSize;

        -- Filter by ProjectTaskId
        IF @in_intProjectTaskId IS NOT NULL
                SET @v_vchWhereClause = @v_vchWhereClause + ' AND tt.project_task_id = ' + CAST(@in_intProjectTaskId AS NVARCHAR(20));

        -- Filter by specific tracking record
        IF @in_intProjectTaskTrackingId IS NOT NULL
                SET @v_vchWhereClause = @v_vchWhereClause + ' AND tt.project_task_tracking_id = ' + CAST(@in_intProjectTaskTrackingId AS NVARCHAR(20));

        -- Quick filter
        IF @in_vchQuickFilter IS NOT NULL AND @in_vchQuickFilter != ''
            BEGIN
            SET @v_vchWhereClause = @v_vchWhereClause + ' AND (
                    tt.issue_type LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR tt.process_update LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR tt.assignee_first_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                    OR tt.assignee_last_name LIKE ''%' + REPLACE(@in_vchQuickFilter, '''', '''''') + '%''
                )';
        END

        -- Build count query
        SET @v_vchCountSQL = '
                SELECT COUNT(*) 
                FROM tmt.t_tmt_project_task_tracking tt
                ' + @v_vchWhereClause;

        -- Build main query
        SET @v_vchSQL = '
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
                ' + @v_vchWhereClause + '
                ORDER BY ' + @v_vchOrderByClause + '
                OFFSET ' + CAST(@v_intOffset AS NVARCHAR(10)) + ' ROWS
                FETCH NEXT ' + CAST(@in_intPageSize AS NVARCHAR(10)) + ' ROWS ONLY';

        -- Execute count query
        DECLARE @v_intTotalRows INT;
        DECLARE @v_vchCountParams NVARCHAR(100) = N'@TotalRowsOut INT OUTPUT';
        SET @v_vchCountSQL = 'SELECT @TotalRowsOut = (' + @v_vchCountSQL + ')';
        EXEC sp_executesql @v_vchCountSQL, @v_vchCountParams, @TotalRowsOut = @v_intTotalRows OUTPUT;

        -- Create temp table
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

        INSERT INTO #TrackingResults
        EXEC sp_executesql @v_vchSQL;

        SELECT *
        FROM #TrackingResults;
        DROP TABLE #TrackingResults;

        -- Return pagination metadata
        SELECT @v_intTotalRows AS TotalRows,
            @in_intPage AS CurrentPage,
            @in_intPageSize AS PageSize,
            CEILING(CAST(ISNULL(@v_intTotalRows, 0) AS FLOAT) / @in_intPageSize) AS TotalPages;

        SET @out_intRowCount = ISNULL(@v_intTotalRows, 0);
        SET @out_vchMessage = 'Task tracking retrieved successfully';
        SET @out_intErrorCode = 0;
    END

        -- ==========================================
        -- INSERT Operation
        -- ==========================================
        ELSE IF @in_vchOperation = 'INSERT'
        BEGIN
        -- Validate required fields
        IF @in_intProjectTaskId IS NULL
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Project Task ID is required';
            RETURN;
        END

        IF @in_vchIssueType IS NULL OR @in_vchIssueType = ''
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Issue Type is required';
            RETURN;
        END

        IF @in_decActualWork IS NULL
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Actual Work is required';
            RETURN;
        END

        IF @v_dtActualDateConverted IS NULL
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Actual Date is required or invalid format';
            RETURN;
        END

        IF @in_vchProcessUpdate IS NULL OR @in_vchProcessUpdate = ''
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Process Update is required';
            RETURN;
        END

        -- Get project_header_id and validate date range
        DECLARE @v_dtTaskStartDate DATE, @v_dtTaskEndDate DATE, @v_intTaskProjectHeaderId INT;
        SELECT @v_dtTaskStartDate = start_date, @v_dtTaskEndDate = end_date, @v_intTaskProjectHeaderId = project_header_id
        FROM tmt.t_tmt_project_task
        WHERE project_task_id = @in_intProjectTaskId;

        IF @v_dtActualDateConverted < @v_dtTaskStartDate OR @v_dtActualDateConverted > @v_dtTaskEndDate
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @v_dtTaskStartDate, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @v_dtTaskEndDate, 103) + ')';
            RETURN;
        END

        -- Get user info for assignee
        DECLARE @v_vchEffectiveAssignee VARCHAR(50) = ISNULL(NULLIF(@in_vchAssigneeUserId, ''), @in_vchUserId);
        DECLARE @v_vchAssigneeFirstName NVARCHAR(200), @v_vchAssigneeLastName NVARCHAR(200);
        SELECT @v_vchAssigneeFirstName = first_name, @v_vchAssigneeLastName = last_name
        FROM sec.t_com_user
        WHERE user_id = @v_vchEffectiveAssignee;

        -- Get next ID from sequence
        DECLARE @v_intNewId INT = NEXT VALUE FOR tmt.ProjectTaskTrackingID;

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
                @v_intNewId,
                @in_intProjectTaskId,
                @v_intTaskProjectHeaderId,
                @in_vchIssueType,
                @in_decActualWork,
                @v_dtActualDateConverted,
                @in_vchProcessUpdate,
                @v_vchEffectiveAssignee,
                @v_vchAssigneeFirstName,
                @v_vchAssigneeLastName,
                @in_vchUserId,
                GETDATE()
            );

        SET @out_intRowCount = 1;
        SET @out_vchMessage = 'Task tracking inserted successfully';
        SET @out_intErrorCode = 0;

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
        WHERE tt.project_task_tracking_id = @v_intNewId;
    END

        -- ==========================================
        -- UPDATE Operation
        -- ==========================================
        ELSE IF @in_vchOperation = 'UPDATE'
        BEGIN
        IF @in_intProjectTaskTrackingId IS NULL
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Project Task Tracking ID is required for update';
            RETURN;
        END

        -- Get project task id for date validation
        DECLARE @v_intCurrentProjectTaskId INT;
        SELECT @v_intCurrentProjectTaskId = project_task_id
        FROM tmt.t_tmt_project_task_tracking
        WHERE project_task_tracking_id = @in_intProjectTaskTrackingId;

        DECLARE @v_dtTaskStartDate2 DATE, @v_dtTaskEndDate2 DATE;
        SELECT @v_dtTaskStartDate2 = start_date, @v_dtTaskEndDate2 = end_date
        FROM tmt.t_tmt_project_task
        WHERE project_task_id = @v_intCurrentProjectTaskId;

        -- Validate ActualDate if provided
        IF @v_dtActualDateConverted IS NOT NULL AND (@v_dtActualDateConverted < @v_dtTaskStartDate2 OR @v_dtActualDateConverted > @v_dtTaskEndDate2)
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Actual Date must be within Task date range (' + 
                    CONVERT(VARCHAR(10), @v_dtTaskStartDate2, 103) + ' - ' + 
                    CONVERT(VARCHAR(10), @v_dtTaskEndDate2, 103) + ')';
            RETURN;
        END

        -- Get assignee info if provided
        DECLARE @v_vchUpdateAssignee VARCHAR(50) = NULL;
        DECLARE @v_vchUpdateAssigneeFirstName NVARCHAR(200) = NULL;
        DECLARE @v_vchUpdateAssigneeLastName NVARCHAR(200) = NULL;
        IF @in_vchAssigneeUserId IS NOT NULL AND @in_vchAssigneeUserId != ''
            BEGIN
            SET @v_vchUpdateAssignee = @in_vchAssigneeUserId;
            SELECT @v_vchUpdateAssigneeFirstName = first_name, @v_vchUpdateAssigneeLastName = last_name
            FROM sec.t_com_user
            WHERE user_id = @in_vchAssigneeUserId;
        END

        -- Update tracking record
        UPDATE tmt.t_tmt_project_task_tracking
            SET 
                issue_type = ISNULL(@in_vchIssueType, issue_type),
                actual_work = ISNULL(@in_decActualWork, actual_work),
                actual_date = ISNULL(@v_dtActualDateConverted, actual_date),
                process_update = ISNULL(@in_vchProcessUpdate, process_update),
                assignee = ISNULL(@v_vchUpdateAssignee, assignee),
                assignee_first_name = ISNULL(@v_vchUpdateAssigneeFirstName, assignee_first_name),
                assignee_last_name = ISNULL(@v_vchUpdateAssigneeLastName, assignee_last_name),
                update_by = @in_vchUserId,
                update_date = GETDATE()
            WHERE project_task_tracking_id = @in_intProjectTaskTrackingId;

        SET @out_intRowCount = 1;
        SET @out_vchMessage = 'Task tracking updated successfully';
        SET @out_intErrorCode = 0;

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
        WHERE tt.project_task_tracking_id = @in_intProjectTaskTrackingId;
    END

        -- ==========================================
        -- DELETE Operation
        -- ==========================================
        ELSE IF @in_vchOperation = 'DELETE'
        BEGIN
        IF @in_intProjectTaskTrackingId IS NULL
            BEGIN
            SET @out_intErrorCode = 1;
            SET @out_vchMessage = 'Project Task Tracking ID is required for delete';
            RETURN;
        END

        DELETE FROM tmt.t_tmt_project_task_tracking
            WHERE project_task_tracking_id = @in_intProjectTaskTrackingId;

        IF @@ROWCOUNT > 0
            BEGIN
            SET @out_intRowCount = 1;
            SET @out_vchMessage = 'Task tracking deleted successfully';
            SET @out_intErrorCode = 0;
        END
            ELSE
            BEGIN
            SET @out_intRowCount = 0;
            SET @out_vchMessage = 'Task tracking not found';
            SET @out_intErrorCode = 1;
        END
    END

    END TRY
    BEGIN CATCH
        SET @out_intErrorCode = ERROR_NUMBER();
        SET @out_vchMessage = 'Error: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- SUMMARY: Parameter Naming Convention
-- ============================================================================
/*
============================================================================
STORED PROCEDURES ที่ MIGRATE แล้ว (9 รายการ):
============================================================================
1. usp_invoice
2. usp_project_history  
3. usp_project_teams
4. usp_tmt_project_task_member
5. usp_tmt_my_task
6. usp_tmt_project_header
7. usp_tmt_project_header_ma
8. usp_tmt_project_task
9. usp_tmt_project_task_tracking

============================================================================
PARAMETER NAMING CONVENTION:
============================================================================

Input Parameters (@in_):
OLD NAME                    NEW NAME
========================   ========================
@Operation                 @in_vchOperation
@Page                      @in_intPage
@PageSize                  @in_intPageSize
@OrderBy                   @in_vchOrderBy
@QuickFilter               @in_vchQuickFilter
@FilterModel               @in_vchFilterModel
@SortModel                 @in_vchSortModel
@ProjectId                 @in_intProjectId
@ProjectHeaderId           @in_intProjectHeaderId
@ProjectMemberId           @in_intProjectMemberId
@ProjectTaskId             @in_intProjectTaskId
@ProjectTaskMemberId       @in_intProjectTaskMemberId
@ProjectTaskTrackingId     @in_intProjectTaskTrackingId
@ProjectInvoiceId          @in_intProjectInvoiceId
@ProjectTaskPhaseId        @in_intProjectTaskPhaseId
@MasterProjectId           @in_intMasterProjectId
@IsoTypeId                 @in_intIsoTypeId
@SaleId                    @in_intSaleId
@CustomerId                @in_intCustomerId
@Sequence                  @in_intSequence
@UserId                    @in_vchUserId
@LoginUserId               @in_vchLoginUserId
@AssignUserId              @in_vchAssignUserId
@AssigneeUserId            @in_vchAssigneeUserId
@TaskMemberUserId          @in_vchTaskMemberUserId
@TaskStatus                @in_vchTaskStatus
@TaskNo                    @in_vchTaskNo
@TaskName                  @in_vchTaskName
@TaskDescription           @in_vchTaskDescription
@TaskStatus                @in_vchTaskStatus
@IssueType                 @in_vchIssueType
@Priority                  @in_vchPriority
@ProjectNo                 @in_vchProjectNo
@ProjectName               @in_vchProjectName
@ProjectStatus             @in_vchProjectStatus
@ApplicationType           @in_vchApplicationType
@ProjectType               @in_vchProjectType
@PoNumber                  @in_vchPoNumber
@ProcessUpdate             @in_vchProcessUpdate
@CloseBy                   @in_vchCloseBy
@CloseRemark               @in_vchCloseRemark
@Role                      @in_vchRole
@Description               @in_vchDescription
@Remark                    @in_vchRemark
@ActualDate                @in_vchActualDate
@Manday                    @in_decManday
@ActualWork                @in_decActualWork
@ManagementCost            @in_decManagementCost
@TravelCost                @in_decTravelCost
@StartDate                 @in_dtStartDate
@EndDate                   @in_dtEndDate
@PlanProjectStart          @in_dtPlanProjectStart
@PlanProjectEnd            @in_dtPlanProjectEnd
@ReviseProjectStart        @in_dtReviseProjectStart
@ReviseProjectEnd          @in_dtReviseProjectEnd
@ActualProjectStart        @in_dtActualProjectStart
@ActualProjectEnd          @in_dtActualProjectEnd
@IsActive                  @in_bitIsActive

Output Parameters (@out_):
@OutputRowCount            @out_intRowCount
@OutputMessage             @out_vchMessage
@OutputErrorCode           @out_intErrorCode

Variables (@v_):
@SQL                       @v_vchSQL
@CountSQL                  @v_vchCountSQL
@WhereClause               @v_vchWhereClause
@OrderByClause             @v_vchOrderByClause
@CountParams               @v_vchCountParams
@Offset                    @v_intOffset
@TotalRows                 @v_intTotalRows
@NewId                     @v_intNewId
@first_name                @v_vchFirstName
@last_name                 @v_vchLastName
@master_project_id         @v_intMasterProjectId
@TASK_STATUS               @v_vchTaskStatus
@ActualDateConverted       @v_dtActualDateConverted
@TaskStartDate             @v_dtTaskStartDate
@TaskEndDate               @v_dtTaskEndDate
@TaskProjectHeaderId       @v_intTaskProjectHeaderId
@EffectiveAssignee         @v_vchEffectiveAssignee
@AssigneeFirstName         @v_vchAssigneeFirstName
@AssigneeLastName          @v_vchAssigneeLastName
@UpdateAssignee            @v_vchUpdateAssignee
@UpdateAssigneeFirstName   @v_vchUpdateAssigneeFirstName
@UpdateAssigneeLastName    @v_vchUpdateAssigneeLastName
@CurrentProjectTaskId      @v_intCurrentProjectTaskId
*/
