namespace AiAssistant.Models.Responses;

/// <summary>
/// Result from the fallback-aware chat service.
/// Contains the AI response, which model succeeded, token usage, and fallback trace.
/// </summary>
public class FallbackChatResult
{
    /// <summary>The AI's response text.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>The model ID that successfully generated this response.</summary>
    public string ModelUsed { get; set; } = string.Empty;

    /// <summary>Number of prompt tokens consumed.</summary>
    public int PromptTokens { get; set; }

    /// <summary>Number of completion tokens consumed.</summary>
    public int CompletionTokens { get; set; }

    /// <summary>Total tokens consumed.</summary>
    public int TotalTokens { get; set; }

    /// <summary>How many models were attempted before success.</summary>
    public int AttemptCount { get; set; }

    /// <summary>List of models that failed before the successful one.</summary>
    public List<string> FailedModels { get; set; } = [];
}
