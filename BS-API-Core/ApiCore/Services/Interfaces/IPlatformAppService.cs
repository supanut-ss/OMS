using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IPlatformAppService
    {
        Task<IReadOnlyList<PlatformAppResponse>> GetAllAsync(
            string? platform,
            CancellationToken cancellationToken = default);

        Task<PlatformAppResponse?> GetByIdAsync(
            long id,
            CancellationToken cancellationToken = default);

        Task<PlatformAppResponse> SaveAsync(
            SavePlatformAppRequest request,
            string updateBy,
            CancellationToken cancellationToken = default);

        Task DeleteAsync(long id, CancellationToken cancellationToken = default);
    }
}
