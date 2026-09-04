using System.ComponentModel.DataAnnotations;
using OmsApi.Models.Common;

namespace OmsApi.Models.Shipping;

/// <summary>
/// A package and its item allocation as read from WMS.
/// </summary>
public class WmsPackageManifest
{
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public string OutboundOrderNumber { get; set; } = string.Empty;
    public Guid OutboundOrderMasterId { get; set; }
    public PlatformType? Platform { get; set; }
    public List<WmsPackageManifestPackage> Packages { get; set; } = new();
}

public class WmsPackageManifestPackage
{
    public Guid WmsPackageRef { get; set; }
    public int BoxNumber { get; set; }
    public Guid? CarrierId { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public string IsCloseBox { get; set; } = string.Empty;
    public double? TotalWeight { get; set; }
    public string BoxSize { get; set; } = string.Empty;
    public List<WmsPackageManifestItem> Items { get; set; } = new();
}

public class WmsPackageManifestItem
{
    public Guid WmsItemMasterId { get; set; }
    public Guid ItemMasterId { get; set; }
    public string ItemNumber { get; set; } = string.Empty;
    public string ItemDescription { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Uom { get; set; } = string.Empty;
    public string LotNumber { get; set; } = string.Empty;
}

/// <summary>
/// Runs the package workflow for one platform order. OMS validates the WMS
/// boxes, persists their item allocation, arranges shipment when required,
/// retrieves tracking numbers and saves them back to OMS/WMS.
/// </summary>
public class ProcessPlatformPackagesRequest
{
    [Required]
    public PlatformType Platform { get; set; }

    [Required, StringLength(128)]
    public string ShopId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string PlatformOrderId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string CustomerOrderNumber { get; set; } = string.Empty;
}

public class ProcessPlatformPackagesResult
{
    public PlatformType Platform { get; set; }
    public string ShopId { get; set; } = string.Empty;
    public string PlatformOrderId { get; set; } = string.Empty;
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public string Stage { get; set; } = "VALIDATED";
    public int TotalBoxes { get; set; }
    public List<ProcessPlatformPackageResult> Packages { get; set; } = new();
}

/// <summary>
/// Internal request used to split one platform order according to the physical
/// boxes that WMS has already closed.
/// </summary>
public class SplitPlatformOrderRequest
{
    public PlatformType Platform { get; set; }
    public string AccessToken { get; set; } = string.Empty;
    public string? ShopId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public List<WmsPackageManifestPackage> Packages { get; set; } = new();
}

public class SplitPlatformOrderResult
{
    public List<PlatformPackageMappingRequest> PackageMappings { get; set; } = new();
}

public class ProcessPlatformPackageResult
{
    public long? PlatformPackageRecordId { get; set; }
    public Guid WmsPackageRef { get; set; }
    public int BoxNumber { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalQuantity { get; set; }
    public string? PlatformPackageId { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "READY";
    public string? Error { get; set; }
}

/// <summary>
/// Request used by WMS/integration jobs to save the platform package result
/// back against a physical WMS box.
/// </summary>
public class SyncPlatformPackagesRequest
{
    [Required]
    public PlatformType Platform { get; set; }

    [Required, StringLength(128)]
    public string ShopId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string PlatformOrderId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string CustomerOrderNumber { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public List<SyncPlatformPackageRequest> Packages { get; set; } = new();
}

public class SyncPlatformPackageRequest
{
    [Required]
    public Guid WmsPackageRef { get; set; }

    public int? BoxNumber { get; set; }

    [StringLength(128)]
    public string? PlatformPackageId { get; set; }

    [StringLength(256)]
    public string? TrackingNumber { get; set; }

    [StringLength(128)]
    public string? ShippingProviderId { get; set; }

    [StringLength(256)]
    public string? ShippingProviderName { get; set; }

    [StringLength(32)]
    public string? PackageStatus { get; set; }

    [StringLength(2000)]
    public string? Error { get; set; }

    public List<SyncPlatformPackageItemRequest> Items { get; set; } = new();
}

public class SyncPlatformPackageItemRequest
{
    [StringLength(128)]
    public string? PlatformItemId { get; set; }

    [StringLength(128)]
    public string? PlatformSkuId { get; set; }

    public Guid? WmsItemMasterId { get; set; }

    [Required, StringLength(128)]
    public string ItemNumber { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.0001", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
}

public class PlatformPackageRecordResult
{
    public long PlatformPackageRecordId { get; set; }
    public Guid WmsPackageRef { get; set; }
    public int BoxNumber { get; set; }
    public string? PlatformPackageId { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public string PackageStatus { get; set; } = string.Empty;
    public string SyncStatus { get; set; } = string.Empty;
    public string? Error { get; set; }
}

public class SyncPlatformPackagesResult
{
    public PlatformType Platform { get; set; }
    public string PlatformOrderId { get; set; } = string.Empty;
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public int TotalPackages { get; set; }
    public int SucceededPackages { get; set; }
    public int FailedPackages { get; set; }
    public List<PlatformPackageRecordResult> Packages { get; set; } = new();
}

/// <summary>
/// Requests OMS to read the current package/tracking result from a platform
/// and persist it against WMS boxes. For split orders, provide one mapping for
/// every platform package so tracking numbers cannot be assigned to the wrong
/// physical box.
/// </summary>
public class SyncPlatformTrackingRequest
{
    [Required]
    public PlatformType Platform { get; set; }

    [StringLength(512)]
    public string? AccessToken { get; set; }

    [Required, StringLength(128)]
    public string ShopId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string PlatformOrderId { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string CustomerOrderNumber { get; set; } = string.Empty;

    public List<PlatformPackageMappingRequest> PackageMappings { get; set; } = new();
}

public class PlatformPackageMappingRequest
{
    [Required]
    public Guid WmsPackageRef { get; set; }

    [StringLength(128)]
    public string? PlatformPackageId { get; set; }
}
