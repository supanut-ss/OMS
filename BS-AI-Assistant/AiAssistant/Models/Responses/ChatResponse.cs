namespace AiAssistant.Models.Responses;

/// <summary>
/// Response model for the AI Chat endpoint.
/// NOTE: GeneratedSQL is intentionally excluded — stored in ChatLog (audit) only.
/// </summary>
public class ChatResponse
{
    /// <summary>Indicates whether the request was processed successfully.</summary>
    public bool Success { get; set; }

    /// <summary>The AI-generated natural language response.</summary>
    public string? AiResponse { get; set; }

    /// <summary>AI routing decision for this request (BYPASS_SQL or GENERATE_SQL).</summary>
    public string? AiDecision { get; set; }

    /// <summary>The SQL executed in GENERATE_SQL path (if any).</summary>
    public string? GeneratedSql { get; set; }

    /// <summary>Parsed action from AI JSON (select, insert, update, delete).</summary>
    public string? Action { get; set; }

    /// <summary>Parsed target table from AI JSON.</summary>
    public string? Table { get; set; }

    /// <summary>Parsed field/value payload for insert or update proposals.</summary>
    public Dictionary<string, object?>? Fields { get; set; }

    /// <summary>Parsed condition payload for update/delete proposals.</summary>
    public Dictionary<string, object?>? Where { get; set; }

    /// <summary>Business-friendly summary shown to the user before confirming a CRUD proposal.</summary>
    public CrudBusinessPlan? BusinessPlan { get; set; }

    /// <summary>True when the response is a non-executed CRUD draft that requires user confirmation.</summary>
    public bool RequiresConfirmation { get; set; }

    /// <summary>CRUD audit log identifier for proposal/confirm correlation.</summary>
    public long? AiCrudAuditLogId { get; set; }

    /// <summary>Tabular result payload for custom report rendering when SQL is executed.</summary>
    public ReportDataPayload? ReportData { get; set; }

    /// <summary>Primary row-by-row payload for UI table rendering on GENERATE_SQL select results.</summary>
    public List<Dictionary<string, object?>> DataRows { get; set; } = [];

    /// <summary>The model that successfully generated the final response.</summary>
    public string? ModelUsed { get; set; }

    /// <summary>Fallback information (populated only when fallback occurred).</summary>
    public FallbackInfo? FallbackInfo { get; set; }

    /// <summary>Token usage information (accumulated across all AI calls).</summary>
    public TokenUsage? Tokens { get; set; }

    /// <summary>Total processing time in milliseconds.</summary>
    public long ProcessingTimeMs { get; set; }

    /// <summary>Error message if the request failed.</summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Human-readable CRUD proposal summary for confirmation UX.
/// </summary>
public class CrudBusinessPlan
{
    public string? Target { get; set; }
    public string? Activity { get; set; }
    public string? DataSummary { get; set; }
    public string? Reference { get; set; }
}

/// <summary>
/// Flat tabular payload returned to UI for dynamic report rendering.
/// </summary>
public class ReportDataPayload
{
    public List<string> Columns { get; set; } = [];
    public List<Dictionary<string, object?>> Rows { get; set; } = [];
    public int RowCount { get; set; }
    public bool IsTruncated { get; set; }
}

/// <summary>
/// Token usage details from the AI provider.
/// </summary>
public class TokenUsage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
}

/// <summary>
/// Populated when model fallback occurred during the request.
/// </summary>
public class FallbackInfo
{
    /// <summary>Total number of models attempted (including the successful one).</summary>
    public int AttemptCount { get; set; }

    /// <summary>Models that failed before the successful one (with failure reason).</summary>
    public List<string> FailedModels { get; set; } = [];

    /// <summary>The model ID that ultimately succeeded.</summary>
    public string FinalModel { get; set; } = string.Empty;
}
