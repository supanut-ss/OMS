using ApiCore.Models.Base;

namespace ApiCore.Services.Interfaces
{
    /// <summary>
    /// Base service interface providing common CRUD operations
    /// </summary>
    /// <typeparam name="TEntity">Entity type</typeparam>
    /// <typeparam name="TResponse">Response model type</typeparam>
    /// <typeparam name="TCreateRequest">Create request type</typeparam>
    /// <typeparam name="TUpdateRequest">Update request type</typeparam>
    /// <typeparam name="TSummaryResponse">Summary response type</typeparam>
    /// <typeparam name="TDataGridRequest">DataGrid request type</typeparam>
    public interface IBaseService<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest>
        where TEntity : BaseEntity
        where TResponse : BaseResponse
        where TCreateRequest : BaseRequest
        where TUpdateRequest : BaseUpdateRequest
        where TDataGridRequest : DataGridRequest
    {
        Task<List<TResponse>> GetAllAsync();
        Task<List<TSummaryResponse>> GetSummaryAsync();
        Task<TResponse?> GetByIdAsync(string id);
        Task<TResponse> CreateAsync(TCreateRequest request);
        Task<TResponse> UpdateAsync(TUpdateRequest request);
        Task<bool> DeleteAsync(string id);
        Task<DataGridResponse<TResponse>> GetDataGridAsync(TDataGridRequest request);
        Task<bool> ExistsAsync(string identifier);
    }
}
