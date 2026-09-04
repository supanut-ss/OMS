namespace OmsApi.Models.Orders
{
    /// <summary>
    /// Unified order item model
    /// </summary>
    public class OrderItem
    {
        /// <summary>Platform-specific item ID</summary>
        public string ItemId { get; set; } = string.Empty;

        /// <summary>Platform-specific variation/model ID</summary>
        public long ModelId { get; set; }

        /// <summary>Platform order-line identity used by package operations</summary>
        public long OrderItemId { get; set; }

        /// <summary>Platform promotion group identity used by package operations</summary>
        public long PromotionGroupId { get; set; }

        /// <summary>SKU</summary>
        public string Sku { get; set; } = string.Empty;

        /// <summary>ชื่อสินค้า</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>จำนวน</summary>
        public int Quantity { get; set; }

        /// <summary>ราคาต่อชิ้น</summary>
        public decimal UnitPrice { get; set; }

        /// <summary>ราคารวม</summary>
        public decimal TotalPrice { get; set; }

        /// <summary>ส่วนลด</summary>
        public decimal Discount { get; set; }

        /// <summary>URL รูปสินค้า</summary>
        public string ImageUrl { get; set; } = string.Empty;

        /// <summary>Variation / ตัวเลือก (เช่น สี, ไซส์)</summary>
        public string Variation { get; set; } = string.Empty;

        /// <summary>น้ำหนัก (กรัม)</summary>
        public decimal? Weight { get; set; }
    }
}
