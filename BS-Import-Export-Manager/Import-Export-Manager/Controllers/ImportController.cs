using ClosedXML.Excel;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
            using (var workbook = new XLWorkbook(excelStream))
            {
                var worksheet = workbook.Worksheets.First();
                var rows = worksheet.RangeUsed().RowsUsed();

                var xml = new XElement("Workbook",
                    new XElement("Worksheet",
                        new XAttribute("Name", worksheet.Name),
                        rows.Select(row =>
                            new XElement("Row",
                                row.Cells().Select(cell =>
                                    new XElement("Cell", cell.Value.IsBlank ? string.Empty : cell.Value.ToString())
                                )
                            )
                        )
                    )
                );
                return xml.ToString();
            }
        }
    }
}
