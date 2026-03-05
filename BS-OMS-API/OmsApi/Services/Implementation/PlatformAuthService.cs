using OmsApi.Helpers;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    /// <summary>
    /// Service for managing OAuth authentication with Shopee, Lazada, and TikTok
    /// </summary>
    public class PlatformAuthService : IPlatformAuthService
    {
        private readonly ILogger<PlatformAuthService> _logger;

        // Shopee credentials
        private readonly long _shopeePartnerId;
        private readonly string _shopeePartnerKey;
        private readonly string _shopeeApiUrl;
        private readonly string _shopeeRedirectUrl;

        // Lazada credentials
        private readonly string _lazadaAppKey;
        private readonly string _lazadaAppSecret;
        private readonly string _lazadaAuthUrl;
        private readonly string _lazadaRedirectUrl;

        // TikTok credentials
        private readonly string _tiktokAppKey;
        private readonly string _tiktokAppSecret;
        private readonly string _tiktokAuthUrl;
        private readonly string _tiktokRedirectUrl;

        public PlatformAuthService(ILogger<PlatformAuthService> logger)
        {
            _logger = logger;

            _shopeePartnerId = long.TryParse(Environment.GetEnvironmentVariable("SHOPEE_PARTNER_ID"), out var sid) ? sid : 0;
            _shopeePartnerKey = Environment.GetEnvironmentVariable("SHOPEE_PARTNER_KEY") ?? "";
            _shopeeApiUrl = Environment.GetEnvironmentVariable("SHOPEE_API_URL") ?? "https://partner.shopeemobile.com";
            _shopeeRedirectUrl = Environment.GetEnvironmentVariable("SHOPEE_REDIRECT_URL") ?? "";

            _lazadaAppKey = Environment.GetEnvironmentVariable("LAZADA_APP_KEY") ?? "";
            _lazadaAppSecret = Environment.GetEnvironmentVariable("LAZADA_APP_SECRET") ?? "";
            _lazadaAuthUrl = Environment.GetEnvironmentVariable("LAZADA_AUTH_URL") ?? "https://auth.lazada.com/oauth/authorize";
            _lazadaRedirectUrl = Environment.GetEnvironmentVariable("LAZADA_REDIRECT_URL") ?? "";

            _tiktokAppKey = Environment.GetEnvironmentVariable("TIKTOK_APP_KEY") ?? "";
            _tiktokAppSecret = Environment.GetEnvironmentVariable("TIKTOK_APP_SECRET") ?? "";
            _tiktokAuthUrl = Environment.GetEnvironmentVariable("TIKTOK_AUTH_URL") ?? "https://services.tiktokshop.com/open/authorize";
            _tiktokRedirectUrl = Environment.GetEnvironmentVariable("TIKTOK_REDIRECT_URL") ?? "";
        }

        public string GetAuthorizationUrl(PlatformType platform, string? state = null)
        {
            state ??= Guid.NewGuid().ToString("N");

            return platform switch
            {
                PlatformType.Shopee => GetShopeeAuthUrl(state),
                PlatformType.Lazada => GetLazadaAuthUrl(state),
                PlatformType.TikTok => GetTikTokAuthUrl(state),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }

        public async Task<TokenInfo> HandleCallbackAsync(PlatformType platform, string code, string? shopId = null)
        {
            _logger.LogInformation("🔑 Handling OAuth callback for {Platform}", platform);

            return platform switch
            {
                PlatformType.Shopee => await HandleShopeeCallbackAsync(code, shopId),
                PlatformType.Lazada => await HandleLazadaCallbackAsync(code),
                PlatformType.TikTok => await HandleTikTokCallbackAsync(code),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }

        public async Task<TokenInfo> RefreshTokenAsync(PlatformType platform, string refreshToken, string? shopId = null)
        {
            _logger.LogInformation("🔄 Refreshing token for {Platform}", platform);

            // Token refresh implementation would follow the same pattern
            // Each platform has its own refresh endpoint
            return await Task.FromResult(new TokenInfo
            {
                Platform = platform,
                AccessToken = "refresh_not_yet_implemented",
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddHours(4)
            });
        }

        #region Shopee Auth

        private string GetShopeeAuthUrl(string state)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/shop/auth_partner";
            var redirectUrl = Uri.EscapeDataString(_shopeeRedirectUrl);
            var sign = SignatureHelper.GenerateShopeeSignature(_shopeePartnerKey, _shopeePartnerId, apiPath, timestamp);

            return $"{_shopeeApiUrl}{apiPath}?partner_id={_shopeePartnerId}&timestamp={timestamp}" +
                   $"&sign={sign}&redirect={redirectUrl}";
        }

        private async Task<TokenInfo> HandleShopeeCallbackAsync(string code, string? shopId)
        {
            // In production, this would call /api/v2/auth/token/get
            _logger.LogInformation("🛒 Shopee OAuth callback: code={Code}, shopId={ShopId}", code, shopId);

            return await Task.FromResult(new TokenInfo
            {
                Platform = PlatformType.Shopee,
                AccessToken = $"shopee_token_{code}",
                RefreshToken = $"shopee_refresh_{code}",
                ShopId = shopId,
                ExpiresAt = DateTime.UtcNow.AddHours(4),
                RefreshExpiresAt = DateTime.UtcNow.AddDays(30)
            });
        }

        #endregion

        #region Lazada Auth

        private string GetLazadaAuthUrl(string state)
        {
            return $"{_lazadaAuthUrl}?response_type=code&force_auth=true" +
                   $"&redirect_uri={Uri.EscapeDataString(_lazadaRedirectUrl)}" +
                   $"&client_id={_lazadaAppKey}&state={state}";
        }

        private async Task<TokenInfo> HandleLazadaCallbackAsync(string code)
        {
            // In production, this would call /auth/token/create
            _logger.LogInformation("🏪 Lazada OAuth callback: code={Code}", code);

            return await Task.FromResult(new TokenInfo
            {
                Platform = PlatformType.Lazada,
                AccessToken = $"lazada_token_{code}",
                RefreshToken = $"lazada_refresh_{code}",
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                RefreshExpiresAt = DateTime.UtcNow.AddDays(30)
            });
        }

        #endregion

        #region TikTok Auth

        private string GetTikTokAuthUrl(string state)
        {
            return $"{_tiktokAuthUrl}?app_key={_tiktokAppKey}&state={state}";
        }

        private async Task<TokenInfo> HandleTikTokCallbackAsync(string code)
        {
            // In production, this would call /api/v2/token/get
            _logger.LogInformation("🎵 TikTok OAuth callback: code={Code}", code);

            return await Task.FromResult(new TokenInfo
            {
                Platform = PlatformType.TikTok,
                AccessToken = $"tiktok_token_{code}",
                RefreshToken = $"tiktok_refresh_{code}",
                ExpiresAt = DateTime.UtcNow.AddHours(12),
                RefreshExpiresAt = DateTime.UtcNow.AddDays(365)
            });
        }

        #endregion
    }
}
