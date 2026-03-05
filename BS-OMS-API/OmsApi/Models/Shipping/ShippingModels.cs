using OmsApi.Models.Common;

namespace OmsApi.Models.Shipping
{
    /// <summary>
    /// Request สำหรับดึงใบปะหน้าพัสดุ
    /// </summary>
    public class ShippingLabelRequest
    {
        public PlatformType Platform { get; set; }
        public string AccessToken { get; set; } = string.Empty;
        public string? ShopId { get; set; }

        /// <summary>รหัส Order</summary>
        public string OrderId { get; set; } = string.Empty;

        /// <summary>รหัส Package (ถ้ามี — TikTok ใช้ package_id)</summary>
        public string? PackageId { get; set; }

        /// <summary>ประเภทเอกสาร: NORMAL, THERMAL (สำหรับ Shopee)</summary>
        public string DocumentType { get; set; } = "NORMAL";
    }

    /// <summary>
    /// Response ใบปะหน้าพัสดุ
    /// </summary>
    public class ShippingLabelResult
    {
        public PlatformType Platform { get; set; }
        public string OrderId { get; set; } = string.Empty;

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
        public string AccessToken { get; set; } = string.Empty;
        public string? ShopId { get; set; }
        public string OrderId { get; set; } = string.Empty;

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
