namespace AiAssistant.Models.Responses;

/// <summary>
/// Lightweight schema catalog preview for admin/debug screens.
/// </summary>
public class SchemaCatalogPreviewResponse
{
    public bool Success { get; set; }
    public IEnumerable<SchemaCatalogPreviewItem> Items { get; set; } = [];
    public string? ErrorMessage { get; set; }
}

public class SchemaCatalogPreviewItem
{
    public string SchemaName { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string? TableDescription { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsNullable { get; set; }
    public bool IsPrimaryKey { get; set; }
    public string? ColumnDescription { get; set; }
}

