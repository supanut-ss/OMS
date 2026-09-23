namespace OmsApi.Models.Persistence;

/// <summary>
/// Maps one physical WMS packing box to a package created by a sales platform.
/// The WMS package id is kept as a reference because the WMS tables live in a
/// different bounded context even when they share the same SQL Server database.
/// </summary>
public class PlatformPackage
{
    public long PlatformPackageRecordId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string PlatformOrderId { get; set; } = string.Empty;
    public string CustomerOrderNumber { get; set; } = string.Empty;

    /// <summary>
    /// Optional link to the matching oms.t_oms_order row. Null when the
    /// package was created before the order was synced into t_oms_order.
    /// </summary>
    public long? OrderRecordId { get; set; }
    public Guid OutboundOrderMasterId { get; set; }
    public Guid OutboundSortMasterId { get; set; }
    public int BoxNumber { get; set; }
    public string? PlatformPackageId { get; set; }
    public string? TrackingNumber { get; set; }
    public string? ShippingProviderId { get; set; }
    public string? ShippingProviderName { get; set; }
    public string PackageStatus { get; set; } = "PENDING";
    public string SyncStatus { get; set; } = "PENDING";
    public int AttemptCount { get; set; }
    public string? RequestId { get; set; }
    public DateTime? LastSyncDate { get; set; }
    public string? LastError { get; set; }
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<PlatformPackageItem> Items { get; set; } = new List<PlatformPackageItem>();
    public PlatformOrder? PlatformOrder { get; set; }
}

/// <summary>
/// Item allocation snapshot used when a platform requires order-item ids to
/// create or confirm a split package.
/// </summary>
public class PlatformPackageItem
{
    public long PlatformPackageItemId { get; set; }
    public long PlatformPackageRecordId { get; set; }
    public string? PlatformItemId { get; set; }
    public string? PlatformSkuId { get; set; }
    public Guid WmsItemMasterId { get; set; }
    public string ItemNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public PlatformPackage? PlatformPackage { get; set; }
}

/// <summary>
/// Read-only projections of the existing WMS outbound tables.
/// </summary>
public class WmsOutboundMaster
{
    public Guid OutboundOrderMasterId { get; set; }
    public Guid WhMasterId { get; set; }
    public Guid OwnerId { get; set; }
    public string OutboundOrderNumber { get; set; } = string.Empty;
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public string? Platform { get; set; }
}

public class WmsOutboundPackingMaster
{
    public Guid OutboundSortMasterId { get; set; }
    public Guid WhMasterId { get; set; }
    public Guid OwnerId { get; set; }
    public Guid OutboundOrderMasterId { get; set; }
    public string OutboundOrderNumber { get; set; } = string.Empty;
    public Guid? CarrierId { get; set; }
    public int BoxNumber { get; set; }
    public string? TrackingNo { get; set; }
    public double? TotalWeight { get; set; }
    public string? BoxSize { get; set; }
    public string? IsCloseBox { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}

public class WmsOutboundPackingDetail
{
    public Guid OutboundSortDetailId { get; set; }
    public Guid OutboundSortMasterId { get; set; }
    public Guid WhItemMasterId { get; set; }
    public Guid ItemMasterId { get; set; }
    public string ItemNumber { get; set; } = string.Empty;
    public string? ItemDescription { get; set; }
    public double QuantitySort { get; set; }
    public Guid ItemUomId { get; set; }
    public string? Uom { get; set; }
    public string? LotNumber { get; set; }
    public DateTime? MfgDate { get; set; }
    public string? ExpiryDate { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
