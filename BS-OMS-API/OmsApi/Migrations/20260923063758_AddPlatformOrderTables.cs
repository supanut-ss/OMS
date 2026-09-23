using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformOrderTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "t_oms_order",
                schema: "oms",
                columns: table => new
                {
                    order_record_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform = table.Column<string>(type: "varchar(32)", nullable: false),
                    shop_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    platform_order_id = table.Column<string>(type: "varchar(128)", nullable: false),
                    shop_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    status = table.Column<string>(type: "varchar(32)", nullable: false),
                    original_status = table.Column<string>(type: "varchar(64)", nullable: false),
                    buyer_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    buyer_remarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    tax_invoice_requested = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    tax_invoice_tax_id = table.Column<string>(type: "varchar(32)", nullable: true),
                    tax_invoice_company_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    tax_invoice_address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    tax_invoice_branch_code = table.Column<string>(type: "varchar(20)", nullable: true),
                    cancellation_deadline = table.Column<DateTime>(type: "datetime", nullable: true),
                    order_created_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    order_updated_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    total_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    currency = table.Column<string>(type: "varchar(3)", nullable: false, defaultValue: "THB"),
                    shipping_carrier = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    tracking_number = table.Column<string>(type: "varchar(256)", nullable: true),
                    package_number = table.Column<string>(type: "varchar(128)", nullable: true),
                    shipping_method = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    shipping_fee = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    estimated_delivery_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    recipient_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    recipient_phone = table.Column<string>(type: "varchar(32)", nullable: true),
                    recipient_address_line1 = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    recipient_address_line2 = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    recipient_sub_district = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    recipient_district = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    recipient_province = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    recipient_postal_code = table.Column<string>(type: "varchar(10)", nullable: true),
                    recipient_country = table.Column<string>(type: "varchar(2)", nullable: true, defaultValue: "TH"),
                    recipient_full_address = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    sync_status = table.Column<string>(type: "varchar(16)", nullable: false, defaultValue: "SYNCED"),
                    last_sync_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    create_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_by = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_order", x => x.order_record_id);
                });

            migrationBuilder.CreateTable(
                name: "t_oms_order_item",
                schema: "oms",
                columns: table => new
                {
                    order_item_record_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    order_record_id = table.Column<long>(type: "bigint", nullable: false),
                    platform_item_id = table.Column<string>(type: "varchar(128)", nullable: true),
                    model_id = table.Column<long>(type: "bigint", nullable: true),
                    platform_order_item_id = table.Column<long>(type: "bigint", nullable: true),
                    promotion_group_id = table.Column<long>(type: "bigint", nullable: true),
                    sku = table.Column<string>(type: "varchar(128)", nullable: true),
                    item_name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    unit_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    total_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    discount = table.Column<decimal>(type: "decimal(18,2)", nullable: false, defaultValue: 0m),
                    image_url = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    variation = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    weight = table.Column<decimal>(type: "decimal(18,3)", nullable: true),
                    create_date = table.Column<DateTime>(type: "datetime", nullable: false),
                    update_date = table.Column<DateTime>(type: "datetime", nullable: true),
                    rowversion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_oms_order_item", x => x.order_item_record_id);
                    table.ForeignKey(
                        name: "FK_t_oms_order_item_order",
                        column: x => x.order_record_id,
                        principalSchema: "oms",
                        principalTable: "t_oms_order",
                        principalColumn: "order_record_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_order_shop",
                schema: "oms",
                table: "t_oms_order",
                columns: new[] { "platform", "shop_id", "order_created_date" });

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_order_status",
                schema: "oms",
                table: "t_oms_order",
                columns: new[] { "status", "order_created_date" });

            migrationBuilder.CreateIndex(
                name: "UQ_t_oms_order_platform_order",
                schema: "oms",
                table: "t_oms_order",
                columns: new[] { "platform", "shop_id", "platform_order_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_order_item_order",
                schema: "oms",
                table: "t_oms_order_item",
                column: "order_record_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_oms_order_item",
                schema: "oms");

            migrationBuilder.DropTable(
                name: "t_oms_order",
                schema: "oms");
        }
    }
}
