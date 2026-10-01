namespace OmsApi.Models.Persistence;

/// <summary>
/// Durable receipt for a marketplace webhook. The unique EventKey is the
/// idempotency boundary; the raw request is stored only after sensitive JSON
/// fields have been redacted.
/// </summary>
public class PlatformWebhookEvent
{
    public long WebhookEventRecordId { get; set; }
    public string EventKey { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string? ShopId { get; set; }
    public string? PlatformOrderId { get; set; }
    public string? PlatformStatus { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? EventTime { get; set; }
    public string SignatureStatus { get; set; } = "VERIFIED";
    public string ProcessingStatus { get; set; } = "RECEIVED";
    public int AttemptCount { get; set; }
    public string? RequestPayload { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime ReceivedDate { get; set; }
    public DateTime? ProcessedDate { get; set; }
    public DateTime? LastAttemptDate { get; set; }
    public string? InternalStatus { get; set; }
}
