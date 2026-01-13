using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Notification.Models;
using Notification.Services;

namespace Notification.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class NotifyController : ControllerBase
    {
        private readonly NotificationService _service;
        private readonly ILogger<NotifyController> _logger;

        public NotifyController(NotificationService service, ILogger<NotifyController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpPost("all")]
        public async Task<IActionResult> SendAll([FromBody] NotifyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Message))
                return BadRequest();

            _logger.LogInformation("SendAll called by user={User} message={Message}", User?.Identity?.Name ?? User?.FindFirst("UserId")?.Value ?? "(unknown)", request.Message);
            request.UserId = string.IsNullOrEmpty(User?.FindFirst("UserId")?.Value) ? User.FindFirst("UserId")!.Value : "anonymous";
            await _service.NotifyAll(request);
            return Accepted();
        }

        [HttpPost("user/{userId}")]
        public async Task<IActionResult> SendUser(string userId, [FromBody] NotifyRequest request)
        {
            _logger.LogInformation("SendUser called by user={User} for user={TargetUser} message={Message}", User?.Identity?.Name ?? User?.FindFirst("UserId")?.Value ?? "(unknown)", userId, request);
            await _service.NotifyUser(userId, request);
            return Ok();
        }
    }
}
