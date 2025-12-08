using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IProjectsService
    {
        Task<ProjectTaskResponse> InsertProjectTaskAsync(InsertProjectTaskRequest projectTask, string userId);
        Task<ProjectsResponse> InsertProjecHeaderAsync(InsertProjectHeader project, string userId);
        Task<List<ProjectTaskPhaseResponse>> GetProjectTaskPhasesByIdAsync(int projectId);
        Task<ProjectsResponse> GetProjectsByIdAsync(int projectId);
    }
}
