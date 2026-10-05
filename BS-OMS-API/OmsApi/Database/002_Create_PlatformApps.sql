/*
    Platform App master and its shop mapping.

    These tables intentionally do not change the shared platform-credential
    table. OAuth tokens continue to be stored in the existing credential store.
*/
IF SCHEMA_ID(N'oms') IS NULL
    EXEC(N'CREATE SCHEMA oms');
GO

IF OBJECT_ID(N'oms.t_oms_platform_apps', N'U') IS NULL
BEGIN
    CREATE TABLE oms.t_oms_platform_apps
    (
        platform_app_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_t_oms_platform_apps PRIMARY KEY,
        platform NVARCHAR(32) NOT NULL,
        app_name NVARCHAR(128) NOT NULL,
        app_key_encrypted NVARCHAR(MAX) NOT NULL,
        app_secret_encrypted NVARCHAR(MAX) NOT NULL,
        redirect_url NVARCHAR(2048) NOT NULL,
        service_id NVARCHAR(255) NULL,
        is_active NVARCHAR(3) NOT NULL
            CONSTRAINT DF_t_oms_platform_apps_is_active DEFAULT (N'YES'),
        create_by NVARCHAR(80) NULL,
        create_date DATETIME NOT NULL
            CONSTRAINT DF_t_oms_platform_apps_create_date DEFAULT (SYSUTCDATETIME()),
        update_by NVARCHAR(80) NULL,
        update_date DATETIME NULL,
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT UQ_t_oms_platform_apps_platform_name UNIQUE (platform, app_name),
        CONSTRAINT CK_t_oms_platform_apps_platform
            CHECK (platform IN (N'Shopee', N'Lazada', N'TikTok')),
        CONSTRAINT CK_t_oms_platform_apps_is_active
            CHECK (is_active IN (N'YES', N'NO'))
    );

    CREATE INDEX IX_t_oms_platform_apps_active
        ON oms.t_oms_platform_apps (platform, is_active, app_name);
END;
GO

IF OBJECT_ID(N'oms.t_oms_platform_app_shops', N'U') IS NULL
BEGIN
    CREATE TABLE oms.t_oms_platform_app_shops
    (
        platform_app_shop_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_t_oms_platform_app_shops PRIMARY KEY,
        platform_app_id BIGINT NOT NULL,
        platform NVARCHAR(32) NOT NULL,
        shop_id NVARCHAR(128) NOT NULL,
        shop_name NVARCHAR(256) NULL,
        is_active NVARCHAR(3) NOT NULL
            CONSTRAINT DF_t_oms_platform_app_shops_is_active DEFAULT (N'YES'),
        create_by NVARCHAR(80) NULL,
        create_date DATETIME NOT NULL
            CONSTRAINT DF_t_oms_platform_app_shops_create_date DEFAULT (SYSUTCDATETIME()),
        update_by NVARCHAR(80) NULL,
        update_date DATETIME NULL,
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT FK_t_oms_platform_app_shops_app
            FOREIGN KEY (platform_app_id) REFERENCES oms.t_oms_platform_apps(platform_app_id),
        CONSTRAINT UQ_t_oms_platform_app_shops_platform_shop UNIQUE (platform, shop_id),
        CONSTRAINT CK_t_oms_platform_app_shops_platform
            CHECK (platform IN (N'Shopee', N'Lazada', N'TikTok')),
        CONSTRAINT CK_t_oms_platform_app_shops_is_active
            CHECK (is_active IN (N'YES', N'NO'))
    );

    CREATE INDEX IX_t_oms_platform_app_shops_app_active
        ON oms.t_oms_platform_app_shops (platform_app_id, is_active, shop_id);
END;
GO
