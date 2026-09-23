namespace AiAssistant.Models.Responses;

/// <summary>
/// Result of syncing SQL Server schema metadata into the AI schema catalog.
/// </summary>
public class SchemaSyncResponse
{
    public bool Success { get; set; }
    public int SourceColumnCount { get; set; }
    public int ActiveCatalogColumnCount { get; set; }
    public int SourceRelationCount { get; set; }
    public int ActiveRelationCount { get; set; }
    public DateTime SyncedAtUtc { get; set; }
    public string? ErrorMessage { get; set; }
}

