namespace OmsApi.Models.Persistence;

/// <summary>
/// One row per platform sync attempt (t_oms_sync_log). Mirrors the table as
/// it already exists on the shared OMS database; RequestPayload is the only
/// column this codebase introduces.
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
    public string? RequestPayload { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CreateBy { get; set; }
    public DateTime CreateDate { get; set; }
}
