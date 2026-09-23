namespace AiAssistant.Models.Entities;

/// <summary>
/// Maps to ais.t_ai_provider_config joined with ais.t_ai_model_priority.
/// Loaded once from DB and cached; falls back to appsettings when DB has no data.
/// </summary>
public class AiProviderConfig
{
    public int ProviderConfigId { get; set; }
    public string ProviderName { get; set; } = "OpenRouter";
    public string BaseUrl { get; set; } = "https://openrouter.ai";
    public string ChatEndpoint { get; set; } = "/api/v1/chat/completions";
    public string? ApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 60;
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Whether this provider supports multimodal (image) attachments.
    /// Only enable when the active models are vision-capable.
    /// </summary>
    public bool AllowFileAttachment { get; set; } = false;

    /// <summary>
    /// Comma-separated MIME types allowed for attachment (e.g. "image/jpeg,image/png").
    /// Null/empty falls back to the default image list.
    /// </summary>
    public string? AllowedFileTypes { get; set; }

    /// <summary>
    /// Returns the list of allowed MIME types. Falls back to common image types.
    /// </summary>
    public IReadOnlyList<string> AllowedFileTypesList =>
        string.IsNullOrWhiteSpace(AllowedFileTypes)
            ? ["image/jpeg", "image/png", "image/gif", "image/webp"]
            : AllowedFileTypes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

    /// <summary>
    /// Ordered list of model identifiers to try. Populated from t_ai_model_priority (priority_order ASC).
    /// </summary>
    public IReadOnlyList<string> Models { get; set; } = [];

    /// <summary>Convenience: full URL = BaseUrl + ChatEndpoint</summary>
    public string FullEndpointUrl => BaseUrl.TrimEnd('/') + ChatEndpoint;
}
