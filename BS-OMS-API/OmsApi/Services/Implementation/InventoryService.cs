using OmsApi.Models.Common;
using OmsApi.Models.Auth;
using OmsApi.Models.Inventory;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    public class InventoryService : IInventoryService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly IPlatformCredentialService _credentialService;
        private readonly ILogger<InventoryService> _logger;

        public InventoryService(
            IPlatformClientFactory clientFactory,
            IPlatformCredentialService credentialService,
            ILogger<InventoryService> logger)
        {
            _clientFactory = clientFactory;
            _credentialService = credentialService;
            _logger = logger;
        }

        public async Task<PaginatedResult<ProductItem>> GetProductsAsync(ProductFilter filter)
        {
            if (!filter.Platform.HasValue)
                return new PaginatedResult<ProductItem>();

            var platform = filter.Platform.Value;
            var client = _clientFactory.GetClient(platform);
            return await _credentialService.ExecuteAsync(
                platform,
                filter.ShopId,
                credential =>
                {
                    filter.AccessToken = credential.AccessToken;
                    filter.ShopId = credential.ShopId;
                    return client.GetProductsAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        filter);
                });
        }

        public async Task<List<ProductItem>> GetProductsFromAllPlatformsAsync(ProductFilter filter)
        {
            var selections = filter.PlatformCredentials?.Count > 0
                ? filter.PlatformCredentials
                    .Select(x => new PlatformCredentialSelection(x.Platform, x.ShopId ?? string.Empty))
                    .ToList()
                : (await _credentialService.GetActiveCredentialSelectionsAsync()).ToList();
            if (selections.Count == 0)
                return new List<ProductItem>();

            var tasks = selections.Select(async selection =>
            {
                try
                {
                    var client = _clientFactory.GetClient(selection.Platform);
                    var pf = new ProductFilter
                    {
                        Page = filter.Page,
                        PageSize = filter.PageSize,
                        Keyword = filter.Keyword,
                        ItemStatus = filter.ItemStatus,
                        LowStockThreshold = filter.LowStockThreshold
                    };
                    return await _credentialService.ExecuteAsync(
                        selection.Platform,
                        string.IsNullOrWhiteSpace(selection.ShopId) ? null : selection.ShopId,
                        async credential =>
                        {
                            pf.AccessToken = credential.AccessToken;
                            pf.ShopId = credential.ShopId;
                            var result = await client.GetProductsAsync(
                                credential.AccessToken,
                                credential.ShopId,
                                pf);
                            return result.Items;
                        });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching products from {Platform}", selection.Platform);
                    return new List<ProductItem>();
                }
            });

            var results = await Task.WhenAll(tasks);
            var allProducts = results.SelectMany(r => r).ToList();

            // Filter low stock if threshold is set
            if (filter.LowStockThreshold.HasValue)
            {
                allProducts = allProducts.Where(p => p.TotalStock <= filter.LowStockThreshold.Value).ToList();
            }

            return allProducts;
        }

        public async Task<ProductItem?> GetProductDetailAsync(PlatformType platform, string itemId, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await _credentialService.ExecuteAsync(
                platform,
                shopId,
                credential => client.GetProductDetailAsync(
                    credential.AccessToken,
                    credential.ShopId,
                    itemId));
        }

        public async Task<List<ProductItem>> GetLowStockProductsAsync(ProductFilter filter, int threshold = 5)
        {
            filter.LowStockThreshold = threshold;
            return await GetProductsFromAllPlatformsAsync(filter);
        }

        public async Task<bool> UpdateStockAsync(UpdateStockRequest request)
        {
            var client = _clientFactory.GetClient(request.Platform);
            return await _credentialService.ExecuteAsync(
                request.Platform,
                request.ShopId,
                credential =>
                {
                    request.AccessToken = credential.AccessToken;
                    request.ShopId = credential.ShopId;
                    return client.UpdateStockAsync(
                        credential.AccessToken,
                        credential.ShopId,
                        request.ItemId,
                        request.VariationId,
                        request.NewStock);
                });
        }
    }
}
