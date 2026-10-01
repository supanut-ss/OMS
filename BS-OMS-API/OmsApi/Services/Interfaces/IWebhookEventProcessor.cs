namespace OmsApi.Services.Interfaces;

public interface IWebhookEventProcessor
{
    Task ProcessAsync(long webhookEventRecordId, CancellationToken cancellationToken = default);
}
