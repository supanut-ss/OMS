using System.ComponentModel.DataAnnotations;
using OmsApi.Models.Common;

namespace OmsApi.Models.Auth
{
    /// <summary>
    /// Platform credentials configuration
    /// </summary>
    public class PlatformCredentials
    {
        public PlatformType Platform { get; set; }
        public string AppKey { get; set; } = string.Empty;
        public string AppSecret { get; set; } = string.Empty;
        public string ApiBaseUrl { get; set; } = string.Empty;
        public string RedirectUrl { get; set; } = string.Empty;
        public string? AuthUrl { get; set; }
    }

    /// <summary>
    /// Token information received from OAuth flow
    /// </summary>
    public class TokenInfo
    {
        public PlatformType Platform { get; set; }
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime RefreshExpiresAt { get; set; }
        public string? ShopId { get; set; }
        public string? ShopName { get; set; }
    }

    /// <summary>
    /// Token refresh request
    /// </summary>
    public class RefreshTokenRequest
    {
        [Required]
        [StringLength(512)]
        public string RefreshToken { get; set; } = string.Empty;

        public string? ShopId { get; set; }
    }
}
