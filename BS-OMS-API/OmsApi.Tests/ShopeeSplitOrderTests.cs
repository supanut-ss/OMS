using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class ShopeeSplitOrderTests
{
    [Fact]
    public async Task SplitOrder_UsesWmsBoxesAndReturnsPackageMappings()
    {
        const string orderJson = """
        {
          "error": "",
          "response": {
            "order_list": [{
              "order_sn": "ORDER-1",
              "order_status": "READY_TO_SHIP",
              "item_list": [{
                "item_id": 101,
                "model_id": 202,
                "order_item_id": 303,
                "promotion_group_id": 0,
                "model_sku": "FND",
                "model_quantity_purchased": 3
              }]
            }]
          }
        }
        """;
        const string splitJson = """
        {
          "error": "",
          "response": {
            "order_sn": "ORDER-1",
            "package_list": [
              { "package_number": "PKG-1", "item_list": [] },
              { "package_number": "PKG-2", "item_list": [] }
            ]
          }
        }
        """;
        var handler = new SplitHandler(orderJson, splitJson);
        var client = new ShopeeClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://openplatform.example.test")
            }),
            NullLogger<ShopeeClient>.Instance);
        var box1 = Guid.NewGuid();
        var box2 = Guid.NewGuid();

        var result = await client.SplitOrderAsync("token", "123", new SplitPlatformOrderRequest
        {
            OrderId = "ORDER-1",
            Packages =
            {
                Box(box1, 1, 2),
                Box(box2, 2, 1)
            }
        });

        Assert.Equal(2, result.PackageMappings.Count);
        Assert.Equal((box1, "PKG-1"),
            (result.PackageMappings[0].WmsPackageRef, result.PackageMappings[0].PlatformPackageId));
        Assert.Equal((box2, "PKG-2"),
            (result.PackageMappings[1].WmsPackageRef, result.PackageMappings[1].PlatformPackageId));

        using var body = JsonDocument.Parse(handler.SplitBody!);
        var packages = body.RootElement.GetProperty("package_list");
        Assert.Equal(2, packages.GetArrayLength());
        var firstItem = packages[0].GetProperty("item_list")[0];
        Assert.Equal(101, firstItem.GetProperty("item_id").GetInt64());
        Assert.Equal(202, firstItem.GetProperty("model_id").GetInt64());
        Assert.Equal(303, firstItem.GetProperty("order_item_id").GetInt64());
        Assert.Equal(2, firstItem.GetProperty("model_quantity").GetInt64());
        Assert.Equal(1, packages[1].GetProperty("item_list")[0]
            .GetProperty("model_quantity").GetInt64());
    }

    [Fact]
    public async Task SplitOrder_MatchesSandboxItemsByItemId_WhenSellerSkuIsEmpty()
    {
        const string orderJson = """
        {
          "error": "",
          "response": {
            "order_list": [{
              "order_sn": "ORDER-ITEM-ID",
              "order_status": "READY_TO_SHIP",
              "item_list": [
                {
                  "item_id": 802601569,
                  "model_id": 202,
                  "order_item_id": 303,
                  "model_sku": "",
                  "item_sku": "",
                  "model_quantity_purchased": 2
                },
                {
                  "item_id": 802601428,
                  "model_id": 204,
                  "order_item_id": 305,
                  "model_sku": "",
                  "item_sku": "",
                  "model_quantity_purchased": 1
                }
              ]
            }]
          }
        }
        """;
        const string splitJson = """
        {
          "error": "",
          "response": {
            "package_list": [
              { "package_number": "PKG-1" },
              { "package_number": "PKG-2" }
            ]
          }
        }
        """;
        var handler = new SplitHandler(orderJson, splitJson);
        var client = new ShopeeClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://openplatform.example.test")
            }),
            NullLogger<ShopeeClient>.Instance);

        var result = await client.SplitOrderAsync("token", "123", new SplitPlatformOrderRequest
        {
            OrderId = "ORDER-ITEM-ID",
            Packages =
            {
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = Guid.NewGuid(), BoxNumber = 1, IsCloseBox = "YES",
                    Items = { new WmsPackageManifestItem { ItemNumber = "802601569", Quantity = 2 } }
                },
                new WmsPackageManifestPackage
                {
                    WmsPackageRef = Guid.NewGuid(), BoxNumber = 2, IsCloseBox = "YES",
                    Items = { new WmsPackageManifestItem { ItemNumber = "802601428", Quantity = 1 } }
                }
            }
        });

        Assert.Equal(2, result.PackageMappings.Count);
        using var body = JsonDocument.Parse(handler.SplitBody!);
        var packages = body.RootElement.GetProperty("package_list");
        Assert.Equal(802601569, packages[0].GetProperty("item_list")[0].GetProperty("item_id").GetInt64());
        Assert.Equal(802601428, packages[1].GetProperty("item_list")[0].GetProperty("item_id").GetInt64());
    }

    [Fact]
    public async Task GetTracking_SplitOrderWithoutTracking_DoesNotCallOrderOnlyFallback()
    {
        const string orderJson = """
        {
          "error": "",
          "response": {
            "order_list": [{
              "order_sn": "ORDER-SPLIT",
              "order_status": "READY_TO_SHIP",
              "package_list": [
                { "package_number": "PKG-1", "logistics_status": "LOGISTICS_NOT_START" },
                { "package_number": "PKG-2", "logistics_status": "LOGISTICS_NOT_START" }
              ],
              "item_list": []
            }]
          }
        }
        """;
        var handler = new SplitTrackingHandler(orderJson);
        var client = new ShopeeClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://openplatform.example.test")
            }),
            NullLogger<ShopeeClient>.Instance);

        var tracking = await client.GetTrackingInfoAsync("token", "123", "ORDER-SPLIT");

        Assert.NotNull(tracking);
        Assert.Equal(2, tracking.Packages.Count);
        Assert.Equal(new[] { "PKG-1", "PKG-2" }, tracking.Packages.Select(x => x.PackageId));
        Assert.Equal(new[] { "PKG-1", "PKG-2" }, handler.RequestedPackageNumbers);
        Assert.DoesNotContain(handler.RequestedPackageNumbers, string.IsNullOrWhiteSpace);
    }

    private static WmsPackageManifestPackage Box(Guid packageRef, int boxNumber, decimal quantity) => new()
    {
        WmsPackageRef = packageRef,
        BoxNumber = boxNumber,
        IsCloseBox = "YES",
        Items = { new WmsPackageManifestItem { ItemNumber = "FND", Quantity = quantity } }
    };

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class SplitHandler(string orderJson, string splitJson) : HttpMessageHandler
    {
        public string? SplitBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var isSplit = request.RequestUri!.AbsolutePath.EndsWith("/order/split_order", StringComparison.Ordinal);
            if (isSplit)
                SplitBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(isSplit ? splitJson : orderJson, Encoding.UTF8, "application/json"),
                RequestMessage = request
            };
        }
    }

    private sealed class SplitTrackingHandler(string orderJson) : HttpMessageHandler
    {
        public List<string> RequestedPackageNumbers { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("/logistics/get_tracking_number", StringComparison.Ordinal))
            {
                var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query);
                RequestedPackageNumbers.Add(query["package_number"] ?? string.Empty);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"error\":\"\",\"response\":{\"tracking_number\":\"\"}}",
                        Encoding.UTF8,
                        "application/json"),
                    RequestMessage = request
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(orderJson, Encoding.UTF8, "application/json"),
                RequestMessage = request
            });
        }
    }
}
