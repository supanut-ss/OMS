using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using OmsApi.Extensions;
using OmsApi.Helpers;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class WebhookIngestService : IWebhookIngestService
{
    private const int MaxBodyBytes = 1_048_576;
    private readonly ApplicationDbContext _db;
    private readonly IWebhookQueue _queue;
    private readonly ILogger<WebhookIngestService> _logger;

    public WebhookIngestService(
        ApplicationDbContext db,
        IWebhookQueue queue,
        ILogger<WebhookIngestService> logger)
    {
        _db = db;
        _queue = queue;
        _logger = logger;
    }

    public async Task<WebhookReceiptResult> ReceiveAsync(
        PlatformType platform,
        byte[] rawBody,
        string? authorization,
        CancellationToken cancellationToken = default)
    {
        if (rawBody.Length == 0)
            return Rejected(StatusCodes.Status400BadRequest, "Webhook body is required.");
        if (rawBody.Length > MaxBodyBytes)
            return Rejected(StatusCodes.Status413PayloadTooLarge, "Webhook body is too large.");

        var signatureConfiguration = GetSignatureConfiguration(platform);
        if (!signatureConfiguration.IsConfigured)
        {
            _logger.LogError("Webhook signature configuration is incomplete for {Platform}", platform);
            return Rejected(StatusCodes.Status503ServiceUnavailable, "Webhook signature is not configured.");
        }

        if (!VerifySignature(platform, rawBody, authorization, signatureConfiguration))
        {
            _logger.LogWarning("Rejected {Platform} webhook with an invalid signature", platform);
            return Rejected(StatusCodes.Status401Unauthorized, "Invalid webhook signature.");
        }

        WebhookEventEnvelope envelope;
        try
        {
            envelope = PlatformWebhookPayloadParser.Parse(platform, rawBody);
        }
        catch (WebhookPayloadException ex)
        {
            _logger.LogWarning("Rejected incomplete {Platform} webhook: {Message}", platform, ex.Message);
            return Rejected(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (JsonException)
        {
            _logger.LogWarning("Rejected malformed {Platform} webhook JSON", platform);
            return Rejected(StatusCodes.Status400BadRequest, "Webhook body must be valid JSON.");
        }

        var existing = await _db.PlatformWebhookEvents
            .SingleOrDefaultAsync(x => x.EventKey == envelope.EventKey, cancellationToken);
        if (existing != null)
        {
            var requeued = await RequeueFailedAsync(existing, cancellationToken);
            if (requeued)
                _logger.LogInformation("Requeued failed duplicate {Platform} webhook {EventKey}", platform, envelope.EventKey);

            return new WebhookReceiptResult(
                StatusCodes.Status200OK,
                Accepted: true,
                Duplicate: true,
                existing.WebhookEventRecordId,
                requeued ? "Webhook was already received and has been requeued." : "Webhook was already received.");
        }

        var now = DateTime.Now;
        var webhookEvent = new PlatformWebhookEvent
        {
            EventKey = envelope.EventKey,
            Platform = platform.ToString(),
            EventType = envelope.EventType,
            ShopId = envelope.ShopId,
            PlatformOrderId = envelope.OrderId,
            PlatformStatus = envelope.PlatformStatus,
            TrackingNumber = envelope.TrackingNumber,
            EventTime = envelope.EventTime,
            SignatureStatus = "VERIFIED",
            ProcessingStatus = WebhookProcessingStatuses.Queued,
            RequestPayload = Truncate(envelope.RedactedPayload, 16000),
            ReceivedDate = now
        };

        _db.PlatformWebhookEvents.Add(webhookEvent);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // The unique index is the final concurrency guard when two
            // deliveries arrive at the same time. The losing request is a
            // successful duplicate acknowledgement, not a platform error.
            _db.ChangeTracker.Clear();
            var concurrent = await _db.PlatformWebhookEvents
                .SingleOrDefaultAsync(x => x.EventKey == envelope.EventKey, cancellationToken);
            if (concurrent != null)
            {
                return new WebhookReceiptResult(
                    StatusCodes.Status200OK,
                    Accepted: true,
                    Duplicate: true,
                    concurrent.WebhookEventRecordId,
                    "Webhook was already received.");
            }

            _logger.LogError("Could not persist {Platform} webhook receipt {EventKey}", platform, envelope.EventKey);
            return Rejected(StatusCodes.Status503ServiceUnavailable, "Webhook receipt could not be persisted.");
        }

        if (!_queue.TryEnqueue(webhookEvent.WebhookEventRecordId))
        {
            _logger.LogWarning("Webhook queue was unavailable for event {EventRecordId}; startup recovery will retry it", webhookEvent.WebhookEventRecordId);
        }

        return new WebhookReceiptResult(
            StatusCodes.Status200OK,
            Accepted: true,
            Duplicate: false,
            webhookEvent.WebhookEventRecordId,
            "Webhook accepted.");
    }

    private async Task<bool> RequeueFailedAsync(
        PlatformWebhookEvent existing,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(existing.ProcessingStatus, WebhookProcessingStatuses.Failed, StringComparison.OrdinalIgnoreCase) ||
            existing.AttemptCount >= WebhookEventProcessor.MaxAttempts)
            return false;

        existing.ProcessingStatus = WebhookProcessingStatuses.Queued;
        existing.ErrorMessage = null;
        await _db.SaveChangesAsync(cancellationToken);
        return _queue.TryEnqueue(existing.WebhookEventRecordId);
    }

    private static bool VerifySignature(
        PlatformType platform,
        byte[] rawBody,
        string? authorization,
        SignatureConfiguration config) => platform switch
        {
            PlatformType.Shopee => WebhookSignatureVerifier.VerifyShopee(
                rawBody, authorization, config.CallbackUrl!, config.Secret!),
            PlatformType.Lazada => WebhookSignatureVerifier.VerifyLazada(
                rawBody, authorization, config.AppKey!, config.Secret!),
            PlatformType.TikTok => WebhookSignatureVerifier.VerifyTikTok(
                rawBody, authorization, config.AppKey!, config.Secret!),
            _ => false
        };

    private static SignatureConfiguration GetSignatureConfiguration(PlatformType platform)
    {
        var callbackUrl = Environment.GetEnvironmentVariable($"{platform.ToString().ToUpperInvariant()}_WEBHOOK_URL")?.Trim();
        if (string.IsNullOrWhiteSpace(callbackUrl))
        {
            var baseUrl = Environment.GetEnvironmentVariable("OMS_PUBLIC_BASE_URL")?.TrimEnd('/');
            if (!string.IsNullOrWhiteSpace(baseUrl))
                callbackUrl = $"{baseUrl}/api/webhooks/{PlatformPath(platform)}";
        }

        return platform switch
        {
            PlatformType.Shopee => new SignatureConfiguration(
                callbackUrl,
                AppKey: null,
                Environment.GetEnvironmentVariable("SHOPEE_WEBHOOK_SECRET") ??
                Environment.GetEnvironmentVariable("SHOPEE_PARTNER_KEY"),
                RequiresAppKey: false),
            PlatformType.Lazada => new SignatureConfiguration(
                callbackUrl,
                Environment.GetEnvironmentVariable("LAZADA_APP_KEY"),
                Environment.GetEnvironmentVariable("LAZADA_WEBHOOK_SECRET") ??
                Environment.GetEnvironmentVariable("LAZADA_APP_SECRET"),
                RequiresAppKey: true),
            PlatformType.TikTok => new SignatureConfiguration(
                callbackUrl,
                Environment.GetEnvironmentVariable("TIKTOK_APP_KEY"),
                Environment.GetEnvironmentVariable("TIKTOK_WEBHOOK_SECRET") ??
                Environment.GetEnvironmentVariable("TIKTOK_APP_SECRET"),
                RequiresAppKey: true),
            _ => new SignatureConfiguration(null, null, null, RequiresAppKey: false)
        };
    }

    private static string PlatformPath(PlatformType platform) => platform switch
    {
        PlatformType.Shopee => "shopee",
        PlatformType.Lazada => "lazada",
        PlatformType.TikTok => "tiktok",
        _ => platform.ToString().ToLowerInvariant()
    };

    private static WebhookReceiptResult Rejected(int statusCode, string message) =>
        new(statusCode, Accepted: false, Duplicate: false, EventRecordId: null, message);

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private sealed record SignatureConfiguration(
        string? CallbackUrl,
        string? AppKey,
        string? Secret,
        bool RequiresAppKey)
    {
        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(Secret) &&
            (RequiresAppKey
                ? !string.IsNullOrWhiteSpace(AppKey)
                : !string.IsNullOrWhiteSpace(CallbackUrl));
    }
}
