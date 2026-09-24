using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using OmsApi.Models.Common;

namespace OmsApi.Models.Shipping
{
    /// <summary>
    /// Request สำหรับดึงใบปะหน้าพัสดุ
    /// </summary>
    public class ShippingLabelRequest
    {
        public PlatformType Platform { get; set; }

        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        public string? ShopId { get; set; }

        /// <summary>รหัส Order</summary>
        [Required]
        [StringLength(100)]
        public string OrderId { get; set; } = string.Empty;

        /// <summary>รหัส Package (ถ้ามี — TikTok ใช้ package_id)</summary>
        public string? PackageId { get; set; }

        public string? TrackingNumber { get; set; }

        /// <summary>ประเภทเอกสาร: NORMAL, THERMAL (สำหรับ Shopee)</summary>
        public string DocumentType { get; set; } = "NORMAL_AIR_WAYBILL";
    }

    /// <summary>
    /// Response ใบปะหน้าพัสดุ
    /// </summary>
    public class ShippingLabelResult
    {
        public PlatformType Platform { get; set; }
        public string OrderId { get; set; } = string.Empty;
        public string? PackageId { get; set; }
        public string DocumentType { get; set; } = string.Empty;

        /// <summary>Tracking number</summary>
        public string TrackingNumber { get; set; } = string.Empty;

        /// <summary>URL ดาวน์โหลดเอกสาร (ถ้ามี)</summary>
        public string? DocumentUrl { get; set; }

        /// <summary>เอกสาร Base64 (ถ้ามี — สำหรับ platforms ที่ return binary)</summary>
        public string? DocumentBase64 { get; set; }

        /// <summary>Content type (application/pdf, image/png, etc.)</summary>
        public string ContentType { get; set; } = "application/pdf";

        /// <summary>สถานะการสร้างเอกสาร</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>ข้อมูลขนส่ง</summary>
        public string Carrier { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request จัดส่งสินค้า (Ship Order)
    /// </summary>
    public class ShipOrderRequest
    {
        public PlatformType Platform { get; set; }

        [JsonIgnore]
        [StringLength(512)]
        public string AccessToken { get; set; } = string.Empty;

        public string? ShopId { get; set; }

        [Required]
        [StringLength(100)]
        public string OrderId { get; set; } = string.Empty;

        /// <summary>Platform package identifier for split orders</summary>
        public string? PackageId { get; set; }

        /// <summary>วิธีจัดส่ง: pickup, dropoff, non_integrated</summary>
        public string ShippingMethod { get; set; } = "dropoff";

        /// <summary>Tracking number (สำหรับ seller shipping)</summary>
        public string? TrackingNumber { get; set; }

        /// <summary>Shipping provider ID (สำหรับ seller shipping)</summary>
        public string? ShippingProviderId { get; set; }
    }

    /// <summary>
    /// ข้อมูลผู้ให้บริการขนส่ง
    /// </summary>
    public class ShippingProvider
    {
        public string ProviderId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public PlatformType Platform { get; set; }
        public bool Enabled { get; set; }
    }

    /// <summary>
    /// ผลการทดสอบ credential และการเรียก Platform API โดยไม่เปิดเผย token
    /// </summary>
    public class PlatformConnectionTestResult
    {
        public PlatformType Platform { get; set; }
        public bool Connected { get; set; }
        public bool CredentialFound { get; set; }
        public string ShopId { get; set; } = string.Empty;
        public int ShippingProviderCount { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
        public string? RequestId { get; set; }
        public DateTime CheckedAtUtc { get; set; }
    }

    /// <summary>
    /// ข้อมูลติดตามพัสดุ
    /// </summary>
    public class TrackingInfo
    {
        public string TrackingNumber { get; set; } = string.Empty;
        public string Carrier { get; set; } = string.Empty;
        public PlatformType Platform { get; set; }
        public string OrderId { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;
        public List<TrackingEvent> Events { get; set; } = new();

        /// <summary>รายการพัสดุทั้งหมดของ Order (หนึ่ง Order อาจมีหลายกล่อง)</summary>
        public List<ShippingPackage> Packages { get; set; } = new();
    }

    /// <summary>
    /// ข้อมูลพัสดุระดับกล่อง ใช้ร่วมกันทุก Platform
    /// </summary>
    public class ShippingPackage
    {
        /// <summary>รหัสกล่องจาก WMS (outbound_sort_master_id ถ้ามี)</summary>
        public string WmsPackageRef { get; set; } = string.Empty;

        /// <summary>ลำดับกล่องจาก WMS</summary>
        public int? BoxNumber { get; set; }

        /// <summary>Primary key ของ record ใน OMS package table (ถ้ามี)</summary>
        public long? PlatformPackageRecordId { get; set; }

        /// <summary>รหัสพัสดุของ Platform (ถ้ามี)</summary>
        public string PackageId { get; set; } = string.Empty;

        /// <summary>เลข Tracking ของกล่องนี้</summary>
        public string TrackingNumber { get; set; } = string.Empty;

        /// <summary>ผู้ให้บริการขนส่งของกล่องนี้</summary>
        public string Carrier { get; set; } = string.Empty;

        /// <summary>สถานะพัสดุ</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// Shopee's package-level flag indicating whether shipment has already
        /// been arranged. This is required because LOGISTICS_READY can mean
        /// either awaiting arrange or tracking-number generation in progress.
        /// </summary>
        public bool? IsShipmentArranged { get; set; }

        /// <summary>วิธีจัดส่ง</summary>
        public string ShippingMethod { get; set; } = string.Empty;

        /// <summary>รายการ Item/Order item ที่อยู่ในกล่องนี้</summary>
        public List<string> ItemIds { get; set; } = new();

        /// <summary>
        /// รายละเอียดสินค้าในกล่องจาก Platform ใช้จับคู่กับสินค้าใน WMS
        /// เมื่อ Platform แยก package แล้วแต่ยังไม่มี mapping ที่บันทึกไว้
        /// </summary>
        public List<ShippingPackageItem> Items { get; set; } = new();

        /// <summary>เหตุการณ์ติดตามของกล่องนี้</summary>
        public List<TrackingEvent> Events { get; set; } = new();
    }

    public class ShippingPackageItem
    {
        public string ItemId { get; set; } = string.Empty;
        public string ItemNumber { get; set; } = string.Empty;
        public List<string> ItemNumberAliases { get; set; } = new();
        public decimal Quantity { get; set; }
    }

    /// <summary>
    /// Event ในการติดตามพัสดุ
    /// </summary>
    public class TrackingEvent
    {
        public DateTime Timestamp { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}
