BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE TABLE [oms].[t_oms_sync_log] (
        [sync_log_id] bigint NOT NULL IDENTITY,
        [sync_type] varchar(32) NOT NULL DEFAULT 'ORDER',
        [sync_source] varchar(32) NOT NULL,
        [platform] varchar(32) NOT NULL,
        [shop_id] varchar(128) NULL,
        [sync_status] varchar(16) NOT NULL,
        [total_fetched] int NOT NULL DEFAULT 0,
        [total_inserted] int NOT NULL DEFAULT 0,
        [total_updated] int NOT NULL DEFAULT 0,
        [total_failed] int NOT NULL DEFAULT 0,
        [start_date] datetime NOT NULL,
        [end_date] datetime NULL,
        [duration_ms] int NULL,
        [error_message] nvarchar(2000) NULL,
        [create_by] nvarchar(80) NULL,
        [create_date] datetime NOT NULL,
        CONSTRAINT [PK_t_oms_sync_log] PRIMARY KEY ([sync_log_id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE TABLE [oms].[t_oms_sync_log_detail] (
        [sync_log_detail_id] bigint NOT NULL IDENTITY,
        [sync_log_id] bigint NOT NULL,
        [platform_order_id] varchar(128) NOT NULL,
        [order_record_id] bigint NULL,
        [action] varchar(16) NOT NULL,
        [old_status] varchar(32) NULL,
        [new_status] varchar(32) NULL,
        [message] nvarchar(2000) NULL,
        [create_date] datetime NOT NULL,
        CONSTRAINT [PK_t_oms_sync_log_detail] PRIMARY KEY ([sync_log_detail_id]),
        CONSTRAINT [FK_t_oms_sync_log_detail_log] FOREIGN KEY ([sync_log_id]) REFERENCES [oms].[t_oms_sync_log] ([sync_log_id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE INDEX [IX_t_oms_sync_log_platform_shop] ON [oms].[t_oms_sync_log] ([platform], [shop_id], [start_date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE INDEX [IX_t_oms_sync_log_status] ON [oms].[t_oms_sync_log] ([sync_status], [start_date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE INDEX [IX_t_oms_sync_log_detail_log] ON [oms].[t_oms_sync_log_detail] ([sync_log_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    CREATE INDEX [IX_t_oms_sync_log_detail_order] ON [oms].[t_oms_sync_log_detail] ([platform_order_id], [create_date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925033239_AddPlatformSyncLogTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260925033239_AddPlatformSyncLogTables', N'9.0.8');
END;

COMMIT;
GO

