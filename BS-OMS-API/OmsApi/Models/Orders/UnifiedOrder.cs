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
    }
}
