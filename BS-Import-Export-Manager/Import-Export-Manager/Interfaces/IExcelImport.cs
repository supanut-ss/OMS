using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;

namespace Import_Export_Manager.Interfaces
{
    public interface IExcelImport
    {
        Task<ExcelImportResponse> ExcelImportXMLData(ExcelImportRequest request);
    }
}
