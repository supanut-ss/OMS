namespace OmsApi.Models.Persistence;

/// <summary>
/// One row per platform -> OMS sync batch (one platform + shop per call).
/// Append-only audit trail, so there are no update/rowversion columns.
/// </summary>
public class PlatformSyncLog
{
    public long SyncLogId { get; set; }
    public string SyncType { get; set; } = "ORDER";
    public string SyncSource { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string? ShopId { get; set; }
    public string SyncStatus { get; set; } = string.Empty;
    public int TotalFetched { get; set; }
    public int TotalInserted { get; set; }
    public int TotalUpdated { get; set; }
    public int TotalFailed { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }

    public ICollection<PlatformSyncLogDetail> Details { get; set; } = new List<PlatformSyncLogDetail>();
}

/// <summary>
/// One row per platform order touched by a sync batch. order_record_id is not
/// a foreign key on purpose: the log must survive the order row being deleted.
/// </summary>
public class PlatformSyncLogDetail
{
    public long SyncLogDetailId { get; set; }
    public long SyncLogId { get; set; }
    public string PlatformOrderId { get; set; } = string.Empty;
    public long? OrderRecordId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldStatus { get; set; }
    public string? NewStatus { get; set; }
    public string? Message { get; set; }
    public DateTime CreateDate { get; set; }

    public PlatformSyncLog? SyncLog { get; set; }
}
