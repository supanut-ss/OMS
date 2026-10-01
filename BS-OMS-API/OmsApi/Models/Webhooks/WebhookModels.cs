using OmsApi.Models.Common;

namespace OmsApi.Models.Webhooks;

public sealed class WebhookEventEnvelope
{
    public PlatformType Platform { get; init; }
    public string EventKey { get; init; } = string.Empty;
    public string EventType { get; init; } = string.Empty;
    public string? ShopId { get; init; }
    public string? OrderId { get; init; }
    public string? PlatformStatus { get; init; }
    public string? TrackingNumber { get; init; }
    public DateTime? EventTime { get; init; }
    public bool IsOrderEvent { get; init; }
    public bool IsAuthorizationEvent { get; init; }
    public bool IsDeauthorizationEvent { get; init; }
    public string RedactedPayload { get; init; } = string.Empty;
}

public sealed record WebhookReceiptResult(
    int StatusCode,
    bool Accepted,
    bool Duplicate,
    long? EventRecordId,
    string Message);

public static class WebhookProcessingStatuses
{
    public const string Received = "RECEIVED";
    public const string Queued = "QUEUED";
    public const string Processing = "PROCESSING";
    public const string Processed = "PROCESSED";
    public const string Failed = "FAILED";
    public const string Ignored = "IGNORED";
    public const string Duplicate = "DUPLICATE";
}
