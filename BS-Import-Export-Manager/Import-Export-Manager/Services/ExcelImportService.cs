using Import_Export_Manager.Extensions;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using System.Data;
using ExcelDataReader;
using Microsoft.EntityFrameworkCore;

namespace Import_Export_Manager.Services
{
    public class ExcelImportService : IExcelImport
    {
        private readonly ApplicationDbContext _context;
        public ExcelImportService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ExcelImportResponse> ExcelImportBulkData(ExcelImportRequest request)
        {
            try
            {
                if (request.files == null || request.files.Count == 0 || request.files[0] == null)
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "No file provided for import.",
                        total = 0
                    };
                }

                DataTable excelData;
                using (var stream = request.files[0].OpenReadStream())
                {
                    excelData = ConvertExcelToDataTable(stream);
                }

                return await _context.ExcelImportBulkData(request, excelData);
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse
                {
                    code = "1",
                    message = ex.Message,
                    total = 0
                };
            }
        }

        public async Task<ImportUploadHistoryResponse> GetUploadHistory(int importId, int limit = 500)
        {
            var safeLimit = Math.Clamp(limit, 1, 1000);
            var query = _context.TImportUploadHistories
                .AsNoTracking()
                .Where(x => x.ImportId == importId);

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(x => x.ImportDate)
                .ThenByDescending(x => x.ImportHistoryId)
                .Take(safeLimit)
                .Select(x => new ImportUploadHistoryItemResponse
                {
                    import_history_id = x.ImportHistoryId,
                    import_id = x.ImportId,
                    import_date = x.ImportDate,
                    file_name = x.FileName,
                    total_rows = x.TotalRows,
                    success = x.SuccessRows,
                    failed = x.FailedRows,
                    imported_by = x.ImportedBy,
                    status = x.Status
                })
                .ToListAsync();

            return new ImportUploadHistoryResponse
            {
                data = data,
                total = total
            };
        }

        private DataTable ConvertExcelToDataTable(Stream excelStream)
        {
            excelStream.Position = 0;
            System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

            using (var reader = ExcelReaderFactory.CreateReader(excelStream))
            {
                var config = new ExcelDataSetConfiguration
                {
                    ConfigureDataTable = _ => new ExcelDataTableConfiguration
                    {
                        UseHeaderRow = true
                    }
                };

                var dataSet = reader.AsDataSet(config);

                if (dataSet.Tables.Count == 0)
                {
                    throw new Exception("No worksheet found in the Excel file.");
                }

                DataTable dt = dataSet.Tables[0];

                // --- ส่วนที่เพิ่มเข้ามา: ลบ Row ที่ว่างทั้งหมดออก ---
                for (int i = dt.Rows.Count - 1; i >= 0; i--)
                {
                    DataRow row = dt.Rows[i];

                    // เช็คว่าทุกคอลัมน์ใน Row นั้นเป็นค่าว่าง (null, DBNull หรือ String ว่าง) หรือไม่
                    bool isEmptyRow = true;
                    foreach (var item in row.ItemArray)
                    {
                        if (item != null && item != DBNull.Value && !string.IsNullOrWhiteSpace(item.ToString()))
                        {
                            isEmptyRow = false;
                            break; // ถ้าเจอแม้แต่คอลัมน์เดียวที่มีข้อมูล แปลว่าไม่ใช่ Row ว่าง
                        }
                    }

                    // ถ้าเป็น Row ว่างจริง ให้ลบออก
                    if (isEmptyRow)
                    {
                        dt.Rows.RemoveAt(i);
                    }
                }
                // ---------------------------------------------

                return dt;
            }
        }
    }
}
