using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace ApiCore.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class OutboundController : ControllerResponse
    {
        private const string RequiredMasterMessage = "Outbound master requires warehouse_id, warehouse, owner_id, owner_code, order_type, and order_status.";
        private const string RequiredDetailItemMessage = "Outbound detail requires valid item_master_id (existing inv.t_inv_item.item_master_id).";
        private const string InvalidItemMasterMessage = "Invalid item_master_id in outbound_details. The value must exist in inv.t_inv_item.item_master_id.";
        private const string InvalidItemUomMessage = "Invalid item_uom_id in outbound_details. The value must exist in inv.t_inv_item_uom.item_uom_id.";
        private readonly IOutbound _outbound;
        public OutboundController(IOutbound outbound)
        {
            _outbound = outbound;
        }

        private string ResolveUserId()
        {
            return User?.Identity?.Name
            ?? User.FindFirst("UserId")?.Value
                ?? User?.FindFirst("user_id")?.Value
                ?? User?.FindFirst("sub")?.Value
                ?? "SYSTEM";
        }

        private static bool IsNullOrWhiteSpace(string? value)
        {
            return string.IsNullOrWhiteSpace(value);
        }

        private bool HasRequiredMaster(OutboundRequest? request)
        {
            var master = request?.OutboundMaster;
            if (master == null)
            {
                return false;
            }

            return master.warehouse_id.HasValue && master.warehouse_id.Value > 0
                && !IsNullOrWhiteSpace(master.warehouse)
                && master.owner_id.HasValue && master.owner_id.Value > 0
                && !IsNullOrWhiteSpace(master.owner_code)
                && !IsNullOrWhiteSpace(master.order_type)
                && !IsNullOrWhiteSpace(master.order_status);
        }

        private bool HasValidDetailItemReference(OutboundRequest? request)
        {
            var details = request?.OutboundDetails;
            if (details == null || details.Count == 0)
            {
                return true;
            }

            return details.All(d => d.item_master_id.HasValue && d.item_master_id.Value > 0);
        }

        private IActionResult BuildValidationError(string message)
        {
            var details = new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["request"] = new[] { message }
            })
            {
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status400BadRequest,
                Instance = HttpContext.Request.Path
            };

            return BadRequest(details);
        }

        private IActionResult BuildSqlError(string message)
        {
            return BadRequest(new
            {
                message_code = 1,
                message_status = "error",
                message_text = message,
            });
        }

        private static bool IsForeignKeyConflict(SqlException ex)
        {
            return ex.Message.Contains("FOREIGN KEY constraint", StringComparison.OrdinalIgnoreCase)
                || ex.Message.Contains("FK_", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsValidOutboundActionRequest(OutboundActionRequest? request)
        {
            return request != null && request.outbound_master_id > 0;
        }

        private OutboundActionRequest EnsureActionDefaults(OutboundActionRequest request)
        {
            //request.device ??= HttpContext?.Request?.Headers["User-Agent"].FirstOrDefault() ?? "WEB";
            request.device = GetClientIpAddress();
            request.lang ??= HttpContext?.Request?.Headers["Accept-Language"].FirstOrDefault() ?? "en-US";
            return request;
        }

        [HttpGet("{outbound_master_id}")]
        [Produces("application/json")]
        public async Task<IActionResult> GetOutboundAsnc(int outbound_master_id)
        {
            try
            {
                var result = await _outbound.GetOutboundAsync(outbound_master_id);
                return result != null ?
                    AccessResponseSuccess("success", result) :
                    ResponseNotFound("Data not found");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost]
        [Produces("application/json")]
        public async Task<IActionResult> PostOutboundAsync([FromBody] OutboundRequest request)
        {
            try
            {
                if (!HasRequiredMaster(request))
                {
                    return BuildValidationError(RequiredMasterMessage);
                }

                if (!HasValidDetailItemReference(request))
                {
                    return BuildValidationError(RequiredDetailItemMessage);
                }

                var userId = ResolveUserId();

                var result = await _outbound.InsertOutboundAsync(request, userId);
                return result != null ?
                    AccessResponseSuccess("success", result) :
                    ResponseNotFound("Data not found");
            }
            catch (SqlException ex) when (ex.Message.Contains(RequiredMasterMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildValidationError(RequiredMasterMessage);
            }
            catch (SqlException ex) when (ex.Message.Contains(InvalidItemMasterMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildSqlError(InvalidItemMasterMessage);
            }
            catch (SqlException ex) when (ex.Message.Contains(InvalidItemUomMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildSqlError(InvalidItemUomMessage);
            }
            catch (SqlException ex) when (IsForeignKeyConflict(ex))
            {
                return BuildSqlError(ex.Message);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("update/{outbound_master_id}")]
        [Produces("application/json")]
        public async Task<IActionResult> PutOutboundAsync(int outbound_master_id, [FromBody] OutboundRequest request)
        {
            try
            {
                if (!HasRequiredMaster(request))
                {
                    return BuildValidationError(RequiredMasterMessage);
                }

                if (!HasValidDetailItemReference(request))
                {
                    return BuildValidationError(RequiredDetailItemMessage);
                }

                var userId = ResolveUserId();

                var result = await _outbound.UpdateOutboundAsync(outbound_master_id, request, userId);
                return result != null ?
                    AccessResponseSuccess("success", result) :
                    ResponseNotFound("Data not found");
            }
            catch (SqlException ex) when (ex.Message.Contains(RequiredMasterMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildValidationError(RequiredMasterMessage);
            }
            catch (SqlException ex) when (ex.Message.Contains(InvalidItemMasterMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildSqlError(InvalidItemMasterMessage);
            }
            catch (SqlException ex) when (ex.Message.Contains(InvalidItemUomMessage, StringComparison.OrdinalIgnoreCase))
            {
                return BuildSqlError(InvalidItemUomMessage);
            }
            catch (SqlException ex) when (IsForeignKeyConflict(ex))
            {
                return BuildSqlError(ex.Message);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpDelete("{outbound_master_id}")]
        [Produces("application/json")]
        public async Task<IActionResult> DeleteOutboundAsync(int outbound_master_id)
        {
            try
            {
                if (outbound_master_id <= 0)
                {
                    return BuildValidationError("outbound_master_id is required.");
                }

                var result = await _outbound.DeleteOutboundAsync(outbound_master_id, ResolveUserId());
                return result != null
                    ? AccessResponseDataSuccess("success", result)
                    : ResponseNotFound("Data not found");
            }
            catch (SqlException ex) when (IsForeignKeyConflict(ex))
            {
                return BuildSqlError(ex.Message);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("delete/{outbound_master_id}")]
        [Produces("application/json")]
        public async Task<IActionResult> DeleteOutboundByPostAsync(int outbound_master_id)
        {
            return await DeleteOutboundAsync(outbound_master_id);
        }

        [HttpPost("release-user")]
        [Produces("application/json")]
        public async Task<IActionResult> ReleaseUserAsync([FromBody] OutboundActionRequest request)
        {
            try
            {
                if (!IsValidOutboundActionRequest(request))
                {
                    return BuildValidationError("outbound_master_id is required.");
                }
                request.device = GetClientIpAddress();
                var result = await _outbound.ReleaseUserAsync(EnsureActionDefaults(request), ResolveUserId());
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("release")]
        [Produces("application/json")]
        public async Task<IActionResult> ReleaseSystemAsync([FromBody] OutboundActionRequest request)
        {
            try
            {
                if (!IsValidOutboundActionRequest(request))
                {
                    return BuildValidationError("outbound_master_id is required.");
                }

                request.device = GetClientIpAddress();
                var result = await _outbound.ReleaseSystemAsync(EnsureActionDefaults(request), ResolveUserId());
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("unrelease-user")]
        [Produces("application/json")]
        public async Task<IActionResult> UnreleaseUserAsync([FromBody] OutboundActionRequest request)
        {
            try
            {
                if (!IsValidOutboundActionRequest(request))
                {
                    return BuildValidationError("outbound_master_id is required.");
                }
                request.device = GetClientIpAddress();
                var result = await _outbound.UnreleaseUserAsync(EnsureActionDefaults(request), ResolveUserId());
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("unrelease")]
        [Produces("application/json")]
        public async Task<IActionResult> UnreleaseSystemAsync([FromBody] OutboundActionRequest request)
        {
            try
            {
                if (!IsValidOutboundActionRequest(request))
                {
                    return BuildValidationError("outbound_master_id is required.");
                }
                request.device = GetClientIpAddress();
                var result = await _outbound.UnreleaseSystemAsync(EnsureActionDefaults(request), ResolveUserId());
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("cancel-order")]
        [Produces("application/json")]
        public async Task<IActionResult> CancelOrderAsync([FromBody] OutboundActionRequest request)
        {
            try
            {
                if (!IsValidOutboundActionRequest(request))
                {
                    return BuildValidationError("outbound_master_id is required.");
                }

                request.device = GetClientIpAddress();
                var result = await _outbound.CancelOrderAsync(EnsureActionDefaults(request), ResolveUserId());
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }

        [HttpPost("confirm-ship/{outbound_master_id}")]
        [Produces("application/json")]
        public async Task<IActionResult> ConfirmShipAsync(long outbound_master_id)
        {
            try
            {
                if (outbound_master_id <= 0)
                {
                    return BuildValidationError("outbound_master_id is required.");
                }

                var result = await _outbound.ConfirmShipAsync(outbound_master_id, ResolveUserId(), GetClientIpAddress(), HttpContext?.Request?.Headers["Accept-Language"].FirstOrDefault() ?? "en-US");
                return AccessResponseDataSuccess("success", result);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
