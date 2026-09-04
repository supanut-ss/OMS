namespace OmsApi.Models.Persistence;

public class PlatformDocument
{
    public long PlatformDocumentId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string PlatformOrderId { get; set; } = string.Empty;
    public string? PlatformPackageId { get; set; }
    public string? TrackingNumber { get; set; }
    public string DocumentType { get; set; } = "WAYBILL";
    public string SourceFormat { get; set; } = "PDF";
    public string? SourceContentType { get; set; }
    public string? RawStorageKey { get; set; }
    public string? PrintStorageKey { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileChecksum { get; set; }
    public string DocumentStatus { get; set; } = "PENDING";
    public string? PlatformRequestId { get; set; }
    public DateTime? SourceExpiresDate { get; set; }
    public string? LastError { get; set; }
    public int PrintCount { get; set; }
    public DateTime? LastPrintDate { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
