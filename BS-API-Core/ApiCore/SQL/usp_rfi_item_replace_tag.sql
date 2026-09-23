-- =============================================
-- Stored Procedure : rfi.usp_rfi_item_replace_tag
-- Schema           : rfi
-- Table            : rfi.t_rfi_tag
-- Description      : Replace RFID tag on an item.
--                    Step 1 – Set old tag row is_active = 'NO'
--                    Step 2 – Insert new tag row with the new values,
--                             carrying forward other fields from the old row.
--                             ref_uid_tag on the new row points to old uid_tag.
-- Parameters:
--   @in_vchUid          - Current tag UID (uid_tag of existing active row)
--   @in_vchNewUid       - New tag UID to assign
--   @in_vchNewItemCode  - New item code
--   @in_vchCategory     - New item_category
--   @in_vchLocation     - New location
--   @out_vchErrorCode   - OUTPUT: '0' = success, '1' = error
--   @out_vchErrorMessage- OUTPUT: description of result or error
-- =============================================

USE [freshket]
GO

CREATE OR ALTER PROCEDURE rfi.usp_rfi_item_replace_tag
    @in_vchUid           NVARCHAR(200),
    @in_vchNewUid        NVARCHAR(200),
    @in_vchNewItemCode   NVARCHAR(200),
    @in_vchCategory      NVARCHAR(500),
    @in_vchLocation      NVARCHAR(100),
    @out_vchErrorCode    NVARCHAR(50)  OUTPUT,
    @out_vchErrorMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @out_vchErrorCode    = '0';
    SET @out_vchErrorMessage = N'Success';

    BEGIN TRY

        -- 0. Lookup location_type from t_rfi_location
        DECLARE @vchLocationType NVARCHAR(200);
        SELECT @vchLocationType = location_type
        FROM rfi.t_rfi_location
        WHERE location  = @in_vchLocation
          AND is_active = 'YES';

        -- 1. Old tag must exist and be active
        IF NOT EXISTS (
            SELECT 1
            FROM rfi.t_rfi_tag
            WHERE uid_tag   = @in_vchUid
              AND is_active  = 'YES'
        )
        BEGIN
            SET @out_vchErrorCode    = '1';
            SET @out_vchErrorMessage = N'Tag not found or already inactive: ' + ISNULL(@in_vchUid, N'');
            RETURN;
        END

        -- 2. New UID must not already be active (unless same as old)
        IF @in_vchNewUid <> @in_vchUid
            AND EXISTS (
                SELECT 1
                FROM rfi.t_rfi_tag
                WHERE uid_tag  = @in_vchNewUid
                  AND is_active = 'YES'
            )
        BEGIN
            SET @out_vchErrorCode    = '1';
            SET @out_vchErrorMessage = N'New tag UID is already in use: ' + ISNULL(@in_vchNewUid, N'');
            RETURN;
        END

        BEGIN TRANSACTION;

            -- 3. Deactivate old tag row
            UPDATE rfi.t_rfi_tag
            SET
                is_active   = 'NO',
                update_date = GETDATE()
            WHERE uid_tag  = @in_vchUid
              AND is_active = 'YES';

            -- 4. Insert new tag row, carrying forward fields from old row
            INSERT INTO rfi.t_rfi_tag (
                uid_tag,
                item_code,
                item_category,
                location,
                location_type,
                license_plate,
                driver,
                route,
                last_location_change,
                last_tran_number,
                last_tran_type,
                last_mode,
                ref_uid_tag,
                is_active,
                create_by,
                create_date,
                update_by,
                update_date
            )
            SELECT
                @in_vchNewUid,          -- uid_tag          (new)
                @in_vchNewItemCode,     -- item_code        (new)
                @in_vchCategory,        -- item_category    (new)
                @in_vchLocation,        -- location         (new)
                @vchLocationType,       -- location_type    (lookup from t_rfi_location)
                license_plate,          -- carry forward
                driver,                 -- carry forward
                route,                  -- carry forward
                last_location_change,   -- carry forward
                last_tran_number,       -- carry forward
                last_tran_type,         -- carry forward
                last_mode,              -- carry forward
                ref_uid_tag,            -- carry forward original ref_uid_tag
                'YES',                  -- is_active
                create_by,              -- carry forward original creator
                GETDATE(),              -- create_date      (new)
                NULL,                   -- update_by
                NULL                    -- update_date
            FROM rfi.t_rfi_tag
            WHERE uid_tag = @in_vchUid;

        COMMIT TRANSACTION;

        SET @out_vchErrorCode    = '0';
        SET @out_vchErrorMessage = N'Success';

    END TRY
    BEGIN CATCH

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @out_vchErrorCode    = '1';
        SET @out_vchErrorMessage = ERROR_MESSAGE();

    END CATCH
END
GO
