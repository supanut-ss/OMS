USE [MyInventory]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      BS Platform
-- Create date: 2026-05-12
-- Description: Update / Insert / Delete menu assignment for a user group.
--              Incoming is_xxx_view values are VARCHAR(5): 'YES' or 'NO'.
--              Table columns are BIT, so values are converted before DML.
-- =============================================
ALTER PROCEDURE [sec].[usp_update_menu_assign]
    @in_int_user_group_id    INT,
    @in_int_menu_id          INT,
    @in_vch_is_add_view      VARCHAR(5),
    @in_vch_is_edit_view     VARCHAR(5),
    @in_vch_is_delete_view   VARCHAR(5),
    @in_vch_is_view          VARCHAR(5),
    @in_vch_create_by        NVARCHAR(50),
    @out_vch_error_code      NVARCHAR(50)  OUTPUT,
    @out_vch_error_message   NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Convert YES/NO → BIT (1/0) for the bit columns
    DECLARE @b_add_view    BIT = CASE WHEN @in_vch_is_add_view    = 'YES' THEN 1 ELSE 0 END;
    DECLARE @b_edit_view   BIT = CASE WHEN @in_vch_is_edit_view   = 'YES' THEN 1 ELSE 0 END;
    DECLARE @b_delete_view BIT = CASE WHEN @in_vch_is_delete_view = 'YES' THEN 1 ELSE 0 END;
    DECLARE @b_view        BIT = CASE WHEN @in_vch_is_view        = 'YES' THEN 1 ELSE 0 END;

    -- Validate user group
    IF NOT EXISTS (SELECT 1 FROM [sec].[t_com_user_group] WHERE user_group_id = @in_int_user_group_id)
    BEGIN
        SET @out_vch_error_code    = N'1';
        SET @out_vch_error_message = N'Not Found Data Group User';
        RETURN;
    END

    -- Validate menu
    IF NOT EXISTS (SELECT 1 FROM [sec].[t_com_menu] WHERE menu_id = @in_int_menu_id)
    BEGIN
        SET @out_vch_error_code    = N'1';
        SET @out_vch_error_message = N'Not Found Data Menu';
        RETURN;
    END

    -- ── Assignment already exists ─────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM [sec].[t_com_user_group_menu]
        WHERE user_group_id = @in_int_user_group_id AND menu_id = @in_int_menu_id
    )
    BEGIN
        -- All permissions are NO (0) → remove the assignment
        IF (@b_add_view = 0 AND @b_edit_view = 0 AND @b_delete_view = 0 AND @b_view = 0)
        BEGIN
            DELETE FROM [sec].[t_com_user_group_menu]
            WHERE user_group_id = @in_int_user_group_id AND menu_id = @in_int_menu_id;

            UPDATE [sec].[t_com_menu_favorite]
            SET    is_active = 0
            WHERE  menu_id = @in_int_menu_id;
        END
        ELSE
        BEGIN
            UPDATE [sec].[t_com_user_group_menu]
            SET    is_add_view    = @b_add_view,
                   is_edit_view   = @b_edit_view,
                   is_delete_view = @b_delete_view,
                   is_view        = @b_view
            WHERE  user_group_id = @in_int_user_group_id AND menu_id = @in_int_menu_id;
        END

        SET @out_vch_error_code    = N'0';
        SET @out_vch_error_message = N'Success';
    END
    -- ── New assignment ────────────────────────────────────────────────────
    ELSE
    BEGIN
        IF (@b_add_view = 1 OR @b_edit_view = 1 OR @b_delete_view = 1 OR @b_view = 1)
        BEGIN
            INSERT INTO [sec].[t_com_user_group_menu]
                ([user_group_id], [menu_id],
                 [is_add_view], [is_edit_view], [is_delete_view], [is_view],
                 [create_by], [create_date])
            VALUES
                (@in_int_user_group_id, @in_int_menu_id,
                 @b_add_view, @b_edit_view, @b_delete_view, @b_view,
                 @in_vch_create_by, GETDATE());

            UPDATE [sec].[t_com_menu_favorite]
            SET    is_active = 1
            WHERE  menu_id = @in_int_menu_id;
        END

        SET @out_vch_error_code    = N'0';
        SET @out_vch_error_message = N'Success';
    END
END
GO
