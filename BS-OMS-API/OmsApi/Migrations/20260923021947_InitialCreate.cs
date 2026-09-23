using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "oms");

            migrationBuilder.CreateTable(
                name: "t_oms_platform_credential",
                schema: "oms",
                columns: table => new
                {
                    platform_credential_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    shop_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    access_token_encrypted = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    refresh_token_encrypted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    access_token_expires_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    refresh_token_expires_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    is_active = table.Column<string>(type: "varchar(3)", nullable: false, defaultValue: "YES"),
                    requires_reauthorization = table.Column<string>(type: "varchar(3)", nullable: false, defaultValue: "NO"),
                    last_refresh_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_use_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_error = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_platform_credential", x => x.platform_credential_id);
                });

            migrationBuilder.CreateTable(
                name: "t_oms_platform_document",
                schema: "oms",
                columns: table => new
                {
                    platform_document_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    platform_order_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    platform_package_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    tracking_number = table.Column<string>(type: "varchar(256)", nullable: true),
                    document_type = table.Column<string>(type: "varchar(32)", nullable: false),
                    source_format = table.Column<string>(type: "varchar(16)", nullable: false),
                    source_content_type = table.Column<string>(type: "varchar(128)", nullable: true),
                    raw_storage_key = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    print_storage_key = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    file_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    file_size = table.Column<long>(type: "bigint", nullable: true),
                    file_checksum = table.Column<string>(type: "varchar(128)", nullable: true),
                    document_status = table.Column<string>(type: "varchar(20)", nullable: false, defaultValue: "PENDING"),
                    platform_request_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    source_expires_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_error = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    print_count = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    last_print_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_platform_document", x => x.platform_document_id);
                });

            migrationBuilder.CreateTable(
                name: "t_oms_platform_package",
                schema: "oms",
                columns: table => new
                {
                    platform_package_record_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    platform_order_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    customer_order_number = table.Column<string>(type: "varchar(128)", nullable: false),
                    outbound_order_master_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    outbound_sort_master_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    box_number = table.Column<int>(type: "int", nullable: false),
                    platform_package_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    tracking_number = table.Column<string>(type: "varchar(256)", nullable: true),
                    shipping_provider_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    shipping_provider_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    package_status = table.Column<string>(type: "varchar(32)", nullable: false, defaultValue: "PENDING"),
                    sync_status = table.Column<string>(type: "varchar(16)", nullable: false, defaultValue: "PENDING"),
                    attempt_count = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    request_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    last_sync_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_error = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    create_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_platform_package", x => x.platform_package_record_id);
                });

            migrationBuilder.CreateTable(
                name: "t_oms_platform_package_item",
                schema: "oms",
                columns: table => new
                {
                    platform_package_item_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform_package_record_id = table.Column<long>(type: "bigint", nullable: false),
                    platform_item_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    platform_sku_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    wms_item_master_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    item_number = table.Column<string>(type: "varchar(128)", nullable: false),
                    quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    create_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_platform_package_item", x => x.platform_package_item_id);
                    table.ForeignKey(
                        name: "FK_t_oms_platform_package_item_package",
                        column: x => x.platform_package_record_id,
                        principalSchema: "oms",
                        principalTable: "t_oms_platform_package",
                        principalColumn: "platform_package_record_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_t_oms_platform_credential_platform_shop",
                schema: "oms",
                table: "t_oms_platform_credential",
                columns: new[] { "platform", "shop_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_t_oms_platform_document_package",
                schema: "oms",
                table: "t_oms_platform_document",
                columns: new[] { "platform", "shop_id", "platform_order_id", "platform_package_id", "document_type" },
                unique: true,
                filter: "[platform_package_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_platform_package_order",
                schema: "oms",
                table: "t_oms_platform_package",
                columns: new[] { "platform", "shop_id", "platform_order_id", "box_number" });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_platform_package_platform_id",
                schema: "oms",
                table: "t_oms_platform_package",
                columns: new[] { "platform", "shop_id", "platform_package_id" },
                filter: "[platform_package_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_platform_package_sync",
                schema: "oms",
                table: "t_oms_platform_package",
                columns: new[] { "sync_status", "last_sync_date" });

            migrationBuilder.CreateIndex(
                name: "UQ_t_oms_platform_package_wms",
                schema: "oms",
                table: "t_oms_platform_package",
                columns: new[] { "platform", "shop_id", "outbound_sort_master_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_platform_package_item_package",
                schema: "oms",
                table: "t_oms_platform_package_item",
                columns: new[] { "platform_package_record_id", "item_number" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_oms_platform_credential",
                schema: "oms");

            migrationBuilder.DropTable(
                name: "t_oms_platform_document",
                schema: "oms");

            migrationBuilder.DropTable(
                name: "t_oms_platform_package_item",
                schema: "oms");

            migrationBuilder.DropTable(
                name: "t_oms_platform_package",
                schema: "oms");
        }
    }
}
