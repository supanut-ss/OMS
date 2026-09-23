using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;

namespace Import_Export_Manager.Interfaces
{
    public interface IImportColumnMapping
    {
        Task<ImportColumnMappingResponse> GetImportColumnMappings(int importId, int page, int limit, string search, string sortBy, string sortOrder);
        Task<ImportColumnMappingResponse> GetImportColumnMappingById(int mappingId);
        Task<ImportColumnMappingResponse> CreateImportColumnMapping(ImportColumnMappingRequest request);
        Task<ImportColumnMappingResponse> UpdateImportColumnMapping(int mappingId, ImportColumnMappingRequest request);
        Task<ImportColumnMappingResponse> DeleteImportColumnMapping(int mappingId);
        Task<List<ImportColumnMappingListResponse>> GetAllImportColumnMappings(int importId);
        Task<(byte[] FileBytes, string FileName, string ErrorMessage)> GenerateExcelTemplateAsync(int importId, string safeImportName);
    }
}