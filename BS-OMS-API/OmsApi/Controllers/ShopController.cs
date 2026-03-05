using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// Shop/Store management endpoints
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ShopController : ControllerBase
    {
        private readonly ILogger<ShopController> _logger;

        public ShopController(ILogger<ShopController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Get list of connected shops/stores
        /// </summary>
        [HttpGet]
        [SwaggerOperation(Summary = "Get connected shops")]
        [SwaggerResponse(200, "Connected shops list")]
        public IActionResult GetShops()
        {
            // Placeholder — จะ implement เมื่อมี database เก็บ shop connections
            var shops = new[]
            {
                new { Platform = "shopee", ShopId = "", ShopName = "Not connected", Connected = false },
                new { Platform = "lazada", ShopId = "", ShopName = "Not connected", Connected = false },
                new { Platform = "tiktok", ShopId = "", ShopName = "Not connected", Connected = false }
            };

            return Ok(ApiResponse<object>.Ok(shops, "Shop connections retrieved"));
        }
    }
}
