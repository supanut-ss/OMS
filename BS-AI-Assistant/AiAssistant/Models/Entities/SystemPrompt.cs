namespace AiAssistant.Models.Entities;

/// <summary>
/// Entity mapping for ais.t_ai_system_prompt table.
/// Global AI system prompt template.
/// </summary>
public class SystemPrompt
{
    public int SystemPromptId { get; set; }
    public string PromptName { get; set; } = string.Empty;
    public string SystemPromptText { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
