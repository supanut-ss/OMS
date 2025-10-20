using Import_Export_Manager.Extensions;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;

namespace Import_Export_Manager.Services
{
    public class ExcelImportService : IExcelImport
    {
        private readonly ApplicationDbContext _context;
        public ExcelImportService(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<ExcelImportResponse> ExcelImportXMLData(ExcelImportRequest request)
        {
            try
            {
                return await _context.ExcelImportXMLData(request);
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null
                };
            }
        }
    }
}
