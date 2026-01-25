using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class MyTaskController : ControllerResponse
    {
        private readonly IMyTaskService _myTaskService;
        private readonly IDashboard _dashboardService;

        public MyTaskController(IMyTaskService myTaskService, IDashboard dashboard)
        {
            _myTaskService = myTaskService;
            _dashboardService = dashboard;
        }

        /// <summary>
        /// Get My Tasks with pagination and filtering by status
        /// POST /api/mytask
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> GetMyTasks([FromBody] MyTaskRequest request)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseSuccess("failed", "User not authenticated", 1);
                }

                var result = await _myTaskService.GetMyTasksAsync(request, userId);

                return AccessResponseDataSuccess("success", result, 0);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        /// <summary>
        /// Get Task Tracking records for a specific task
        /// POST /api/mytask/tracking
        /// </summary>
        [HttpPost("tracking")]
        public async Task<IActionResult> GetTaskTracking([FromBody] TaskTrackingRequest request)
        {
            try
            {
                if (request.ProjectTaskId <= 0)
                {
                    return ResponseSuccess("failed", "ProjectTaskId is required", 1);
                }

                var result = await _myTaskService.GetTaskTrackingAsync(request);

                return AccessResponseDataSuccess("success", result, 0);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        /// <summary>
        /// Insert new Task Tracking record
        /// POST /api/mytask/tracking/save
        /// </summary>
        [HttpPost("tracking/save")]
        public async Task<IActionResult> SaveTaskTracking([FromBody] InsertTaskTrackingRequest request)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseSuccess("failed", "User not authenticated", 1);
                }

                // Validation
                if (request.ProjectTaskId <= 0)
                {
                    return ResponseSuccess("failed", "ProjectTaskId is required", 1);
                }

                if (string.IsNullOrWhiteSpace(request.IssueType))
                {
                    return ResponseSuccess("failed", "Issue Type is required", 1);
                }

                if (request.ActualWork <= 0)
                {
                    return ResponseSuccess("failed", "Actual Work must be greater than 0", 1);
                }

                if (string.IsNullOrWhiteSpace(request.ProcessUpdate))
                {
                    return ResponseSuccess("failed", "Process Update is required", 1);
                }

                TaskTrackingResponse? result;

                // Determine Insert or Update based on ProjectTaskTrackingId
                if (request.ProjectTaskTrackingId.HasValue && request.ProjectTaskTrackingId.Value > 0)
                {
                    // Update existing
                    result = await _myTaskService.UpdateTaskTrackingAsync(request, userId);
                }
                else
                {
                    // Insert new
                    result = await _myTaskService.InsertTaskTrackingAsync(request, userId);
                }

                if (result != null && result.project_task_tracking_id > 0)
                {
                    return AccessResponseDataSuccess("success", result, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Save task tracking failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        /// <summary>
        /// Delete Task Tracking record
        /// POST /api/mytask/tracking/delete/{projectTaskTrackingId}
        /// </summary>
        [HttpPost("tracking/delete/{projectTaskTrackingId}")]
        public async Task<IActionResult> DeleteTaskTracking(int projectTaskTrackingId)
        {
            try
            {
                if (projectTaskTrackingId <= 0)
                {
                    return ResponseSuccess("failed", "ProjectTaskTrackingId is required", 1);
                }

                var result = await _myTaskService.DeleteTaskTrackingAsync(projectTaskTrackingId);

                if (result.message_code == "0")
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", result.message_text, 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        /// <summary>
        /// Get Task Detail by ID (reuse from ProjectsController)
        /// GET /api/mytask/task/{projectTaskId}
        /// </summary>
        [HttpGet("task/{projectTaskId}")]
        public async Task<IActionResult> GetTaskById(int projectTaskId, [FromServices] IProjectsService projectsService)
        {
            try
            {
                var result = await projectsService.GetProjectsTaskByIdAsync(projectTaskId);

                if (result != null && result.project_task_id > 0)
                {
                    return AccessResponseDataSuccess("success", result, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Task not found " + projectTaskId, 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpGet("dashboard/stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseSuccess("failed", "User not authenticated", 1);
                }
                var res = await _dashboardService.GetDashboard(userId);
                return AccessResponseDataSuccess("success", res, 0);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
