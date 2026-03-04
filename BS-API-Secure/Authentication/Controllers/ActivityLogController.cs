using Authentication.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers
{
    [Route("api/activity-log")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ActivityLogController : ControllerBase
    {
        private readonly IActivityLog _activityLogService;
        public ActivityLogController(IActivityLog activityLogService)
        {
            _activityLogService = activityLogService ?? throw new ArgumentNullException(nameof(activityLogService));
        }
        [HttpPost]
        public async Task<IActionResult> LogActivity([FromBody] Models.Requests.ActivityLogRequest request)
        {
            var username = User.FindFirst("UserId")?.Value ?? "";
            await _activityLogService.LogActivityAsync(request, username);
            return Ok(new { message_code = "0", message_text = "Activity logged successfully" });
        }
     }
}
