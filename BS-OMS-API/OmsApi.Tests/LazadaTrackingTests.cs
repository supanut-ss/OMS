using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
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
}
