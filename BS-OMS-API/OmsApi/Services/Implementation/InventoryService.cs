using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    public class InventoryService : IInventoryService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly ILogger<InventoryService> _logger;

        public InventoryService(IPlatformClientFactory clientFactory, ILogger<InventoryService> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        public async Task<PaginatedResult<ProductItem>> GetProductsAsync(ProductFilter filter)
        {
            if (!filter.Platform.HasValue)
                return new PaginatedResult<ProductItem>();

            var client = _clientFactory.GetClient(filter.Platform.Value);
            return await client.GetProductsAsync(filter.AccessToken, filter.ShopId, filter);
        }

        public async Task<List<ProductItem>> GetProductsFromAllPlatformsAsync(ProductFilter filter)
        {
            if (filter.PlatformCredentials == null || filter.PlatformCredentials.Count == 0)
                return new List<ProductItem>();

            var tasks = filter.PlatformCredentials.Select(async cred =>
            {
                try
                {
                    var client = _clientFactory.GetClient(cred.Platform);
                    var pf = new ProductFilter
                    {
                        Page = filter.Page,
                        PageSize = filter.PageSize,
                        Keyword = filter.Keyword,
                        ItemStatus = filter.ItemStatus,
                        LowStockThreshold = filter.LowStockThreshold
                    };
                    var result = await client.GetProductsAsync(cred.AccessToken, cred.ShopId, pf);
                    return result.Items;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching products from {Platform}", cred.Platform);
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

        public async Task<ProductItem?> GetProductDetailAsync(PlatformType platform, string itemId, string accessToken, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await client.GetProductDetailAsync(accessToken, shopId, itemId);
        }

        public async Task<List<ProductItem>> GetLowStockProductsAsync(ProductFilter filter, int threshold = 5)
        {
            filter.LowStockThreshold = threshold;
            return await GetProductsFromAllPlatformsAsync(filter);
        }

        public async Task<bool> UpdateStockAsync(UpdateStockRequest request)
        {
            var client = _clientFactory.GetClient(request.Platform);
            return await client.UpdateStockAsync(request.AccessToken, request.ShopId, request.ItemId, request.VariationId, request.NewStock);
        }
    }
}
