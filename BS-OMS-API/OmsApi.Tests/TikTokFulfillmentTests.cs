using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class TikTokFulfillmentTests
{
    [Fact]
    public async Task SplitOrder_MapsNewAndOriginalPackagesToTheirWmsBoxes()
    {
        var handler = new SplitHandler();
        var client = CreateClient(handler);
        var firstBox = Guid.NewGuid();
        var secondBox = Guid.NewGuid();

        var result = await client.SplitOrderAsync(
            "token",
            "shop-cipher",
            new SplitPlatformOrderRequest
            {
                Platform = PlatformType.TikTok,
                OrderId = "ORDER-1",
                Packages =
                {
                    Box(firstBox, 1, "SKU-A"),
                    Box(secondBox, 2, "SKU-B")
                }
            });

        Assert.Equal(2, result.PackageMappings.Count);
        Assert.Equal(firstBox, result.PackageMappings[0].WmsPackageRef);
        Assert.Equal("PKG-NEW", result.PackageMappings[0].PlatformPackageId);
        Assert.Equal(secondBox, result.PackageMappings[1].WmsPackageRef);
        Assert.Equal("PKG-ORIGINAL", result.PackageMappings[1].PlatformPackageId);

        using var body = JsonDocument.Parse(handler.SplitBody);
        var group = Assert.Single(
            body.RootElement.GetProperty("splittable_groups").EnumerateArray());
        Assert.Equal("1", group.GetProperty("id").GetString());
        Assert.Equal(
            "LINE-A",
            Assert.Single(group.GetProperty("order_line_item_ids").EnumerateArray())
                .GetString());
    }

    [Fact]
    public async Task ShipOrder_UsesPackageEndpointAndDropOffHandover()
    {
        var handler = new ShipHandler();
        var client = CreateClient(handler);

        var arranged = await client.ShipOrderAsync(
            "token",
            "shop-cipher",
            new ShipOrderRequest
            {
                Platform = PlatformType.TikTok,
                OrderId = "ORDER-1",
                PackageId = "PKG-1",
                ShippingMethod = "dropoff"
            });

        Assert.True(arranged);
        Assert.Equal(
            "/fulfillment/202309/packages/PKG-1/ship",
            handler.RequestPath);
        using var body = JsonDocument.Parse(handler.RequestBody);
        Assert.Equal(
            "DROP_OFF",
            body.RootElement.GetProperty("handover_method").GetString());
    }

    private static WmsPackageManifestPackage Box(
        Guid packageRef,
        int boxNumber,
        string itemNumber) => new()
    {
        WmsPackageRef = packageRef,
        BoxNumber = boxNumber,
        IsCloseBox = "YES",
        Items =
        {
            new WmsPackageManifestItem
            {
                ItemNumber = itemNumber,
                Quantity = 1
            }
        }
    };

    private static TikTokClient CreateClient(HttpMessageHandler handler) =>
        new(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://open-api.tiktokglobalshop.com")
            }),
            NullLogger<TikTokClient>.Instance);

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class SplitHandler : HttpMessageHandler
    {
        private int _orderDetailCalls;
        public string SplitBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith(
                    "/split",
                    StringComparison.Ordinal))
            {
                SplitBody = await request.Content!.ReadAsStringAsync(cancellationToken);
                return JsonResponse(
                    """
                    {
                      "code": 0,
                      "message": "Success",
                      "data": {
                        "packages": [
                          {
                            "splittable_group_id": "1",
                            "id": "PKG-NEW"
                          }
                        ]
                      }
                    }
                    """);
            }

            var afterSplit = Interlocked.Increment(ref _orderDetailCalls) > 1;
            return JsonResponse(
                $$"""
                {
                  "code": 0,
                  "message": "Success",
                  "data": {
                    "orders": [
                      {
                        "id": "ORDER-1",
                        "status": "AWAITING_SHIPMENT",
                        "line_items": [
                          {
                            "id": "LINE-A",
                            "seller_sku": "SKU-A",
                            "quantity": 1,
                            "package_id": "{{(afterSplit ? "PKG-NEW" : "PKG-ORIGINAL")}}"
                          },
                          {
                            "id": "LINE-B",
                            "seller_sku": "SKU-B",
                            "quantity": 1,
                            "package_id": "PKG-ORIGINAL"
                          }
                        ]
                      }
                    ]
                  }
                }
                """);
        }
    }

    private sealed class ShipHandler : HttpMessageHandler
    {
        public string RequestPath { get; private set; } = string.Empty;
        public string RequestBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestPath = request.RequestUri!.AbsolutePath;
            RequestBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            return JsonResponse(
                """{"code":0,"message":"Success","data":{}}""");
        }
    }

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
}
