using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;

namespace Import_Export_Manager.Interfaces
{
    public interface IImportMaster
    {
        Task<ImportMasterResponse> GetImportMasters(int page, int limit, string search, string sortBy, string sortOrder);
        Task<ImportMasterResponse> GetImportMasterById(int import_id);
        Task<ImportMasterResponse> CreateImportMaster(ImportMasterRequest request);
        Task<ImportMasterResponse> UpdateImportMaster(int import_id, ImportMasterRequest request);
        Task<ImportMasterResponse> DeleteImportMaster(int import_id);
    }
}
