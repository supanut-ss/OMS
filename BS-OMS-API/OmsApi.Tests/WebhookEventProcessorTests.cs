using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Models.Persistence;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Implementation;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class WebhookEventProcessorTests
{
    [Fact]
    public async Task OrderEvent_SyncsLatestOrderAndMarksProcessed()
    {
        await using var db = CreateDb();
        db.PlatformWebhookEvents.Add(NewEvent("ORD-1", "ORDER_STATUS_UPDATE"));
        await db.SaveChangesAsync();
        var orderService = new StubOrderService(new UnifiedOrder
        {
            OrderId = "ORD-1",
            Platform = PlatformType.Shopee,
            Status = OrderStatus.ReadyToShip,
            OriginalStatus = "READY_TO_SHIP"
        });
        var processor = new WebhookEventProcessor(
            db,
            orderService,
            NullLogger<WebhookEventProcessor>.Instance);

        await processor.ProcessAsync(1);

        var saved = await db.PlatformWebhookEvents.SingleAsync();
        Assert.Equal(WebhookProcessingStatuses.Processed, saved.ProcessingStatus);
        Assert.Equal("READY_TO_SHIP", saved.PlatformStatus);
        Assert.Equal("ReadyToShip", saved.InternalStatus);
        Assert.Equal(1, orderService.WebhookCalls);
    }

    [Fact]
    public async Task OrderDetailFailure_IsLoggedAsFailedAndDoesNotCreateOrder()
    {
        await using var db = CreateDb();
        db.PlatformWebhookEvents.Add(NewEvent("ORD-FAIL", "ORDER_STATUS_UPDATE"));
        await db.SaveChangesAsync();
        var processor = new WebhookEventProcessor(
            db,
            new StubOrderService(exception: new InvalidOperationException("Order Detail unavailable")),
            NullLogger<WebhookEventProcessor>.Instance);

        await processor.ProcessAsync(1);

        var saved = await db.PlatformWebhookEvents.SingleAsync();
        Assert.Equal(WebhookProcessingStatuses.Failed, saved.ProcessingStatus);
        Assert.Contains("Order Detail unavailable", saved.ErrorMessage);
        Assert.Empty(await db.PlatformOrders.ToListAsync());
    }

    [Fact]
    public async Task Deauthorization_MarksStoredCredentialForReauthorization()
    {
        await using var db = CreateDb();
        db.PlatformWebhookEvents.Add(new PlatformWebhookEvent
        {
            EventKey = "Shopee:ID:DEAUTH-1",
            Platform = "Shopee",
            EventType = "SHOP_DEAUTHORIZATION",
            ShopId = "SHOP-1",
            ProcessingStatus = WebhookProcessingStatuses.Queued,
            ReceivedDate = DateTime.Now
        });
        db.PlatformCredentials.Add(new PlatformCredential
        {
            Platform = "Shopee",
            ShopId = "SHOP-1",
            IsActive = "YES",
            RequiresReauthorization = "NO",
            AccessTokenEncrypted = "encrypted",
            AccessTokenExpiresDate = DateTime.Now.AddHours(1),
            CreateDate = DateTime.Now,
            UpdateDate = DateTime.Now
        });
        await db.SaveChangesAsync();
        var processor = new WebhookEventProcessor(
            db,
            new StubOrderService(),
            NullLogger<WebhookEventProcessor>.Instance);

        await processor.ProcessAsync(1);

        var credential = await db.PlatformCredentials.SingleAsync();
        Assert.Equal("NO", credential.IsActive);
        Assert.Equal("YES", credential.RequiresReauthorization);
    }

    [Fact]
    public async Task EveryCallback_RefreshesOrderListForShop_AndCoalescesBursts()
    {
        WebhookEventProcessor.ResetOrderListThrottle();
        await using var db = CreateDb();
        db.PlatformWebhookEvents.Add(NewEvent("ORD-A", "ORDER_STATUS_UPDATE"));
        db.PlatformWebhookEvents.Add(NewEvent("ORD-B", "ORDER_STATUS_UPDATE"));
        await db.SaveChangesAsync();
        var orderService = new StubOrderService(new UnifiedOrder { OrderId = "x", Platform = PlatformType.Shopee });
        var processor = new WebhookEventProcessor(db, orderService, NullLogger<WebhookEventProcessor>.Instance);

        await processor.ProcessAsync(1);
        await processor.ProcessAsync(2);

        var call = Assert.Single(orderService.ListCalls);
        Assert.Equal(PlatformType.Shopee, call.Platform);
        Assert.Equal("SHOP-1", call.ShopId);
        Assert.NotNull(call.DateFrom);
    }

    [Fact]
    public async Task OrderListFailure_DoesNotChangeEventStatus()
    {
        WebhookEventProcessor.ResetOrderListThrottle();
        await using var db = CreateDb();
        db.PlatformWebhookEvents.Add(NewEvent("ORD-C", "ORDER_STATUS_UPDATE"));
        await db.SaveChangesAsync();
        var orderService = new StubOrderService(new UnifiedOrder { OrderId = "x", Platform = PlatformType.Shopee })
        {
            ListException = new InvalidOperationException("list failed")
        };
        var processor = new WebhookEventProcessor(db, orderService, NullLogger<WebhookEventProcessor>.Instance);

        await processor.ProcessAsync(1);

        Assert.Single(orderService.ListCalls);
        Assert.Equal(WebhookProcessingStatuses.Processed, (await db.PlatformWebhookEvents.SingleAsync()).ProcessingStatus);
    }

    private static PlatformWebhookEvent NewEvent(string orderId, string eventType) => new()
    {
        EventKey = $"Shopee:ORDER:SHOP-1:{orderId}:{eventType}:1",
        Platform = "Shopee",
        EventType = eventType,
        ShopId = "SHOP-1",
        PlatformOrderId = orderId,
        ProcessingStatus = WebhookProcessingStatuses.Queued,
        ReceivedDate = DateTime.Now
    };

    private static ApplicationDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private sealed class StubOrderService(
        UnifiedOrder? order = null,
        Exception? exception = null) : IOrderService
    {
        public int WebhookCalls { get; private set; }
        public List<OrderFilter> ListCalls { get; } = new();
        public Exception? ListException { get; init; }

        public Task<PaginatedResult<UnifiedOrder>> GetOrdersAsync(OrderFilter filter)
        {
            ListCalls.Add(filter);
            if (ListException != null)
                throw ListException;
            return Task.FromResult(new PaginatedResult<UnifiedOrder>());
        }

        public Task<UnifiedOrder?> GetOrderDetailAsync(PlatformType platform, string orderId, string? shopId = null) =>
            Task.FromResult<UnifiedOrder?>(null);

        public Task<UnifiedOrder?> SyncOrderFromWebhookAsync(
            PlatformType platform,
            string orderId,
            string? shopId = null,
            CancellationToken cancellationToken = default)
        {
            WebhookCalls++;
            if (exception != null)
                throw exception;
            return Task.FromResult(order);
        }

        public Task<List<UnifiedOrder>> GetOrdersFromAllPlatformsAsync(OrderFilter filter) =>
            Task.FromResult(new List<UnifiedOrder>());

        public Task<List<UnifiedOrder>> GetOrdersNearCancellationAsync(OrderFilter filter, int daysThreshold = 2) =>
            Task.FromResult(new List<UnifiedOrder>());
    }
}
