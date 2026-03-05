using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Shipping management — จัดส่ง ปริ๊นใบปะหน้า ติดตามพัสดุ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ShippingController : ControllerBase
    {
        private readonly IShippingService _shippingService;
        private readonly ILogger<ShippingController> _logger;

        public ShippingController(IShippingService shippingService, ILogger<ShippingController> logger)
        {
            _shippingService = shippingService;
            _logger = logger;
        }

        /// <summary>
        /// ปริ๊นใบปะหน้าพัสดุ (Shipping Label / AWB)
        /// </summary>
        [HttpPost("print-label")]
        [SwaggerOperation(Summary = "ปริ๊นใบปะหน้าพัสดุ")]
        [SwaggerResponse(200, "Returns shipping label document")]
        public async Task<IActionResult> PrintLabel([FromBody] ShippingLabelRequest request)
        {
            _logger.LogInformation("🏷️ Shipping: Print label for order {OrderId} on {Platform}", request.OrderId, request.Platform);

            var result = await _shippingService.GetShippingLabelAsync(request);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Unable to generate shipping label. Check order status and platform."));

            return Ok(ApiResponse<ShippingLabelResult>.Ok(result, "Shipping label generated successfully"));
        }

        /// <summary>
        /// ปริ๊นใบปะหน้าแบบ Batch (หลายออเดอร์)
        /// </summary>
        [HttpPost("print-labels-batch")]
        [SwaggerOperation(Summary = "ปริ๊นใบปะหน้าหลายออเดอร์พร้อมกัน")]
        [SwaggerResponse(200, "Returns batch shipping labels")]
        public async Task<IActionResult> PrintLabelBatch([FromBody] List<ShippingLabelRequest> requests)
        {
            _logger.LogInformation("🏷️ Shipping: Batch print {Count} labels", requests.Count);

            var results = await _shippingService.GetBatchShippingLabelsAsync(requests);
            return Ok(ApiResponse<List<ShippingLabelResult>>.Ok(results,
                $"Generated {results.Count}/{requests.Count} shipping labels"));
        }

        /// <summary>
        /// จัดส่งสินค้า (Arrange Shipment / Ship Order)
        /// </summary>
        [HttpPost("arrange")]
        [SwaggerOperation(Summary = "จัดส่งสินค้า (Ship Order)")]
        [SwaggerResponse(200, "Order shipped successfully")]
        public async Task<IActionResult> ArrangeShipment([FromBody] ShipOrderRequest request)
        {
            _logger.LogInformation("📦 Shipping: Arrange shipment for order {OrderId}", request.OrderId);

            var success = await _shippingService.ShipOrderAsync(request);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("Failed to arrange shipment. Check order status."));

            return Ok(ApiResponse<string>.Ok("", "Shipment arranged successfully"));
        }

        /// <summary>
        /// ติดตามพัสดุ
        /// </summary>
        [HttpGet("tracking/{platform}/{orderId}")]
        [SwaggerOperation(Summary = "ติดตามสถานะพัสดุ")]
        [SwaggerResponse(200, "Returns tracking info")]
        public async Task<IActionResult> GetTracking(
            PlatformType platform, string orderId,
            [FromQuery] string accessToken, [FromQuery] string? shopId = null)
        {
            _logger.LogInformation("📍 Tracking: Get tracking for order {OrderId}", orderId);

            var tracking = await _shippingService.GetTrackingInfoAsync(platform, orderId, accessToken, shopId);
            if (tracking == null)
                return NotFound(ApiResponse<string>.Fail("Tracking info not available"));

            return Ok(ApiResponse<TrackingInfo>.Ok(tracking));
        }

        /// <summary>
        /// ดูรายการผู้ให้บริการขนส่ง
        /// </summary>
        [HttpGet("providers/{platform}")]
        [SwaggerOperation(Summary = "ดูรายการผู้ให้บริการขนส่งที่รองรับ")]
        [SwaggerResponse(200, "Returns shipping providers")]
        public async Task<IActionResult> GetShippingProviders(
            PlatformType platform,
            [FromQuery] string accessToken, [FromQuery] string? shopId = null)
        {
            var providers = await _shippingService.GetShippingProvidersAsync(platform, accessToken, shopId);
            return Ok(ApiResponse<List<ShippingProvider>>.Ok(providers,
                $"Found {providers.Count} shipping providers for {platform}"));
        }
    }
}
