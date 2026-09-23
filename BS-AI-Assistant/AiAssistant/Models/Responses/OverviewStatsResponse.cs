namespace AiAssistant.Models.Responses;

public class OverviewStatsResponse
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }

    // Chat provider
    public string? ChatProviderName { get; set; }
    public string? ChatModelName { get; set; }
    public bool ChatProviderActive { get; set; }

    // Embedding provider
    public string? EmbeddingProviderName { get; set; }
    public string? EmbeddingModel { get; set; }
    public bool EmbeddingProviderActive { get; set; }

    // Prompts & page configs
    public int SystemPromptCount { get; set; }
    public int PageConfigCount { get; set; }

    // Knowledge base
    public int DocumentCount { get; set; }
    public int ChunkCount { get; set; }
    public int EmbeddedChunkCount { get; set; }

    // Schema
    public int SchemaTableCount { get; set; }
    public int SchemaColumnCount { get; set; }
    public DateTime? LastSchemaSyncDate { get; set; }

    // Chat activity
    public int ChatToday { get; set; }
    public int ChatTotal { get; set; }
    public double ChatSuccessRate { get; set; }

    // Recent logs
    public List<RecentChatLogItem> RecentLogs { get; set; } = [];
}

public class RecentChatLogItem
{
    public string UserMessage { get; set; } = string.Empty;
    public string? ModelName { get; set; }
    public bool IsSuccess { get; set; }
    public long? ProcessingTimeMs { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? AiDecision { get; set; }
}
