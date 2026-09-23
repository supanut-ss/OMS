namespace OmsApi.Models.Persistence;

/// <summary>
/// Normalized order header aggregated from Shopee/Lazada/TikTok, one row per
/// platform order. Mirrors OmsApi.Models.Orders.UnifiedOrder for persistence.
/// </summary>
public class PlatformOrder
{
    public long OrderRecordId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string PlatformOrderId { get; set; } = string.Empty;
    public string ShopName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string OriginalStatus { get; set; } = string.Empty;
    public string? BuyerName { get; set; }
    public string? BuyerRemarks { get; set; }
    public bool TaxInvoiceRequested { get; set; }
    public string? TaxInvoiceTaxId { get; set; }
    public string? TaxInvoiceCompanyName { get; set; }
    public string? TaxInvoiceAddress { get; set; }
    public string? TaxInvoiceBranchCode { get; set; }
    public DateTime? CancellationDeadline { get; set; }
    public DateTime OrderCreatedDate { get; set; }
    public DateTime? OrderUpdatedDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "THB";
    public string? ShippingCarrier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? PackageNumber { get; set; }
    public string? ShippingMethod { get; set; }
    public decimal? ShippingFee { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public string? RecipientName { get; set; }
    public string? RecipientPhone { get; set; }
    public string? RecipientAddressLine1 { get; set; }
    public string? RecipientAddressLine2 { get; set; }
    public string? RecipientSubDistrict { get; set; }
    public string? RecipientDistrict { get; set; }
    public string? RecipientProvince { get; set; }
    public string? RecipientPostalCode { get; set; }
    public string? RecipientCountry { get; set; }
    public string? RecipientFullAddress { get; set; }
    public string SyncStatus { get; set; } = "SYNCED";
    public DateTime? LastSyncDate { get; set; }
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PlatformOrderItem> Items { get; set; } = new List<PlatformOrderItem>();
    public ICollection<PlatformPackage> Packages { get; set; } = new List<PlatformPackage>();
}

/// <summary>
/// Normalized order line item. Mirrors OmsApi.Models.Orders.OrderItem for persistence.
/// </summary>
public class PlatformOrderItem
{
    public long OrderItemRecordId { get; set; }
    public long OrderRecordId { get; set; }
    public string? PlatformItemId { get; set; }
    public long? ModelId { get; set; }
    public long? PlatformOrderItemId { get; set; }
    public long? PromotionGroupId { get; set; }
    public string? Sku { get; set; }
    public string? ItemName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal Discount { get; set; }
    public string? ImageUrl { get; set; }
    public string? Variation { get; set; }
    public decimal? Weight { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public PlatformOrder? PlatformOrder { get; set; }
}
