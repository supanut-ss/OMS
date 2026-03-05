using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    /// <summary>
    /// Unified order service that aggregates data from all platforms
    /// </summary>
    public class OrderService : IOrderService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly ILogger<OrderService> _logger;

        public OrderService(IPlatformClientFactory clientFactory, ILogger<OrderService> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        public async Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(OrderFilter filter)
        {
            if (!filter.Platform.HasValue)
                throw new ArgumentException("Platform is required for single-platform query");

            var client = _clientFactory.GetClient(filter.Platform.Value);
            return await client.GetOrdersAsync(filter.AccessToken, filter.ShopId, filter);
        }

        public async Task<UnifiedOrder?> GetOrderDetailAsync(PlatformType platform, string orderId, string accessToken, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await client.GetOrderDetailAsync(accessToken, shopId, orderId);
        }

        public async Task<List<UnifiedOrder>> GetOrdersFromAllPlatformsAsync(OrderFilter filter)
        {
            if (filter.PlatformCredentials == null || !filter.PlatformCredentials.Any())
                throw new ArgumentException("PlatformCredentials are required for multi-platform query");

            var allOrders = new List<UnifiedOrder>();
            var tasks = new List<Task<PaginatedResult<UnifiedOrder>>>();

            foreach (var cred in filter.PlatformCredentials)
            {
                var platformFilter = new OrderFilter
                {
                    Platform = cred.Platform,
                    AccessToken = cred.AccessToken,
                    ShopId = cred.ShopId,
                    Status = filter.Status,
                    DateFrom = filter.DateFrom,
                    DateTo = filter.DateTo,
                    Page = filter.Page,
                    PageSize = filter.PageSize
                };

                var client = _clientFactory.GetClient(cred.Platform);
                tasks.Add(client.GetOrdersAsync(cred.AccessToken, cred.ShopId, platformFilter));
            }

            try
            {
                var results = await Task.WhenAll(tasks);
                foreach (var result in results)
                {
                    allOrders.AddRange(result.Items);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching orders from all platforms");
            }

            // Sort by creation date descending
            return allOrders.OrderByDescending(o => o.CreatedAt).ToList();
        }

        public async Task<List<UnifiedOrder>> GetOrdersNearCancellationAsync(OrderFilter filter, int daysThreshold = 2)
        {
            var allOrders = await GetOrdersFromAllPlatformsAsync(filter);
            return allOrders
                .Where(o => o.CancellationDeadline.HasValue &&
                            o.DaysUntilCancellation.HasValue &&
                            o.DaysUntilCancellation.Value <= daysThreshold &&
                            o.DaysUntilCancellation.Value >= 0 &&
                            o.Status != OrderStatus.Shipped &&
                            o.Status != OrderStatus.Delivered &&
                            o.Status != OrderStatus.Cancelled)
                .OrderBy(o => o.CancellationDeadline)
                .ToList();
        }
    }
}
