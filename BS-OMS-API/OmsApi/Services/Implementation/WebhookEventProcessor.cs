using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Orders;
using OmsApi.Models.Persistence;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class WebhookEventProcessor : IWebhookEventProcessor
{
    public const int MaxAttempts = 3;
    private const string SystemUser = "OMS_WEBHOOK";
    private const int DefaultOrderListLookbackHours = 24;
    private const int OrderListMaxPages = 5;
    private static readonly TimeSpan OrderListMinInterval = TimeSpan.FromSeconds(30);
    private static readonly ConcurrentDictionary<string, DateTime> LastOrderListRefresh = new();
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

        await RefreshOrderListAsync(webhookEvent, cancellationToken);
    }

    /// <summary>Clears the per-shop throttle (used by tests).</summary>
    public static void ResetOrderListThrottle() => LastOrderListRefresh.Clear();

    /// <summary>
    /// After every platform callback, pull the platform's order list for the
    /// shop so new and updated orders are synchronized even if the pushed
    /// event carried no usable order id. Best-effort: a failure here is logged
    /// and never changes the webhook event's own processing status. Calls for
    /// the same shop are coalesced within a short interval so a burst of
    /// callbacks triggers a single list request.
    /// </summary>
    private async Task RefreshOrderListAsync(
        PlatformWebhookEvent webhookEvent,
        CancellationToken cancellationToken)
    {
        if (webhookEvent.EventType == "SHOP_DEAUTHORIZATION")
            return;

        var key = $"{webhookEvent.Platform}|{webhookEvent.ShopId}";
        var now = DateTime.UtcNow;
        if (LastOrderListRefresh.TryGetValue(key, out var last) && now - last < OrderListMinInterval)
            return;
        LastOrderListRefresh[key] = now;

        try
        {
            var platform = ParsePlatform(webhookEvent.Platform);
            var lookbackHours = int.TryParse(
                Environment.GetEnvironmentVariable("WEBHOOK_ORDER_LIST_LOOKBACK_HOURS"), out var hours) && hours > 0
                ? hours
                : DefaultOrderListLookbackHours;
            var dateTo = DateTime.Now;
            var total = 0;

            for (var page = 1; page <= OrderListMaxPages; page++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var result = await _orderService.GetOrdersAsync(new OrderFilter
                {
                    Platform = platform,
                    ShopId = string.IsNullOrWhiteSpace(webhookEvent.ShopId) ? null : webhookEvent.ShopId,
                    DateFrom = dateTo.AddHours(-lookbackHours),
                    DateTo = dateTo,
                    Page = page,
                    PageSize = 50
                });
                total += result.Items.Count;
                if (!result.HasMore)
                    break;
            }

            _logger.LogInformation(
                "Order list refreshed after {Platform} webhook {EventType}: {Count} order(s)",
                webhookEvent.Platform,
                webhookEvent.EventType,
                total);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Allow the next callback to retry immediately.
            LastOrderListRefresh.TryRemove(key, out _);
            _logger.LogWarning(
                ex,
                "Order list refresh after {Platform} webhook {EventType} failed",
                webhookEvent.Platform,
                webhookEvent.EventType);
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
