using OmsApi.Models.Common;
using OmsApi.Services.Implementation.Platforms;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation
{
    /// <summary>
    /// Factory that resolves the correct platform client based on PlatformType
    /// </summary>
    public class PlatformClientFactory : IPlatformClientFactory
    {
        private readonly IServiceProvider _serviceProvider;

        public PlatformClientFactory(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public IPlatformClient GetClient(PlatformType platform)
        {
            return platform switch
            {
                PlatformType.Shopee => _serviceProvider.GetRequiredService<ShopeeClient>(),
                PlatformType.Lazada => _serviceProvider.GetRequiredService<LazadaClient>(),
                PlatformType.TikTok => _serviceProvider.GetRequiredService<TikTokClient>(),
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };
        }
    }
}
