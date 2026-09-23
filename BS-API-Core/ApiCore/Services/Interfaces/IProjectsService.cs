using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IProjectsService
    {
        Task<ProjectsResponse> GetProjectsByIdAsync(int projectId);
        Task<List<ProjectTaskPhaseResponse>> GetProjectTaskPhasesByIdAsync(int projectId);
        Task<ProjectsResponse> InsertProjecHeaderAsync(InsertProjectHeader project, string userId);
        Task<ProjectsTaskResponse> InsertProjectTaskAsync(InsertProjectTaskRequest request, string userId);
        Task<ProjectsTaskResponse> GetProjectsTaskByIdAsync(int projectTaskId);
        Task<ProjectTaskDeleteResponse> DeleteProjectsTaskByIdAsync(int projectTaskId);
        Task<ProjectAssignTaskMemberResponse> InsertOrUpdateProjectTaskMemberAsync(AssignProjectTaskToTeamRequest req, string userId);
        Task<ProjectAssignTaskMemberResponse> DeleteAssignTaskMemberAsync(int assignTaskMemberId);
        Task<ProjectTeamResponse> InsertOrUpdateProjectTeam(ProjectTeamRequest project, string userId);
        Task<ProjectTeamResponse> DeleteProjectTeam(int projectTeamId);
        Task<List<ProjectIncentiveResponse>> GetProjectIncentiveByIdAsync(string projectId, string year);
        Task<List<MonthlyPerformanceInvoiceDto>> GetMonthlyPerformanceInvoicesAsync(int year, int month);
    }
}
