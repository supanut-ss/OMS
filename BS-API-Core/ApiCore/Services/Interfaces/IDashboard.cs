using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IDashboard
    {
        Task<DashboardResponse> GetDashboard(string userId);
    }
}
