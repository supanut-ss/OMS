using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IMyTaskService
    {
        Task<MyTaskPaginatedResult> GetMyTasksAsync(MyTaskRequest request, string userId);
        Task<TaskTrackingPaginatedResult> GetTaskTrackingAsync(TaskTrackingRequest request);
        Task<TaskTrackingResponse?> InsertTaskTrackingAsync(InsertTaskTrackingRequest request, string userId);
        Task<TaskTrackingResponse?> UpdateTaskTrackingAsync(InsertTaskTrackingRequest request, string userId);
        Task<TaskTrackingDeleteResponse> DeleteTaskTrackingAsync(int projectTaskTrackingId);
    }
}
