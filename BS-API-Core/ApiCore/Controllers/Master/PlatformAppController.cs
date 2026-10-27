using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ApiCore.Controllers.Master
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public sealed class PlatformAppController : ControllerResponse
    {
        private readonly IPlatformAppService _platformAppService;
        private readonly ILogger<PlatformAppController> _logger;

        public PlatformAppController(
            IPlatformAppService platformAppService,
            ILogger<PlatformAppController> logger)
        {
            _platformAppService = platformAppService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? platform,
            CancellationToken cancellationToken)
        {
            try
            {
                return AccessResponseDataSuccess(
                    "success",
                    await _platformAppService.GetAllAsync(platform, cancellationToken));
            }
            catch (Exception ex)
            {
                return HandleError(ex, "load App Masters");
            }
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        {
            try
            {
                var app = await _platformAppService.GetByIdAsync(id, cancellationToken);
                return app is null
                    ? ResponseNotFound($"App Master '{id}' was not found.")
                    : AccessResponseDataSuccess("success", app);
            }
            catch (Exception ex)
            {
                return HandleError(ex, $"load App Master {id}");
            }
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save(
            [FromBody] SavePlatformAppRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var app = await _platformAppService.SaveAsync(
                    request,
                    ResolveUserId(),
                    cancellationToken);
                return AccessResponseDataSuccess("success", app);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "save App Master");
            }
        }

        [HttpPost("{id:long}/delete")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            try
            {
                await _platformAppService.DeleteAsync(id, cancellationToken);
                return AccessResponseDataSuccess("success", new { PlatformAppId = id });
            }
            catch (Exception ex)
            {
                return HandleError(ex, $"delete App Master {id}");
            }
        }

        private IActionResult HandleError(Exception exception, string operation) => exception switch
        {
            ArgumentException => ResponseError(exception.Message),
            KeyNotFoundException => ResponseNotFound(exception.Message),
            InvalidOperationException => Conflict(new
            {
                message_code = 409,
                message_status = "conflict",
                message_text = exception.Message,
            }),
            _ => LogAndReturnServerError(exception, operation),
        };

        private IActionResult LogAndReturnServerError(Exception exception, string operation)
        {
            _logger.LogError(exception, "Failed to {Operation}", operation);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message_code = 1,
                message_status = "error",
                message_text = "Unable to complete the App Master request.",
            });
        }

        private string ResolveUserId() =>
            User?.Identity?.Name ??
            User?.FindFirst("UserId")?.Value ??
            User?.FindFirst("user_id")?.Value ??
            User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            User?.FindFirst("sub")?.Value ??
            "SYSTEM";
    }
}
