using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformSyncLogTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "t_oms_sync_log",
                schema: "oms",
                columns: table => new
                {
                    sync_log_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    sync_type = table.Column<string>(type: "varchar(32)", nullable: false, defaultValue: "ORDER"),
                    sync_source = table.Column<string>(type: "varchar(32)", nullable: false),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    sync_status = table.Column<string>(type: "varchar(16)", nullable: false),
                    total_fetched = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    total_inserted = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    total_updated = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    total_failed = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    start_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    end_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    duration_ms = table.Column<int>(type: "int", nullable: true),
                    error_message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    create_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_sync_log", x => x.sync_log_id);
                });

            migrationBuilder.CreateTable(
                name: "t_oms_sync_log_detail",
                schema: "oms",
                columns: table => new
                {
                    sync_log_detail_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    sync_log_id = table.Column<long>(type: "bigint", nullable: false),
                    platform_order_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    order_record_id = table.Column<long>(type: "bigint", nullable: true),
                    action = table.Column<string>(type: "varchar(16)", nullable: false),
                    old_status = table.Column<string>(type: "varchar(32)", nullable: true),
                    new_status = table.Column<string>(type: "varchar(32)", nullable: true),
                    message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_sync_log_detail", x => x.sync_log_detail_id);
                    table.ForeignKey(
                        name: "FK_t_oms_sync_log_detail_log",
                        column: x => x.sync_log_id,
                        principalSchema: "oms",
                        principalTable: "t_oms_sync_log",
                        principalColumn: "sync_log_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_sync_log_platform_shop",
                schema: "oms",
                table: "t_oms_sync_log",
                columns: new[] { "platform", "shop_id", "start_date" });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_sync_log_status",
                schema: "oms",
                table: "t_oms_sync_log",
                columns: new[] { "sync_status", "start_date" });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_sync_log_detail_log",
                schema: "oms",
                table: "t_oms_sync_log_detail",
                column: "sync_log_id");

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_sync_log_detail_order",
                schema: "oms",
                table: "t_oms_sync_log_detail",
                columns: new[] { "platform_order_id", "create_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_oms_sync_log_detail",
                schema: "oms");

            migrationBuilder.DropTable(
                name: "t_oms_sync_log",
                schema: "oms");
        }
    }
}
