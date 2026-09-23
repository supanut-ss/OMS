-- =============================================
-- Stored Procedure : rfi.usp_rfi_item_toggle_active
-- Schema           : rfi
-- Table            : rfi.t_rfi_tag
-- Description      : Toggle active status of a tag row by uid_tag.
-- Parameters:
--   @in_vchUid          - Tag UID (uid_tag)
--   @in_isActive        - Target active status ('YES' or 'NO')
--   @out_vchErrorCode   - OUTPUT: '0' = success, '1' = error
--   @out_vchErrorMessage- OUTPUT: description of result or error
-- =============================================

USE [freshket]
GO

CREATE OR ALTER PROCEDURE rfi.usp_rfi_item_toggle_active
    @in_vchUid           NVARCHAR(200),
    @in_isActive         NVARCHAR(10),
    @out_vchErrorCode    NVARCHAR(50)  OUTPUT,
    @out_vchErrorMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @out_vchErrorCode    = '0';
    SET @out_vchErrorMessage = N'Success';

    BEGIN TRY

        -- Validate input status
        IF UPPER(ISNULL(@in_isActive, '')) NOT IN ('YES', 'NO')
        BEGIN
            SET @out_vchErrorCode = '1';
            SET @out_vchErrorMessage = N'Invalid in_isActive. Allowed values: YES, NO';
            RETURN;
        END

        -- Validate uid exists
        IF NOT EXISTS (
            SELECT 1
            FROM rfi.t_rfi_tag
            WHERE uid_tag = @in_vchUid
        )
        BEGIN
            SET @out_vchErrorCode = '1';
            SET @out_vchErrorMessage = N'UID not found: ' + ISNULL(@in_vchUid, N'');
            RETURN;
        END

        BEGIN TRANSACTION;

            UPDATE rfi.t_rfi_tag
            SET
                is_active   = UPPER(@in_isActive),
                update_date = GETDATE()
            WHERE uid_tag = @in_vchUid;

        COMMIT TRANSACTION;

        SET @out_vchErrorCode = '0';
        SET @out_vchErrorMessage = N'Status updated successfully';

    END TRY
    BEGIN CATCH

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @out_vchErrorCode    = '1';
        SET @out_vchErrorMessage = ERROR_MESSAGE();

    END CATCH
END
GO
