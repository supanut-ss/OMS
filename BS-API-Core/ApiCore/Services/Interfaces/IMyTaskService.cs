using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IMyTaskService
    {
        /// <summary>
        /// Get My Tasks with pagination and filtering
        /// </summary>
        Task<MyTaskPaginatedResult> GetMyTasksAsync(MyTaskRequest request, string userId);

        /// <summary>
        /// Get Task Tracking records for a task
        /// </summary>
        Task<TaskTrackingPaginatedResult> GetTaskTrackingAsync(TaskTrackingRequest request);

        /// <summary>
        /// Insert new Task Tracking record
        /// </summary>
        Task<TaskTrackingResponse?> InsertTaskTrackingAsync(InsertTaskTrackingRequest request, string userId);

        /// <summary>
        /// Update existing Task Tracking record
        /// </summary>
        Task<TaskTrackingResponse?> UpdateTaskTrackingAsync(InsertTaskTrackingRequest request, string userId);

        /// <summary>
        /// Delete Task Tracking record
        /// </summary>
        Task<TaskTrackingDeleteResponse> DeleteTaskTrackingAsync(int projectTaskTrackingId);
    }
}
