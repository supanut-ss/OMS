namespace OmsApi.Services.Interfaces;

public interface IWebhookQueue
{
    bool TryEnqueue(long webhookEventRecordId);

    IAsyncEnumerable<long> ReadAllAsync(CancellationToken cancellationToken);
}
