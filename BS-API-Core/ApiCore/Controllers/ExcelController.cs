using ApiCore.Extension;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using OfficeOpenXml;
using System.Data;

namespace ApiCore.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ExcelController : ControllerBase
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly Dictionary<DatabaseType, string> _connectionStrings;
        public string ConnectionString => _connectionStrings[DatabaseType.Main];
        public ExcelController(IConfiguration config, ISqlConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        // GET: api/excel/export?q=mouse&from=2025-01-01&to=2025-12-31
        [HttpGet("ExportSummaryReport")]
        public IActionResult ExportSummaryReport()
        {
            try
            {
                // 1) ดึงข้อมูลจาก SQL Server เป็น DataTable
                var dt = new DataTable("InventoryCheck");

                using (var conn = _connectionFactory.CreateConnection(DatabaseType.Main))
                using (var cmd = new SqlCommand("dbo.usp_inventory_check_report", conn))
                using (var da = new SqlDataAdapter(cmd))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.CommandTimeout = 120;

                    // ✅ ตัวอย่างเพิ่มพารามิเตอร์ (ตามที่ Stored Procedure ใช้จริง)
                    //cmd.Parameters.Add(new SqlParameter("@warehouse_code", (object?)warehouseCode ?? DBNull.Value));
                    //cmd.Parameters.Add(new SqlParameter("@item_code", (object?)itemCode ?? DBNull.Value));

                    conn.Open();
                    da.Fill(dt); // ดึงข้อมูลจาก SP ลง DataTable
                }
                ///////////////////
                //var dt = new DataTable("ProductList");
                //dt.Columns.Add("No", typeof(int));
                //dt.Columns.Add("PART NO", typeof(string));
                //dt.Columns.Add("PART NAME", typeof(string));
                //dt.Columns.Add("SUPPLIER NAME", typeof(string));
                //dt.Columns.Add("UNIT PRICE", typeof(decimal));
                //dt.Columns.Add("SNP", typeof(int));
                //dt.Columns.Add("Sub", typeof(string));

                //dt.Rows.Add(1, "P001", "Keyboard", "KUBOTA Machinery Trading Co.,", 9.03,500,"");
                //dt.Rows.Add(2, "P002", "Mouse", "THAI ASAKAWA CO., LTD.", 0.98,1500, "");
                //dt.Rows.Add(3, "P003", "Monitor", "DEXTECH(THAILAND)", 0.7,1000, "");

                if (dt.Rows.Count == 0)
                    return NotFound("No data returned from stored procedure.");

                // 2) แปลง DataTable → Excel (EPPlus)
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                var bytes = EpplusExporter.ExportDataTableToXlsx(dt, sheetName: "SummaryReport");

                // 3) ส่งไฟล์ออก
                var fileName = $"inventory_check_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
                const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                
                return File(bytes, contentType, fileName);
            }catch(Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
