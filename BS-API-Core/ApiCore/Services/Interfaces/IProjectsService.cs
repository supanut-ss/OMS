using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IProjectsService
    {
        Task<ProjectTeamResponse> DeleteProjectTeam(int projectTeamId);
        Task<ProjectTeamResponse> InsertOrUpdateProjectTeam(ProjectTeamRequest project, string userId);
        Task<ProjectAssignTaskMemberResponse> DeleteAssignTaskMemberAsync(int assignTaskMemberId);
        Task<ProjectAssignTaskMemberResponse> InsertOrUpdateProjectTaskMemberAsync(AssignProjectTaskToTeamRequest assignTaskMemberRequest, string userId);
        Task<ProjectTaskDeleteResponse> DeleteProjectsTaskByIdAsync(int projectTaskId);
        Task<ProjectsTaskResponse> GetProjectsTaskByIdAsync(int projectTaskId);
        Task<ProjectsTaskResponse> InsertProjectTaskAsync(InsertProjectTaskRequest projectTask, string userId);
        Task<ProjectsResponse> InsertProjecHeaderAsync(InsertProjectHeader project, string userId);
        Task<List<ProjectTaskPhaseResponse>> GetProjectTaskPhasesByIdAsync(int projectId);
        Task<ProjectsResponse> GetProjectsByIdAsync(int projectId);
        Task<List<ProjectIncentiveResponse>> GetProjectIncentiveByIdAsync(string? projectId, string year);
        Task<List<MonthlyPerformanceInvoiceDto>> GetMonthlyPerformanceInvoicesAsync(int year, int month);
    }
}
