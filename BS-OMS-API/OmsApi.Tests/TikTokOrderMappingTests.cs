using System.Reflection;
using System.Text.Json;
using OmsApi.Models.Orders;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class TikTokOrderMappingTests
{
    [Fact]
    public void MapTikTokOrderDetail_MapsCurrentOrderResponseShape()
    {
        const string json = """
        {
          "id": "585819642580993034",
          "status": "DELIVERED",
          "create_time": 1788170578,
          "update_time": 1788171181,
          "cancel_order_sla_time": 1788454799,
          "buyer_message": "",
          "tracking_number": "174099746111735",
          "shipping_provider": "TT Virtual# J&T Express",
          "delivery_option_name": "Standard shipping",
          "line_items": [{
            "id": "585819642581124106",
            "product_id": "1737184575174903328",
            "product_name": "Sandbox - Test Item for API",
            "sku_id": "1737184701880632864",
            "seller_sku": "",
            "sku_name": "ค่าเริ่มต้น",
            "sku_image": "https://example.test/item.jpeg",
            "original_price": "10000",
            "sale_price": "9500",
            "tracking_number": "174099746111735",
            "shipping_provider_name": "TT Virtual# J&T Express"
          }],
          "packages": [{ "id": "1209239909803787274" }],
          "payment": {
            "currency": "THB",
            "total_amount": "9500.1",
            "shipping_fee": "0.1"
          },
          "recipient_address": {
            "name": "a***o",
            "phone_number": "(+86)123******10",
            "address_line1": "50***",
            "full_address": "Thailand, Bangkok, Pathum Wan,50***",
            "postal_code": "10***",
            "region_code": "TH",
            "district_info": [
              { "address_level": "L1", "address_name": "Bangkok" },
              { "address_level": "L2", "address_name": "Pathum Wan" }
            ]
          }
        }
        """;

        using var document = JsonDocument.Parse(json);
        var method = typeof(TikTokClient).GetMethod(
            "MapTikTokOrderDetail",
            BindingFlags.NonPublic | BindingFlags.Static);

        var order = Assert.IsType<UnifiedOrder>(method!.Invoke(null, [document.RootElement]));

        Assert.Equal("585819642580993034", order.OrderId);
        Assert.Equal(9500.1m, order.TotalAmount);
        Assert.Equal("174099746111735", order.Shipping!.TrackingNumber);
        Assert.Equal("TT Virtual# J&T Express", order.Shipping.Carrier);
        Assert.Equal("1209239909803787274", order.Shipping.PackageNumber);
        Assert.Equal("Bangkok", order.Shipping.RecipientAddress!.Province);
        Assert.Equal("Pathum Wan", order.Shipping.RecipientAddress.District);
        Assert.Equal("1737184575174903328", order.Items.Single().ItemId);
        Assert.Equal("https://example.test/item.jpeg", order.Items.Single().ImageUrl);
        Assert.Equal(1, order.Items.Single().Quantity);
        Assert.Equal(500m, order.Items.Single().Discount);
        Assert.Single(order.Packages);
        Assert.Equal("1209239909803787274", order.Packages[0].PackageId);
        Assert.Contains("585819642581124106", order.Packages[0].ItemIds);
    }

    [Fact]
    public void MapTikTokOrderDetail_MapsMultiplePackagesForOneOrder()
    {
        const string json = """
        {
          "id": "order-1",
          "status": "SHIPPED",
          "line_items": [
            { "id": "line-1", "package_id": "package-a", "tracking_number": "track-a", "shipping_provider_name": "Carrier A", "display_status": "IN_TRANSIT" },
            { "id": "line-2", "package_id": "package-b", "tracking_number": "track-b", "shipping_provider_name": "Carrier B", "display_status": "IN_TRANSIT" }
          ],
          "packages": [{ "id": "package-a" }, { "id": "package-b" }]
        }
        """;

        using var document = JsonDocument.Parse(json);
        var method = typeof(TikTokClient).GetMethod(
            "MapTikTokOrderDetail",
            BindingFlags.NonPublic | BindingFlags.Static);

        var order = Assert.IsType<UnifiedOrder>(method!.Invoke(null, [document.RootElement]));

        Assert.Equal(2, order.Packages.Count);
        Assert.Collection(order.Packages,
            package =>
            {
                Assert.Equal("package-a", package.PackageId);
                Assert.Equal("track-a", package.TrackingNumber);
                Assert.Contains("line-1", package.ItemIds);
            },
            package =>
            {
                Assert.Equal("package-b", package.PackageId);
                Assert.Equal("track-b", package.TrackingNumber);
                Assert.Contains("line-2", package.ItemIds);
            });
        Assert.Equal("track-a", order.Shipping!.TrackingNumber);
        Assert.Equal("package-a", order.Shipping.PackageNumber);
    }
}
