using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Extensions;
using OmsApi.Helpers;
using OmsApi.Models.Common;
using OmsApi.Services.Implementation;

namespace OmsApi.Tests;

public class WebhookIngestServiceTests
{
    [Fact]
    public async Task ValidWebhook_IsAcceptedAndEnqueuedOnce()
    {
        using var environment = ConfigureShopee();
        await using var db = CreateDb();
        var service = CreateService(db);
        var body = ShopeeBody("ORD-1", 1660124246);
        var signature = WebhookSignatureVerifier.ComputeShopee(
            Environment.GetEnvironmentVariable("SHOPEE_WEBHOOK_URL")!, body, "partner-key");

        var first = await service.ReceiveAsync(PlatformType.Shopee, body, signature);
        var duplicate = await service.ReceiveAsync(PlatformType.Shopee, body, signature);

        Assert.Equal(200, first.StatusCode);
        Assert.True(first.Accepted);
        Assert.False(first.Duplicate);
        Assert.Equal(200, duplicate.StatusCode);
        Assert.True(duplicate.Duplicate);
        Assert.Equal(1, await db.PlatformWebhookEvents.CountAsync());
    }

    [Fact]
    public async Task InvalidSignature_IsRejectedBeforeParsingOrPersistence()
    {
        using var environment = ConfigureShopee();
        await using var db = CreateDb();
        var service = CreateService(db);

        var result = await service.ReceiveAsync(
            PlatformType.Shopee,
            ShopeeBody("ORD-2", 1660124247),
            "not-a-signature");

        Assert.Equal(401, result.StatusCode);
        Assert.False(result.Accepted);
        Assert.Equal(0, await db.PlatformWebhookEvents.CountAsync());
    }

    [Fact]
    public async Task IncompletePayload_ReturnsBadRequest()
    {
        using var environment = ConfigureShopee();
        await using var db = CreateDb();
        var service = CreateService(db);
        var body = Encoding.UTF8.GetBytes("{\"code\":3,\"shop_id\":123,\"timestamp\":1,\"data\":{}}");
        var signature = WebhookSignatureVerifier.ComputeShopee(
            Environment.GetEnvironmentVariable("SHOPEE_WEBHOOK_URL")!, body, "partner-key");

        var result = await service.ReceiveAsync(PlatformType.Shopee, body, signature);

        Assert.Equal(400, result.StatusCode);
        Assert.False(result.Accepted);
    }

    private static WebhookIngestService CreateService(ApplicationDbContext db) =>
        new(db, new WebhookQueue(), NullLogger<WebhookIngestService>.Instance);

    private static ApplicationDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private static byte[] ShopeeBody(string orderId, long timestamp) => Encoding.UTF8.GetBytes(
        $"{{\"code\":3,\"shop_id\":123,\"timestamp\":{timestamp}," +
        $"\"data\":{{\"ordersn\":\"{orderId}\",\"status\":\"PAID\",\"update_time\":{timestamp}}}}}");

    private static IDisposable ConfigureShopee()
    {
        var snapshot = new Dictionary<string, string?>
        {
            ["SHOPEE_WEBHOOK_URL"] = Environment.GetEnvironmentVariable("SHOPEE_WEBHOOK_URL"),
            ["SHOPEE_PARTNER_KEY"] = Environment.GetEnvironmentVariable("SHOPEE_PARTNER_KEY"),
            ["SHOPEE_WEBHOOK_SECRET"] = Environment.GetEnvironmentVariable("SHOPEE_WEBHOOK_SECRET")
        };
        Environment.SetEnvironmentVariable("SHOPEE_WEBHOOK_URL", "https://example.test/api/webhooks/shopee");
        Environment.SetEnvironmentVariable("SHOPEE_PARTNER_KEY", "partner-key");
        Environment.SetEnvironmentVariable("SHOPEE_WEBHOOK_SECRET", null);
        return new EnvironmentRestore(snapshot);
    }

    private sealed class EnvironmentRestore(Dictionary<string, string?> values) : IDisposable
    {
        public void Dispose()
        {
            foreach (var pair in values)
                Environment.SetEnvironmentVariable(pair.Key, pair.Value);
        }
    }
}
