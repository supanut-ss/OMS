using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class LazadaTrackingTests
{
    [Fact]
    public async Task GetTrackingInfo_WhenOrderIdIsInvalid_ReportsLazadaErrorAndDoesNotCallTrace()
    {
        const string invalidOrderJson = """
        {
          "code": "16",
          "type": "ISP",
          "message": "E016: Invalid Order ID",
          "request_id": "test-request"
        }
        """;
        var handler = new StubHandler(invalidOrderJson, "{}");
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.lazada.co.th/rest/")
        };
        var client = new LazadaClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<LazadaClient>.Instance);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.GetTrackingInfoAsync("test-token", "seller-123", "711433034864242"));

        Assert.Contains("code 16", exception.Message);
        Assert.Contains("/orders/get", exception.Message);
        Assert.Single(handler.RequestUris);
        Assert.EndsWith("/rest/order/items/get", handler.RequestUris[0].AbsolutePath);
    }

    [Fact]
    public async Task GetTrackingInfo_WhenOrderItemsHaveTracking_DoesNotCallTrace()
    {
        const string orderItemsJson = """
        {
          "code": "0",
          "data": [
            { "order_item_id": 1, "package_id": "pkg-a", "tracking_code": "track-a", "shipment_provider": "LEX" },
            { "order_item_id": 2, "package_id": "pkg-b", "tracking_code": "track-b", "shipment_provider": "LEX" }
          ]
        }
        """;
        const string emptyTraceJson = """
        {
          "result": {
            "not_success": false,
            "success": true,
            "error_code": {},
            "repeated": false,
            "retry": false
          },
          "code": "0",
          "request_id": "test-request"
        }
        """;

        var handler = new StubHandler(orderItemsJson, emptyTraceJson);
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.lazada.co.th/rest/")
        };
        var client = new LazadaClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<LazadaClient>.Instance);

        var tracking = await client.GetTrackingInfoAsync("test-token", "seller-123", "order-1");

        Assert.NotNull(tracking);
        Assert.Equal("track-a", tracking.TrackingNumber);
        Assert.Equal(2, tracking.Packages.Count);
        Assert.Equal("track-b", tracking.Packages[1].TrackingNumber);
        Assert.Single(handler.RequestUris);
        Assert.EndsWith("/rest/order/items/get", handler.RequestUris[0].AbsolutePath);
    }

    [Fact]
    public async Task GetTrackingInfo_PrefersTrackingNumberOverSellerPackageCode()
    {
        const string orderItemsJson = """
        {
          "code": "0",
          "data": [
            {
              "order_item_id": 1,
              "package_id": "SOF_FP000000000001",
              "tracking_code": "SOF_FP000000000001",
              "tracking_number": "LEXD00188557241",
              "shipment_provider": "LEX TH"
            }
          ]
        }
        """;

        var handler = new StubHandler(orderItemsJson, "{}");
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.lazada.co.th/rest/")
        };
        var client = new LazadaClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<LazadaClient>.Instance);

        var tracking = await client.GetTrackingInfoAsync("test-token", "seller-123", "order-1");

        Assert.NotNull(tracking);
        Assert.Equal("LEXD00188557241", tracking.TrackingNumber);
        Assert.Equal("LEXD00188557241", tracking.Packages[0].TrackingNumber);
    }

    [Fact]
    public async Task GetTrackingInfo_PreservesRestPathAndMapsEveryPackage()
    {
        const string orderItemsJson = """
        {
          "code": "0",
          "data": [
            { "order_item_id": 1, "package_id": "pkg-a", "tracking_code": "", "shipment_provider": "LEX" },
            { "order_item_id": 2, "package_id": "pkg-b", "tracking_code": "", "shipment_provider": "LEX" }
          ]
        }
        """;
        const string responseJson = """
        {
          "code": "0",
          "result": {
            "success": true,
            "module": [
              {
                "ofc_order_id": 1100453800688001,
                "package_detail_info_list": [
                  {
                    "ofc_package_id": "pkg-a",
                    "tracking_number": "track-a",
                    "logistic_detail_info_list": [
                      { "status_code": "SHIPPED", "description": "Parcel shipped", "event_time": 1788343576 }
                    ]
                  },
                  {
                    "ofc_package_id": "pkg-b",
                    "tracking_number": "track-b",
                    "logistic_detail_info_list": []
                  }
                ]
              }
            ]
          }
        }
        """;

        var handler = new StubHandler(orderItemsJson, responseJson);
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.lazada.co.th/rest/")
        };
        var client = new LazadaClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<LazadaClient>.Instance);

        var tracking = await client.GetTrackingInfoAsync(
            "test-token", "seller-123", "1100453800688001");

        Assert.NotNull(tracking);
        Assert.Equal("/rest/logistic/order/trace", handler.RequestUri!.AbsolutePath);
        Assert.Contains("seller_id=seller-123", handler.RequestUri.Query);
        Assert.Contains("ofcPackageIdList=%5B%22pkg-a%22%2C%22pkg-b%22%5D", handler.RequestUri.Query);
        Assert.Equal(2, tracking.Packages.Count);
        Assert.Equal("track-a", tracking.Packages[0].TrackingNumber);
        Assert.Equal("track-b", tracking.Packages[1].TrackingNumber);
        Assert.Single(tracking.Packages[0].Events);
    }

    [Fact]
    public async Task SplitOrderAsync_PacksEachWmsBoxUsingItsSkuAndQuantity()
    {
        const string orderItemsJson = """
        {
          "code": "0",
          "data": [
            { "order_item_id": 101, "seller_sku": "16262078600", "quantity": 1, "status": "pending" },
            { "order_item_id": 102, "seller_sku": "16262078600", "quantity": 1, "status": "pending" },
            { "order_item_id": 201, "seller_sku": "16261083348", "quantity": 1, "status": "pending" },
            { "order_item_id": 202, "seller_sku": "16261083348", "quantity": 1, "status": "pending" }
          ]
        }
        """;
        var handler = new PackStubHandler(orderItemsJson);
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.lazada.co.th/rest/")
        };
        var client = new LazadaClient(
            new StubHttpClientFactory(httpClient),
            NullLogger<LazadaClient>.Instance);
        var firstBox = Guid.NewGuid();
        var secondBox = Guid.NewGuid();

        var result = await client.SplitOrderAsync(
            "test-token",
            "seller-123",
            new SplitPlatformOrderRequest
            {
                Platform = PlatformType.Lazada,
                OrderId = "7001",
                Packages = new List<WmsPackageManifestPackage>
                {
                    new()
                    {
                        WmsPackageRef = firstBox,
                        BoxNumber = 1,
                        Items = new List<WmsPackageManifestItem>
                        {
                            new() { ItemNumber = "16262078600", Quantity = 2 }
                        }
                    },
                    new()
                    {
                        WmsPackageRef = secondBox,
                        BoxNumber = 2,
                        Items = new List<WmsPackageManifestItem>
                        {
                            new() { ItemNumber = "16261083348", Quantity = 2 }
                        }
                    }
                }
            });

        Assert.Equal(2, result.PackageMappings.Count);
        Assert.Equal(firstBox, result.PackageMappings[0].WmsPackageRef);
        Assert.Equal("package-a", result.PackageMappings[0].PlatformPackageId);
        Assert.Equal(secondBox, result.PackageMappings[1].WmsPackageRef);
        Assert.Equal("package-b", result.PackageMappings[1].PlatformPackageId);
        Assert.Equal(2, handler.PackRequests.Count);
        Assert.Contains(101L, handler.PackRequests[0]);
        Assert.Contains(102L, handler.PackRequests[0]);
        Assert.Contains(201L, handler.PackRequests[1]);
        Assert.Contains(202L, handler.PackRequests[1]);
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class StubHandler(string orderItemsJson, string traceJson) : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }
        public List<Uri> RequestUris { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            RequestUris.Add(request.RequestUri!);
            var responseJson = request.RequestUri!.AbsolutePath.EndsWith("/order/items/get", StringComparison.Ordinal)
                ? orderItemsJson
                : traceJson;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
                RequestMessage = request
            });
        }
    }

    private sealed class PackStubHandler(string orderItemsJson) : HttpMessageHandler
    {
        private int _packCall;
        public List<List<long>> PackRequests { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            await Task.Yield();
            if (request.RequestUri!.AbsolutePath.EndsWith("/order/items/get", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(orderItemsJson, Encoding.UTF8, "application/json"),
                    RequestMessage = request
                };
            }

            Assert.Equal(HttpMethod.Post, request.Method);
            var encodedPackRequest = request.RequestUri.Query
                .TrimStart('?')
                .Split('&', StringSplitOptions.RemoveEmptyEntries)
                .Select(part => part.Split('=', 2))
                .Where(parts => parts.Length == 2 && parts[0] == "packReq")
                .Select(parts => parts[1])
                .Single();
            using var packRequest = JsonDocument.Parse(Uri.UnescapeDataString(encodedPackRequest));
            var itemIds = packRequest.RootElement
                .GetProperty("pack_order_list")[0]
                .GetProperty("order_item_list")
                .EnumerateArray()
                .Select(x => x.GetInt64())
                .ToList();
            PackRequests.Add(itemIds);
            var packageId = Interlocked.Increment(ref _packCall) == 1 ? "package-a" : "package-b";
            var packedItemJson = string.Join(",", itemIds.Select(itemId =>
                $"{{\"order_item_id\":{itemId},\"package_id\":\"{packageId}\",\"item_err_code\":\"0\"}}"));
            var response = $$"""
            {
              "errorCode": "0",
              "errorMsg": "",
              "result": {
                "data": {
                  "pack_order_list": [
                    {
                      "order_item_list": [{{packedItemJson}}]
                    }
                  ]
                }
              }
            }
            """;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(response, Encoding.UTF8, "application/json"),
                RequestMessage = request
            };
        }
    }
}
