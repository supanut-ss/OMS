namespace ApiCore.Models.Responses
{
    public sealed class PlatformAppResponse
    {
        public long PlatformAppId { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string AppName { get; set; } = string.Empty;
        public string CountryCode { get; set; } = string.Empty;
        public string Environment { get; set; } = string.Empty;
        public string RedirectUrl { get; set; } = string.Empty;
        public string? ServiceId { get; set; }
        public bool HasAppKey { get; set; }
        public bool HasAppSecret { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public int ShopCount { get; set; }
        public DateTime CreateDate { get; set; }
        public string? CreateBy { get; set; }
        public DateTime? UpdateDate { get; set; }
        public string? UpdateBy { get; set; }
    }
}
