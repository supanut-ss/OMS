using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Sprache;

namespace ApiCore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ProjectsController : ControllerResponse
    {
        IProjectsService projectsService;
        public ProjectsController(IProjectsService _projectsService)
        {
            projectsService = _projectsService;
        }
        [HttpGet("{projectId}")]
        public async Task<IActionResult> GetProjectById(int projectId)
        {
            try
            {
                var project = await projectsService.GetProjectsByIdAsync(projectId);
                if (project != null && project?.project_header_id > 0)
                {
                    return AccessResponseDataSuccess("success", project, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Project  not found " + projectId, 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpGet("task/phases/{projectId}")]
        public async Task<IActionResult> GetProjectTaskPhasesById(int projectId)
        {
            try
            {
                var phases = await projectsService.GetProjectTaskPhasesByIdAsync(projectId);

                if (phases != null)
                {
                    return AccessResponseDataSuccess("success", phases, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Project phases not found " + projectId, 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpGet("task/{projectTaskId}")]
        public async Task<IActionResult> GetProjectTaskById(int projectTaskId)
        {
            try
            {
                var result = await projectsService.GetProjectsTaskByIdAsync(projectTaskId);
                if (result != null && result?.project_task_id > 0)
                {
                    return AccessResponseDataSuccess("success", result, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Project task not found " + projectTaskId, 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("task/delete/{projectTaskId}")]
        public async Task<IActionResult> DeleteProjectTaskByIdAsync(int projectTaskId)
        {
            try
            {
                var result = await projectsService.DeleteProjectsTaskByIdAsync(projectTaskId);
                if (result.message_code == "0")
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Delete project task failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("task")]
        public async Task<IActionResult> InsertProjectTaskPhasesAsync([FromBody] InsertProjectTaskRequest projectTaskPhase)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                var result = await projectsService.InsertProjectTaskAsync(projectTaskPhase, userId);
                if (result != null && result.project_task_id > 0)
                {
                    return AccessResponseDataSuccess("success", result, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Insert/Update project task phase failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost]
        public async Task<IActionResult> InsertProjecHeaderAsync([FromBody] InsertProjectHeader project)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                var result = await projectsService.InsertProjecHeaderAsync(project, userId);
                if (result != null && result.project_header_id > 0)
                {
                    return AccessResponseDataSuccess("success", result, 0);
                }
                else
                {
                    return ResponseSuccess("failed", "Insert/Update project failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("task/assign_team")]
        public async Task<IActionResult> AssignProjectTaskToTeamAsync([FromBody] AssignProjectTaskToTeamRequest assignProjectTaskToTeam)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                var result = await projectsService.InsertOrUpdateProjectTaskMemberAsync(assignProjectTaskToTeam, userId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Assign project task to team failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("task/assign_team/delete/{projectTaskMemberId}")]
        public async Task<IActionResult> DeleteAssignTaskMemberAsync(int projectTaskMemberId)
        {
            try
            {
                var result = await projectsService.DeleteAssignTaskMemberAsync(projectTaskMemberId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Delete assigned task member failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("team")]
        public async Task<IActionResult> InsertOrUpdateProjectTeam([FromBody] ProjectTeamRequest projectTeamRequest)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value ?? "";
                var result = await projectsService.InsertOrUpdateProjectTeam(projectTeamRequest, userId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Insert/Update project team failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
        [HttpPost("team/delete/{projectMemberId}")]
        public async Task<IActionResult> DeleteProjectTeam(int projectMemberId)
        {
            try
            {
                var result = await projectsService.DeleteProjectTeam(projectMemberId);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return ResponseSuccess("failed", "Delete project team failed", 1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
