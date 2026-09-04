/* Metadata for platform waybills and other printable documents. */
IF OBJECT_ID(N'dbo.t_interface_platform_document', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_interface_platform_document
    (
        platform_document_id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_interface_platform_document PRIMARY KEY,
        platform NVARCHAR(32) NOT NULL,
        shop_id NVARCHAR(128) NOT NULL,
        platform_order_id NVARCHAR(128) NOT NULL,
        platform_package_id NVARCHAR(128) NULL,
        tracking_number NVARCHAR(256) NULL,
        document_type NVARCHAR(32) NOT NULL,
        source_format NVARCHAR(16) NOT NULL,
        source_content_type NVARCHAR(128) NULL,
        raw_storage_key NVARCHAR(1000) NULL,
        print_storage_key NVARCHAR(1000) NULL,
        file_name NVARCHAR(256) NULL,
        file_size BIGINT NULL,
        file_checksum NVARCHAR(128) NULL,
        document_status NVARCHAR(20) NOT NULL
            CONSTRAINT df_platform_document_status DEFAULT (N'PENDING'),
        platform_request_id NVARCHAR(128) NULL,
        source_expires_date DATETIME2(0) NULL,
        last_error NVARCHAR(2000) NULL,
        print_count INT NOT NULL
            CONSTRAINT df_platform_document_print_count DEFAULT (0),
        last_print_date DATETIME2(0) NULL,
        create_date DATETIME2(0) NOT NULL
            CONSTRAINT df_platform_document_create_date DEFAULT (SYSUTCDATETIME()),
        update_date DATETIME2(0) NOT NULL
            CONSTRAINT df_platform_document_update_date DEFAULT (SYSUTCDATETIME()),
        rowversion ROWVERSION NOT NULL,
        CONSTRAINT uq_interface_platform_document_package UNIQUE
            (platform, shop_id, platform_order_id, platform_package_id, document_type)
    );
END;
GO
