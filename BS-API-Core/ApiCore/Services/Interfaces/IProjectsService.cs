using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IProjectsService
    {
        Task<List<ProjectTaskPhaseResponse>> GetProjectTaskPhasesByIdAsync(int projectId);
        Task<ProjectsResponse> GetProjectsByIdAsync(int projectId);
    }
}
