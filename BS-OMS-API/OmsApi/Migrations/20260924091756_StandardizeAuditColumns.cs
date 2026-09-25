using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmsApi.Migrations
{
    /// <inheritdoc />
    public partial class StandardizeAuditColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "update_date",
                schema: "oms",
                table: "t_oms_platform_document",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime");

            migrationBuilder.AddColumn<string>(
                name: "create_by",
                schema: "oms",
                table: "t_oms_platform_document",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "update_by",
                schema: "oms",
                table: "t_oms_platform_document",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "update_date",
                schema: "oms",
                table: "t_oms_platform_credential",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime");

            migrationBuilder.AddColumn<string>(
                name: "create_by",
                schema: "oms",
                table: "t_oms_platform_credential",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "update_by",
                schema: "oms",
                table: "t_oms_platform_credential",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_by",
                schema: "oms",
                table: "t_oms_order_item",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "update_by",
                schema: "oms",
                table: "t_oms_order_item",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "create_by",
                schema: "oms",
                table: "t_oms_platform_document");

            migrationBuilder.DropColumn(
                name: "update_by",
                schema: "oms",
                table: "t_oms_platform_document");

            migrationBuilder.DropColumn(
                name: "create_by",
                schema: "oms",
                table: "t_oms_platform_credential");

            migrationBuilder.DropColumn(
                name: "update_by",
                schema: "oms",
                table: "t_oms_platform_credential");

            migrationBuilder.DropColumn(
                name: "create_by",
                schema: "oms",
                table: "t_oms_order_item");

            migrationBuilder.DropColumn(
                name: "update_by",
                schema: "oms",
                table: "t_oms_order_item");

            migrationBuilder.AlterColumn<DateTime>(
                name: "update_date",
                schema: "oms",
                table: "t_oms_platform_document",
                type: "datetime",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "update_date",
                schema: "oms",
                table: "t_oms_platform_credential",
                type: "datetime",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);
        }
    }
}
