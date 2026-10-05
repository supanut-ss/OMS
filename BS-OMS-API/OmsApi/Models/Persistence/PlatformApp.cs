namespace OmsApi.Models.Persistence;

public sealed class PlatformApp
{
    public long PlatformAppId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string AppName { get; set; } = string.Empty;
    public string AppKeyEncrypted { get; set; } = string.Empty;
    public string AppSecretEncrypted { get; set; } = string.Empty;
    public string RedirectUrl { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string IsActive { get; set; } = "YES";
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public ICollection<PlatformAppShop> Shops { get; set; } = new List<PlatformAppShop>();
}
