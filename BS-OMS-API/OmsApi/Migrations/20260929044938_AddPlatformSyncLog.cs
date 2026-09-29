using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformSyncLog : Migration
    {
        // oms.t_oms_sync_log already exists on the shared OMS database (created
        // out-of-band, outside this project's migration history) without a
        // request_payload column. This migration must work both there and on
        // a fresh database created from scratch, so table creation and the
        // new column are each guarded to run only where needed.
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'oms.t_oms_sync_log', N'U') IS NULL
                BEGIN
                    CREATE TABLE oms.t_oms_sync_log
                    (
                        sync_log_id BIGINT IDENTITY(1,1) NOT NULL
                            CONSTRAINT PK_t_oms_sync_log PRIMARY KEY,
                        sync_type VARCHAR(32) NOT NULL CONSTRAINT DF_t_oms_sync_log_sync_type DEFAULT ('ORDER'),
                        sync_source VARCHAR(32) NOT NULL,
                        platform VARCHAR(32) NOT NULL,
                        shop_id VARCHAR(128) NULL,
                        sync_status VARCHAR(16) NOT NULL,
                        total_fetched INT NOT NULL CONSTRAINT DF_t_oms_sync_log_total_fetched DEFAULT (0),
                        total_inserted INT NOT NULL CONSTRAINT DF_t_oms_sync_log_total_inserted DEFAULT (0),
                        total_updated INT NOT NULL CONSTRAINT DF_t_oms_sync_log_total_updated DEFAULT (0),
                        total_failed INT NOT NULL CONSTRAINT DF_t_oms_sync_log_total_failed DEFAULT (0),
                        start_date DATETIME NOT NULL,
                        end_date DATETIME NULL,
                        duration_ms INT NULL,
                        request_payload NVARCHAR(MAX) NULL,
                        error_message NVARCHAR(2000) NULL,
                        create_by NVARCHAR(80) NULL,
                        create_date DATETIME NOT NULL
                    );

                    CREATE INDEX IX_t_oms_sync_log_platform_shop
                        ON oms.t_oms_sync_log (platform, shop_id, start_date);
                    CREATE INDEX IX_t_oms_sync_log_status
                        ON oms.t_oms_sync_log (sync_status, start_date);
                END;
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('oms.t_oms_sync_log', 'request_payload') IS NULL
                BEGIN
                    ALTER TABLE oms.t_oms_sync_log ADD request_payload NVARCHAR(MAX) NULL;
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('oms.t_oms_sync_log', 'request_payload') IS NOT NULL
                BEGIN
                    ALTER TABLE oms.t_oms_sync_log DROP COLUMN request_payload;
                END;
                """);
        }
    }
}
