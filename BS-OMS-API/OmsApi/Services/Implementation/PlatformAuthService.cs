using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Persistence;
using System.Text.Json;
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
        private const string SystemUser = "OMS_API";
        private readonly ILogger<PlatformAuthService> _logger;
        private readonly ApplicationDbContext _db;
        private readonly IDataProtector _tokenProtector;
        private readonly IDataProtector _oauthStateProtector;

        // Shopee credentials
        private long _shopeePartnerId;
        private string _shopeePartnerKey = string.Empty;
        private readonly string _shopeeApiUrl;
        private string _shopeeRedirectUrl = string.Empty;

        // Lazada credentials
        private string _lazadaAppKey = string.Empty;
        private string _lazadaAppSecret = string.Empty;
        private readonly string _lazadaAuthUrl;
        private readonly string _lazadaAuthApiUrl;
        private string _lazadaRedirectUrl = string.Empty;

        // TikTok credentials
        private string _tiktokAppKey = string.Empty;
        private string _tiktokAppSecret = string.Empty;
        private string _tiktokServiceId = string.Empty;
        private readonly string _tiktokAuthUrl;
        private readonly string _tiktokAuthApiUrl;
        private readonly string _tiktokApiUrl;
        private string _tiktokRedirectUrl = string.Empty;

        public PlatformAuthService(ILogger<PlatformAuthService> logger, ApplicationDbContext db, IDataProtectionProvider protectionProvider)
        {
            _db = db;
            _tokenProtector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");
            _oauthStateProtector = protectionProvider.CreateProtector("OmsApi.OAuthState.v1");
            _logger = logger;

            _shopeeApiUrl = Environment.GetEnvironmentVariable("SHOPEE_API_URL") ?? "https://partner.shopeemobile.com";
            _lazadaAuthUrl = Environment.GetEnvironmentVariable("LAZADA_AUTH_URL") ?? "https://auth.lazada.com/oauth/authorize";
            _lazadaAuthApiUrl = Environment.GetEnvironmentVariable("LAZADA_AUTH_API_URL") ?? "https://auth.lazada.com/rest";
            _tiktokAuthUrl = Environment.GetEnvironmentVariable("TIKTOK_AUTH_URL") ?? "https://services.tiktokshop.com/open/authorize";
            _tiktokAuthApiUrl = Environment.GetEnvironmentVariable("TIKTOK_AUTH_API_URL") ?? "https://auth.tiktok-shops.com";
            _tiktokApiUrl = Environment.GetEnvironmentVariable("TIKTOK_API_URL") ?? "https://open-api.tiktokglobalshop.com";
        }

        public async Task<string> GetAuthorizationUrlAsync(PlatformType platform, long platformAppShopId, CancellationToken cancellationToken = default)
        {
            await LoadAppCredentialAsync(platform, platformAppShopId, cancellationToken);
            var state = _oauthStateProtector.Protect(JsonSerializer.Serialize(new OAuthState(platformAppShopId, platform, DateTime.UtcNow.AddMinutes(10))));

            return platform switch
            {
                PlatformType.Shopee => GetShopeeAuthUrl(state),
                PlatformType.Lazada => GetLazadaAuthUrl(state),
                PlatformType.TikTok => GetTikTokAuthUrl(state),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }

        public async Task<TokenInfo> HandleCallbackAsync(PlatformType platform, string code, string? shopId = null, string? state = null)
        {
            _logger.LogInformation("🔑 Handling OAuth callback for {Platform}", platform);
            if (string.IsNullOrWhiteSpace(state)) throw new ArgumentException("OAuth state is required.");
            var oauthState = JsonSerializer.Deserialize<OAuthState>(_oauthStateProtector.Unprotect(state))
                ?? throw new ArgumentException("OAuth state is invalid.");
            if (oauthState.Platform != platform || oauthState.ExpiresAtUtc <= DateTime.UtcNow)
                throw new ArgumentException("OAuth state is invalid or expired.");

            var appShop = await _db.PlatformAppShops.SingleOrDefaultAsync(
                x => x.PlatformAppShopId == oauthState.PlatformAppShopId && x.Platform == platform.ToString())
                ?? throw new InvalidOperationException("Configured connector was not found for the OAuth callback.");
            if (platform == PlatformType.Shopee && !string.Equals(appShop.ShopId, shopId, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Shopee callback shop_id does not match the configured connector.");
            await LoadAppCredentialAsync(platform, appShop.PlatformAppShopId, CancellationToken.None);

            return platform switch
            {
                PlatformType.Shopee => await HandleShopeeCallbackAsync(code, appShop.ShopId),
                PlatformType.Lazada => await HandleLazadaCallbackAsync(code, appShop.ShopId),
                PlatformType.TikTok => await HandleTikTokCallbackAsync(code, appShop.ShopId),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }

        private async Task LoadAppCredentialAsync(PlatformType platform, long credentialId, CancellationToken cancellationToken)
        {
            var appShop = await _db.PlatformAppShops.Include(x => x.PlatformApp)
                .SingleOrDefaultAsync(x => x.PlatformAppShopId == credentialId, cancellationToken)
                ?? throw new InvalidOperationException("Connector was not found.");
            if (!string.Equals(appShop.Platform, platform.ToString(), StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Connector platform does not match the OAuth platform.");
            if (appShop.IsActive != "YES" || appShop.PlatformApp.IsActive != "YES")
                throw new InvalidOperationException("Connector or App Master is inactive.");
            try
            {
                var appKey = _tokenProtector.Unprotect(appShop.PlatformApp.AppKeyEncrypted);
                var appSecret = _tokenProtector.Unprotect(appShop.PlatformApp.AppSecretEncrypted);
                var redirectUrl = appShop.PlatformApp.RedirectUrl?.Trim();
                if (string.IsNullOrWhiteSpace(redirectUrl)) throw new InvalidOperationException("Redirect URL is not configured.");
                switch (platform)
                {
                    case PlatformType.Shopee:
                        if (!long.TryParse(appKey, out _shopeePartnerId) || _shopeePartnerId <= 0) throw new InvalidOperationException("Shopee Partner ID is invalid.");
                        _shopeePartnerKey = appSecret; _shopeeRedirectUrl = redirectUrl; break;
                    case PlatformType.Lazada:
                        _lazadaAppKey = appKey; _lazadaAppSecret = appSecret; _lazadaRedirectUrl = redirectUrl; break;
                    case PlatformType.TikTok:
                        _tiktokAppKey = appKey; _tiktokAppSecret = appSecret; _tiktokRedirectUrl = redirectUrl; _tiktokServiceId = appShop.PlatformApp.ServiceId?.Trim() ?? string.Empty; break;
                }
            }
            catch (PlatformCredentialException) { throw; }
            catch (Exception ex) { throw new InvalidOperationException("Connector app credential could not be decrypted or is incomplete.", ex); }
        }

        private sealed record OAuthState(long PlatformAppShopId, PlatformType Platform, DateTime ExpiresAtUtc);

        public async Task<TokenInfo> RefreshTokenAsync(PlatformType platform, string refreshToken, string? shopId = null)
        {
            _logger.LogInformation("🔄 Refreshing token for {Platform}", platform);
            if (string.IsNullOrWhiteSpace(shopId))
                throw new ArgumentException("shopId is required when refreshing a connector token.");
            var appShop = await _db.PlatformAppShops.SingleOrDefaultAsync(x =>
                x.Platform == platform.ToString() && x.ShopId == shopId);
            if (appShop == null)
                throw new InvalidOperationException("Connector was not found for the requested shop.");
            await LoadAppCredentialAsync(platform, appShop.PlatformAppShopId, CancellationToken.None);

            return platform switch
            {
                PlatformType.Shopee => await RefreshShopeeTokenAsync(refreshToken, shopId),
                PlatformType.Lazada => await RefreshLazadaTokenAsync(refreshToken, shopId),
                PlatformType.TikTok => await RefreshTikTokTokenAsync(refreshToken, shopId),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }

        public async Task<TokenInfo> ImportSandboxTokenAsync(PlatformType platform, SandboxTokenRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
                throw new ArgumentException("accessToken is required.", nameof(request));
            if (string.IsNullOrWhiteSpace(request.ShopId))
                throw new ArgumentException("shopId is required.", nameof(request));
            if (platform == PlatformType.Shopee &&
                (!long.TryParse(request.ShopId.Trim(), out var shopeeShopId) || shopeeShopId <= 0))
                throw new ArgumentException("shopId must be the numeric Shopee Sandbox shop_id.", nameof(request));

            var now = DateTime.UtcNow;
            var accessExpiresIn = request.ExpiresInSeconds ??
                (platform == PlatformType.Shopee ? 14400 : 604800);
            var refreshExpiresIn = request.RefreshExpiresInSeconds ?? 2592000;
            var hasRefreshToken = !string.IsNullOrWhiteSpace(request.RefreshToken);
            var tokenInfo = new TokenInfo
            {
                Platform = platform,
                AccessToken = request.AccessToken.Trim(),
                RefreshToken = hasRefreshToken ? request.RefreshToken!.Trim() : string.Empty,
                ShopId = request.ShopId.Trim(),
                ShopName = string.IsNullOrWhiteSpace(request.ShopName)
                    ? $"{platform} Sandbox"
                    : $"{request.ShopName.Trim()} [SANDBOX]",
                ExpiresAt = now.AddSeconds(accessExpiresIn),
                RefreshExpiresAt = hasRefreshToken
                    ? now.AddSeconds(refreshExpiresIn)
                    : now
            };
            await SaveCredentialAsync(tokenInfo);

            _logger.LogInformation(
                "Imported encrypted {Platform} Sandbox credential for shop {ShopId}; expires at {ExpiresAt}",
                platform,
                tokenInfo.ShopId,
                tokenInfo.ExpiresAt);

            return tokenInfo;
        }

        #region Shopee Auth

        private string GetShopeeAuthUrl(string state)
        {
            var timestamp = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath = "/api/v2/shop/auth_partner";
            var redirectUrl = Uri.EscapeDataString(BuildShopeeRedirectUrl(_shopeeRedirectUrl, state));
            var sign = SignatureHelper.GenerateShopeeSignature(_shopeePartnerKey, _shopeePartnerId, apiPath, timestamp);

            return $"{_shopeeApiUrl}{apiPath}?partner_id={_shopeePartnerId}&timestamp={timestamp}" +
                   $"&sign={sign}&redirect={redirectUrl}";
        }

        /// <summary>
        /// Shopee has no OAuth "state" parameter and only appends code/shop_id to
        /// the redirect URL, so the signed state travels inside the redirect URL
        /// itself and comes back on the callback request.
        /// </summary>
        private static string BuildShopeeRedirectUrl(string redirectUrl, string state)
        {
            var separator = redirectUrl.Contains('?') ? "&" : "?";
            return $"{redirectUrl}{separator}state={Uri.EscapeDataString(state)}";
        }

        private async Task<TokenInfo> HandleShopeeCallbackAsync(string code, string? shopId)
        {
            _logger.LogInformation("Processing Shopee OAuth callback for shop {ShopId}", shopId);

            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var timestamp  = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath    = "/api/v2/auth/token/get";
            var sign       = SignatureHelper.GenerateShopeeSignature(_shopeePartnerKey, _shopeePartnerId, apiPath, timestamp);

            var url  = $"{_shopeeApiUrl}{apiPath}?partner_id={_shopeePartnerId}&timestamp={timestamp}&sign={sign}";
            var body = JsonSerializer.Serialize(new { code, shop_id = shopIdLong, partner_id = _shopeePartnerId });

            try
            {
                using var http     = new HttpClient();
                using var content  = new StringContent(body, Encoding.UTF8, "application/json");
                var response       = await http.PostAsync(url, content);
                var responseBody   = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("🛒 Shopee token response: {Body}", responseBody);

                var json = JsonDocument.Parse(responseBody);
                var root = json.RootElement;

                if (root.TryGetProperty("error", out var err) && !string.IsNullOrEmpty(err.GetString()))
                {
                    _logger.LogError("❌ Shopee token error: {Error} - {Msg}",
                        err.GetString(), root.TryGetProperty("message", out var m) ? m.GetString() : "");
                    throw new InvalidOperationException($"Shopee token exchange failed: {err.GetString()}");
                }

                var expireIn = root.TryGetProperty("expire_in", out var ei) ? ei.GetInt32() : 14400;

                var tokenInfo = new TokenInfo
                {
                    Platform        = PlatformType.Shopee,
                    AccessToken     = root.TryGetProperty("access_token",  out var at) ? at.GetString() ?? "" : "",
                    RefreshToken    = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "",
                    ShopId          = shopId,
                    ExpiresAt       = DateTime.UtcNow.AddSeconds(expireIn),
                    RefreshExpiresAt = DateTime.UtcNow.AddDays(30)

                };

                await SaveCredentialAsync(tokenInfo);
                return tokenInfo;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "❌ Shopee: Error exchanging token");
                throw;
            }
        }

        private async Task<TokenInfo> RefreshShopeeTokenAsync(string refreshToken, string? shopId)
        {
            _logger.LogInformation("🔄 Shopee token refresh: shopId={ShopId}", shopId);

            var shopIdLong = long.TryParse(shopId, out var sid) ? sid : 0;
            var timestamp  = DateTimeHelper.CurrentUnixTimestamp();
            var apiPath    = "/api/v2/auth/access_token/get";
            var sign       = SignatureHelper.GenerateShopeeSignature(_shopeePartnerKey, _shopeePartnerId, apiPath, timestamp);

            var url  = $"{_shopeeApiUrl}{apiPath}?partner_id={_shopeePartnerId}&timestamp={timestamp}&sign={sign}";
            var body = JsonSerializer.Serialize(new { refresh_token = refreshToken, shop_id = shopIdLong, partner_id = _shopeePartnerId });

            try
            {
                using var http     = new HttpClient();
                using var content  = new StringContent(body, Encoding.UTF8, "application/json");
                var response       = await http.PostAsync(url, content);
                var responseBody   = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("🔄 Shopee refresh response: {Body}", responseBody);

                var json = JsonDocument.Parse(responseBody);
                var root = json.RootElement;

                if (root.TryGetProperty("error", out var err) && !string.IsNullOrEmpty(err.GetString()))
                {
                    _logger.LogError("❌ Shopee refresh error: {Error} - {Msg}",
                        err.GetString(), root.TryGetProperty("message", out var m) ? m.GetString() : "");
                    throw new InvalidOperationException($"Shopee token refresh failed: {err.GetString()}");
                }

                var expireIn = root.TryGetProperty("expire_in", out var ei) ? ei.GetInt32() : 14400;

                var tokenInfo = new TokenInfo
                {
                    Platform         = PlatformType.Shopee,
                    AccessToken      = root.TryGetProperty("access_token",  out var at) ? at.GetString() ?? "" : "",
                    RefreshToken     = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "",
                    ShopId           = shopId,
                    ExpiresAt        = DateTime.UtcNow.AddSeconds(expireIn),
                    RefreshExpiresAt = DateTime.UtcNow.AddDays(30)

                };

                await SaveCredentialAsync(tokenInfo);
                return tokenInfo;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "❌ Shopee: Error refreshing token");
                throw;
            }
        }

        private async Task SaveCredentialAsync(TokenInfo tokenInfo)
        {
            var platform = tokenInfo.Platform.ToString();
            var shopId = tokenInfo.ShopId?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(shopId))
                throw new InvalidOperationException("Shop ID/shop cipher is required to persist platform credentials.");

            var credential = await _db.PlatformCredentials.SingleOrDefaultAsync(
                x => x.Platform == platform && x.ShopId == shopId);
            var now = DateTime.UtcNow;
            if (credential == null)
            {
                credential = new PlatformCredential
                {
                    Platform = platform,
                    ShopId = shopId,
                    CreateBy = SystemUser,
                    CreateDate = now
                };
                _db.PlatformCredentials.Add(credential);
            }
            credential.ShopId = shopId;
            credential.ShopName = tokenInfo.ShopName;
            credential.AccessTokenEncrypted = _tokenProtector.Protect(tokenInfo.AccessToken);
            credential.RefreshTokenEncrypted = string.IsNullOrWhiteSpace(tokenInfo.RefreshToken) ? null : _tokenProtector.Protect(tokenInfo.RefreshToken);
            credential.AccessTokenExpiresDate = tokenInfo.ExpiresAt;
            credential.RefreshTokenExpiresDate = tokenInfo.RefreshExpiresAt > now ? tokenInfo.RefreshExpiresAt : null;
            credential.IsActive = "YES";
            credential.RequiresReauthorization = "NO";
            credential.LastRefreshDate = now;
            credential.LastError = null;
            credential.UpdateBy = SystemUser;
            credential.UpdateDate = now;
            await _db.SaveChangesAsync();
        }
        #endregion

        #region Lazada Auth

        private string GetLazadaAuthUrl(string state)
        {
            return $"{_lazadaAuthUrl}?response_type=code&force_auth=true" +
                   $"&redirect_uri={Uri.EscapeDataString(_lazadaRedirectUrl)}" +
                   $"&client_id={_lazadaAppKey}&state={state}";
        }

        private async Task<TokenInfo> HandleLazadaCallbackAsync(string code, string? shopId)
        {
            _logger.LogInformation("🏪 Exchanging Lazada authorization code");

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _lazadaAppKey },
                { "sign_method", "sha256" },
                { "timestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() },
                { "code", code }
            };

            return await CallLazadaTokenApiAsync(
                "/auth/token/create", parameters, "exchanging token", shopId);
        }

        private async Task<TokenInfo> RefreshLazadaTokenAsync(string refreshToken, string? shopId)
        {
            _logger.LogInformation("🔄 Lazada token refresh");

            var parameters = new Dictionary<string, string>
            {
                { "app_key", _lazadaAppKey },
                { "sign_method", "sha256" },
                { "timestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() },
                { "refresh_token", refreshToken }
            };

            return await CallLazadaTokenApiAsync(
                "/auth/token/refresh", parameters, "refreshing token", shopId, refreshToken);
        }

        private async Task<TokenInfo> CallLazadaTokenApiAsync(
            string apiPath,
            Dictionary<string, string> parameters,
            string actionDescription,
            string? requestedShopId = null,
            string? fallbackRefreshToken = null)
        {
            var sign = SignatureHelper.GenerateLazadaSignature(_lazadaAppSecret, apiPath, parameters);
            parameters["sign"] = sign;

            var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            var url = $"{_lazadaAuthApiUrl}{apiPath}?{queryString}";

            try
            {
                using var http = new HttpClient();
                var response = await http.GetAsync(url);
                var responseBody = await response.Content.ReadAsStringAsync();

                using var json = JsonDocument.Parse(responseBody);
                var root = json.RootElement;

                // Lazada returns code "0" on success; anything else is an error
                var resultCode = root.TryGetProperty("code", out var c) ? ReadJsonText(c) : null;
                var requestId = root.TryGetProperty("request_id", out var requestIdElement)
                    ? ReadJsonText(requestIdElement)
                    : null;
                _logger.LogInformation(
                    "🏪 Lazada token request completed: status={StatusCode}, code={Code}, requestId={RequestId}",
                    response.StatusCode, resultCode, requestId);

                if (resultCode != "0")
                {
                    var msg = root.TryGetProperty("message", out var m) ? ReadJsonText(m) : "Unknown error";
                    _logger.LogError(
                        "❌ Lazada token error: {Code} - {Msg}, requestId={RequestId}",
                        resultCode, msg, requestId);
                    throw new InvalidOperationException(
                        $"Lazada error {actionDescription}: {msg} (request_id: {requestId ?? "n/a"})");
                }

                var expiresIn = ReadJsonInt32(root, "expires_in", 2592000);
                var refreshExpiresIn = ReadJsonInt32(root, "refresh_expires_in", 2592000);
                var accessToken = root.TryGetProperty("access_token", out var at)
                    ? ReadJsonText(at) : "";
                var refreshToken = root.TryGetProperty("refresh_token", out var rt)
                    ? ReadJsonText(rt) : "";
                if (string.IsNullOrWhiteSpace(refreshToken))
                    refreshToken = fallbackRefreshToken ?? "";

                if (string.IsNullOrWhiteSpace(accessToken))
                    throw new InvalidOperationException("Lazada token response does not contain access_token.");

                var shop = ReadLazadaShop(root, requestedShopId);
                if (string.IsNullOrWhiteSpace(shop.ShopId))
                    throw new InvalidOperationException(
                        "Lazada token response does not contain seller_id/user_id required for credential persistence.");

                var tokenInfo = new TokenInfo
                {
                    Platform = PlatformType.Lazada,
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                    RefreshExpiresAt = DateTime.UtcNow.AddSeconds(refreshExpiresIn),
                    ShopId = shop.ShopId,
                    ShopName = shop.ShopName
                };

                await SaveCredentialAsync(tokenInfo);
                return tokenInfo;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "❌ Lazada: Error {Action}", actionDescription);
                throw;
            }
        }

        private static (string ShopId, string? ShopName) ReadLazadaShop(
            JsonElement root, string? requestedShopId)
        {
            var account = root.TryGetProperty("account", out var accountElement)
                ? ReadJsonText(accountElement)
                : null;
            var shops = new List<(string ShopId, string? ShopName)>();

            if (root.TryGetProperty("country_user_info", out var countryUsers) &&
                countryUsers.ValueKind == JsonValueKind.Array)
            {
                foreach (var countryUser in countryUsers.EnumerateArray())
                {
                    var sellerId = countryUser.TryGetProperty("seller_id", out var sellerIdElement)
                        ? ReadJsonText(sellerIdElement)
                        : "";
                    if (string.IsNullOrWhiteSpace(sellerId) &&
                        countryUser.TryGetProperty("user_id", out var userIdElement))
                        sellerId = ReadJsonText(userIdElement);
                    if (string.IsNullOrWhiteSpace(sellerId)) continue;

                    var shortCode = countryUser.TryGetProperty("short_code", out var shortCodeElement)
                        ? ReadJsonText(shortCodeElement)
                        : null;
                    var country = countryUser.TryGetProperty("country", out var countryElement)
                        ? ReadJsonText(countryElement).ToUpperInvariant()
                        : null;
                    var shopName = !string.IsNullOrWhiteSpace(shortCode)
                        ? string.IsNullOrWhiteSpace(country) ? shortCode : $"{shortCode} ({country})"
                        : account;
                    shops.Add((sellerId, shopName));
                }
            }

            if (!string.IsNullOrWhiteSpace(requestedShopId))
            {
                var requested = shops.FirstOrDefault(shop => shop.ShopId == requestedShopId);
                if (!string.IsNullOrWhiteSpace(requested.ShopId)) return requested;
            }

            if (shops.Count > 0) return shops[0];

            var rootSellerId = root.TryGetProperty("seller_id", out var rootSellerIdElement)
                ? ReadJsonText(rootSellerIdElement)
                : "";
            if (string.IsNullOrWhiteSpace(rootSellerId) &&
                root.TryGetProperty("user_id", out var rootUserIdElement))
                rootSellerId = ReadJsonText(rootUserIdElement);

            return (!string.IsNullOrWhiteSpace(rootSellerId)
                    ? rootSellerId
                    : requestedShopId?.Trim() ?? "",
                account);
        }

        private static int ReadJsonInt32(JsonElement root, string propertyName, int fallback)
        {
            return root.TryGetProperty(propertyName, out var element) &&
                   int.TryParse(ReadJsonText(element), out var value)
                ? value
                : fallback;
        }

        private static string ReadJsonText(JsonElement element)
        {
            return element.ValueKind == JsonValueKind.String
                ? element.GetString() ?? ""
                : element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
                    ? ""
                    : element.ToString();
        }

        #endregion

        #region TikTok Auth

        private string GetTikTokAuthUrl(string state)
        {
            var authorizationParameter = string.IsNullOrWhiteSpace(_tiktokServiceId)
                ? $"app_key={Uri.EscapeDataString(_tiktokAppKey)}"
                : $"service_id={Uri.EscapeDataString(_tiktokServiceId)}";

            return $"{_tiktokAuthUrl}?{authorizationParameter}" +
                   $"&state={Uri.EscapeDataString(state)}";
        }

        private async Task<TokenInfo> HandleTikTokCallbackAsync(string code, string? shopId)
        {
            _logger.LogInformation("🎵 Exchanging TikTok authorization code");
            return await CallTikTokTokenApiAsync(
                "/api/v2/token/get",
                "auth_code",
                code,
                "authorized_code",
                shopId);
        }

        private async Task<TokenInfo> RefreshTikTokTokenAsync(string refreshToken, string? shopId)
        {
            _logger.LogInformation("🔄 Refreshing TikTok access token");
            return await CallTikTokTokenApiAsync(
                "/api/v2/token/refresh",
                "refresh_token",
                refreshToken,
                "refresh_token",
                shopId);
        }

        private async Task<TokenInfo> CallTikTokTokenApiAsync(
            string apiPath,
            string credentialParameter,
            string credentialValue,
            string grantType,
            string? requestedShopId)
        {
            if (string.IsNullOrWhiteSpace(_tiktokAppKey) || string.IsNullOrWhiteSpace(_tiktokAppSecret))
                throw new InvalidOperationException("TIKTOK_APP_KEY and TIKTOK_APP_SECRET must be configured.");

            var url = $"{_tiktokAuthApiUrl.TrimEnd('/')}{apiPath}" +
                      $"?app_key={Uri.EscapeDataString(_tiktokAppKey)}" +
                      $"&app_secret={Uri.EscapeDataString(_tiktokAppSecret)}" +
                      $"&{credentialParameter}={Uri.EscapeDataString(credentialValue)}" +
                      $"&grant_type={Uri.EscapeDataString(grantType)}";

            using var http = new HttpClient();
            var response = await http.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;
            var resultCode = ReadTikTokResultCode(root);

            if (!response.IsSuccessStatusCode || resultCode != 0)
            {
                var message = root.TryGetProperty("message", out var messageElement)
                    ? messageElement.GetString()
                    : response.ReasonPhrase;
                throw new InvalidOperationException(
                    $"TikTok token request failed (code {resultCode}): {message}");
            }

            if (!root.TryGetProperty("data", out var data))
                throw new InvalidOperationException("TikTok token response does not contain data.");

            var accessToken = data.TryGetProperty("access_token", out var accessTokenElement)
                ? accessTokenElement.GetString() ?? ""
                : "";
            if (string.IsNullOrWhiteSpace(accessToken))
                throw new InvalidOperationException("TikTok token response does not contain access_token.");

            var refreshToken = data.TryGetProperty("refresh_token", out var refreshTokenElement)
                ? refreshTokenElement.GetString() ?? ""
                : "";
            if (string.IsNullOrWhiteSpace(refreshToken) && credentialParameter == "refresh_token")
                refreshToken = credentialValue;
            var accessExpiresAt = ReadTikTokExpiration(
                data, "access_token_expire_in", DateTime.UtcNow.AddHours(12));
            var refreshExpiresAt = ReadTikTokExpiration(
                data, "refresh_token_expire_in", DateTime.UtcNow.AddDays(365));

            var shop = await GetTikTokAuthorizedShopAsync(accessToken, requestedShopId);
            var tokenInfo = new TokenInfo
            {
                Platform = PlatformType.TikTok,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = accessExpiresAt,
                RefreshExpiresAt = refreshExpiresAt,
                ShopId = shop.ShopCipher,
                ShopName = shop.ShopName
            };

            await SaveCredentialAsync(tokenInfo);
            return tokenInfo;
        }

        private async Task<(string ShopCipher, string? ShopName)> GetTikTokAuthorizedShopAsync(
            string accessToken,
            string? requestedShopId)
        {
            var apiPath = "/authorization/202309/shops";
            var parameters = new Dictionary<string, string>
            {
                { "app_key", _tiktokAppKey },
                { "timestamp", DateTimeHelper.CurrentUnixTimestamp().ToString() }
            };
            parameters["sign"] = SignatureHelper.GenerateTikTokSignature(
                _tiktokAppSecret, apiPath, parameters);

            var queryString = string.Join("&", parameters.Select(
                p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            using var request = new HttpRequestMessage(
                HttpMethod.Get, $"{_tiktokApiUrl.TrimEnd('/')}{apiPath}?{queryString}");
            request.Headers.TryAddWithoutValidation("x-tts-access-token", accessToken);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            using var http = new HttpClient();
            var response = await http.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;
            var resultCode = ReadTikTokResultCode(root);

            if (!response.IsSuccessStatusCode || resultCode != 0)
            {
                var message = root.TryGetProperty("message", out var messageElement)
                    ? messageElement.GetString()
                    : response.ReasonPhrase;
                throw new InvalidOperationException(
                    $"TikTok authorized shops request failed (code {resultCode}): {message}");
            }

            if (!root.TryGetProperty("data", out var data) ||
                !data.TryGetProperty("shops", out var shopsElement))
                throw new InvalidOperationException("TikTok authorized shops response does not contain shops.");

            var shops = shopsElement.EnumerateArray().ToList();
            if (shops.Count == 0)
                throw new InvalidOperationException("No TikTok Shop is associated with this access token.");

            var selectedShop = shops.FirstOrDefault(shop =>
                string.IsNullOrWhiteSpace(requestedShopId) ||
                string.Equals(ReadJsonString(shop, "cipher"), requestedShopId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(ReadJsonString(shop, "id"), requestedShopId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(ReadJsonString(shop, "code"), requestedShopId, StringComparison.OrdinalIgnoreCase));

            if (selectedShop.ValueKind == JsonValueKind.Undefined)
                throw new InvalidOperationException($"TikTok Shop '{requestedShopId}' was not found in the authorized shops.");

            var shopCipher = ReadJsonString(selectedShop, "cipher");
            if (string.IsNullOrWhiteSpace(shopCipher))
                throw new InvalidOperationException("TikTok authorized shop does not contain shop cipher.");

            return (shopCipher, ReadJsonString(selectedShop, "name"));
        }

        private static int ReadTikTokResultCode(JsonElement root)
        {
            if (!root.TryGetProperty("code", out var codeElement))
                return -1;

            if (codeElement.ValueKind == JsonValueKind.Number && codeElement.TryGetInt32(out var numericCode))
                return numericCode;

            return int.TryParse(codeElement.GetString(), out var stringCode) ? stringCode : -1;
        }

        private static DateTime ReadTikTokExpiration(
            JsonElement data,
            string propertyName,
            DateTime fallback)
        {
            if (!data.TryGetProperty(propertyName, out var value))
                return fallback;

            long unixTimestamp;
            if (value.ValueKind == JsonValueKind.Number)
            {
                if (!value.TryGetInt64(out unixTimestamp))
                    return fallback;
            }
            else if (!long.TryParse(value.GetString(), out unixTimestamp))
            {
                return fallback;
            }

            try
            {
                return DateTimeOffset.FromUnixTimeSeconds(unixTimestamp).UtcDateTime;
            }
            catch (ArgumentOutOfRangeException)
            {
                return fallback;
            }
        }

        private static string? ReadJsonString(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var value))
                return null;

            return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
        }

        #endregion
    }
}
