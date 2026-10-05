namespace ApiCore.Models.Responses
{
    public sealed class ConnectorResponse
    {
        public long PlatformCredentialId { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string ShopId { get; set; } = string.Empty;
        public string? ShopName { get; set; }
        public bool HasAccessToken { get; set; }
        public bool HasRefreshToken { get; set; }
        public bool HasAppKey { get; set; }
        public bool HasAppSecret { get; set; }
        public string? RedirectUrl { get; set; }
        public string? ServiceId { get; set; }
        public DateTime? AccessTokenExpiresDate { get; set; }
        public DateTime? RefreshTokenExpiresDate { get; set; }
        public bool IsActive { get; set; }
        public bool RequiresReauthorization { get; set; }
        public DateTime? LastRefreshDate { get; set; }
        public DateTime? LastUseDate { get; set; }
        public string? LastError { get; set; }
        public DateTime CreateDate { get; set; }
        public DateTime? UpdateDate { get; set; }
    }
}
