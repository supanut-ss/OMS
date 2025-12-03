using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IProjectsService
    {
        Task<ProjectsResponse> GetProjectsByIdAsync(int projectId);
    }
}
