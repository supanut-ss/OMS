using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;

namespace OmsApi.Models.Inventory
{
    /// <summary>
    /// Unified product item model across platforms
    /// </summary>
    public class ProductItem
    {
        /// <summary>Platform-specific product/item ID</summary>
        public string ItemId { get; set; } = string.Empty;

        /// <summary>Source platform</summary>
        public PlatformType Platform { get; set; }

        /// <summary>ชื่อสินค้า</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>SKU หลัก</summary>
        public string Sku { get; set; } = string.Empty;

        /// <summary>สถานะสินค้า (NORMAL, BANNED, etc.)</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>URL รูปหลัก</summary>
        public string ImageUrl { get; set; } = string.Empty;

        /// <summary>ราคา</summary>
        public decimal Price { get; set; }

        /// <summary>สกุลเงิน</summary>
        public string Currency { get; set; } = "THB";

        /// <summary>ข้อมูลสต๊อก (ถ้าไม่มี variation)</summary>
        public StockInfo? Stock { get; set; }

        /// <summary>ข้อมูลสต๊อกแยกตาม variation</summary>
        public List<VariationStock> Variations { get; set; } = new();

        /// <summary>จำนวนสต๊อกรวม (ทุก variation)</summary>
        public int TotalStock => Stock?.CurrentStock ?? Variations.Sum(v => v.CurrentStock);

        /// <summary>วันที่สร้าง</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>วันที่อัปเดตล่าสุด</summary>
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// ข้อมูลสต๊อกสินค้า
    /// </summary>
    public class StockInfo
    {
        /// <summary>จำนวนสต๊อกปัจจุบัน</summary>
        public int CurrentStock { get; set; }

        /// <summary>จำนวนที่ถูกจอง (reserved)</summary>
        public int ReservedStock { get; set; }

        /// <summary>สต๊อกที่ขายได้จริง</summary>
        public int AvailableStock => CurrentStock - ReservedStock;
    }

    /// <summary>
    /// ข้อมูลสต๊อกแยกตาม variation (สี, ไซส์)
    /// </summary>
    public class VariationStock
    {
        /// <summary>Variation/Model ID</summary>
        public string VariationId { get; set; } = string.Empty;

        /// <summary>ชื่อ variation (เช่น "สีดำ / Size L")</summary>
        public string VariationName { get; set; } = string.Empty;

        /// <summary>SKU ของ variation</summary>
        public string Sku { get; set; } = string.Empty;

        /// <summary>ราคา</summary>
        public decimal Price { get; set; }

        /// <summary>จำนวนสต๊อกปัจจุบัน</summary>
        public int CurrentStock { get; set; }
    }

    /// <summary>
    /// Filter สำหรับค้นหาสินค้า
    /// </summary>
    public class ProductFilter
    {
        /// <summary>Platform ที่ต้องการ</summary>
        public PlatformType? Platform { get; set; }

        /// <summary>Resolved internally from the encrypted OMS credential store.</summary>
        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>Shop ID</summary>
        public string? ShopId { get; set; }

        /// <summary>ค้นหาจากชื่อ/SKU</summary>
        public string? Keyword { get; set; }

        /// <summary>Filter สถานะสินค้า</summary>
        public string? ItemStatus { get; set; }

        /// <summary>แสดงเฉพาะสินค้าที่สต๊อกต่ำกว่าจำนวนนี้</summary>
        public int? LowStockThreshold { get; set; }

        /// <summary>หน้าที่ (1-based)</summary>
        public int Page { get; set; } = 1;

        /// <summary>จำนวนต่อหน้า</summary>
        public int PageSize { get; set; } = 50;

        /// <summary>ตัวเลือก platform/shop สำหรับค้นหาหลายร้าน</summary>
        public List<Orders.PlatformCredentialInput>? PlatformCredentials { get; set; }
    }

    /// <summary>
    /// Request สำหรับอัปเดตสต๊อก
    /// </summary>
    public class UpdateStockRequest
    {
        public PlatformType Platform { get; set; }

        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        public string? ShopId { get; set; }

        [Required]
        [StringLength(100)]
        public string ItemId { get; set; } = string.Empty;

        public string? VariationId { get; set; }

        [Range(0, int.MaxValue)]
        public int NewStock { get; set; }
    }
}
