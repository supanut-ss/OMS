/*
    OAuth credentials used by OMS.
    Tokens must be encrypted by the application before storage.
    All DATETIME2 values are UTC.
*/
IF OBJECT_ID(N'dbo.t_interface_platform_credentials', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_interface_platform_credentials
    (
        platform_credential_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_platform_credentials PRIMARY KEY,
        platform NVARCHAR(32) NOT NULL,
        shop_id NVARCHAR(128) NOT NULL,
        shop_name NVARCHAR(256) NULL,
        access_token_encrypted NVARCHAR(MAX) NOT NULL,
        refresh_token_encrypted NVARCHAR(MAX) NULL,
        access_token_expires_date DATETIME2(0) NOT NULL,
        refresh_token_expires_date DATETIME2(0) NULL,
        is_active NVARCHAR(3) NOT NULL
            CONSTRAINT df_platform_credentials_is_active DEFAULT (N'YES'),
        requires_reauthorization NVARCHAR(3) NOT NULL
            CONSTRAINT df_platform_credentials_requires_reauthorization DEFAULT (N'NO'),
        last_refresh_date DATETIME2(0) NULL,
        last_use_date DATETIME2(0) NULL,
        last_error NVARCHAR(2000) NULL,
        create_date DATETIME2(0) NOT NULL
            CONSTRAINT df_platform_credentials_create_date DEFAULT (SYSUTCDATETIME()),
        update_date DATETIME2(0) NOT NULL
            CONSTRAINT df_platform_credentials_update_date DEFAULT (SYSUTCDATETIME()),
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT ck_platform_credentials_platform
            CHECK (platform IN (N'Shopee', N'Lazada', N'TikTok')),
        CONSTRAINT ck_platform_credentials_is_active
            CHECK (is_active IN (N'YES', N'NO')),
        CONSTRAINT ck_platform_credentials_requires_reauthorization
            CHECK (requires_reauthorization IN (N'YES', N'NO')),
        CONSTRAINT uq_platform_credentials_platform_shop
            UNIQUE (platform, shop_id)
    );

    CREATE INDEX ix_t_interface_platform_credentials_active_expiry
        ON dbo.t_interface_platform_credentials
            (platform, shop_id, is_active, access_token_expires_date);
END;
GO
