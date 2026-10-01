using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Webhooks;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class WebhookBackgroundService : BackgroundService
{
    private readonly IWebhookQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WebhookBackgroundService> _logger;

    public WebhookBackgroundService(
        IWebhookQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<WebhookBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverPendingEventsAsync(stoppingToken);

        await foreach (var eventRecordId in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<IWebhookEventProcessor>();
                await processor.ProcessAsync(eventRecordId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // A receipt is durable even if an individual background scope
                // fails. The event remains available for startup recovery or a
                // platform retry.
                _logger.LogError(ex, "Unhandled webhook worker error for event {EventRecordId}", eventRecordId);
            }
        }
    }

    private async Task RecoverPendingEventsAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var pendingIds = await db.PlatformWebhookEvents
                .Where(x =>
                    x.ProcessingStatus == WebhookProcessingStatuses.Received ||
                    x.ProcessingStatus == WebhookProcessingStatuses.Queued ||
                    x.ProcessingStatus == WebhookProcessingStatuses.Processing ||
                    (x.ProcessingStatus == WebhookProcessingStatuses.Failed &&
                     x.AttemptCount < WebhookEventProcessor.MaxAttempts))
                .OrderBy(x => x.ReceivedDate)
                .Select(x => x.WebhookEventRecordId)
                .ToListAsync(cancellationToken);

            foreach (var id in pendingIds)
                _queue.TryEnqueue(id);

            if (pendingIds.Count > 0)
                _logger.LogInformation("Recovered {Count} pending marketplace webhook event(s)", pendingIds.Count);
        }
        catch (Exception ex)
        {
            // Database migrations or connection setup may complete after the
            // host starts. Keep the worker alive; new receipts still enter the
            // queue and the next deployment can recover old receipts.
            _logger.LogWarning(ex, "Could not recover pending marketplace webhook events at startup");
        }
    }
}
