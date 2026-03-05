using OmsApi.Models.Common;
using OmsApi.Models.Orders;

namespace OmsApi.Services.Interfaces
{
    /// <summary>
    /// Service for unified order management across platforms
    /// </summary>
    public interface IOrderService
    {
        /// <summary>ดึง orders จาก specific platform</summary>
        Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(OrderFilter filter);

        /// <summary>ดึงรายละเอียด order เฉพาะ</summary>
        Task<UnifiedOrder?> GetOrderDetailAsync(PlatformType platform, string orderId, string accessToken, string? shopId = null);

        /// <summary>ดึง orders จากทุก platform รวมกัน</summary>
        Task<List<UnifiedOrder>> GetOrdersFromAllPlatformsAsync(OrderFilter filter);

        /// <summary>ดึง orders ที่ใกล้หมดเขตจัดส่ง</summary>
        Task<List<UnifiedOrder>> GetOrdersNearCancellationAsync(OrderFilter filter, int daysThreshold = 2);
    }
}
