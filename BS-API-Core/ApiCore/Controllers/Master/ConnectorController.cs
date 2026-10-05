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
    public sealed class ConnectorController : ControllerResponse
    {
        private readonly IConnectorService _connectorService;
        private readonly ILogger<ConnectorController> _logger;

        public ConnectorController(IConnectorService connectorService, ILogger<ConnectorController> logger)
        {
            _connectorService = connectorService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            try
            {
                var connectors = await _connectorService.GetAllAsync(cancellationToken);
                return AccessResponseDataSuccess("success", connectors);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "load connectors");
            }
        }

        [HttpGet("apps")]
        public async Task<IActionResult> GetPlatformApps([FromQuery] string? platform, CancellationToken cancellationToken)
        {
            try
            {
                var apps = await _connectorService.GetPlatformAppsAsync(platform, cancellationToken);
                return AccessResponseDataSuccess("success", apps);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "load platform apps");
            }
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        {
            try
            {
                var connector = await _connectorService.GetByIdAsync(id, cancellationToken);
                return connector == null
                    ? ResponseNotFound($"Connector '{id}' was not found.")
                    : AccessResponseDataSuccess("success", connector);
            }
            catch (Exception ex)
            {
                return HandleError(ex, $"load connector {id}");
            }
        }

        [HttpPost("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
        {
            try
            {
                await _connectorService.DeleteAsync(id, cancellationToken);
                return AccessResponseDataSuccess("success", new { PlatformCredentialId = id });
            }
            catch (Exception ex)
            {
                return HandleError(ex, $"delete connector {id}");
            }
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save(
            [FromBody] SaveConnectorRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var connector = await _connectorService.SaveAsync(request, ResolveUserId(), cancellationToken);
                return AccessResponseDataSuccess("success", connector);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "save connector");
            }
        }

        [HttpPost("set-active")]
        public async Task<IActionResult> SetActive(
            [FromBody] SetConnectorActiveRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var connector = await _connectorService.SetActiveAsync(request, ResolveUserId(), cancellationToken);
                return AccessResponseDataSuccess("success", connector);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "update connector active state");
            }
        }

        [HttpPost("set-reauthorization")]
        public async Task<IActionResult> SetReauthorization(
            [FromBody] SetConnectorReauthorizationRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var connector = await _connectorService.SetReauthorizationAsync(request, ResolveUserId(), cancellationToken);
                return AccessResponseDataSuccess("success", connector);
            }
            catch (Exception ex)
            {
                return HandleError(ex, "update connector authorization state");
            }
        }

        private IActionResult HandleError(Exception exception, string operation)
        {
            return exception switch
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
        }

        private IActionResult LogAndReturnServerError(Exception exception, string operation)
        {
            _logger.LogError(exception, "Failed to {Operation}", operation);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message_code = 1,
                message_status = "error",
                message_text = "Unable to complete the connector request.",
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
