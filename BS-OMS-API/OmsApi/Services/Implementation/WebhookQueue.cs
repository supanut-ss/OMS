using System.Threading.Channels;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class WebhookQueue : IWebhookQueue
{
    private readonly Channel<long> _channel = Channel.CreateUnbounded<long>(
        new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

    public bool TryEnqueue(long webhookEventRecordId) =>
        _channel.Writer.TryWrite(webhookEventRecordId);

    public IAsyncEnumerable<long> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
