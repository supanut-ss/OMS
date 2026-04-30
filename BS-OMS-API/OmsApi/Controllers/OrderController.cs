using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Unified order management endpoints — ดึง Order จากทุกแพลตฟอร์ม
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ILogger<OrderController> _logger;

        public OrderController(IOrderService orderService, ILogger<OrderController> logger)
        {
            _orderService = orderService;
            _logger = logger;
        }

        /// <summary>
        /// ดึง Order จาก specific platform
        /// </summary>
        [HttpPost("list")]
        [SwaggerOperation(Summary = "Get orders from a specific platform")]
        [SwaggerResponse(200, "Orders retrieved successfully")]
        [SwaggerResponse(400, "Bad request")]
        public async Task<IActionResult> GetOrders([FromBody] OrderFilter filter)
        {
            try
            {
                if (!filter.Platform.HasValue)
                    return BadRequest(ApiResponse<string>.Fail("Platform is required. Use /api/orders/all for multi-platform query."));

                _logger.LogInformation("📦 Fetching orders from {Platform}, page {Page}", filter.Platform, filter.Page);

                var result = await _orderService.GetOrdersAsync(filter);

                return Ok(ApiResponse<PaginatedResult<UnifiedOrder>>.Ok(
                    result,
                    $"Retrieved {result.Items.Count} orders from {filter.Platform}",
                    result.TotalCount));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching orders");
                return StatusCode(500, ApiResponse<string>.Fail($"Internal error: {ex.Message}"));
            }
        }

        /// <summary>
        /// ดึง Order จากทุก platform รวมกัน (ต้องส่ง credentials ของแต่ละ platform)
        /// </summary>
        [HttpPost("all")]
        [SwaggerOperation(Summary = "Get orders from ALL platforms combined")]
        [SwaggerResponse(200, "Orders retrieved from all platforms")]
        [SwaggerResponse(400, "Bad request")]
        public async Task<IActionResult> GetAllOrders([FromBody] OrderFilter filter)
        {
            try
            {
                if (filter.PlatformCredentials == null || !filter.PlatformCredentials.Any())
                    return BadRequest(ApiResponse<string>.Fail("PlatformCredentials are required for multi-platform query."));

                _logger.LogInformation("📦 Fetching orders from ALL platforms ({Count} platforms)",
                    filter.PlatformCredentials.Count);

                var orders = await _orderService.GetOrdersFromAllPlatformsAsync(filter);

                return Ok(ApiResponse<List<UnifiedOrder>>.Ok(
                    orders,
                    $"Retrieved {orders.Count} orders from {filter.PlatformCredentials.Count} platforms",
                    orders.Count));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching orders from all platforms");
                return StatusCode(500, ApiResponse<string>.Fail($"Internal error: {ex.Message}"));
            }
        }

        /// <summary>
        /// ดูรายละเอียด Order (รวม items, shipping, tax invoice, buyer remarks)
        /// </summary>
        [HttpGet("{platform}/{orderId}")]
        [SwaggerOperation(Summary = "Get order detail from a specific platform")]
        [SwaggerResponse(200, "Order detail retrieved")]
        [SwaggerResponse(404, "Order not found")]
        public async Task<IActionResult> GetOrderDetail(
            string platform, string orderId,
            [FromQuery] string accessToken,
            [FromQuery] string? shopId = null)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                _logger.LogInformation("📋 Fetching order detail: {Platform}/{OrderId}", platform, orderId);

                var order = await _orderService.GetOrderDetailAsync(platformType, orderId, accessToken, shopId);

                if (order == null)
                    return NotFound(ApiResponse<string>.Fail($"Order '{orderId}' not found on {platform}"));

                return Ok(ApiResponse<UnifiedOrder>.Ok(order, "Order detail retrieved successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching order detail");
                return StatusCode(500, ApiResponse<string>.Fail($"Internal error: {ex.Message}"));
            }
        }

        /// <summary>
        /// เช็คสถานะ Order
        /// </summary>
        [HttpGet("{platform}/{orderId}/status")]
        [SwaggerOperation(Summary = "Get order status")]
        [SwaggerResponse(200, "Order status retrieved")]
        public async Task<IActionResult> GetOrderStatus(
            string platform, string orderId,
            [FromQuery] string accessToken,
            [FromQuery] string? shopId = null)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var order = await _orderService.GetOrderDetailAsync(platformType, orderId, accessToken, shopId);

                if (order == null)
                    return NotFound(ApiResponse<string>.Fail($"Order '{orderId}' not found"));

                var statusInfo = new
                {
                    order.OrderId,
                    order.Platform,
                    order.Status,
                    StatusName = order.Status.ToString(),
                    order.OriginalStatus,
                    order.CancellationDeadline,
                    order.DaysUntilCancellation,
                    IsUrgent = order.DaysUntilCancellation.HasValue && order.DaysUntilCancellation.Value <= 1
                };

                return Ok(ApiResponse<object>.Ok(statusInfo, "Order status retrieved"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching order status");
                return StatusCode(500, ApiResponse<string>.Fail($"Internal error: {ex.Message}"));
            }
        }

        /// <summary>
        /// ดึง Order ที่ใกล้หมดเขตจัดส่ง (เสี่ยงถูกยกเลิก)
        /// </summary>
        [HttpPost("cancellation-deadlines")]
        [SwaggerOperation(Summary = "Get orders near cancellation deadline")]
        [SwaggerResponse(200, "Orders near cancellation retrieved")]
        public async Task<IActionResult> GetOrdersNearCancellation(
            [FromBody] OrderFilter filter,
            [FromQuery] int daysThreshold = 2)
        {
            try
            {
                _logger.LogInformation("⚠️ Fetching orders near cancellation (threshold: {Days} days)", daysThreshold);

                var orders = await _orderService.GetOrdersNearCancellationAsync(filter, daysThreshold);

                return Ok(ApiResponse<List<UnifiedOrder>>.Ok(
                    orders,
                    $"Found {orders.Count} orders near cancellation deadline",
                    orders.Count));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching cancellation deadlines");
                return StatusCode(500, ApiResponse<string>.Fail($"Internal error: {ex.Message}"));
            }
        }

        private static PlatformType ParsePlatform(string platform)
        {
            return platform.ToLowerInvariant() switch
            {
                "shopee" => PlatformType.Shopee,
                "lazada" => PlatformType.Lazada,
                "tiktok" => PlatformType.TikTok,
                _ => throw new ArgumentException($"Invalid platform: '{platform}'. Supported: shopee, lazada, tiktok")
            };
        }
    }
}
