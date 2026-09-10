using System.Reflection;
using System.Text.Json;
using OmsApi.Models.Orders;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class MultiPackageMappingTests
{
    [Fact]
    public void ShopeeOrderDetail_MapsAllPackages()
    {
        const string json = """
        {
          "order_sn": "order-1",
          "order_status": "SHIPPED",
          "package_list": [
            { "package_number": "pkg-a", "tracking_number": "track-a", "shipping_carrier": "Carrier A", "logistics_status": "SHIPPED" },
            { "package_number": "pkg-b", "tracking_number": "track-b", "shipping_carrier": "Carrier B", "logistics_status": "SHIPPED" }
          ],
          "item_list": [
            { "item_id": 101, "item_name": "Item A", "package_number": "pkg-a" },
            { "item_id": 102, "item_name": "Item B", "package_number": "pkg-b" }
          ]
        }
        """;

        var order = InvokeMapper<ShopeeClient>("MapShopeeOrderDetail", json);

        Assert.Equal(2, order.Packages.Count);
        Assert.Equal("track-a", order.Packages[0].TrackingNumber);
        Assert.Equal("track-b", order.Packages[1].TrackingNumber);
        Assert.Contains("101", order.Packages[0].ItemIds);
        Assert.Contains("102", order.Packages[1].ItemIds);
        Assert.Equal("pkg-a", order.Shipping!.PackageNumber);
    }

    [Fact]
    public void LazadaOrderDetail_MapsAllPackages()
    {
        const string json = """
        {
          "order_id": 1,
          "statuses": ["shipped"],
          "order_items": [
            { "order_item_id": 201, "package_id": "pkg-a", "tracking_code": "track-a", "shipping_provider": "Carrier A", "status": "shipped" },
            { "order_item_id": 202, "package_id": "pkg-b", "tracking_code": "track-b", "shipping_provider": "Carrier B", "status": "shipped" }
          ]
        }
        """;

        var order = InvokeMapper<LazadaClient>("MapLazadaOrderDetail", json);

        Assert.Equal(2, order.Packages.Count);
        Assert.Equal("track-a", order.Packages[0].TrackingNumber);
        Assert.Equal("track-b", order.Packages[1].TrackingNumber);
        Assert.Contains("201", order.Packages[0].ItemIds);
        Assert.Contains("202", order.Packages[1].ItemIds);
        Assert.Equal("pkg-a", order.Shipping!.PackageNumber);
    }

    [Fact]
    public void LazadaOrderDetail_MapsStringPriceWithoutJsonTypeError()
    {
        const string json = """
        {
          "order_number": 1117729602964242,
          "order_id": 1117729602964242,
          "created_at": "2026-09-09 16:27:36 +0700",
          "updated_at": "2026-09-09 16:35:32 +0700",
          "price": "1683.00",
          "customer_first_name": "L**r",
          "buyer_note": "test note",
          "tax_code": "3333333333333",
          "items_count": 4,
          "statuses": ["packed"],
          "address_shipping": {
            "country": "Thailand",
            "address1": "W**n",
            "city": "Pathum Wan",
            "post_code": "10330",
            "first_name": "S**B"
          }
        }
        """;

        var order = InvokeMapper<LazadaClient>("MapLazadaOrderDetail", json);

        Assert.Equal("1117729602964242", order.OrderId);
        Assert.Equal(1683.00m, order.TotalAmount);
        Assert.Equal("packed", order.OriginalStatus);
        Assert.Equal("test note", order.BuyerRemarks);
        Assert.True(order.TaxInvoiceRequested);
        Assert.Equal("3333333333333", order.TaxInvoice!.TaxId);
        Assert.Equal(2026, order.CreatedAt.Year);
        Assert.Equal(2026, order.UpdatedAt!.Value.Year);
    }

    [Fact]
    public void LazadaOrderDetail_MapsStringOrderIdAndNumericPrice()
    {
        const string json = """
        {
          "order_id": "1117729602964242",
          "price": 1683.00,
          "statuses": ["packed"]
        }
        """;

        var order = InvokeMapper<LazadaClient>("MapLazadaOrderDetail", json);

        Assert.Equal("1117729602964242", order.OrderId);
        Assert.Equal(1683.00m, order.TotalAmount);
    }

    private static UnifiedOrder InvokeMapper<TClient>(string methodName, string json)
    {
        using var document = JsonDocument.Parse(json);
        var method = typeof(TClient).GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static);
        return Assert.IsType<UnifiedOrder>(method!.Invoke(null, [document.RootElement]));
    }
}
