/*
    OMS central marketplace-app / OAuth-session migration (SQL Server)

    Scope
    -----
    - Keeps the existing single-tenant key (platform, shop_id) so the current
      API remains compatible during the application-code migration.
    - Adds server-side App Master selection metadata.
    - Adds an explicit connector status.
    - Links each credential to its connector without deleting the legacy
      platform/shop columns.
    - Adds a one-time OAuth session table so a connector can be created after
      the marketplace callback instead of requiring a manually entered Shop ID.

    Important
    ---------
    1. Back up the OMS database before running this script.
    2. Run this script against the OMS database.
    3. App Key/Secret values remain encrypted application ciphertext. This
       script never decrypts, copies, or prints them.
    4. Multi-tenant isolation is intentionally not added here because the
       current schema has no authoritative tenant key. Add it only after the
       application has a defined tenant identifier and ownership model.
*/

USE [OMS];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'oms.t_oms_platform_apps', N'U') IS NULL
    THROW 50001, 'Missing table oms.t_oms_platform_apps.', 1;

IF OBJECT_ID(N'oms.t_oms_platform_app_shops', N'U') IS NULL
    THROW 50002, 'Missing table oms.t_oms_platform_app_shops.', 1;

IF OBJECT_ID(N'oms.t_oms_platform_credential', N'U') IS NULL
    THROW 50003, 'Missing table oms.t_oms_platform_credential.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /* ---------------------------------------------------------------------
       1. App Master metadata used for automatic server-side app selection.
       --------------------------------------------------------------------- */

    IF COL_LENGTH(N'oms.t_oms_platform_apps', N'country_code') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps
            ADD country_code VARCHAR(2) NOT NULL
                CONSTRAINT DF_t_oms_platform_apps_country_code DEFAULT ('TH') WITH VALUES;
    END;

    IF COL_LENGTH(N'oms.t_oms_platform_apps', N'environment') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps
            ADD environment VARCHAR(16) NOT NULL
                CONSTRAINT DF_t_oms_platform_apps_environment DEFAULT ('PRODUCTION') WITH VALUES;
    END;

    IF COL_LENGTH(N'oms.t_oms_platform_apps', N'is_default') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps
            ADD is_default VARCHAR(3) NOT NULL
                CONSTRAINT DF_t_oms_platform_apps_is_default DEFAULT ('NO') WITH VALUES;
    END;

    IF OBJECT_ID(N'oms.CK_t_oms_platform_apps_country_code', N'C') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps WITH CHECK
            ADD CONSTRAINT CK_t_oms_platform_apps_country_code
                CHECK (country_code = UPPER(country_code)
                       AND LEN(country_code) = 2
                       AND country_code NOT LIKE '%[^A-Z]%');
    END;

    IF OBJECT_ID(N'oms.CK_t_oms_platform_apps_environment', N'C') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps WITH CHECK
            ADD CONSTRAINT CK_t_oms_platform_apps_environment
                CHECK (environment IN ('SANDBOX', 'PRODUCTION'));
    END;

    IF OBJECT_ID(N'oms.CK_t_oms_platform_apps_is_default', N'C') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_apps WITH CHECK
            ADD CONSTRAINT CK_t_oms_platform_apps_is_default
                CHECK (is_default IN ('YES', 'NO'));
    END;

    /* Only one active default App Master is allowed per platform/market/env. */
    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'oms.t_oms_platform_apps')
          AND name = N'UX_t_oms_platform_apps_default'
    )
    BEGIN
        CREATE UNIQUE INDEX UX_t_oms_platform_apps_default
            ON oms.t_oms_platform_apps (platform, country_code, environment)
            WHERE is_default = 'YES' AND is_active = N'YES';
    END;

    /* ---------------------------------------------------------------------
       2. Connector lifecycle state.
       --------------------------------------------------------------------- */

    IF COL_LENGTH(N'oms.t_oms_platform_app_shops', N'connection_status') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops
            ADD connection_status VARCHAR(32) NULL;
    END;

    IF COL_LENGTH(N'oms.t_oms_platform_app_shops', N'authorized_date') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops
            ADD authorized_date DATETIME NULL;
    END;

    IF COL_LENGTH(N'oms.t_oms_platform_app_shops', N'disconnected_date') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops
            ADD disconnected_date DATETIME NULL;
    END;

    IF COL_LENGTH(N'oms.t_oms_platform_app_shops', N'last_auth_error') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops
            ADD last_auth_error NVARCHAR(2000) NULL;
    END;

    /* Backfill status from the existing credential without exposing tokens. */
    UPDATE shop
       SET connection_status =
           CASE
               WHEN credential.platform_credential_id IS NULL
                    OR credential.access_token_encrypted IS NULL
                   THEN 'PENDING_AUTHORIZATION'
               WHEN credential.requires_reauthorization = 'YES'
                   THEN 'REAUTHORIZATION_REQUIRED'
               ELSE 'CONNECTED'
           END,
           authorized_date =
           CASE
               WHEN credential.access_token_encrypted IS NOT NULL
                   THEN COALESCE(shop.authorized_date,
                                 credential.last_refresh_date,
                                 credential.update_date,
                                 credential.create_date)
               ELSE shop.authorized_date
           END
    FROM oms.t_oms_platform_app_shops AS shop
    LEFT JOIN oms.t_oms_platform_credential AS credential
      ON credential.platform = shop.platform
     AND credential.shop_id = shop.shop_id
    WHERE shop.connection_status IS NULL;

    IF EXISTS
    (
        SELECT 1
        FROM oms.t_oms_platform_app_shops
        WHERE connection_status IS NULL
    )
        THROW 50004, 'Unable to backfill connector connection_status.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
            ON c.object_id = dc.parent_object_id
           AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID(N'oms.t_oms_platform_app_shops')
          AND c.name = N'connection_status'
    )
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops
            ADD CONSTRAINT DF_t_oms_platform_app_shops_connection_status
                DEFAULT ('PENDING_AUTHORIZATION') FOR connection_status;
    END;

    ALTER TABLE oms.t_oms_platform_app_shops
        ALTER COLUMN connection_status VARCHAR(32) NOT NULL;

    IF OBJECT_ID(N'oms.CK_t_oms_platform_app_shops_connection_status', N'C') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_app_shops WITH CHECK
            ADD CONSTRAINT CK_t_oms_platform_app_shops_connection_status
                CHECK (connection_status IN
                (
                    'PENDING_AUTHORIZATION',
                    'CONNECTED',
                    'REAUTHORIZATION_REQUIRED',
                    'DISCONNECTED',
                    'ERROR'
                ));
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'oms.t_oms_platform_app_shops')
          AND name = N'IX_t_oms_platform_app_shops_status'
    )
    BEGIN
        CREATE INDEX IX_t_oms_platform_app_shops_status
            ON oms.t_oms_platform_app_shops
                (connection_status, is_active, platform)
            INCLUDE (platform_app_id, shop_id, shop_name);
    END;

    /* ---------------------------------------------------------------------
       3. Link credentials directly to their connector.

       The old (platform, shop_id) columns and unique index are retained until
       all application queries have migrated to platform_app_shop_id.
       --------------------------------------------------------------------- */

    IF COL_LENGTH(N'oms.t_oms_platform_credential', N'platform_app_shop_id') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_credential
            ADD platform_app_shop_id BIGINT NULL;
    END;

    UPDATE credential
       SET platform_app_shop_id = shop.platform_app_shop_id
    FROM oms.t_oms_platform_credential AS credential
    INNER JOIN oms.t_oms_platform_app_shops AS shop
      ON shop.platform = credential.platform
     AND shop.shop_id = credential.shop_id
    WHERE credential.platform_app_shop_id IS NULL;

    IF OBJECT_ID(N'oms.FK_t_oms_platform_credential_app_shop', N'F') IS NULL
    BEGIN
        ALTER TABLE oms.t_oms_platform_credential WITH CHECK
            ADD CONSTRAINT FK_t_oms_platform_credential_app_shop
                FOREIGN KEY (platform_app_shop_id)
                REFERENCES oms.t_oms_platform_app_shops(platform_app_shop_id);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'oms.t_oms_platform_credential')
          AND name = N'UX_t_oms_platform_credential_app_shop'
    )
    BEGIN
        CREATE UNIQUE INDEX UX_t_oms_platform_credential_app_shop
            ON oms.t_oms_platform_credential (platform_app_shop_id)
            WHERE platform_app_shop_id IS NOT NULL;
    END;

    /* ---------------------------------------------------------------------
       4. One-time OAuth sessions.

       Store SHA-256(state), never the raw state. The application should compare
       hashes, reject expired/consumed rows, and mark a row CONSUMED in the same
       transaction that persists the marketplace credential.
       --------------------------------------------------------------------- */

    IF OBJECT_ID(N'oms.t_oms_oauth_session', N'U') IS NULL
    BEGIN
        CREATE TABLE oms.t_oms_oauth_session
        (
            oauth_session_id UNIQUEIDENTIFIER NOT NULL
                CONSTRAINT DF_t_oms_oauth_session_id DEFAULT (NEWSEQUENTIALID()),
            state_hash BINARY(32) NOT NULL,
            platform_app_id BIGINT NOT NULL,
            platform NVARCHAR(32) NOT NULL,
            requested_by NVARCHAR(80) NULL,
            status VARCHAR(16) NOT NULL
                CONSTRAINT DF_t_oms_oauth_session_status DEFAULT ('PENDING'),
            expires_date DATETIME NOT NULL,
            consumed_date DATETIME NULL,
            callback_error NVARCHAR(2000) NULL,
            create_date DATETIME NOT NULL
                CONSTRAINT DF_t_oms_oauth_session_create_date DEFAULT (SYSUTCDATETIME()),
            update_date DATETIME NULL,
            rowversion ROWVERSION NOT NULL,

            CONSTRAINT PK_t_oms_oauth_session
                PRIMARY KEY (oauth_session_id),
            CONSTRAINT FK_t_oms_oauth_session_platform_app
                FOREIGN KEY (platform_app_id)
                REFERENCES oms.t_oms_platform_apps(platform_app_id),
            CONSTRAINT CK_t_oms_oauth_session_platform
                CHECK (platform IN (N'Shopee', N'Lazada', N'TikTok')),
            CONSTRAINT CK_t_oms_oauth_session_status
                CHECK (status IN ('PENDING', 'CONSUMED', 'FAILED', 'EXPIRED')),
            CONSTRAINT CK_t_oms_oauth_session_expiry
                CHECK (expires_date > create_date)
        );

        CREATE UNIQUE INDEX UX_t_oms_oauth_session_state_hash
            ON oms.t_oms_oauth_session (state_hash);

        CREATE INDEX IX_t_oms_oauth_session_pending_expiry
            ON oms.t_oms_oauth_session (status, expires_date)
            INCLUDE (platform_app_id, platform, requested_by);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

