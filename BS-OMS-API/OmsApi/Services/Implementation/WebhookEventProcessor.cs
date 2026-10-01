using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Persistence;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class WebhookEventProcessor : IWebhookEventProcessor
{
    public const int MaxAttempts = 3;
    private const string SystemUser = "OMS_WEBHOOK";
    private readonly ApplicationDbContext _db;
    private readonly IOrderService _orderService;
    private readonly ILogger<WebhookEventProcessor> _logger;

    public WebhookEventProcessor(
        ApplicationDbContext db,
        IOrderService orderService,
        ILogger<WebhookEventProcessor> logger)
    {
        _db = db;
        _orderService = orderService;
        _logger = logger;
    }

    public async Task ProcessAsync(
        long webhookEventRecordId,
        CancellationToken cancellationToken = default)
    {
        var webhookEvent = await _db.PlatformWebhookEvents
            .SingleOrDefaultAsync(x => x.WebhookEventRecordId == webhookEventRecordId, cancellationToken);
        if (webhookEvent == null ||
            webhookEvent.ProcessingStatus is WebhookProcessingStatuses.Processed or WebhookProcessingStatuses.Ignored)
            return;

        webhookEvent.ProcessingStatus = WebhookProcessingStatuses.Processing;
        webhookEvent.AttemptCount++;
        webhookEvent.LastAttemptDate = DateTime.Now;
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            if (webhookEvent.EventType == "SHOP_DEAUTHORIZATION")
            {
                await MarkShopDeauthorizedAsync(webhookEvent, cancellationToken);
                Complete(webhookEvent, "Shop deauthorization recorded.");
            }
            else if (webhookEvent.EventType == "SHOP_AUTHORIZATION")
            {
                // The OAuth callback remains the only place that exchanges a
                // code and stores credentials. This event is only an audit
                // signal and must not create a second OAuth flow.
                Complete(webhookEvent, "Shop authorization event recorded; OAuth callback remains authoritative.");
            }
            else if (string.IsNullOrWhiteSpace(webhookEvent.PlatformOrderId))
            {
                webhookEvent.ProcessingStatus = WebhookProcessingStatuses.Ignored;
                webhookEvent.ErrorMessage = "Webhook did not contain an order id; no Order Detail call was possible.";
                webhookEvent.ProcessedDate = DateTime.Now;
            }
            else
            {
                var order = await _orderService.SyncOrderFromWebhookAsync(
                    ParsePlatform(webhookEvent.Platform),
                    webhookEvent.PlatformOrderId,
                    webhookEvent.ShopId,
                    cancellationToken);
                if (order == null)
                    throw new InvalidOperationException("Platform Order Detail returned no order.");

                webhookEvent.PlatformStatus = order.OriginalStatus;
                webhookEvent.InternalStatus = order.Status.ToString();
                Complete(webhookEvent, null);
            }

            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            webhookEvent.ProcessingStatus = WebhookProcessingStatuses.Failed;
            webhookEvent.ErrorMessage = SafeError(ex);
            webhookEvent.ProcessedDate = null;
            try
            {
                await _db.SaveChangesAsync(cancellationToken);
            }
            catch (Exception saveException)
            {
                _logger.LogError(saveException, "Could not save failed status for webhook event {EventRecordId}", webhookEventRecordId);
            }

            _logger.LogError(
                ex,
                "Marketplace webhook processing failed for {Platform} event {EventType}, order {OrderId}, attempt {Attempt}",
                webhookEvent.Platform,
                webhookEvent.EventType,
                webhookEvent.PlatformOrderId,
                webhookEvent.AttemptCount);
        }
    }

    private async Task MarkShopDeauthorizedAsync(
        PlatformWebhookEvent webhookEvent,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(webhookEvent.ShopId))
            return;

        var credentials = await _db.PlatformCredentials
            .Where(x => x.Platform == webhookEvent.Platform && x.ShopId == webhookEvent.ShopId)
            .ToListAsync(cancellationToken);
        foreach (var credential in credentials)
        {
            credential.IsActive = "NO";
            credential.RequiresReauthorization = "YES";
            credential.LastError = "Marketplace shop deauthorization webhook received.";
            credential.UpdateDate = DateTime.Now;
        }
    }

    private static void Complete(PlatformWebhookEvent webhookEvent, string? message)
    {
        webhookEvent.ProcessingStatus = WebhookProcessingStatuses.Processed;
        webhookEvent.ErrorMessage = message;
        webhookEvent.ProcessedDate = DateTime.Now;
    }

    private static Models.Common.PlatformType ParsePlatform(string platform) =>
        Enum.Parse<Models.Common.PlatformType>(platform, ignoreCase: true);

    private static string SafeError(Exception exception)
    {
        var message = exception.GetBaseException().Message;
        if (string.IsNullOrWhiteSpace(message))
            return "Webhook processing failed.";
        return message.Length <= 2000 ? message : message[..2000];
    }
}
