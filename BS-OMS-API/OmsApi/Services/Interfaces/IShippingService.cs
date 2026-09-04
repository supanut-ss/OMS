using OmsApi.Models.Common;
using OmsApi.Models.Shipping;

namespace OmsApi.Services.Interfaces
{
    /// <summary>
    /// Service สำหรับจัดส่ง ปริ๊นใบปะหน้า ติดตามพัสดุ
    /// </summary>
    public interface IShippingService
    {
        /// <summary>ดึงใบปะหน้าพัสดุ (Shipping Label / AWB)</summary>
        Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request);

        /// <summary>Batch ปริ๊นใบปะหน้าหลายออเดอร์</summary>
        Task<List<ShippingLabelResult>> GetBatchShippingLabelsAsync(List<ShippingLabelRequest> requests);

        /// <summary>จัดส่งสินค้า (Ship Order)</summary>
        Task<bool> ShipOrderAsync(ShipOrderRequest request);

        Task<SplitPlatformOrderResult> SplitOrderAsync(SplitPlatformOrderRequest request);

        /// <summary>ดึงรายการผู้ให้บริการขนส่ง</summary>
        Task<List<ShippingProvider>> GetShippingProvidersAsync(PlatformType platform, string accessToken, string? shopId = null);

        /// <summary>ติดตามพัสดุ</summary>
        Task<TrackingInfo?> GetTrackingInfoAsync(
            PlatformType platform,
            string orderId,
            string? accessToken = null,
            string? shopId = null,
            IReadOnlyCollection<string>? packageNumbers = null);
    }
}
