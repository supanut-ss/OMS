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
-- SUMMARY: Parameter Naming Convention
-- ============================================================================
/*
Parameters ที่แก้ไขแล้ว:

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
@ProjectInvoiceId          @in_intProjectInvoiceId
@UserId                    @in_vchUserId
@LoginUserId               @in_vchLoginUserId
@AssignUserId              @in_vchAssignUserId
@TaskMemberUserId          @in_vchTaskMemberUserId
@Role                      @in_vchRole
@Description               @in_vchDescription
@Manday                    @in_decManday
@OutputRowCount            @out_intRowCount
@OutputMessage             @out_vchMessage
@OutputErrorCode           @out_intErrorCode

Variables:
@SQL                       @v_vchSQL
@first_name                @v_vchFirstName
@last_name                 @v_vchLastName
@master_project_id         @v_intMasterProjectId
*/
