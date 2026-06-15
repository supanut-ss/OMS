using OmsApi.Models.Common;

namespace OmsApi.Models.Orders
{
    /// <summary>
    /// Unified order model normalizing data from Shopee, Lazada, and TikTok
    /// </summary>
    public class UnifiedOrder
    {
        /// <summary>Platform-specific order ID</summary>
        public string OrderId { get; set; } = string.Empty;

        /// <summary>Source platform</summary>
        public PlatformType Platform { get; set; }

        /// <summary>Normalized order status</summary>
        public OrderStatus Status { get; set; }

        /// <summary>Original platform status string</summary>
        public string OriginalStatus { get; set; } = string.Empty;

        /// <summary>ชื่อลูกค้า (Buyer name)</summary>
        public string BuyerName { get; set; } = string.Empty;

        /// <summary>หมายเหตุจากลูกค้า (Buyer Remarks / Customer Comment)</summary>
        public string BuyerRemarks { get; set; } = string.Empty;

        /// <summary>Flag ขอใบกำกับภาษี</summary>
        public bool TaxInvoiceRequested { get; set; }

        /// <summary>ข้อมูลใบกำกับภาษี (ถ้ามี)</summary>
        public TaxInvoiceInfo? TaxInvoice { get; set; }

        /// <summary>วันหมดเขตจัดส่ง (ถ้าไม่ส่งภายในวันนี้ order จะถูกยกเลิก)</summary>
        public DateTime? CancellationDeadline { get; set; }

        /// <summary>จำนวนวันที่เหลือก่อน order จะถูกยกเลิก</summary>
        public int? DaysUntilCancellation => CancellationDeadline.HasValue
            ? (int)Math.Ceiling((CancellationDeadline.Value - DateTime.UtcNow).TotalDays)
            : null;

        /// <summary>วันที่สร้าง Order</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>วันที่อัปเดตล่าสุด</summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>ยอดรวมทั้งหมด</summary>
        public decimal TotalAmount { get; set; }

        /// <summary>สกุลเงิน</summary>
        public string Currency { get; set; } = "THB";

        /// <summary>ข้อมูลการจัดส่ง</summary>
        public ShippingInfo? Shipping { get; set; }

        /// <summary>รายการสินค้า</summary>
        public List<OrderItem> Items { get; set; } = new();

        /// <summary>ชื่อร้าน / Shop</summary>
        public string ShopName { get; set; } = string.Empty;
    }

    /// <summary>
    /// ข้อมูลใบกำกับภาษี
    /// </summary>
    public class TaxInvoiceInfo
    {
        public string TaxId { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string BranchCode { get; set; } = string.Empty;
    }

    /// <summary>
    /// ข้อมูลการจัดส่ง
    /// </summary>
    public class ShippingInfo
    {
        public string Carrier { get; set; } = string.Empty;
        public string TrackingNumber { get; set; } = string.Empty;
        public string ShippingMethod { get; set; } = string.Empty;
        public decimal ShippingFee { get; set; }
        public DateTime? EstimatedDeliveryDate { get; set; }

        /// <summary>ที่อยู่ผู้รับพัสดุ</summary>
        public RecipientAddress? RecipientAddress { get; set; }
    }

    /// <summary>
    /// ข้อมูลที่อยู่ผู้รับพัสดุ (Normalized Shipping Address)
    /// </summary>
    public class RecipientAddress
    {
        /// <summary>ชื่อ-นามสกุล ผู้รับ</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>เบอร์โทรศัพท์ติดต่อ</summary>
        public string Phone { get; set; } = string.Empty;

        /// <summary>ที่อยู่บรรทัดที่ 1 (บ้านเลขที่, หมู่บ้าน, ซอย, ถนน)</summary>
        public string AddressLine1 { get; set; } = string.Empty;

        /// <summary>ที่อยู่บรรทัดที่ 2 (อาคาร, ชั้น, ห้อง - ถ้ามี)</summary>
        public string AddressLine2 { get; set; } = string.Empty;

        /// <summary>ตำบล / แขวง (Sub-district / Tumbol)</summary>
        public string SubDistrict { get; set; } = string.Empty;

        /// <summary>อำเภอ / เขต (District / Amphur)</summary>
        public string District { get; set; } = string.Empty;

        /// <summary>จังหวัด (Province / Changwat)</summary>
        public string Province { get; set; } = string.Empty;

        /// <summary>รหัสไปรษณีย์ (Postal / Zip Code)</summary>
        public string PostalCode { get; set; } = string.Empty;

        /// <summary>รหัสประเทศ (เช่น TH, SG)</summary>
        public string Country { get; set; } = "TH";

        /// <summary>ที่อยู่แบบเต็มบรรทัดเดียว (สำหรับพิมพ์ใบแปะหน้าด่วน)</summary>
        public string FullAddress { get; set; } = string.Empty;
    }
}
