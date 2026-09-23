namespace AiAssistant.Models.Entities;

/// <summary>
/// Entity mapping for ais.t_ai_chat_log table.
/// Complete audit log of all AI interactions.
/// </summary>
public class ChatLog
{
    public long AiChatLogId { get; set; }

    // Context
    public string Process { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;

    // Conversation
    public string UserMessage { get; set; } = string.Empty;
    public string? AiResponse { get; set; }

    // AI Decision Trace
    public int? SystemPromptId { get; set; }
    public int? AiConfigId { get; set; }
    public string? AiDecision { get; set; }
    public string? GeneratedSql { get; set; }

    // Resource Consumption
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
    public long ProcessingTimeMs { get; set; }

    // System Health
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }

    // Metadata
    public string? ModelName { get; set; }
    public DateTime CreatedDate { get; set; }
}