/* -------------------------------------------------------------------------
   Post-migration verification. These SELECTs contain no secrets or tokens.
   ------------------------------------------------------------------------- */

SELECT
    platform_app_id,
    platform,
    app_name,
    country_code,
    environment,
    is_default,
    is_active
FROM oms.t_oms_platform_apps
ORDER BY platform, country_code, environment, platform_app_id;

SELECT
    shop.platform_app_shop_id,
    shop.platform,
    shop.shop_id,
    shop.shop_name,
    shop.connection_status,
    shop.authorized_date,
    credential.platform_credential_id,
    credential.platform_app_shop_id AS credential_connector_id
FROM oms.t_oms_platform_app_shops AS shop
LEFT JOIN oms.t_oms_platform_credential AS credential
  ON credential.platform_app_shop_id = shop.platform_app_shop_id
ORDER BY shop.platform, shop.shop_id;

SELECT
    COUNT_BIG(*) AS orphan_credential_count
FROM oms.t_oms_platform_credential
WHERE platform_app_shop_id IS NULL;
GO

/*
    After checking the first result set, explicitly choose one active default
    App Master per platform/market/environment. Example:

    UPDATE oms.t_oms_platform_apps
       SET is_default = CASE WHEN platform_app_id = 1 THEN 'YES' ELSE 'NO' END,
           update_by = N'DBA',
           update_date = SYSUTCDATETIME()
     WHERE platform = N'Shopee'
       AND country_code = 'TH'
       AND environment = 'PRODUCTION';

    Repeat with the correct platform_app_id for Lazada and TikTok. The unique
    filtered index prevents two active defaults in the same platform/market/env.
*/
