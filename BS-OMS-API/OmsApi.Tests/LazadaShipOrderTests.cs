using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class LazadaShipOrderTests
{
    [Fact]
    public async Task ShipOrder_WhenPackageIsPacked_CallsReadyToShipForThatPackage()
    {
        var handler = new ReadyToShipHandler();
        var client = CreateClient(handler);

        var arranged = await client.ShipOrderAsync(
            "token",
            "seller-1",
            new ShipOrderRequest
            {
                Platform = PlatformType.Lazada,
                OrderId = "7001",
                PackageId = "FP-1",
                ShippingMethod = "dropoff"
            });

        Assert.True(arranged);
        Assert.Equal("/rest/order/package/rts", handler.ReadyToShipUri!.AbsolutePath);
        var encodedRequest = handler.ReadyToShipUri.Query
            .TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Single(parts => parts[0] == "readyToShipReq")[1];
        using var request = JsonDocument.Parse(Uri.UnescapeDataString(encodedRequest));
        Assert.Equal(
            "FP-1",
            request.RootElement.GetProperty("packages")[0]
                .GetProperty("package_id").GetString());
    }

    [Fact]
    public async Task ShipOrder_WhenReadyToShipReturnsItemError_ThrowsPlatformError()
    {
        var client = CreateClient(new ReadyToShipHandler(itemErrorCode: "700000"));

        var exception = await Assert.ThrowsAsync<PlatformApiException>(() =>
            client.ShipOrderAsync(
                "token",
                "seller-1",
                new ShipOrderRequest
                {
                    Platform = PlatformType.Lazada,
                    OrderId = "7001",
                    PackageId = "FP-1"
                }));

        Assert.Equal("700000", exception.Code);
        Assert.Contains("status not allowed", exception.Message);
    }

    private static LazadaClient CreateClient(HttpMessageHandler handler) =>
        new(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://api.lazada.co.th/rest/")
            }),
            NullLogger<LazadaClient>.Instance);

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class ReadyToShipHandler(string itemErrorCode = "0") : HttpMessageHandler
    {
        public Uri? ReadyToShipUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith(
                    "/order/items/get",
                    StringComparison.Ordinal))
            {
                return JsonResponse(
                    """
                    {
                      "code": "0",
                      "data": [
                        {
                          "order_item_id": 101,
                          "seller_sku": "SKU-1",
                          "quantity": 1,
                          "status": "packed",
                          "package_id": "FP-1"
                        }
                      ]
                    }
                    """);
            }

            ReadyToShipUri = request.RequestUri;
            var response = $$"""
            {
              "code": "0",
              "request_id": "request-1",
              "result": {
                "success": true,
                "data": {
                  "packages": [
                    {
                      "package_id": "FP-1",
                      "item_err_code": "{{itemErrorCode}}",
                      "msg": "{{(itemErrorCode == "0" ? "success" : "package status not allowed")}}"
                    }
                  ]
                }
              }
            }
            """;
            return JsonResponse(response);
        }

        private static Task<HttpResponseMessage> JsonResponse(string json) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
    }
}
