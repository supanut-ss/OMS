using System.Reflection;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation;

namespace OmsApi.Tests;

public class ShippingServiceValidationTests
{
    [Fact]
    public void ValidateShopeeItemAllocation_AcceptsSingleBoxWithExactSkuAndQuantity()
    {
        var order = ShopeeOrder("SKU-1", 2);
        var packages = new List<WmsPackageManifestPackage>
        {
            Box("SKU-1", 2)
        };

        InvokeValidation(order, packages);
    }

    [Fact]
    public void ValidateShopeeItemAllocation_RejectsSingleBoxQuantityMismatch()
    {
        var exception = Assert.Throws<TargetInvocationException>(() =>
            InvokeValidation(
                ShopeeOrder("SKU-1", 2),
                new List<WmsPackageManifestPackage> { Box("SKU-1", 1) }));

        Assert.IsType<InvalidOperationException>(exception.InnerException);
        Assert.Contains("do not match", exception.InnerException!.Message);
    }

    [Theory]
    [InlineData(PlatformType.Lazada)]
    [InlineData(PlatformType.TikTok)]
    public void ValidateMarketplaceItemAllocation_AcceptsExactSkuAndQuantity(
        PlatformType platform)
    {
        InvokeMarketplaceValidation(
            platform,
            MarketplaceOrder(platform, "SKU-1", 2),
            new List<WmsPackageManifestPackage> { Box("SKU-1", 2) });
    }

    [Theory]
    [InlineData(PlatformType.Lazada)]
    [InlineData(PlatformType.TikTok)]
    public void ValidateMarketplaceItemAllocation_RejectsQuantityMismatch(
        PlatformType platform)
    {
        var exception = Assert.Throws<TargetInvocationException>(() =>
            InvokeMarketplaceValidation(
                platform,
                MarketplaceOrder(platform, "SKU-1", 2),
                new List<WmsPackageManifestPackage> { Box("SKU-1", 1) }));

        Assert.IsType<InvalidOperationException>(exception.InnerException);
        Assert.Contains(platform.ToString(), exception.InnerException!.Message);
        Assert.Contains("do not match", exception.InnerException.Message);
    }

    private static UnifiedOrder ShopeeOrder(string sku, int quantity) => new()
    {
        Platform = PlatformType.Shopee,
        OriginalStatus = "READY_TO_SHIP",
        Items =
        {
            new OrderItem { ItemId = "101", Sku = sku, Quantity = quantity }
        }
    };

    private static UnifiedOrder MarketplaceOrder(
        PlatformType platform,
        string sku,
        int quantity) => new()
    {
        Platform = platform,
        Items =
        {
            new OrderItem { ItemId = "101", Sku = sku, Quantity = quantity }
        }
    };

    private static WmsPackageManifestPackage Box(string itemNumber, decimal quantity) => new()
    {
        WmsPackageRef = Guid.NewGuid(),
        BoxNumber = 1,
        IsCloseBox = "YES",
        Items =
        {
            new WmsPackageManifestItem { ItemNumber = itemNumber, Quantity = quantity }
        }
    };

    private static void InvokeValidation(
        UnifiedOrder order,
        IReadOnlyCollection<WmsPackageManifestPackage> packages)
    {
        var method = typeof(ShippingService).GetMethod(
            "ValidateShopeeItemAllocation",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        method.Invoke(null, new object[] { order, packages });
    }

    private static void InvokeMarketplaceValidation(
        PlatformType platform,
        UnifiedOrder order,
        IReadOnlyCollection<WmsPackageManifestPackage> packages)
    {
        var method = typeof(ShippingService).GetMethod(
            "ValidateMarketplaceItemAllocation",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        method.Invoke(null, new object[] { platform, order, packages });
    }
}
