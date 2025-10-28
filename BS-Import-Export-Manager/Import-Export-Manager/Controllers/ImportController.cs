using ClosedXML.Excel;
using ExcelDataReader;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Xml.Linq;

namespace Import_Export_Manager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ImportController : ControllerBase
    {
        private readonly IExcelImport _excelImport;
        public ImportController(IExcelImport excelImport)
        {
            _excelImport = excelImport;
        }
        // POST api/import Excel file upload from frontend
        [HttpPost("UploadExcel")]
        public async Task<ExcelImportResponse> UploadExcel([FromForm] ExcelImportRequest request)
        {
            if (request.file == null || request.file.Length == 0)
                return new ExcelImportResponse { code = "400", message = "No file uploaded." };

            var ext = Path.GetExtension(request.file.FileName).ToLowerInvariant();
            if (ext != ".xls" && ext != ".xlsx")
                return new ExcelImportResponse { code = "400", message = "Invalid file type. Please upload an Excel file." };

            try
            {
                string xmlData;
                using (var stream = request.file.OpenReadStream())
                {
                    xmlData = ConvertExcelToXML(stream);
                }
                request.xml_import_data = xmlData;

                return await _excelImport.ExcelImportXMLData(request);
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse { code = "500", message = ex.Message };
            }
        }

        private string ConvertExcelToXML(Stream excelStream)
        {
            // จำเป็น: reset stream position ก่อนอ่าน
            excelStream.Position = 0;

            // ต้องใช้ Encoding.RegisterProvider เพื่อรองรับ code page เก่า (.xls)
            System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

            using (var reader = ExcelReaderFactory.CreateReader(excelStream))
            {
                var result = reader.AsDataSet();

                var workbookElement = new XElement("Workbook");

                foreach (DataTable table in result.Tables)
                {
                    var worksheetElement = new XElement("Worksheet", new XAttribute("Name", table.TableName));

                    foreach (DataRow row in table.Rows)
                    {
                        var rowElement = new XElement("Row");
                        foreach (var cell in row.ItemArray)
                        {
                            rowElement.Add(new XElement("Cell", cell?.ToString() ?? string.Empty));
                        }
                        worksheetElement.Add(rowElement);
                    }

                    workbookElement.Add(worksheetElement);
                }

                return workbookElement.ToString();
            }
        }
    }
}
