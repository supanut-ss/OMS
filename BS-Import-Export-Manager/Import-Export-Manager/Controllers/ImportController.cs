using ClosedXML.Excel;
using ExcelDataReader;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Import_Export_Manager.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Import_Export_Manager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ImportController : ControllerBase
    {
        [NonAction]
        public string GetClientIpAddress()
        {
            // 1. ดึง IP Address ขาเข้ามาปกติ
            var remoteIp = HttpContext?.Connection?.RemoteIpAddress;
            string ipAddress = null;

            if (remoteIp != null)
            {
                // 🔥 ไม้เด็ด: ถ้ามันเป็น IPv4-Mapped (มี ::ffff:) ให้ดึงเฉพาะ IPv4 ข้างหลังออกมา
                if (remoteIp.IsIPv4MappedToIPv6)
                {
                    ipAddress = remoteIp.MapToIPv4().ToString(); // จะเหลือแค่ "192.168.1.55"
                }
                else
                {
                    ipAddress = remoteIp.ToString();
                }
            }

            // 2. กรณีถ้าระบบผ่าน Proxy / Load Balancer (ดึงจาก Header)
            if (HttpContext?.Request?.Headers.TryGetValue("X-Forwarded-For", out var forwardedHeader) == true)
            {
                var forwardedIp = forwardedHeader.FirstOrDefault();
                if (!string.IsNullOrEmpty(forwardedIp))
                {
                    // เผื่อใน Header ก็ติด ::ffff: มาด้วย ให้ล้างออกซะ
                    if (forwardedIp.StartsWith("::ffff:"))
                    {
                        forwardedIp = forwardedIp.Replace("::ffff:", "");
                    }
                    ipAddress = forwardedIp;
                }
            }

            return ipAddress ?? "UNKNOWN_IP";
        }
        private readonly IExcelImport _excelImport;
        private readonly IImportMaster _importMaster;
        private readonly IImportColumnMapping _columnMapping;

        public ImportController(IExcelImport excelImport, IImportMaster importMaster, IImportColumnMapping columnMapping)
        {
            _excelImport = excelImport;
            _importMaster = importMaster;
            _columnMapping = columnMapping;
        }

        // POST api/import/bulk - High Performance Bulk Import using SqlBulkCopy
        [HttpPost("UploadExcelBulk")]
        public async Task<ExcelImportResponse> UploadExcelBulk([FromForm] ExcelImportRequest request)
        {
            if (request.files == null || request.files.Count == 0 || request.files[0] == null || request.files[0].Length == 0)
                return new ExcelImportResponse { code = "400", message = "No file uploaded." };

            var ext = Path.GetExtension(request.files[0].FileName).ToLowerInvariant();
            if (ext != ".xls" && ext != ".xlsx")
                return new ExcelImportResponse { code = "400", message = "Invalid file type. Please upload an Excel file." };

            try
            {
                request.device = GetClientIpAddress(); // ดึง IP Address ของผู้ใช้งานที่เข้ามา
                return await _excelImport.ExcelImportBulkData(request);
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse { code = "500", message = ex.Message };
            }
        }

        [HttpGet("UploadHistory")]
        public async Task<ImportUploadHistoryResponse> GetUploadHistory(
            int import_id,
            int limit = 500)
        {
            if (import_id <= 0)
            {
                return new ImportUploadHistoryResponse
                {
                    code = "400",
                    message = "A valid import_id is required."
                };
            }

            try
            {
                return await _excelImport.GetUploadHistory(import_id, limit);
            }
            catch (Exception ex)
            {
                return new ImportUploadHistoryResponse
                {
                    code = "500",
                    message = ex.Message
                };
            }
        }

        // GET api/import/grid-config/{importId} - Get dynamic grid configuration for staging table
        [HttpGet("GridConfig")]
        public async Task<ImportGridConfigResponse> GetGridConfig(int import_id)
        {
            try
            {
                // Get column mappings
                var columnMappings = await _columnMapping.GetAllImportColumnMappings(import_id);


                if (columnMappings == null || columnMappings.Count == 0)
                {
                    return new ImportGridConfigResponse
                    {
                        code = "404",
                        message = "No column mapping found for this import type",
                        columns = new(),
                        data = new()
                    };
                }

                // Build dynamic columns from mapping
                var columns = new List<ImportColumnDefinitionResponse>
                {
                    // Fixed columns for error tracking and metadata
                    new ImportColumnDefinitionResponse
                    {
                        field = "imp_data_id",
                        headerName = "ID",
                        width = 80,
                        type = "number",
                        display = false
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "row_number",
                        headerName = "Row",
                        width = 80,
                        type = "number",
                        display = false
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "imp_status",
                        headerName = "Status",
                        width = 120,
                        type = "string",
                        display = true
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "imp_message",
                        headerName = "Error Message",
                        width = 400,
                        type = "string",
                        display = true
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "session_id",
                        headerName = "Session ID",
                        width = 250,
                        type = "string",
                        display = false
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "create_by",
                        headerName = "Created By",
                        width = 150,
                        type = "string",
                        display = true
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "create_date",
                        headerName = "Created Date",
                        width = 180,
                        type = "date",
                        display = true
                    },
                    new ImportColumnDefinitionResponse
                    {
                        field = "processed_date",
                        headerName = "Processed Date",
                        width = 180,
                        type = "date",
                        display = false
                    }
                };

                // Add data columns from mapping
                foreach (var mapping in columnMappings
                    .OrderBy(m => m.column_order)
                    .ThenBy(m => m.mapping_id))
                {
                    columns.Add(new ImportColumnDefinitionResponse
                    {
                        field = mapping.db_column_name,
                        headerName = mapping.excel_column_name,
                        width = GetWidthByDataType(mapping.data_type),
                        type = MapDataTypeToGridType(mapping.data_type),
                        display = true
                    });
                }

                var tableData = await _importMaster.GetImportMasterById(import_id);

                if (tableData == null || tableData.data == null || !tableData.data.Any())
                {
                    return new ImportGridConfigResponse
                    {
                        code = "0",
                        message = "Success",
                        columns = columns,
                        data = new(),
                        total = 0
                    };
                }

                var importMaster = tableData.data.FirstOrDefault();
                if (importMaster == null || string.IsNullOrEmpty(importMaster.import_temp_table_name))
                {
                    return new ImportGridConfigResponse
                    {
                        code = "0",
                        message = "Success",
                        columns = columns,
                        data = new(),
                        total = 0
                    };
                }

                // Get staging table data
                var (stagingData, totalRecords) = await _importMaster.GetStagingTableData(import_id);

                return new ImportGridConfigResponse
                {
                    code = "0",
                    message = "Success",
                    columns = columns,
                    data = stagingData,
                    total = totalRecords
                };
            }
            catch (Exception ex)
            {
                return new ImportGridConfigResponse
                {
                    code = "500",
                    message = ex.Message,
                    columns = new(),
                    data = new()
                };
            }
        }

        // GET api/import/download-template - Build Excel template from column mapping
        [HttpGet("DownloadTemplateByMapping")]
        public async Task<IActionResult> DownloadTemplateByMapping(int import_id)
        {
            var importMasterResult = await _importMaster.GetImportMasterById(import_id);
            var importName = importMasterResult?.data?.FirstOrDefault()?.import_name ?? import_id.ToString();
            var safeImportName = string.Concat(importName.Where(c => !Path.GetInvalidFileNameChars().Contains(c))).Trim();

            var (fileBytes, fileName, errorMessage) = await _columnMapping.GenerateExcelTemplateAsync(import_id, safeImportName);

            if (errorMessage != null)
            {
                if (errorMessage.Contains("No column mapping found"))
                {
                    return NotFound(new { code = "404", message = errorMessage });
                }
                return StatusCode(500, new { code = "500", message = errorMessage });
            }

            // ส่งไฟล์กลับในรูปแบบ Response สั้น ๆ คลีน ๆ
            var response = File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);

            Response.Headers["Content-Disposition"] = new System.Net.Http.Headers.ContentDispositionHeaderValue("attachment")
            {
                FileName = fileName,
                FileNameStar = fileName
            }.ToString();

            return response;
        }

        private static int GetWidthByDataType(string dataType)
        {
            return dataType.ToLowerInvariant() switch
            {
                "int" or "integer" or "bigint" => 100,
                "decimal" or "numeric" or "money" => 120,
                "bit" or "boolean" => 80,
                "datetime" or "datetime2" or "date" => 180,
                _ => 200
            };
        }

        private static string MapDataTypeToGridType(string dataType)
        {
            return dataType.ToLowerInvariant() switch
            {
                "int" or "integer" or "bigint" => "number",
                "decimal" or "numeric" or "money" or "float" or "real" => "number",
                "bit" or "boolean" => "boolean",
                "datetime" or "datetime2" or "date" => "date",
                _ => "string"
            };
        }

    }
}
