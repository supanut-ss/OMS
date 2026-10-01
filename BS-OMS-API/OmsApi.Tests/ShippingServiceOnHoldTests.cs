using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class ShippingServiceOnHoldTests
{
    [Fact]
    public async Task TikTokOnHoldOrder_IsBlockedBeforePlatformFulfillment()
    {
        await using var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
                .Options);
        db.PlatformOrders.Add(new PlatformOrder
        {
            Platform = "TikTok",
            ShopId = "SHOP-1",
            PlatformOrderId = "ORD-1",
            OriginalStatus = "ON_HOLD",
            Status = "Pending",
            OrderCreatedDate = DateTime.Now,
            CreateDate = DateTime.Now
        });
        await db.SaveChangesAsync();

        var service = new ShippingService(
            new NeverClientFactory(),
            NullLogger<ShippingService>.Instance,
            new NeverCredentialService(),
            db);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ShipOrderAsync(new ShipOrderRequest
            {
                Platform = PlatformType.TikTok,
                ShopId = "SHOP-1",
                OrderId = "ORD-1",
                PackageId = "PKG-1"
            }));

        Assert.Contains("ON_HOLD", exception.Message);
    }

    private sealed class NeverClientFactory : IPlatformClientFactory
    {
        public IPlatformClient GetClient(PlatformType platform) =>
            throw new InvalidOperationException("Platform client must not be called for an On Hold order.");
    }

    private sealed class NeverCredentialService : IPlatformCredentialService
    {
        public Task<T> ExecuteAsync<T>(
            PlatformType platform,
            string? shopId,
            Func<OmsApi.Models.Auth.PlatformAccessCredential, Task<T>> operation,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Credential service must not be called for an On Hold order.");

        public Task<IReadOnlyList<OmsApi.Models.Auth.PlatformCredentialSelection>> GetActiveCredentialSelectionsAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<OmsApi.Models.Auth.PlatformCredentialSelection>>(
                Array.Empty<OmsApi.Models.Auth.PlatformCredentialSelection>());
    }
}
