using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class PlatformWaybillClientTests
{
    [Fact]
    public async Task LazadaShippingLabel_UsesPackageDocumentEndpointAndDownloadsPdf()
    {
        var handler = new LazadaWaybillHandler();
        var client = new LazadaClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://api.lazada.co.th/rest/")
            }),
            NullLogger<LazadaClient>.Instance);

        var result = await client.GetShippingLabelAsync(
            "token", "seller-1", "ORDER-1", "PKG-1", "TRACK-1", "NORMAL_AIR_WAYBILL");

        Assert.NotNull(result);
        Assert.Equal("READY", result.Status);
        Assert.Equal("PKG-1", result.PackageId);
        Assert.Equal("application/pdf", result.ContentType);
        Assert.Equal(Convert.ToBase64String(LazadaWaybillHandler.PdfBytes), result.DocumentBase64);
        Assert.Equal("/rest/order/package/document/get", handler.ApiRequestPath);
        Assert.Contains("getDocumentReq=", handler.ApiRequestQuery);
        Assert.Contains("doc_type", Uri.UnescapeDataString(handler.ApiRequestQuery!));
        Assert.Equal("https://cdn.example.test/lazada-waybill.pdf", result.DocumentUrl);
    }

    [Fact]
    public async Task TikTokShippingLabel_UsesShippingDocumentsEndpointAndDownloadsPdf()
    {
        var handler = new TikTokWaybillHandler();
        var client = new TikTokClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://open-api.tiktokglobalshop.com")
            }),
            NullLogger<TikTokClient>.Instance);

        var result = await client.GetShippingLabelAsync(
            "token", "shop-cipher", "ORDER-1", "PKG-1", "TRACK-1", "NORMAL_AIR_WAYBILL");

        Assert.NotNull(result);
        Assert.Equal("READY", result.Status);
        Assert.Equal("PKG-1", result.PackageId);
        Assert.Equal("TRACK-1", result.TrackingNumber);
        Assert.Equal("application/pdf", result.ContentType);
        Assert.Equal(Convert.ToBase64String(TikTokWaybillHandler.PdfBytes), result.DocumentBase64);
        Assert.Equal("/fulfillment/202309/packages/PKG-1/shipping_documents", handler.ApiRequestPath);
        Assert.Contains("document_type=SHIPPING_LABEL", handler.ApiRequestQuery);
        Assert.Contains("document_format=PDF", handler.ApiRequestQuery);
        Assert.Equal("https://cdn.example.test/tiktok-waybill.pdf", result.DocumentUrl);
        Assert.Equal("token", handler.AccessToken);
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class LazadaWaybillHandler : HttpMessageHandler
    {
        public static readonly byte[] PdfBytes = Encoding.ASCII.GetBytes("%PDF-1.4 lazada");
        public string? ApiRequestPath { get; private set; }
        public string? ApiRequestQuery { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("lazada-waybill.pdf", StringComparison.Ordinal))
            {
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(PdfBytes)
                };
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                return Task.FromResult(response);
            }

            ApiRequestPath = request.RequestUri.AbsolutePath;
            ApiRequestQuery = request.RequestUri.Query;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"result\":{\"success\":true,\"data\":{\"pdf_url\":\"https://cdn.example.test/lazada-waybill.pdf\",\"doc_type\":\"PDF\"}},\"code\":\"0\"}",
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }

    private sealed class TikTokWaybillHandler : HttpMessageHandler
    {
        public static readonly byte[] PdfBytes = Encoding.ASCII.GetBytes("%PDF-1.4 tiktok");
        public string? ApiRequestPath { get; private set; }
        public string? ApiRequestQuery { get; private set; }
        public string? AccessToken { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("tiktok-waybill.pdf", StringComparison.Ordinal))
            {
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(PdfBytes)
                };
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                return Task.FromResult(response);
            }

            ApiRequestPath = request.RequestUri.AbsolutePath;
            ApiRequestQuery = request.RequestUri.Query;
            AccessToken = request.Headers.GetValues("x-tts-access-token").Single();
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"code\":0,\"data\":{\"doc_url\":\"https://cdn.example.test/tiktok-waybill.pdf\",\"tracking_number\":\"TRACK-1\"},\"message\":\"Success\"}",
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }
}
