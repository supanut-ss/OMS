using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface ICount
    {
        Task<CountResponse> InsertCountPlanAsync(CountMasterRequest request);

        Task<DeleteCountResponse> DeleteCountPlanAsync(DeleteCountRequest request);

        Task<CountCycleResponse> GetCountCycleCountDataAsync(CountCycleRequest request);
    }
}
