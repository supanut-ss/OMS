using Azure.Core;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Notification.Attribute;
using Notification.Interfaces;
using Notification.Models;
using Notification.Models.Requests;
using Notification.Services;

namespace Notification.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotifyController : ControllerBase
    {
        private readonly NotificationService _service;
        private readonly ILogger<NotifyController> _logger;

        public NotifyController(NotificationService service, ILogger<NotifyController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Get([FromQuery] int limit = 20)
        {
            var userId = User?.FindFirst("UserId")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }
            var res = await _service.GetNotifyListAsync(userId, limit);

            if (res.message_code != 0)
            {
                _logger.LogError("Get notifications failed for user={UserId} status={Status} message={Message}", userId, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }
        // Other endpoints (MarkNotifyAsRead, DeleteNotification, SaveNotificationToDatabase) would go here

        [HttpPost("read/{notifyId}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> MarkNotifyAsRead(int notifyId)
        {
            var userId = User?.FindFirst("UserId")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var res = await _service.MarkNotifyAsRead(userId, notifyId);
            if (res.message_code != 0)
            {
                _logger.LogError("MarkNotifyAsRead failed for user={UserId} notifyId={NotifyId} status={Status} message={Message}", userId, notifyId, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }

        [HttpPost("delete/{notifyId}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> DeleteNotification(int notifyId)
        {
            var userId = User?.FindFirst("UserId")?.Value ?? "";
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var res = await _service.DeleteNotification(userId, notifyId);
            if (res.message_code != 0)
            {
                _logger.LogError("DeleteNotification failed for user={UserId} notifyId={NotifyId} status={Status} message={Message}", userId, notifyId, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }

        [HttpPost("user/{userId}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> SaveNotificationToDatabase(string userId, [FromBody] NotifyRequest request)
        {
            var fromUser = User?.FindFirst("UserId")?.Value ?? "";
            if (string.IsNullOrEmpty(fromUser) || string.IsNullOrEmpty(request?.Message))
                return BadRequest();

            var res = await _service.SaveNotificationToDatabase(fromUser, userId, request);
            if (res.message_code != 0)
            {
                _logger.LogError("SaveNotificationToDatabase failed for fromUser={FromUser} toUser={ToUser} status={Status} message={Message}", fromUser, request.UserId, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }
        [HttpPost("all")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> SendAll([FromBody] NotifyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Message))
                return BadRequest();

            var fromUser = User?.FindFirst("UserId")?.Value ?? "anonymous";

            _logger.LogInformation(
                "SendAll called by user={User} message={Message}",
                fromUser,
                request.Message
            );

            var res = await _service
                .SaveAndNotifyAll(fromUser, request);

            if (res.message_code != 0)
            {
                _logger.LogError(
                    "NotifyAll failed for user={User} status={Status} message={Message}",
                    fromUser,
                    res.message_code,
                    res.message_text
                );
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }

            return Ok(res);
        }

        [HttpPost("push")]
        [WorkerAuthorize]
        public async Task<IActionResult> Push([FromBody] NotifyPushRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.userId))
                return BadRequest("userId required");

            await _service.PushToUserAsync(req);

            return Ok(new { message = "pushed" });
        }

        [HttpGet("banner")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> GetBanner()
        {
            var res = await _service.GetBannerAsync();
            if (res.message_code != 0)
            {
                _logger.LogError("GetBanner failed status={Status} message={Message}", res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }
        [HttpPost("banner/manage")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> ManageBanner([FromBody] ManageBannerRequest request)
        {
            var userId = User?.FindFirst("UserId")?.Value ?? "";
            request.update_by = userId;
            var result = await _service.ManageBannerAsync(request);
            return Ok(result);
        }
        [HttpGet("banner/{id}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> GetBannerById(int id)
        {
            var res = await _service.GetBannerByIdAsync(id);
            if (res.message_code != 0)
            {
                _logger.LogError("GetBannerById failed for id={Id} status={Status} message={Message}", id, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);

        }
        [HttpGet("banner/detail/{banner_id}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> GetBannerDetail(int banner_id)
        {
            var res = await _service.GetBannerDetailAsync(banner_id);
            if (res.message_code != 0)
            {
                _logger.LogError("GetBannerDetail failed for banner_id={BannerId} status={Status} message={Message}", banner_id, res.message_code, res.message_text);
                return StatusCode(StatusCodes.Status500InternalServerError, res);
            }
            return Ok(res);
        }
        [HttpPost("banner/delete")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> DeleteBanner(DeleteBannerRequest request)
        {
            try
            {
                var res = await _service.DeleteBannerAsync(request);
                if (res.message_code != 0)
                {
                    _logger.LogError("DeleteBanner failed for banner_id={BannerId} status={Status} message={Message}", request, res.message_code, res.message_text);
                    return StatusCode(StatusCodes.Status500InternalServerError, res);
                }
                return Ok(res);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception in DeleteBanner for banner_id={BannerId}", request);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message_code = -1, message_text = "An error occurred while deleting the banner." });
            }
        }
    }
}
