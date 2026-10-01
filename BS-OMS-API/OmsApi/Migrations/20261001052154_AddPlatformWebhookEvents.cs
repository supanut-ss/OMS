using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformWebhookEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "t_oms_webhook_event",
                schema: "oms",
                columns: table => new
                {
                    webhook_event_record_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    event_key = table.Column<string>(type: "varchar(512)", nullable: false),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    event_type = table.Column<string>(type: "varchar(128)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(256)", nullable: true),
                    platform_order_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    platform_status = table.Column<string>(type: "varchar(128)", nullable: true),
                    tracking_number = table.Column<string>(type: "varchar(256)", nullable: true),
                    event_time = table.Column<DateTime>(type: "datetime", nullable: true),
                    signature_status = table.Column<string>(type: "varchar(16)", nullable: false),
                    processing_status = table.Column<string>(type: "varchar(16)", nullable: false),
                    attempt_count = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    request_payload = table.Column<string>(type: "nvarchar(max)", maxLength: 16000, nullable: true),
                    error_message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    received_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    processed_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_attempt_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    internal_status = table.Column<string>(type: "varchar(32)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_webhook_event", x => x.webhook_event_record_id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_webhook_event_order",
                schema: "oms",
                table: "t_oms_webhook_event",
                columns: new[] { "platform", "shop_id", "platform_order_id", "event_time" });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_webhook_event_processing",
                schema: "oms",
                table: "t_oms_webhook_event",
                columns: new[] { "platform", "processing_status", "received_date" });

            migrationBuilder.CreateIndex(
                name: "UQ_t_oms_webhook_event_key",
                schema: "oms",
                table: "t_oms_webhook_event",
                column: "event_key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_oms_webhook_event",
                schema: "oms");
        }
    }
}
