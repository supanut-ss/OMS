using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IGanttService
    {
        Task<List<ProjectTimelineResponse>> GetProjectTimelineAsync(
            DateTime startDate,
            DateTime endDate,
            int? projectHeaderId,
            string xmlUserIds);
    }
}
