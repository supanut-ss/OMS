using System.ComponentModel.DataAnnotations;
using OmsApi.Models.Common;

namespace OmsApi.Models.Shipping;

public class EnsureWaybillRequest
{
    [Required]
    public PlatformType Platform { get; set; }

    [StringLength(128)]
    public string? ShopId { get; set; }

    [Required, StringLength(128)]
    public string PlatformOrderId { get; set; } = string.Empty;

    [StringLength(32)]
    public string ShippingDocumentType { get; set; } = "NORMAL_AIR_WAYBILL";
}

public class PlatformDocumentResult
{
    public long PlatformDocumentId { get; set; }
    public PlatformType Platform { get; set; }
    public string ShopId { get; set; } = string.Empty;
    public string PlatformOrderId { get; set; } = string.Empty;
    public string? PlatformPackageId { get; set; }
    public string? TrackingNumber { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentStatus { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long? FileSize { get; set; }
    public string? Error { get; set; }
}

public class PlatformDocumentFile
{
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = "application/pdf";
    public string FileName { get; set; } = "waybill.pdf";
}

public class ReviewWaybillRequest
{
    [Required]
    public PlatformType Platform { get; set; }

    [StringLength(128)]
    public string? ShopId { get; set; }

    [Required, StringLength(128)]
    public string PlatformOrderId { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public List<Guid> WmsPackageRefs { get; set; } = new();

    [StringLength(32)]
    public string ShippingDocumentType { get; set; } = "NORMAL_AIR_WAYBILL";
}
