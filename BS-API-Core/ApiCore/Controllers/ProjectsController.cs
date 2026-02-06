using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Implementation;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Sprache;
using System.Data;

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
        [HttpGet("incentive")]
        public async Task<IActionResult> GetProjectIncentive(
    [FromQuery] string? project_header_id,
    string year
)
        {
            var flatData = await projectsService
                .GetProjectIncentiveByIdAsync(project_header_id, year);

            if (flatData == null || flatData.Count == 0)
            {
                return Ok(new ApiResponse<List<ProjectIncentiveProjectResponse>>
                {
                    message_code = 1,
                    message_text = "Project incentive not found",
                    data = new List<ProjectIncentiveProjectResponse>()
                });
            }

            var groupedData = flatData
                .GroupBy(p => new
                {
                    p.project_header_id,
                    p.project_no,
                    p.project_name,
                    p.plan_project_start,
                    p.plan_project_end,
                    p.project_value,
                    p.collected_amount,
                    p.incentive_year
                })
                .Select(projectGroup =>
                {
                    /* =========================
                       1) รวม incentive ต่อคน
                       ========================= */
                    var memberTotals = projectGroup
                        .GroupBy(m => new
                        {
                            m.user_id,
                            m.first_name,
                            m.last_name
                        })
                        .Select(g => new
                        {
                            g.Key.user_id,
                            incentive_total =
                                g.Sum(x =>
                                    (x.incentive_by_manday ?? 0)
                                  + (x.incentive_by_actual_work ?? 0)
                                )
                        })
                        .OrderByDescending(x => x.incentive_total)
                        .ToList();

                    /* =========================
                       2) ทำ Dense Rank
                       ========================= */
                    var rankMap = memberTotals
                        .Select((x, index) => new
                        {
                            x.user_id,
                            Rank = memberTotals
                                .Take(index + 1)
                                .Select(t => t.incentive_total)
                                .Distinct()
                                .Count()
                        })
                        .ToDictionary(x => x.user_id, x => x.Rank);

                    /* =========================
                       3) Build Response
                       ========================= */
                    return new ProjectIncentiveProjectResponse
                    {
                        project_header_id = projectGroup.Key.project_header_id,
                        project_no = projectGroup.Key.project_no,
                        project_name = projectGroup.Key.project_name,
                        project_value = projectGroup.Key.project_value,
                        collected_amount = projectGroup.Key.collected_amount,
                        plan_project_start = projectGroup.Key.plan_project_start,
                        plan_project_end = projectGroup.Key.plan_project_end,
                        incentive_year = projectGroup.Key.incentive_year,

                        roles = projectGroup
                            .GroupBy(r => new
                            {
                                r.role,
                                r.role_percentage
                            })
                            .Select(roleGroup => new ProjectIncentiveRoleResponse
                            {
                                role = roleGroup.Key.role,
                                role_percentage = roleGroup.Key.role_percentage,

                                member = roleGroup.Select(m => new ProjectIncentiveMemberResponse
                                {
                                    user_id = m.user_id,
                                    first_name = m.first_name,
                                    last_name = m.last_name,

                                    assign_manday = m.assign_manday,
                                    actual_work_hour = m.actual_work_hour,
                                    total_project_manday = m.total_project_manday,
                                    total_actual_work = m.total_actual_work,

                                    incentive_by_manday = m.incentive_by_manday,
                                    incentive_by_actual_work = m.incentive_by_actual_work,

                                    incentive_total =
                                        (m.incentive_by_manday ?? 0)
                                      + (m.incentive_by_actual_work ?? 0),

                                    rank = rankMap[m.user_id]
                                }).ToList()
                            })
                            .ToList()
                    };
                })
                .ToList();

            return Ok(new ApiResponse<List<ProjectIncentiveProjectResponse>>
            {
                message_code = 0,
                message_text = "success",
                data = groupedData
            });
        }
        [HttpGet("performance")]
        public async Task<IActionResult> GetProjectPerformanceReport([FromQuery] int year, [FromQuery] int? month)
        {
            int monthValue = month ?? 0;
            if (monthValue < 0 || monthValue > 12)
            {
                return BadRequest(new
                {
                    message = "month must be between 0 and 12 (0 = yearly)"
                });
            }
            try
            {
                var result = await projectsService.GetMonthlyPerformanceInvoicesAsync(year, monthValue);
                var groupedData = result
                    .GroupBy(x => new
                    {
                        x.project_header_id,
                        x.project_no,
                        x.project_name,
                        x.total_invoice
                    })
                    .Select(g => new PerformanceProjectDto
                    {
                      
                            project_header_id = g.Key.project_header_id,
                            project_no = g.Key.project_no,
                            project_name = g.Key.project_name,
                            total_invoice = g.Key.total_invoice,
                            roles = g.Select(r => new PerformanceRoleDto
                            {
                                role = r.role,
                                role_percentage = r.role_percentage,
                                incentive_amount = r.incentive_amount
                            }).ToList()
                        
                    })
                    .ToList();
                var response = new ApiResponse<List<PerformanceProjectDto>>
                {
                    message_code = 0,
                    message_text = "success",
                    data = groupedData
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
         }
        }
    }
