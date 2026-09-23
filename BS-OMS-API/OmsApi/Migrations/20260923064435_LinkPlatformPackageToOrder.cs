using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class LinkPlatformPackageToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "order_record_id",
                schema: "oms",
                table: "t_oms_platform_package",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_t_oms_platform_package_order_record",
                schema: "oms",
                table: "t_oms_platform_package",
                column: "order_record_id");

            migrationBuilder.AddForeignKey(
                name: "FK_t_oms_platform_package_order",
                schema: "oms",
                table: "t_oms_platform_package",
                column: "order_record_id",
                principalSchema: "oms",
                principalTable: "t_oms_order",
                principalColumn: "order_record_id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_t_oms_platform_package_order",
                schema: "oms",
                table: "t_oms_platform_package");

            migrationBuilder.DropIndex(
                name: "IX_t_oms_platform_package_order_record",
                schema: "oms",
                table: "t_oms_platform_package");

            migrationBuilder.DropColumn(
                name: "order_record_id",
                schema: "oms",
                table: "t_oms_platform_package");
        }
    }
}
