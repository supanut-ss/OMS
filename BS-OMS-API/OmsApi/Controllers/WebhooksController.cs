using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Common;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Controllers;

/// <summary>
/// Marketplace webhook ingress. These routes are intentionally separate from
/// <see cref="AuthController"/> and never exchange or return OAuth tokens.
/// </summary>
[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]
[IgnoreAntiforgeryToken]
public sealed class WebhooksController : ControllerBase
{
    private readonly IWebhookIngestService _ingestService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IWebhookIngestService ingestService,
        ILogger<WebhooksController> logger)
    {
        _ingestService = ingestService;
        _logger = logger;
    }

    /// <summary>Receive Shopee Push Mechanism notifications.</summary>
    [HttpPost("shopee")]
    [Consumes("application/json")]
    public Task<IActionResult> Shopee(CancellationToken cancellationToken) =>
        ReceiveAsync(PlatformType.Shopee, cancellationToken);

    /// <summary>Receive Lazada Message Service notifications.</summary>
    [HttpPost("lazada")]
    [Consumes("application/json")]
    public Task<IActionResult> Lazada(CancellationToken cancellationToken) =>
        ReceiveAsync(PlatformType.Lazada, cancellationToken);

    /// <summary>Receive TikTok Shop Partner Center event notifications.</summary>
    [HttpPost("tiktok")]
    [Consumes("application/json")]
    public Task<IActionResult> TikTok(CancellationToken cancellationToken) =>
        ReceiveAsync(PlatformType.TikTok, cancellationToken);

    private async Task<IActionResult> ReceiveAsync(
        PlatformType platform,
        CancellationToken cancellationToken)
    {
        await using var body = new MemoryStream();
        await Request.Body.CopyToAsync(body, cancellationToken);

        var authorization = Request.Headers.Authorization.FirstOrDefault();
        var result = await _ingestService.ReceiveAsync(
            platform,
            body.ToArray(),
            authorization,
            cancellationToken);

        if (result.StatusCode == StatusCodes.Status200OK)
            return Ok(new
            {
                accepted = result.Accepted,
                duplicate = result.Duplicate,
                eventId = result.EventRecordId,
                message = result.Message
            });

        _logger.LogWarning(
            "Webhook request rejected for {Platform} with status {StatusCode}: {Message}",
            platform,
            result.StatusCode,
            result.Message);
        return StatusCode(result.StatusCode, new { accepted = false, message = result.Message });
    }
}
