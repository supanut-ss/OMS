/* Durable mapping between physical WMS boxes and platform packages. */
IF OBJECT_ID(N'dbo.t_interface_platform_package', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_interface_platform_package
    (
        platform_package_record_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_interface_platform_package PRIMARY KEY,
        platform NVARCHAR(32) NOT NULL,
        shop_id NVARCHAR(128) NOT NULL,
        platform_order_id NVARCHAR(128) NOT NULL,
        customer_order_number NVARCHAR(128) NOT NULL,
        outbound_order_master_id UNIQUEIDENTIFIER NOT NULL,
        outbound_sort_master_id UNIQUEIDENTIFIER NOT NULL,
        box_number INT NOT NULL,
        platform_package_id NVARCHAR(128) NULL,
        tracking_number NVARCHAR(256) NULL,
        shipping_provider_id NVARCHAR(128) NULL,
        shipping_provider_name NVARCHAR(256) NULL,
        package_status NVARCHAR(32) NOT NULL
            CONSTRAINT df_interface_platform_package_status DEFAULT (N'PENDING'),
        sync_status NVARCHAR(16) NOT NULL
            CONSTRAINT df_interface_platform_package_sync_status DEFAULT (N'PENDING'),
        attempt_count INT NOT NULL
            CONSTRAINT df_interface_platform_package_attempt_count DEFAULT (0),
        request_id NVARCHAR(128) NULL,
        last_sync_date DATETIME NULL,
        last_error NVARCHAR(2000) NULL,
        create_by NVARCHAR(40) NULL,
        create_date DATETIME NOT NULL
            CONSTRAINT df_interface_platform_package_create_date DEFAULT (GETDATE()),
        update_by NVARCHAR(40) NULL,
        update_date DATETIME NULL,
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT uq_interface_platform_package_wms
            UNIQUE (platform, shop_id, outbound_sort_master_id)
    );

    CREATE INDEX ix_interface_platform_package_order
        ON dbo.t_interface_platform_package
            (platform, shop_id, platform_order_id, box_number);
    CREATE INDEX ix_interface_platform_package_sync
        ON dbo.t_interface_platform_package (sync_status, last_sync_date);
    CREATE INDEX ix_interface_platform_package_platform_id
        ON dbo.t_interface_platform_package
            (platform, shop_id, platform_package_id)
        WHERE platform_package_id IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.t_interface_platform_package_item', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_interface_platform_package_item
    (
        platform_package_item_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_interface_platform_package_item PRIMARY KEY,
        platform_package_record_id BIGINT NOT NULL,
        platform_item_id NVARCHAR(128) NULL,
        platform_sku_id NVARCHAR(128) NULL,
        wms_item_master_id UNIQUEIDENTIFIER NOT NULL,
        item_number NVARCHAR(128) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        create_by NVARCHAR(40) NULL,
        create_date DATETIME NOT NULL
            CONSTRAINT df_interface_platform_package_item_create_date DEFAULT (GETDATE()),
        update_by NVARCHAR(40) NULL,
        update_date DATETIME NULL,
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT fk_interface_platform_package_item_package
            FOREIGN KEY (platform_package_record_id)
            REFERENCES dbo.t_interface_platform_package(platform_package_record_id)
    );

    CREATE INDEX ix_interface_platform_package_item_package
        ON dbo.t_interface_platform_package_item
            (platform_package_record_id, item_number);
END;
GO
