using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;
using OmsApi.Models.Orders;

namespace OmsApi.Services.Implementation
{
    public class ShippingService : IShippingService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly ILogger<ShippingService> _logger;
        private readonly IPlatformCredentialService _credentialService;

        public ShippingService(
            IPlatformClientFactory clientFactory,
            ILogger<ShippingService> logger,
            IPlatformCredentialService credentialService)
        {
            _clientFactory = clientFactory;
            _logger = logger;
            _credentialService = credentialService;
        }

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request)
        {
            var client = _clientFactory.GetClient(request.Platform);
            try
            {
                return await _credentialService.ExecuteAsync(
                    request.Platform,
                    request.ShopId,
                    credential =>
                    {
                        request.AccessToken = credential.AccessToken;
                        request.ShopId = credential.ShopId;
                        return client.GetShippingLabelAsync(
                            credential.AccessToken,
                            credential.ShopId,
                            request.OrderId,
                            request.PackageId,
                            request.TrackingNumber,
                            request.DocumentType);
                    });
            }
            catch (PlatformCredentialException ex)
            {
                _logger.LogWarning(
                    "Unable to resolve {Platform} credential for waybill order {OrderId}: {Code}",
                    request.Platform,
                    request.OrderId,
                    ex.Code);
                return null;
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
            var client = _clientFactory.GetClient(request.Platform);
            try
            {
                return await _credentialService.ExecuteAsync(
                    request.Platform,
                    request.ShopId,
                    credential =>
                    {
                        request.AccessToken = credential.AccessToken;
                        request.ShopId = credential.ShopId;
                        return client.ShipOrderAsync(
                            credential.AccessToken,
                            credential.ShopId,
                            request);
                    });
            }
            catch (PlatformCredentialException ex)
            {
                _logger.LogWarning(
                    "Unable to resolve {Platform} credential while arranging order {OrderId}: {Code}",
                    request.Platform,
                    request.OrderId,
                    ex.Code);
                return false;
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

            var client = _clientFactory.GetClient(platform);
            var order = await _credentialService.ExecuteAsync(
                platform,
                shopId,
                credential => client.GetOrderDetailAsync(
                    credential.AccessToken,
                    credential.ShopId,
                    orderId));

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
            var client = _clientFactory.GetClient(request.Platform);
            return await _credentialService.ExecuteAsync(
                request.Platform,
                request.ShopId,
                credential =>
                {
                    request.AccessToken = credential.AccessToken;
                    request.ShopId = credential.ShopId;
                    return client.SplitOrderAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        request);
                });
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(
            PlatformType platform,
            string? shopId = null,
            bool throwOnApiError = false)
        {
            var client = _clientFactory.GetClient(platform);
            return await _credentialService.ExecuteAsync(
                platform,
                shopId,
                credential => client.GetShippingProvidersAsync(
                    credential.AccessToken,
                    credential.ShopId,
                    throwOnApiError));
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

            var client = _clientFactory.GetClient(platform);
            try
            {
                var connection = await _credentialService.ExecuteAsync(
                    platform,
                    shopId,
                    credential =>
                    {
                        result.CredentialFound = true;
                        result.ShopId = credential.ShopId;
                        return client.TestConnectionAsync(
                            credential.AccessToken,
                            credential.ShopId);
                    });
                result.Connected = connection.Connected;
                result.ShippingProviderCount = connection.ShippingProviderCount;
                result.Message = connection.Message;
                return result;
            }
            catch (PlatformCredentialException ex)
            {
                result.CredentialFound = ex.Code != "CREDENTIAL_NOT_FOUND";
                result.Message = ex.Message;
                result.ErrorCode = ex.Code;
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
            string? shopId = null,
            IReadOnlyCollection<string>? packageNumbers = null)
        {
            var client = _clientFactory.GetClient(platform);
            try
            {
                return await _credentialService.ExecuteAsync(
                    platform,
                    shopId,
                    credential => client.GetTrackingInfoAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        orderId,
                        packageNumbers));
            }
            catch (PlatformCredentialException ex)
            {
                _logger.LogWarning(
                    "Unable to resolve {Platform} credential while tracking order {OrderId}: {Code}",
                    platform,
                    orderId,
                    ex.Code);
                return null;
            }
        }
    }
}
