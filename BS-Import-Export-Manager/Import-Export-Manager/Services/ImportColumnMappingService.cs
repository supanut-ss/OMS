using ClosedXML.Excel;
using Import_Export_Manager.Extensions;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Data;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sprache;
using System.Data.Common;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Import_Export_Manager.Services
{
    public class ImportColumnMappingService : IImportColumnMapping
    {
        private readonly ApplicationDbContext _context;

        public ImportColumnMappingService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ImportColumnMappingResponse> GetImportColumnMappings(int importId, int page, int limit, string search, string sortBy, string sortOrder)
        {
            try
            {
                var response = new ImportColumnMappingResponse
                {
                    data = new List<ImportColumnMappingListResponse?>()
                };

                var data = _context.TImportColumnMappings
                    .Where(x => x.ImportId == importId)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(search))
                {
                    data = data.Where(x =>
                        x.ExcelColumnName.Contains(search) ||
                        x.DbColumnName.Contains(search) ||
                        x.DataType.Contains(search));
                }

                string sortByNormalized = sortBy.ToLowerInvariant();
                string sortOrderNormalized = sortOrder.ToLowerInvariant();

                switch (sortByNormalized)
                {
                    case "column_order":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ColumnOrder) : data.OrderBy(x => x.ColumnOrder);
                        break;
                    case "mapping_id":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.MappingId) : data.OrderBy(x => x.MappingId);
                        break;
                    case "excel_column_name":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ExcelColumnName) : data.OrderBy(x => x.ExcelColumnName);
                        break;
                    case "db_column_name":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.DbColumnName) : data.OrderBy(x => x.DbColumnName);
                        break;
                    case "data_type":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.DataType) : data.OrderBy(x => x.DataType);
                        break;
                    case "create_by":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.CreateBy) : data.OrderBy(x => x.CreateBy);
                        break;
                    case "created_date":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.CreatedDate) : data.OrderBy(x => x.CreatedDate);
                        break;
                    case "update_by":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.UpdateBy) : data.OrderBy(x => x.UpdateBy);
                        break;
                    case "update_date":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.UpdateDate) : data.OrderBy(x => x.UpdateDate);
                        break;

                    default:
                        data = data.OrderBy(x => x.MappingId);
                        break;
                }

                response.total = await data.CountAsync();

                var mappings = await data.Skip((page - 1) * limit).Take(limit).ToListAsync();

                foreach (var item in mappings)
                {
                    response.data.Add(new ImportColumnMappingListResponse
                    {
                        mapping_id = item.MappingId,
                        import_id = item.ImportId,
                        excel_column_name = NormalizeMappingColumnText(item.ExcelColumnName),
                        db_column_name = NormalizeMappingColumnText(item.DbColumnName),
                        data_type = item.DataType,
                        allowed_values = item.AllowedValues,
                        datatype_parameter = item.DataTypeParameter,
                        format_pattern = item.FormatPattern,
                        is_required = item.IsRequired,
                        column_order = item.ColumnOrder,
                        create_by = item.CreateBy,
                        create_date = item.CreatedDate,
                        update_date = item.UpdateDate,
                        update_by = item.UpdateBy
                    });
                }

                if (mappings.Count > 0)
                {
                    response.code = "0";
                    response.message = "Success";
                }
                else
                {
                    response.code = "1";
                    response.message = "Data not found";
                }

                return response;
            }
            catch (Exception ex)
            {
                return new ImportColumnMappingResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<ImportColumnMappingResponse> GetImportColumnMappingById(int mappingId)
        {
            try
            {
                var response = new ImportColumnMappingResponse();
                var data = await _context.TImportColumnMappings
                    .FirstOrDefaultAsync(x => x.MappingId == mappingId);

                if (data != null)
                {
                    response.data = new List<ImportColumnMappingListResponse?>
                    {
                        new ImportColumnMappingListResponse
                        {
                            mapping_id = data.MappingId,
                            import_id = data.ImportId,
                            excel_column_name = NormalizeMappingColumnText(data.ExcelColumnName),
                            db_column_name = NormalizeMappingColumnText(data.DbColumnName),
                            data_type = data.DataType,
                            allowed_values = data.AllowedValues,
                            datatype_parameter = data.DataTypeParameter,
                            format_pattern = data.FormatPattern,
                            is_required = data.IsRequired,
                            column_order = data.ColumnOrder,
                            create_by = data.CreateBy,
                            create_date = data.CreatedDate,
                            update_by = data.UpdateBy,
                            update_date = data.UpdateDate
                        }
                    };
                    response.code = "0";
                    response.message = "Success";
                    response.total = 1;
                }
                else
                {
                    response.code = "1";
                    response.message = "Data not found";
                    response.data = null;
                    response.total = 0;
                }

                return response;
            }
            catch (Exception ex)
            {
                return new ImportColumnMappingResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<ImportColumnMappingResponse> CreateImportColumnMapping(ImportColumnMappingRequest request)
        {
            try
            {
                return await _context.InsertImportColumnMapping(request);
            }
            catch (Exception ex)
            {
                return new ImportColumnMappingResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<ImportColumnMappingResponse> UpdateImportColumnMapping(int mappingId, ImportColumnMappingRequest request)
        {
            try
            {
                return await _context.UpdateImportColumnMapping(mappingId, request);
            }
            catch (Exception ex)
            {
                return new ImportColumnMappingResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<ImportColumnMappingResponse> DeleteImportColumnMapping(int mappingId)
        {
            try
            {
                return await _context.DeleteImportColumnMapping(mappingId);
            }
            catch (Exception ex)
            {
                return new ImportColumnMappingResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<List<ImportColumnMappingListResponse>> GetAllImportColumnMappings(int importId)
        {
            return await _context.GetAllImportColumnMappings(importId);
        }

        private static string NormalizeMappingColumnText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value
                .Replace("\r", " ")
                .Replace("\n", " ")
                .Trim();

            while (normalized.Contains("  "))
            {
                normalized = normalized.Replace("  ", " ");
            }

            return normalized;
        }
        public async Task<List<string>> GetAllowedValuesFromQuery(string allowedValuesRaw)
        {
            var result = new List<string>();

            if (string.IsNullOrWhiteSpace(allowedValuesRaw))
                return result;
            if (allowedValuesRaw.Trim().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using (var connection = _context.Database.GetDbConnection())
                    {
                        await connection.OpenAsync();
                        using (var command = connection.CreateCommand())
                        {
                            command.CommandText = allowedValuesRaw;
                            using (var reader = await command.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    var val = reader.GetValue(0)?.ToString();
                                    if (!string.IsNullOrWhiteSpace(val))
                                    {
                                        result.Add(val);
                                    }
                                }
                            }
                        }
                    }
                    return result.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                }
                catch (Exception ex)
                {
                    // แนะนำให้ Log Error ไว้ตรงนี้ แต่ให้ return List เปล่าเพื่อไม่ให้ API พังทั้งหมด
                    // _logger.LogError(ex, "Error executing dynamic allowed values query");
                    return new List<string> { "Error: Load failed" };
                }
            }
            return allowedValuesRaw
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        public async Task<(byte[] FileBytes, string FileName, string ErrorMessage)> GenerateExcelTemplateAsync(int importId, string safeImportName)
        {
            try
            {
                var columnMappings = await GetAllImportColumnMappings(importId);
                if (columnMappings == null || columnMappings.Count == 0)
                {
                    return (null, null, "No column mapping found for this import type");
                }

                var orderedMappings = columnMappings
                    .OrderBy(m => m.column_order)
                    .ThenBy(m => m.mapping_id)
                    .ToList();

                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Template");
                var validationSheet = workbook.Worksheets.Add("_ValidationLists");
                validationSheet.Visibility = XLWorksheetVisibility.VeryHidden;

                var requiredHeaderBackground = XLColor.FromHtml("#D32F2F");

                // ดึง Connection จาก EF Core มาเปิดใช้งานร่วมกันครั้งเดียวในลูป
                var connection = _context.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                try
                {
                    for (int index = 0; index < orderedMappings.Count; index++)
                    {
                        var mapping = orderedMappings[index];
                        var columnNumber = index + 1;

                        // เรียกฟังก์ชันดึงค่า Dropdown (ส่ง connection ไปด้วย)
                        var allowedValues = await GetAllowedValuesFromQuery(mapping.allowed_values, connection);

                        var headerCell = worksheet.Cell(1, columnNumber);
                        headerCell.Value = mapping.excel_column_name;
                        headerCell.Style.Font.Bold = true;
                        headerCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                        headerCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        headerCell.Style.Alignment.WrapText = true;

                        if (mapping.is_required)
                        {
                            headerCell.Style.Fill.BackgroundColor = requiredHeaderBackground;
                            headerCell.Style.Font.FontColor = XLColor.White;
                        }
                        else
                        {
                            headerCell.Style.Fill.BackgroundColor = XLColor.LightGray;
                        }

                        var commentLines = new List<string>();
                        if (allowedValues.Count > 0)
                        {
                            commentLines.Add($"Allowed: {string.Join(", ", allowedValues)}");
                        }
                        if (!string.IsNullOrWhiteSpace(mapping.format_pattern))
                        {
                            commentLines.Add($"FORMAT: {mapping.format_pattern}");
                        }
                        if (!string.IsNullOrWhiteSpace(mapping.datatype_parameter))
                        {
                            commentLines.Add($"MAX: {mapping.datatype_parameter}");
                        }
                        if (commentLines.Count > 0)
                        {
                            headerCell.GetComment().AddText(string.Join("\n", commentLines));
                        }

                        // ใส่ค่าประจำ (Default Value) หรือ Sample Value
                        var sampleCell = worksheet.Cell(2, columnNumber);
                        IReadOnlyList<string> sampleAllowedValues = mapping.is_required
                            ? allowedValues
                            : Array.Empty<string>();
                        sampleCell.Value = GetSampleValueByDataType(
                            mapping.data_type,
                            sampleAllowedValues,
                            mapping.format_pattern,
                            mapping.default_value);

                        // ผูก Dropdown ใน Excel 
                        if (allowedValues.Count > 0)
                        {
                            for (int valueIndex = 0; valueIndex < allowedValues.Count; valueIndex++)
                            {
                                validationSheet.Cell(valueIndex + 1, columnNumber).Value = allowedValues[valueIndex];
                            }

                            // ดึง Column Letter ออกมา (เช่น "A")
                            var colLetter = validationSheet.Cell(1, columnNumber).Address.ColumnLetter;

                            // สร้างสูตรแบบล็อกตำแหน่งตรงๆ: "'_ValidationLists'!$A$1:$A$5"
                            var listFormula = $"'_ValidationLists'!${colLetter}$1:${colLetter}${allowedValues.Count}";

                            // ขยายพื้นที่ผูกสูตรตั้งแต่แถว 2 ถึง 1000
                            var validation = worksheet.Range(2, columnNumber, 1000, columnNumber).CreateDataValidation();
                            validation.IgnoreBlanks = true;
                            validation.InCellDropdown = true;
                            validation.List(listFormula, true);
                        }
                    }
                }
                finally
                {
                    // ปิด Connection เมื่อพ่นลูปทำ Excel เสร็จเรียบร้อย
                    if (connection.State == System.Data.ConnectionState.Open)
                    {
                        await connection.CloseAsync();
                    }
                }

                worksheet.Row(1).Height = 24;
                worksheet.Row(1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                worksheet.SheetView.FreezeRows(1);
                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);

                // ปั้นชื่อไฟล์ลอจิกเดิมของคุณ
                var sanitizedName = safeImportName.Replace(" ", "_").Replace("  ", "_").Replace("-", "_");
                var fileName = $"{sanitizedName}_{DateTime.Now:yyyyMMdd}.xlsx";
                var asciiFileName = Regex.Replace(fileName, @"[^\x20-\x7E]", "_");

                return (stream.ToArray(), asciiFileName, null);
            }
            catch (Exception ex)
            {
                return (null, null, ex.Message);
            }
        }

        public async Task<List<string>> GetAllowedValuesFromQuery(string allowedValuesRaw, DbConnection connection)
        {
            var result = new List<string>();
            if (string.IsNullOrWhiteSpace(allowedValuesRaw)) return result;

            if (allowedValuesRaw.Trim().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = allowedValuesRaw;
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var val = reader.GetValue(0)?.ToString();
                                if (!string.IsNullOrWhiteSpace(val)) result.Add(val);
                            }
                        }
                    }
                    return result.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                }
                catch
                {
                    return new List<string> { "Error: Load failed" };
                }
            }

            return allowedValuesRaw
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        private static string GetSampleValueByDataType(string? dataType, IReadOnlyList<string>? allowedValues = null, string? formatPattern = null, string? defaultValue = null, string? currentUserId = null)
        {
            // 1. ถ้ามีการตั้งค่า Default Value มาจากระบบ
            if (!string.IsNullOrWhiteSpace(defaultValue))
            {
                var cleanedDefault = defaultValue.Trim().ToUpperInvariant();

                if (cleanedDefault == "{TODAY}")
                {
                    // เรียกฟังก์ชันเสริมตัวใหม่เพื่อแปลงวันที่ปัจจุบันตามฟอร์แมตที่ต้องการ
                    return GetFormattedToday(formatPattern, "dd/MM/yyyy");
                }

                return defaultValue;
            }

            // 2. ถ้าคอลัมน์นี้เป็น Dropdown ให้ดึงค่าตัวแรกขึ้นมาแสดง
            if (allowedValues != null && allowedValues.Count > 0) return allowedValues[0];

            // 3. ปล่อยช่องว่างสะอาดๆ (เช่น เคส control_exp เป็น None)
            return string.Empty;
        }
        private static string GetFormattedToday(string? formatPattern, string fallbackFormat)
        {
            var normalizedPattern = formatPattern?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedPattern))
                return DateTime.Today.ToString(fallbackFormat, CultureInfo.InvariantCulture);

            // ทำการตัดแบ่งเผื่อว่าตั้งค่าฟอร์แมตในระบบมาหลายแบบ (เหมือนลอจิกเดิมของคุณ)
            var primaryPattern = normalizedPattern.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
            if (string.IsNullOrWhiteSpace(primaryPattern))
                return DateTime.Today.ToString(fallbackFormat, CultureInfo.InvariantCulture);

            try
            {
                return DateTime.Today.ToString(primaryPattern, CultureInfo.InvariantCulture);
            }
            catch
            {
                return DateTime.Today.ToString(fallbackFormat, CultureInfo.InvariantCulture);
            }
        }
    }
}
