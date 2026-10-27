namespace OmsApi.Models.Persistence;

public sealed class OAuthSession
{
    public Guid OAuthSessionId { get; set; }
    public byte[] StateHash { get; set; } = Array.Empty<byte>();
    public long PlatformAppId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string? RequestedBy { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime ExpiresDate { get; set; }
    public DateTime? ConsumedDate { get; set; }
    public string? CallbackError { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public PlatformApp PlatformApp { get; set; } = null!;
}
