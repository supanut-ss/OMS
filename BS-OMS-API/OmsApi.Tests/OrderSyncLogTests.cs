using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Extensions;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class OrderSyncLogTests
{
    [Fact]
    public async Task GetOrderDetailAsync_WritesInsertThenUpdateLog()
    {
        await using var db = CreateDb();
        var client = new FakeOrderClient();
        var service = CreateService(db, client, shopId: "shop-1");

        client.Order = new UnifiedOrder { OrderId = "ORD-1", Status = OrderStatus.Pending, ShopName = "Shop" };
        await service.GetOrderDetailAsync(PlatformType.Shopee, "ORD-1", "shop-1");

        client.Order.Status = OrderStatus.Shipped;
        await service.GetOrderDetailAsync(PlatformType.Shopee, "ORD-1", "shop-1");

        var logs = await db.PlatformSyncLogs.Include(x => x.Details).OrderBy(x => x.SyncLogId).ToListAsync();
        var order = await db.PlatformOrders.SingleAsync();
        Assert.Equal(2, logs.Count);

        var first = logs[0];
        Assert.Equal("SUCCESS", first.SyncStatus);
        Assert.Equal("ORDER_DETAIL", first.SyncSource);
        Assert.Equal("Shopee", first.Platform);
        Assert.Equal("shop-1", first.ShopId);
        Assert.Equal(1, first.TotalFetched);
        Assert.Equal(1, first.TotalInserted);
        Assert.NotNull(first.DurationMs);
        var insert = Assert.Single(first.Details);
        Assert.Equal("INSERT", insert.Action);
        Assert.Equal(order.OrderRecordId, insert.OrderRecordId);
        Assert.Null(insert.OldStatus);

        var second = logs[1];
        Assert.Equal(1, second.TotalUpdated);
        var update = Assert.Single(second.Details);
        Assert.Equal("UPDATE", update.Action);
        Assert.Equal("Pending", update.OldStatus);
        Assert.Equal("Shipped", update.NewStatus);
    }

    [Fact]
    public async Task GetOrderDetailAsync_WritesErrorLog_WhenSyncFails()
    {
        // An empty shop id with no TIKTOK_DEFAULT_SHOP_ID makes the shop
        // resolver throw inside the sync, which must be logged, not rethrown.
        Environment.SetEnvironmentVariable("TIKTOK_DEFAULT_SHOP_ID", null);
        await using var db = CreateDb();
        var client = new FakeOrderClient
        {
            Order = new UnifiedOrder { OrderId = "ORD-9", Status = OrderStatus.Pending }
        };
        var service = CreateService(db, client, shopId: "");

        var result = await service.GetOrderDetailAsync(PlatformType.TikTok, "ORD-9");

        Assert.NotNull(result);
        Assert.Empty(db.PlatformOrders);
        var log = await db.PlatformSyncLogs.Include(x => x.Details).SingleAsync();
        Assert.Equal("ERROR", log.SyncStatus);
        Assert.Equal(1, log.TotalFailed);
        Assert.Contains("TIKTOK_DEFAULT_SHOP_ID", log.ErrorMessage);
        var detail = Assert.Single(log.Details);
        Assert.Equal("ERROR", detail.Action);
        Assert.Equal("ORD-9", detail.PlatformOrderId);
    }

    private static ApplicationDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static OrderService CreateService(ApplicationDbContext db, FakeOrderClient client, string shopId) =>
        new(new FakeClientFactory(client), new FakeCredentialService(shopId), db, NullLogger<OrderService>.Instance);

    private sealed class FakeCredentialService(string shopId) : IPlatformCredentialService
    {
        public Task<T> ExecuteAsync<T>(
            PlatformType platform,
            string? requestedShopId,
            Func<PlatformAccessCredential, Task<T>> operation,
            CancellationToken cancellationToken = default) =>
            operation(new PlatformAccessCredential(1, platform, shopId, "token"));

        public Task<IReadOnlyList<PlatformCredentialSelection>> GetActiveCredentialSelectionsAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<PlatformCredentialSelection>>(Array.Empty<PlatformCredentialSelection>());
    }

    private sealed class FakeClientFactory(IPlatformClient client) : IPlatformClientFactory
    {
        public IPlatformClient GetClient(PlatformType platform) => client;
    }

    private sealed class FakeOrderClient : IPlatformClient
    {
        public UnifiedOrder? Order { get; set; }
        public PlatformType Platform => PlatformType.Shopee;

        public Task<UnifiedOrder?> GetOrderDetailAsync(string accessToken, string? shopId, string orderId) =>
            Task.FromResult(Order);

        public Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(string accessToken, string? shopId, OrderFilter filter) =>
            throw new NotImplementedException();
        public Task<PaginatedResult<ProductItem>> GetProductsAsync(string accessToken, string? shopId, ProductFilter filter) =>
            throw new NotImplementedException();
        public Task<ProductItem?> GetProductDetailAsync(string accessToken, string? shopId, string itemId) =>
            throw new NotImplementedException();
        public Task<bool> UpdateStockAsync(string accessToken, string? shopId, string itemId, string? variationId, int newStock) =>
            throw new NotImplementedException();
        public Task<ShippingLabelResult?> GetShippingLabelAsync(string accessToken, string? shopId, string orderId, string? packageId, string? trackingNumber, string documentType) =>
            throw new NotImplementedException();
        public Task<bool> ShipOrderAsync(string accessToken, string? shopId, ShipOrderRequest request) =>
            throw new NotImplementedException();
        public Task<List<ShippingProvider>> GetShippingProvidersAsync(string accessToken, string? shopId, bool throwOnApiError = false) =>
            throw new NotImplementedException();
        public Task<TrackingInfo?> GetTrackingInfoAsync(string accessToken, string? shopId, string orderId, IReadOnlyCollection<string>? packageNumbers = null) =>
            throw new NotImplementedException();
    }
}
