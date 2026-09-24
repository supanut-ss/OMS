using OmsApi.Models.Common;
using OmsApi.Models.Inventory;

namespace OmsApi.Services.Interfaces
{
    /// <summary>
    /// Service สำหรับจัดการสต๊อกและสินค้าจากทุก platform
    /// </summary>
    public interface IInventoryService
    {
        /// <summary>ดึงรายการสินค้าจาก platform</summary>
        Task<PaginatedResult<ProductItem>> GetProductsAsync(ProductFilter filter);

        /// <summary>ดึงรายการสินค้าจากทุก platform</summary>
        Task<List<ProductItem>> GetProductsFromAllPlatformsAsync(ProductFilter filter);

        /// <summary>ดึงรายละเอียดสินค้า (พร้อมสต๊อก)</summary>
        Task<ProductItem?> GetProductDetailAsync(PlatformType platform, string itemId, string? shopId = null);

        /// <summary>ดึงสินค้าที่สต๊อกต่ำ</summary>
        Task<List<ProductItem>> GetLowStockProductsAsync(ProductFilter filter, int threshold = 5);

        /// <summary>อัปเดตสต๊อก</summary>
        Task<bool> UpdateStockAsync(UpdateStockRequest request);
    }
}
