using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Common;
using OmsApi.Models.Shipping;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class ShopeeShipOrderTests
{
    [Fact]
    public async Task ShipOrder_WhenSingleBoxIsReportedAsUnsplit_RetriesWithoutPackageNumber()
    {
        var handler = new UnsplitShipOrderHandler();
        var client = new ShopeeClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://openplatform.example.test")
            }),
            NullLogger<ShopeeClient>.Instance);

        var arranged = await client.ShipOrderAsync(
            "token",
            "123",
            new ShipOrderRequest
            {
                Platform = PlatformType.Shopee,
                OrderId = "ORDER-1",
                PackageId = "PACKAGE-1",
                ShippingMethod = "dropoff"
            });

        Assert.True(arranged);
        Assert.Equal(2, handler.ShippingParameterRequests.Count);
        Assert.Contains("package_number=PACKAGE-1", handler.ShippingParameterRequests[0].Query);
        Assert.DoesNotContain("package_number", handler.ShippingParameterRequests[1].Query);
        using var body = JsonDocument.Parse(handler.ShipOrderBody);
        Assert.False(body.RootElement.TryGetProperty("package_number", out _));
        Assert.Equal("ORDER-1", body.RootElement.GetProperty("order_sn").GetString());
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class UnsplitShipOrderHandler : HttpMessageHandler
    {
        public List<Uri> ShippingParameterRequests { get; } = new();
        public string ShipOrderBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith(
                    "/get_shipping_parameter",
                    StringComparison.OrdinalIgnoreCase))
            {
                ShippingParameterRequests.Add(request.RequestUri);
                var hasPackageNumber = request.RequestUri.Query.Contains(
                    "package_number=",
                    StringComparison.OrdinalIgnoreCase);
                return JsonResponse(hasPackageNumber
                    ? """
                      {
                        "error": "logistics.ship_order_not_need_pacakge_number",
                        "message": "Please don't request with package_number for this unsplit order."
                      }
                      """
                    : """{"error":"","response":{"info_needed":{}}}""");
            }

            if (request.RequestUri.AbsolutePath.EndsWith(
                    "/ship_order",
                    StringComparison.OrdinalIgnoreCase))
            {
                ShipOrderBody = await request.Content!.ReadAsStringAsync(cancellationToken);
                return JsonResponse("""{"error":"","message":"","response":{}}""");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                RequestMessage = request
            };
        }

        private static HttpResponseMessage JsonResponse(string json) =>
            new(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
    }
}
