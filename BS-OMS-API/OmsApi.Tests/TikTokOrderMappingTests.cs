using System.Reflection;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Orders;
using OmsApi.Models.Shipping;
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

    [Fact]
    public async Task SplitOrderAsync_MapsReturnedPackageAndOriginalPackageToWmsBoxes()
    {
        var firstBox = Guid.NewGuid();
        var secondBox = Guid.NewGuid();
        var handler = new TikTokSplitHandler();
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://open-api.tiktokglobalshop.com/")
        };
        var client = new TikTokClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<TikTokClient>.Instance);

        var result = await client.SplitOrderAsync(
            "test-token",
            "shop-cipher",
            new SplitPlatformOrderRequest
            {
                Platform = PlatformType.TikTok,
                OrderId = "order-1",
                Packages = new List<WmsPackageManifestPackage>
                {
                    new()
                    {
                        WmsPackageRef = firstBox,
                        BoxNumber = 1,
                        Items = new List<WmsPackageManifestItem>
                        {
                            new() { ItemNumber = "SKU-A", Quantity = 2 }
                        }
                    },
                    new()
                    {
                        WmsPackageRef = secondBox,
                        BoxNumber = 2,
                        Items = new List<WmsPackageManifestItem>
                        {
                            new() { ItemNumber = "SKU-B", Quantity = 1 }
                        }
                    }
                }
            });

        Assert.Equal(2, result.PackageMappings.Count);
        Assert.Equal(firstBox, result.PackageMappings[0].WmsPackageRef);
        Assert.Equal("package-a", result.PackageMappings[0].PlatformPackageId);
        Assert.Equal(secondBox, result.PackageMappings[1].WmsPackageRef);
        Assert.Equal("original-package", result.PackageMappings[1].PlatformPackageId);
        Assert.Single(handler.SplitRequests);
        Assert.Contains("line-a-1", handler.SplitRequests[0]);
        Assert.Contains("line-a-2", handler.SplitRequests[0]);
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class TikTokSplitHandler : HttpMessageHandler
    {
        private int _orderRequestCount;
        public List<string> SplitRequests { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("/order/202309/orders", StringComparison.Ordinal))
            {
                _orderRequestCount++;
                var firstRead = _orderRequestCount == 1;
                var packageA = firstRead ? "original-package" : "package-a";
                const string packageB = "original-package";
                var orderJson = $$"""
                {
                  "code": 0,
                  "data": {
                    "orders": [{
                      "id": "order-1",
                      "line_items": [
                        { "id": "line-a-1", "seller_sku": "SKU-A", "quantity": 1, "package_id": "{{packageA}}" },
                        { "id": "line-a-2", "seller_sku": "SKU-A", "quantity": 1, "package_id": "{{packageA}}" },
                        { "id": "line-b-1", "seller_sku": "SKU-B", "quantity": 1, "package_id": "{{packageB}}" }
                      ]
                    }]
                  }
                }
                """;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(orderJson, Encoding.UTF8, "application/json"),
                    RequestMessage = request
                });
            }

            if (request.RequestUri.AbsolutePath.EndsWith("/fulfillment/202309/orders/order-1/split", StringComparison.Ordinal))
            {
                using var reader = new StreamReader(request.Content!.ReadAsStream());
                var body = reader.ReadToEnd();
                SplitRequests.Add(body);
                const string splitJson = """
                {
                  "code": 0,
                  "data": {
                    "packages": [
                      { "splittable_group_id": "wms_FIRST", "id": "package-a" }
                    ]
                  },
                  "message": "Success"
                }
                """;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(splitJson, Encoding.UTF8, "application/json"),
                    RequestMessage = request
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent("{}", Encoding.UTF8, "application/json"),
                RequestMessage = request
            });
        }
    }
}
