using System.Diagnostics;
using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Services.Implementation;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class LazadaRateLimitHandlerTests
{
    [Fact]
    public async Task ReadRequestRetriesRateLimitAndReturnsSuccess()
    {
        using var context = UseShop(810001);
        var backend = new RecordingHandler("{\"code\":\"SellerCallLimit\"}", "{\"code\":\"0\"}");
        using var client = CreateClient(backend);
        using var response = await client.GetAsync("https://example.test/rest/order/items/get");
        Assert.Contains("\"0\"", await response.Content.ReadAsStringAsync());
        Assert.Equal(2, backend.Calls);
    }

    [Fact]
    public async Task MutationIsNeverRetriedEvenWhenRateLimited()
    {
        using var context = UseShop(810002);
        var backend = new RecordingHandler("{\"code\":\"SellerCallLimit\"}", "{\"code\":\"0\"}");
        using var client = CreateClient(backend);
        using var response = await client.PostAsync("https://example.test/rest/order/fulfill/pack", null);
        Assert.Contains("SellerCallLimit", await response.Content.ReadAsStringAsync());
        Assert.Equal(1, backend.Calls);
    }

    [Fact]
    public async Task UnknownGetIsNotRetried()
    {
        using var context = UseShop(810005);
        var backend = new RecordingHandler("{\"code\":\"SellerCallLimit\"}");
        using var client = CreateClient(backend);
        using var response = await client.GetAsync("https://example.test/rest/unknown");
        Assert.Equal(1, backend.Calls);
    }

    [Fact]
    public async Task ReadRetriesAreBounded()
    {
        using var context = UseShop(810003);
        var backend = new RecordingHandler("{\"code\":\"ApiCallLimit\"}");
        using var client = CreateClient(backend);
        var error = await Assert.ThrowsAsync<PlatformApiException>(() => client.GetAsync("https://example.test/rest/order/items/get"));
        Assert.Equal("ApiCallLimit", error.Code);
        Assert.Equal(3, backend.Calls);
    }

    [Fact]
    public async Task OrderDetailDoesNotRetryAgainAfterReadRetriesAreExhausted()
    {
        using var context = UseShop(810006);
        var backend = new RecordingHandler("{\"code\":\"SellerCallLimit\",\"message\":\"wait\",\"request_id\":\"req-1\"}");
        using var http = CreateClient(backend);
        http.BaseAddress = new Uri("https://example.test/rest/");
        var client = new LazadaClient(new SingleClientFactory(http), NullLogger<LazadaClient>.Instance);
        var error = await Assert.ThrowsAsync<PlatformApiException>(() => client.GetOrderDetailAsync("token", "shop", "order-1"));
        Assert.Equal("SellerCallLimit", error.Code);
        Assert.Equal("req-1", error.RequestId);
        Assert.Equal(3, backend.Calls);
    }

    [Fact]
    public async Task SameShopRequestsAreSpacedAcrossHandlerInstances()
    {
        using var context = UseShop(810004);
        var backend = new RecordingHandler("{\"code\":\"0\"}");
        using var first = CreateClient(backend, TimeSpan.FromMilliseconds(80));
        using var second = CreateClient(backend, TimeSpan.FromMilliseconds(80));
        var requests = new[] { first.GetAsync("https://example.test/a"), second.GetAsync("https://example.test/b") };
        var responses = await Task.WhenAll(requests);
        foreach (var response in responses) response.Dispose();
        Assert.Equal(2, backend.Calls);
        Assert.True(Stopwatch.GetElapsedTime(backend.Timestamps[0], backend.Timestamps[1]) >= TimeSpan.FromMilliseconds(60));
    }

    private static IDisposable UseShop(long id) => PlatformCredentialExecutionContext.Push(
        new PlatformAccessCredential(id, PlatformType.Lazada, "shop", "token", "key", "secret", "https://example.test", null));

    private static HttpClient CreateClient(HttpMessageHandler backend, TimeSpan? interval = null) =>
        new(new LazadaRateLimitHandler(interval ?? TimeSpan.Zero, TimeSpan.Zero, 2) { InnerHandler = backend });

    private sealed class SingleClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class RecordingHandler(params string[] bodies) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public List<long> Timestamps { get; } = new();
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Timestamps.Add(Stopwatch.GetTimestamp());
            var body = bodies[Math.Min(Calls++, bodies.Length - 1)];
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
        }
    }
}
