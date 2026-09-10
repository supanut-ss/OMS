using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class TikTokTrackingTests
{
    [Fact]
    public async Task GetTrackingInfo_WithPersistedPackageIds_ReadsEachPackageDirectly()
    {
        var handler = new PackageDetailHandler();
        var client = new TikTokClient(
            new StubHttpClientFactory(new HttpClient(handler)
            {
                BaseAddress = new Uri("https://open-api.tiktokglobalshop.com")
            }),
            NullLogger<TikTokClient>.Instance);

        var tracking = await client.GetTrackingInfoAsync(
            "token",
            "shop-cipher",
            "ORDER-1",
            new[] { "PKG-1", "PKG-2" });

        Assert.NotNull(tracking);
        Assert.Equal(2, tracking.Packages.Count);
        Assert.Equal("TRACK-1", tracking.Packages[0].TrackingNumber);
        Assert.Equal("TRACK-2", tracking.Packages[1].TrackingNumber);
        Assert.Equal(
            new[]
            {
                "/fulfillment/202309/packages/PKG-1",
                "/fulfillment/202309/packages/PKG-2"
            },
            handler.RequestPaths);
        Assert.All(handler.AccessTokens, token => Assert.Equal("token", token));
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class PackageDetailHandler : HttpMessageHandler
    {
        public List<string> RequestPaths { get; } = new();
        public List<string> AccessTokens { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestPaths.Add(request.RequestUri!.AbsolutePath);
            AccessTokens.Add(request.Headers.GetValues("x-tts-access-token").Single());
            var packageId = request.RequestUri.Segments[^1].Trim('/');
            var suffix = packageId.EndsWith("1", StringComparison.Ordinal) ? "1" : "2";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $$"""
                    {
                      "code": 0,
                      "message": "Success",
                      "data": {
                        "package_id": "{{packageId}}",
                        "tracking_number": "TRACK-{{suffix}}",
                        "shipping_provider_name": "J&T",
                        "package_status": "PROCESSING"
                      }
                    }
                    """,
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }
}
