using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Controllers;
using OmsApi.Models.Common;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class WebhookControllerTests
{
    [Fact]
    public async Task ValidWebhook_ReturnsHttp200Immediately()
    {
        var controller = CreateController(new WebhookReceiptResult(200, true, false, 7, "Webhook accepted."));

        var result = await controller.Shopee(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, ok.StatusCode ?? 200);
    }

    [Fact]
    public async Task InvalidSignature_Returns401()
    {
        var controller = CreateController(new WebhookReceiptResult(401, false, false, null, "Invalid webhook signature."));

        var result = await controller.TikTok(CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, error.StatusCode);
    }

    private static WebhooksController CreateController(WebhookReceiptResult receipt)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes("{}"));
        httpContext.Request.Headers.Authorization = "signature";
        return new WebhooksController(
            new StubIngestService(receipt),
            NullLogger<WebhooksController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    private sealed class StubIngestService(WebhookReceiptResult result) : IWebhookIngestService
    {
        public Task<WebhookReceiptResult> ReceiveAsync(
            PlatformType platform,
            byte[] rawBody,
            string? authorization,
            CancellationToken cancellationToken = default) => Task.FromResult(result);
    }
}
