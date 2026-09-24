using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Inventory management — จัดการสต๊อกสินค้าจากทุก platform
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly ILogger<InventoryController> _logger;

        public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger)
        {
            _inventoryService = inventoryService;
            _logger = logger;
        }

        /// <summary>
        /// ดึงรายการสินค้าจาก 1 platform (พร้อมข้อมูลสต๊อก)
        /// </summary>
        [HttpPost("products")]
        [SwaggerOperation(Summary = "ดึงรายการสินค้าจาก platform ที่ระบุ")]
        [SwaggerResponse(200, "Returns product list with stock info")]
        public async Task<IActionResult> GetProducts([FromBody] ProductFilter filter)
        {
            _logger.LogInformation("📦 Inventory: Get products from {Platform}", filter.Platform);

            if (!filter.Platform.HasValue)
                return BadRequest(ApiResponse<string>.Fail("กรุณาระบุ platform"));

            var result = await _inventoryService.GetProductsAsync(filter);
            return Ok(ApiResponse<PaginatedResult<ProductItem>>.Ok(result,
                $"Retrieved {result.Items.Count} products from {filter.Platform}"));
        }

        /// <summary>
        /// ดึงรายการสินค้าจากทุก platform รวมกัน
        /// </summary>
        [HttpPost("products/all")]
        [SwaggerOperation(Summary = "ดึงสินค้าจากทุก platform")]
        [SwaggerResponse(200, "Returns aggregated product list")]
        public async Task<IActionResult> GetAllProducts([FromBody] ProductFilter filter)
        {
            _logger.LogInformation("📦 Inventory: Get products from all platforms");

            var products = await _inventoryService.GetProductsFromAllPlatformsAsync(filter);
            return Ok(ApiResponse<List<ProductItem>>.Ok(products,
                $"Retrieved {products.Count} products from all platforms"));
        }

        /// <summary>
        /// ดูรายละเอียดสินค้า + สต๊อก
        /// </summary>
        [HttpGet("{platform}/{itemId}")]
        [SwaggerOperation(Summary = "ดูรายละเอียดสินค้าและสต๊อก")]
        [SwaggerResponse(200, "Returns product detail with stock")]
        public async Task<IActionResult> GetProductDetail(
            PlatformType platform, string itemId,
            [FromQuery] string? shopId = null)
        {
            var product = await _inventoryService.GetProductDetailAsync(platform, itemId, shopId);
            if (product == null)
                return NotFound(ApiResponse<string>.Fail("Product not found"));

            return Ok(ApiResponse<ProductItem>.Ok(product));
        }

        /// <summary>
        /// ดึงสินค้าที่สต๊อกต่ำ (Low Stock Alert)
        /// </summary>
        [HttpPost("low-stock")]
        [SwaggerOperation(Summary = "ดึงสินค้าที่สต๊อกต่ำกว่า threshold")]
        [SwaggerResponse(200, "Returns low stock products")]
        public async Task<IActionResult> GetLowStockProducts(
            [FromBody] ProductFilter filter, [FromQuery] int threshold = 5)
        {
            _logger.LogInformation("⚠️ Inventory: Get low stock products (threshold: {Threshold})", threshold);

            var products = await _inventoryService.GetLowStockProductsAsync(filter, threshold);
            return Ok(ApiResponse<List<ProductItem>>.Ok(products,
                $"Found {products.Count} products with stock <= {threshold}"));
        }

        /// <summary>
        /// อัปเดตสต๊อกสินค้า
        /// </summary>
        [HttpPost("update-stock")]
        [SwaggerOperation(Summary = "อัปเดตจำนวนสต๊อกสินค้า")]
        [SwaggerResponse(200, "Stock updated successfully")]
        public async Task<IActionResult> UpdateStock([FromBody] UpdateStockRequest request)
        {
            _logger.LogInformation("📦 Inventory: Update stock for item {ItemId} on {Platform}", request.ItemId, request.Platform);

            var success = await _inventoryService.UpdateStockAsync(request);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("Failed to update stock"));

            return Ok(ApiResponse<string>.Ok("", "Stock updated successfully"));
        }
    }
}
