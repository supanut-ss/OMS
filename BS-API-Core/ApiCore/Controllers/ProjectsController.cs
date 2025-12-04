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
                    return AccessResponseDataSuccess("success", project,0);
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
                    return ResponseSuccess("failed", "Project phases not found " + projectId,1);
                }
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
