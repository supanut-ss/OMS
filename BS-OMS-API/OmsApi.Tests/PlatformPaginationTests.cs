using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Models.Inventory;
using OmsApi.Models.Orders;
using OmsApi.Services.Implementation.Platforms;

namespace OmsApi.Tests;

public class PlatformPaginationTests
{
    [Fact]
    public async Task ShopeeOrders_UsesNextCursorForRequestedPage()
    {
        var handler = new SequenceHandler(
            """{"response":{"order_list":[{"order_sn":"first"}],"more":true,"next_cursor":"cursor/2","total_count":2}}""",
            """{"response":{"order_list":[{"order_sn":"second"}],"more":false,"total_count":2}}""");
        var client = new ShopeeClient(CreateFactory(handler), NullLogger<ShopeeClient>.Instance);

        var result = await client.GetOrdersAsync("token", "123", new OrderFilter { Page = 2, PageSize = 1 });

        Assert.Equal("second", Assert.Single(result.Items).OrderId);
        Assert.Equal(2, handler.Requests.Count);
        Assert.Contains("cursor=cursor%2F2", handler.Requests[1].Query);
    }

    [Fact]
    public async Task TikTokOrders_UsesSignedPageTokenForRequestedPage()
    {
        var handler = new SequenceHandler(
            """{"code":0,"data":{"orders":[{"id":"first","status":"UNPAID"}],"next_page_token":"token/2","total_count":2}}""",
            """{"code":0,"data":{"orders":[{"id":"second","status":"UNPAID"}],"total_count":2}}""");
        var client = new TikTokClient(CreateFactory(handler), NullLogger<TikTokClient>.Instance);

        var result = await client.GetOrdersAsync("token", "shop", new OrderFilter { Page = 2, PageSize = 1 });

        Assert.Equal("second", Assert.Single(result.Items).OrderId);
        Assert.Equal(2, handler.Requests.Count);
        Assert.Contains("page_size=1", handler.Requests[0].Query);
        Assert.Contains("page_token=token%2F2", handler.Requests[1].Query);
        Assert.Contains("sign=", handler.Requests[1].Query);
    }

    [Fact]
    public async Task LazadaOrders_UsesEffectivePageSizeAndEndDate()
    {
        var handler = new SequenceHandler(
            """{"data":{"count":250,"orders":[{"order_id":"second","statuses":["pending"]}]}}""");
        var client = new LazadaClient(CreateFactory(handler), NullLogger<LazadaClient>.Instance);
        var dateTo = new DateTime(2026, 9, 29, 12, 0, 0);

        var result = await client.GetOrdersAsync("token", "shop", new OrderFilter
        {
            Page = 2,
            PageSize = 150,
            DateTo = dateTo
        });

        Assert.Equal("second", Assert.Single(result.Items).OrderId);
        Assert.Equal(100, result.PageSize);
        var query = Uri.UnescapeDataString(Assert.Single(handler.Requests).Query);
        Assert.Contains("limit=100", query);
        Assert.Contains("offset=100", query);
        Assert.True(query.Contains("created_before=2026-09-29T12:00:00+07:00"), query);
    }

    [Fact]
    public async Task TikTokProducts_UsesNextPageTokenForRequestedPage()
    {
        var handler = new SequenceHandler(
            """{"code":0,"data":{"products":[{"id":"first","title":"First"}],"next_page_token":"next/2","total_count":2}}""",
            """{"code":0,"data":{"products":[{"id":"second","title":"Second"}],"total_count":2}}""");
        var client = new TikTokClient(CreateFactory(handler), NullLogger<TikTokClient>.Instance);

        var result = await client.GetProductsAsync("token", "shop", new ProductFilter { Page = 2, PageSize = 1 });

        Assert.Equal("second", Assert.Single(result.Items).ItemId);
        Assert.Equal(2, handler.Requests.Count);
        Assert.Contains("page_token=next%2F2", handler.Requests[1].Query);
    }

    private static IHttpClientFactory CreateFactory(HttpMessageHandler handler) =>
        new StubFactory(new HttpClient(handler) { BaseAddress = new Uri("https://platform.example.test/") });

    private sealed class StubFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class SequenceHandler(params string[] responses) : HttpMessageHandler
    {
        private int _index;
        public List<Uri> Requests { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            var body = responses[_index++];
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
        }
    }
}
