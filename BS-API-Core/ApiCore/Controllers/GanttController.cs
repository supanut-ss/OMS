using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers
{
    /// <summary>
    /// Controller for Gantt chart related operations
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class GanttController : ControllerBase
    {
        private readonly IGanttService _ganttService;
        private readonly ILogger<GanttController> _logger;

        public GanttController(IGanttService ganttService, ILogger<GanttController> logger)
        {
            _ganttService = ganttService;
            _logger = logger;
        }

        /// <summary>
        /// Get project timeline data for Gantt chart
        /// </summary>
        /// <param name="request">Timeline request with date range and filters</param>
        /// <returns>List of project timeline records</returns>
        [HttpPost("timeline")]
        [ProducesResponseType(typeof(List<ProjectTimelineResponse>), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetProjectTimelineAsync([FromBody] ProjectTimelineRequest request)
        {
            try
            {
                _logger.LogInformation("🔵 Fetching Gantt timeline: {StartDate} to {EndDate}, ProjectId: {ProjectId}",
                    request.StartDate, request.EndDate, request.ProjectHeaderId);

                var result = await _ganttService.GetProjectTimelineAsync(
                    request.StartDate,
                    request.EndDate,
                    request.ProjectHeaderId,
                    request.XmlUserIds ?? "");

                _logger.LogInformation("✅ Gantt timeline fetched: {RowCount} records", result.Count);

                return Ok(new
                {
                    success = true,
                    message = "Timeline data retrieved successfully",
                    rowCount = result.Count,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching Gantt timeline");
                return BadRequest(new
                {
                    success = false,
                    message = $"Error retrieving timeline data: {ex.Message}"
                });
            }
        }
    }
}
