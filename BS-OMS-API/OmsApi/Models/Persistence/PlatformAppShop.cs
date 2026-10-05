namespace OmsApi.Models.Persistence;

public sealed class PlatformAppShop
{
    public long PlatformAppShopId { get; set; }
    public long PlatformAppId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string IsActive { get; set; } = "YES";
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
    public string? UpdateBy { get; set; }
    public DateTime? UpdateDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public PlatformApp PlatformApp { get; set; } = null!;
}
