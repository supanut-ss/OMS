namespace OmsApi.Models.Persistence;
public class PlatformCredential
{
    public long PlatformCredentialId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public string? RefreshTokenEncrypted { get; set; }
    public DateTime AccessTokenExpiresDate { get; set; }
    public DateTime? RefreshTokenExpiresDate { get; set; }
    public string IsActive { get; set; } = "YES";
    public string RequiresReauthorization { get; set; } = "NO";
    public DateTime? LastRefreshDate { get; set; }
    public DateTime? LastUseDate { get; set; }
    public string? LastError { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}