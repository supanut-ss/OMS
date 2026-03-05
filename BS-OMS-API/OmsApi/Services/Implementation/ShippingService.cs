using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    public class ShippingService : IShippingService
    {
        private readonly IPlatformClientFactory _clientFactory;
        private readonly ILogger<ShippingService> _logger;

        public ShippingService(IPlatformClientFactory clientFactory, ILogger<ShippingService> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        public async Task<ShippingLabelResult?> GetShippingLabelAsync(ShippingLabelRequest request)
        {
            var client = _clientFactory.GetClient(request.Platform);
            return await client.GetShippingLabelAsync(
                request.AccessToken, request.ShopId,
                request.OrderId, request.PackageId, request.DocumentType);
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
            return await client.ShipOrderAsync(request.AccessToken, request.ShopId, request);
        }

        public async Task<List<ShippingProvider>> GetShippingProvidersAsync(PlatformType platform, string accessToken, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await client.GetShippingProvidersAsync(accessToken, shopId);
        }

        public async Task<TrackingInfo?> GetTrackingInfoAsync(PlatformType platform, string orderId, string accessToken, string? shopId = null)
        {
            var client = _clientFactory.GetClient(platform);
            return await client.GetTrackingInfoAsync(accessToken, shopId, orderId);
        }
    }
}
