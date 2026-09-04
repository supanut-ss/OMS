using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class ShopeeWaybillTests
{
    [Fact]
    public async Task GetShippingLabel_CreatesChecksAndDownloadsSplitPackageWaybill()
    {
        var handler = new WaybillHandler();
        var client = new ShopeeClient(
            new WaybillHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://openplatform.example.test")
            }),
            NullLogger<ShopeeClient>.Instance);

        var result = await client.GetShippingLabelAsync(
            "token", "123", "ORDER-1", "PACKAGE-1", "TRACK-1", "NORMAL_AIR_WAYBILL");

        Assert.NotNull(result);
        Assert.Equal("READY", result.Status);
        Assert.Equal("PACKAGE-1", result.PackageId);
        Assert.Equal("TRACK-1", result.TrackingNumber);
        Assert.Equal(Convert.ToBase64String(WaybillHandler.PdfBytes), result.DocumentBase64);
        Assert.Equal(new[]
        {
            "/api/v2/logistics/create_shipping_document",
            "/api/v2/logistics/get_shipping_document_result",
            "/api/v2/logistics/download_shipping_document"
        }, handler.Paths);

        using var createBody = JsonDocument.Parse(handler.CreateBody!);
        var item = createBody.RootElement.GetProperty("order_list")[0];
        Assert.Equal("ORDER-1", item.GetProperty("order_sn").GetString());
        Assert.Equal("PACKAGE-1", item.GetProperty("package_number").GetString());
        Assert.Equal("TRACK-1", item.GetProperty("tracking_number").GetString());
        Assert.Equal("NORMAL_AIR_WAYBILL", item.GetProperty("shipping_document_type").GetString());

        using var downloadBody = JsonDocument.Parse(handler.DownloadBody!);
        Assert.Equal("NORMAL_AIR_WAYBILL",
            downloadBody.RootElement.GetProperty("shipping_document_type").GetString());
        Assert.Equal("PACKAGE-1", downloadBody.RootElement
            .GetProperty("order_list")[0].GetProperty("package_number").GetString());
    }

    private sealed class WaybillHandler : HttpMessageHandler
    {
        public static readonly byte[] PdfBytes = Encoding.ASCII.GetBytes("%PDF-1.4 test");
        public List<string> Paths { get; } = new();
        public string? CreateBody { get; private set; }
        public string? DownloadBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var path = request.RequestUri!.AbsolutePath;
            Paths.Add(path);
            if (path.EndsWith("/create_shipping_document", StringComparison.Ordinal))
            {
                CreateBody = await request.Content!.ReadAsStringAsync(cancellationToken);
                return Json("""
                    {"error":"","message":"","response":{"result_list":[{"order_sn":"ORDER-1","package_number":"PACKAGE-1"}]}}
                    """);
            }
            if (path.EndsWith("/get_shipping_document_result", StringComparison.Ordinal))
                return Json("""
                    {"error":"","message":"","response":{"result_list":[{"order_sn":"ORDER-1","package_number":"PACKAGE-1","status":"READY"}]}}
                    """);

            DownloadBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(PdfBytes)
            };
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            return response;
        }

        private static HttpResponseMessage Json(string value) => new(HttpStatusCode.OK)
        {
            Content = new StringContent(value, Encoding.UTF8, "application/json")
        };
    }

    private sealed class WaybillHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }
}
