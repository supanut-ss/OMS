using OmsApi.Models.Common;
using OmsApi.Models.Webhooks;

namespace OmsApi.Services.Interfaces;

public interface IWebhookIngestService
{
    Task<WebhookReceiptResult> ReceiveAsync(
        PlatformType platform,
        byte[] rawBody,
        string? authorization,
        CancellationToken cancellationToken = default);
}
