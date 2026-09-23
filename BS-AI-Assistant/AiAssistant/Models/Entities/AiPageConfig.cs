namespace AiAssistant.Models.Entities;

/// <summary>
/// Entity mapping for ais.t_ai_page_config table.
/// Page-specific sub-system prompt configuration.
/// </summary>
public class AiPageConfig
{
    public int AiConfigId { get; set; }
    public string Process { get; set; } = string.Empty;
    public string PageName { get; set; } = string.Empty;
    public string SubSystemPrompt { get; set; } = string.Empty;
    public string? AllowedTables { get; set; }
    public string? AllowedColumns { get; set; }
    public string? SampleQueries { get; set; }
    public int? SystemPromptId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
