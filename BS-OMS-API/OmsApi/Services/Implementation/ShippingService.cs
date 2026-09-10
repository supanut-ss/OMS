using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Extensions;
using OmsApi.Services.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using OmsApi.Models.Orders;
using OmsApi.Models.Persistence;

namespace OmsApi.Services.Implementation
{
    public class ShippingService : IShippingService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly ILogger<ShippingService> _logger;
        private readonly ApplicationDbContext _db;
        private readonly IDataProtector _tokenProtector;
        private readonly IPlatformAuthService _authService;

        public ShippingService(IPlatformClientFactory clientFactory, ILogger<ShippingService> logger,
            ApplicationDbContext db, IDataProtectionProvider protectionProvider,
            IPlatformAuthService authService)
        {
            _clientFactory = clientFactory;
            _logger = logger;
            _db = db;
            _tokenProtector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");
            _authService = authService;
        }

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request)
        {
            PlatformCredential? credential = null;
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                var resolved = await ResolveStoredCredentialAsync(request.Platform, request.ShopId);
                if (resolved.AccessToken == null) return null;
                request.AccessToken = resolved.AccessToken;
                request.ShopId = resolved.ShopId;
                credential = resolved.Credential;
            }

            var client = _clientFactory.GetClient(request.Platform);
            try
            {
                return await client.GetShippingLabelAsync(
                    request.AccessToken, request.ShopId, request.OrderId,
                    request.PackageId, request.TrackingNumber, request.DocumentType);
            }
            catch (PlatformApiException ex) when (
                credential != null && IsInvalidAccessToken(ex) && CanRefresh(credential))
            {
                _logger.LogWarning(
                    "{Platform} rejected the stored access token while creating a waybill for order {OrderId}; refreshing once",
                    request.Platform,
                    request.OrderId);
                var refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(
                    request.Platform, refreshToken, credential.ShopId);
                request.AccessToken = refreshed.AccessToken;
                request.ShopId = credential.ShopId;
                return await client.GetShippingLabelAsync(
                    request.AccessToken, request.ShopId, request.OrderId,
                    request.PackageId, request.TrackingNumber, request.DocumentType);
            }
        }

        public async Task<List<ShippingLabelResult>> GetBatchShippingLabelsAsync(List<ShippingLabelRequest> requests)
        {
            var results = new List<ShippingLabelResult>();

            var tasks = requests.Select(async req =>
            {
                try
                {
                    return await GetShippingLabelAsync(req);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error getting label for order {OrderId}", req.OrderId);
                    return null;
                }
            });

            var labels = await Task.WhenAll(tasks);
            results.AddRange(labels.Where(l => l != null)!);
            return results;
        }

        public async Task<bool> ShipOrderAsync(ShipOrderRequest request)
        {
            PlatformCredential? credential = null;
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                var resolved = await ResolveStoredCredentialAsync(request.Platform, request.ShopId);
                if (resolved.AccessToken == null) return false;
                request.AccessToken = resolved.AccessToken;
                request.ShopId = resolved.ShopId;
                credential = resolved.Credential;
            }
            var client = _clientFactory.GetClient(request.Platform);
            try
            {
                return await client.ShipOrderAsync(request.AccessToken, request.ShopId, request);
            }
            catch (PlatformApiException ex) when (
                credential != null && IsInvalidAccessToken(ex) && CanRefresh(credential))
            {
                _logger.LogWarning(
                    "{Platform} rejected the stored access token while arranging order {OrderId}; refreshing once",
                    request.Platform,
                    request.OrderId);
                var refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(
                    request.Platform, refreshToken, credential.ShopId);
                request.AccessToken = refreshed.AccessToken;
                request.ShopId = credential.ShopId;
                return await client.ShipOrderAsync(request.AccessToken, request.ShopId, request);
            }
        }

        public async Task ValidateOrderPackagesAsync(
            PlatformType platform,
            string orderId,
            IReadOnlyCollection<WmsPackageManifestPackage> packages,
            string? shopId = null)
        {
            if (platform is not (PlatformType.Shopee or PlatformType.Lazada or PlatformType.TikTok))
                return;

            var resolved = await ResolveStoredCredentialAsync(platform, shopId);
            var accessToken = resolved.AccessToken
                ?? throw new InvalidOperationException(
                    $"No active {platform} credential was found for shop '{shopId}'.");
            shopId = resolved.ShopId;
            var client = _clientFactory.GetClient(platform);

            UnifiedOrder? order;
            try
            {
                order = await client.GetOrderDetailAsync(accessToken, shopId, orderId);
            }
            catch (PlatformApiException ex) when (
                resolved.Credential != null && IsInvalidAccessToken(ex) && CanRefresh(resolved.Credential))
            {
                var refreshToken = _tokenProtector.Unprotect(resolved.Credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(
                    platform, refreshToken, resolved.Credential.ShopId);
                order = await client.GetOrderDetailAsync(
                    refreshed.AccessToken, resolved.Credential.ShopId, orderId);
            }

            if (order == null)
                throw new InvalidOperationException(
                    $"{platform} order '{orderId}' was not found.");
            if (order.Items.Count == 0)
                throw new InvalidOperationException(
                    $"{platform} did not return order items for the order.");

            if (platform == PlatformType.Shopee)
                ValidateShopeeItemAllocation(order, packages);
            else
                ValidateMarketplaceItemAllocation(platform, order, packages);
        }

        private static void ValidateMarketplaceItemAllocation(
            PlatformType platform,
            UnifiedOrder order,
            IReadOnlyCollection<WmsPackageManifestPackage> packages)
        {
            var wmsTotals = packages
                .SelectMany(package => package.Items)
                .GroupBy(item => NormalizeItemNumber(item.ItemNumber), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(item => item.Quantity),
                    StringComparer.OrdinalIgnoreCase);
            if (wmsTotals.Count == 0 || wmsTotals.ContainsKey(string.Empty))
                throw new InvalidOperationException(
                    "Every WMS item must contain an item number.");
            if (wmsTotals.Values.Any(quantity =>
                    quantity <= 0 || quantity != decimal.Truncate(quantity)))
                throw new InvalidOperationException(
                    $"{platform} requires every WMS item quantity to be a positive whole number.");

            var platformTotals = new Dictionary<string, decimal>(
                StringComparer.OrdinalIgnoreCase);
            foreach (var orderItem in order.Items)
            {
                var matchingWmsItems = new[] { orderItem.Sku, orderItem.ItemId }
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Select(NormalizeItemNumber)
                    .Where(wmsTotals.ContainsKey)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                if (matchingWmsItems.Count != 1)
                {
                    var identity = string.IsNullOrWhiteSpace(orderItem.Sku)
                        ? orderItem.ItemId
                        : orderItem.Sku;
                    throw new InvalidOperationException(
                        $"{platform} item '{identity}' could not be matched uniquely " +
                        "to a WMS item by seller SKU or item ID.");
                }

                var itemNumber = matchingWmsItems[0];
                platformTotals[itemNumber] =
                    platformTotals.GetValueOrDefault(itemNumber) + orderItem.Quantity;
            }

            if (platformTotals.Count != wmsTotals.Count ||
                wmsTotals.Any(item =>
                    !platformTotals.TryGetValue(item.Key, out var quantity) ||
                    quantity != item.Value))
            {
                var wmsSummary = string.Join(
                    ", ",
                    wmsTotals.OrderBy(item => item.Key)
                        .Select(item => $"{item.Key}={item.Value}"));
                var platformSummary = string.Join(
                    ", ",
                    platformTotals.OrderBy(item => item.Key)
                        .Select(item => $"{item.Key}={item.Value}"));
                throw new InvalidOperationException(
                    $"WMS item quantities do not match the {platform} order. " +
                    $"WMS: [{wmsSummary}]; {platform}: [{platformSummary}].");
            }
        }

        private static void ValidateShopeeItemAllocation(
            UnifiedOrder order,
            IReadOnlyCollection<WmsPackageManifestPackage> packages)
        {
            var wmsTotals = packages
                .SelectMany(package => package.Items)
                .GroupBy(item => NormalizeItemNumber(item.ItemNumber), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(item => item.Quantity),
                    StringComparer.OrdinalIgnoreCase);

            if (wmsTotals.Count == 0 || wmsTotals.ContainsKey(string.Empty))
                throw new InvalidOperationException("Every WMS item must contain an item number.");
            if (wmsTotals.Values.Any(quantity =>
                    quantity <= 0 || quantity != decimal.Truncate(quantity)))
                throw new InvalidOperationException(
                    "Shopee requires every WMS item quantity to be a positive whole number.");

            var platformTotals = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            foreach (var orderItem in order.Items)
            {
                var matchingWmsItems = new[] { orderItem.Sku, orderItem.ItemId }
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Select(NormalizeItemNumber)
                    .Where(wmsTotals.ContainsKey)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                if (matchingWmsItems.Count != 1)
                {
                    var identity = string.IsNullOrWhiteSpace(orderItem.Sku)
                        ? orderItem.ItemId
                        : orderItem.Sku;
                    throw new InvalidOperationException(
                        $"Shopee item '{identity}' could not be matched uniquely to a WMS item by seller SKU or item_id.");
                }

                var itemNumber = matchingWmsItems[0];
                platformTotals[itemNumber] =
                    platformTotals.GetValueOrDefault(itemNumber) + orderItem.Quantity;
            }

            if (platformTotals.Count != wmsTotals.Count ||
                wmsTotals.Any(item =>
                    !platformTotals.TryGetValue(item.Key, out var quantity) ||
                    quantity != item.Value))
            {
                var wmsSummary = string.Join(", ", wmsTotals.OrderBy(x => x.Key)
                    .Select(x => $"{x.Key}={x.Value}"));
                var shopeeSummary = string.Join(", ", platformTotals.OrderBy(x => x.Key)
                    .Select(x => $"{x.Key}={x.Value}"));
                throw new InvalidOperationException(
                    $"WMS item quantities do not match the Shopee order. WMS: [{wmsSummary}]; Shopee: [{shopeeSummary}].");
            }
        }

        private static string NormalizeItemNumber(string? value) =>
            (value ?? string.Empty).Trim().Replace(" ", string.Empty).ToUpperInvariant();

        public async Task<SplitPlatformOrderResult> SplitOrderAsync(SplitPlatformOrderRequest request)
        {
            PlatformCredential? credential = null;
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                var resolved = await ResolveStoredCredentialAsync(request.Platform, request.ShopId);
                request.AccessToken = resolved.AccessToken
                    ?? throw new InvalidOperationException(
                        $"No active {request.Platform} credential was found for shop '{request.ShopId}'.");
                request.ShopId = resolved.ShopId;
                credential = resolved.Credential;
            }

            var client = _clientFactory.GetClient(request.Platform);
            try
            {
                return await client.SplitOrderAsync(request.AccessToken, request.ShopId, request);
            }
            catch (PlatformApiException ex) when (
                credential != null && IsInvalidAccessToken(ex) && CanRefresh(credential))
            {
                _logger.LogWarning(
                    "{Platform} rejected the stored access token while splitting order {OrderId}; refreshing once",
                    request.Platform,
                    request.OrderId);
                var refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(
                    request.Platform, refreshToken, credential.ShopId);
                request.AccessToken = refreshed.AccessToken;
                request.ShopId = credential.ShopId;
                return await client.SplitOrderAsync(request.AccessToken, request.ShopId, request);
            }
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(
            PlatformType platform,
            string accessToken,
            string? shopId = null,
            bool throwOnApiError = false)
        {
            shopId = PlatformShopIdResolver.Resolve(platform, shopId);
            var client = _clientFactory.GetClient(platform);
            return await client.GetShippingProvidersAsync(accessToken, shopId, throwOnApiError);
        }

        public async Task<PlatformConnectionTestResult> TestConnectionAsync(
            PlatformType platform,
            string? shopId = null)
        {
            var checkedAt = DateTime.UtcNow;
            var result = new PlatformConnectionTestResult
            {
                Platform = platform,
                CheckedAtUtc = checkedAt
            };

            var resolved = await ResolveStoredCredentialAsync(platform, shopId);
            result.ShopId = resolved.ShopId ?? string.Empty;
            result.CredentialFound = resolved.Credential != null;
            if (string.IsNullOrWhiteSpace(resolved.AccessToken))
            {
                result.Message = resolved.Credential == null
                    ? $"No active {platform} credential was found for shop '{result.ShopId}'."
                    : $"The stored {platform} credential could not be decrypted or refreshed.";
                result.ErrorCode = "CREDENTIAL_NOT_FOUND";
                return result;
            }

            var client = _clientFactory.GetClient(platform);
            try
            {
                var connection = await client.TestConnectionAsync(
                    resolved.AccessToken,
                    resolved.ShopId);
                result.Connected = connection.Connected;
                result.ShippingProviderCount = connection.ShippingProviderCount;
                result.Message = connection.Message;
                return result;
            }
            catch (PlatformApiException ex) when (
                resolved.Credential != null &&
                IsInvalidAccessToken(ex) &&
                CanRefresh(resolved.Credential))
            {
                var refreshToken = _tokenProtector.Unprotect(resolved.Credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(
                    platform,
                    refreshToken,
                    resolved.Credential.ShopId);
                var connection = await client.TestConnectionAsync(
                    refreshed.AccessToken,
                    resolved.Credential.ShopId);
                result.Connected = connection.Connected;
                result.ShopId = resolved.Credential.ShopId;
                result.ShippingProviderCount = connection.ShippingProviderCount;
                result.Message = connection.Connected
                    ? "Platform API connection succeeded after refreshing the access token."
                    : connection.Message;
                return result;
            }
            catch (PlatformApiException ex)
            {
                result.Message = ex.Message;
                result.ErrorCode = ex.Code;
                result.RequestId = ex.RequestId;
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Platform connection test failed for {Platform}", platform);
                result.Message = ex.Message;
                result.ErrorCode = "CONNECTION_TEST_FAILED";
                return result;
            }
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(
            PlatformType platform,
            string orderId,
            string? accessToken = null,
            string? shopId = null,
            IReadOnlyCollection<string>? packageNumbers = null)
        {
            PlatformCredential? credential = null;
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                var resolved = await ResolveStoredCredentialAsync(platform, shopId);
                accessToken = resolved.AccessToken;
                shopId = resolved.ShopId;
                credential = resolved.Credential;
                if (accessToken == null) return null;
            }

            var client = _clientFactory.GetClient(platform);
            try
            {
                return await client.GetTrackingInfoAsync(accessToken, shopId, orderId, packageNumbers);
            }
            catch (PlatformApiException ex) when (
                credential != null && IsInvalidAccessToken(ex) && CanRefresh(credential))
            {
                _logger.LogWarning(
                    "{Platform} rejected the stored access token for shop {ShopId}; refreshing once",
                    platform,
                    credential.ShopId);
                var refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted!);
                var refreshed = await _authService.RefreshTokenAsync(platform, refreshToken, credential.ShopId);
                return await client.GetTrackingInfoAsync(
                    refreshed.AccessToken, credential.ShopId, orderId, packageNumbers);
            }
        }

        private async Task<(string? AccessToken, string? ShopId, PlatformCredential? Credential)> ResolveStoredCredentialAsync(
            PlatformType platform,
            string? shopId)
        {
            if (string.IsNullOrWhiteSpace(shopId))
            {
                var defaultShopVariable = $"{platform.ToString().ToUpperInvariant()}_DEFAULT_SHOP_ID";
                shopId = Environment.GetEnvironmentVariable(defaultShopVariable)?.Trim();
            }

            var platformName = platform.ToString();
            var credentialQuery = _db.PlatformCredentials.AsNoTracking()
                .Where(x => x.Platform == platformName && x.IsActive == "YES" && x.RequiresReauthorization == "NO");
            if (!string.IsNullOrWhiteSpace(shopId))
                credentialQuery = credentialQuery.Where(x => x.ShopId == shopId);

            var credentials = await credentialQuery.OrderByDescending(x => x.UpdateDate).Take(2).ToListAsync();
            if (credentials.Count == 0)
                return (null, shopId, null);
            if (string.IsNullOrWhiteSpace(shopId) && credentials.Count > 1)
                throw new InvalidOperationException(
                    $"More than one active {platformName} shop credential exists. Specify shopId.");

            var credential = credentials[0];
            try
            {
                string accessToken;
                if (credential.AccessTokenExpiresDate <= DateTime.UtcNow.AddMinutes(2))
                {
                    if (!CanRefresh(credential)) return (null, credential.ShopId, credential);
                    var refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted!);
                    var refreshed = await _authService.RefreshTokenAsync(platform, refreshToken, credential.ShopId);
                    accessToken = refreshed.AccessToken;
                }
                else
                {
                    accessToken = _tokenProtector.Unprotect(credential.AccessTokenEncrypted);
                }

                var tracked = await _db.PlatformCredentials.FirstAsync(
                    x => x.PlatformCredentialId == credential.PlatformCredentialId);
                tracked.LastUseDate = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return (accessToken, credential.ShopId, credential);
            }
            catch (PlatformApiException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to resolve platform credential for {Platform}", platformName);
                return (null, credential.ShopId, credential);
            }
        }

        private static bool CanRefresh(PlatformCredential credential) =>
            !string.IsNullOrWhiteSpace(credential.RefreshTokenEncrypted) &&
            credential.RefreshTokenExpiresDate > DateTime.UtcNow;

        private static bool IsInvalidAccessToken(PlatformApiException exception)
        {
            // Platforms do not use one common OAuth error shape:
            // TikTok commonly returns numeric code 36009005, Lazada may return
            // IllegalAccessToken, and Shopee usually describes access_token in
            // either the code or message.
            if (string.Equals(exception.Code, "36009005", StringComparison.OrdinalIgnoreCase))
                return true;

            var error = string.Concat(exception.Code, " ", exception.Message);
            var normalized = new string(error
                .Where(char.IsLetterOrDigit)
                .Select(char.ToLowerInvariant)
                .ToArray());
            return normalized.Contains("accesstoken", StringComparison.Ordinal) ||
                   normalized.Contains("acceesstoken", StringComparison.Ordinal);
        }
    }
}
