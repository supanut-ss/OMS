using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IConnectorService
    {
        Task<IReadOnlyList<ConnectorResponse>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<ConnectorResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<ConnectorResponse> SaveAsync(
            SaveConnectorRequest request,
            string updateBy,
            CancellationToken cancellationToken = default);
        Task<ConnectorResponse> SetActiveAsync(
            SetConnectorActiveRequest request,
            string updateBy,
            CancellationToken cancellationToken = default);
        Task<ConnectorResponse> SetReauthorizationAsync(
            SetConnectorReauthorizationRequest request,
            string updateBy,
            CancellationToken cancellationToken = default);
    }
}
