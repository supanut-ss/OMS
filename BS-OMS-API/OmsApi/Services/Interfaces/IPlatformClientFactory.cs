using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;

namespace OmsApi.Services.Interfaces
{
    /// <summary>
    /// Interface for platform-specific API clients
    /// </summary>
    public interface IPlatformClient
    {
        PlatformType Platform { get; }

        // ── Orders ─────────────────────────────────────────

        /// <summary>ดึง order list จาก platform</summary>
        Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(string accessToken, string? shopId, OrderFilter filter);

        /// <summary>ดึงรายละเอียด order</summary>
        Task<UnifiedOrder?> GetOrderDetailAsync(string accessToken, string? shopId, string orderId);

        // ── Inventory ─────────────────────────────────────

        /// <summary>ดึงรายการสินค้า</summary>
        Task<PaginatedResult<ProductItem>> GetProductsAsync(string accessToken, string? shopId, ProductFilter filter);

        /// <summary>ดึงรายละเอียดสินค้า (พร้อมสต๊อก)</summary>
        Task<ProductItem?> GetProductDetailAsync(string accessToken, string? shopId, string itemId);

        /// <summary>อัปเดตสต๊อก</summary>
        Task<bool> UpdateStockAsync(string accessToken, string? shopId, string itemId, string? variationId, int newStock);

        // ── Shipping ──────────────────────────────────────

        /// <summary>ดึงใบปะหน้าพัสดุ</summary>
        Task<ShippingLabelResult?> GetShippingLabelAsync(
            string accessToken,
            string? shopId,
            string orderId,
            string? packageId,
            string? trackingNumber,
            string documentType);

        /// <summary>จัดส่งสินค้า</summary>
        Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request);

        /// <summary>แยก Order เป็นหลาย Platform packages ตามกล่อง WMS</summary>
        Task<SplitPlatformOrderResult> SplitOrderAsync(
            string accessToken,
            string? shopId,
            SplitPlatformOrderRequest request)
            => throw new NotSupportedException($"{Platform} does not support order splitting through OMS yet.");

        /// <summary>ดึงรายการผู้ให้บริการขนส่ง</summary>
        Task<List<ShippingProvider>> GetShippingProvidersAsync(string accessToken, string? shopId);

        /// <summary>ดึงข้อมูลติดตามพัสดุ</summary>
        Task<TrackingInfo?> GetTrackingInfoAsync(
            string accessToken,
            string? shopId,
            string orderId,
            IReadOnlyCollection<string>? packageNumbers = null);
    }

    /// <summary>
    /// Factory for creating platform-specific clients
    /// </summary>
    public interface IPlatformClientFactory
    {
        IPlatformClient GetClient(PlatformType platform);
    }
}
