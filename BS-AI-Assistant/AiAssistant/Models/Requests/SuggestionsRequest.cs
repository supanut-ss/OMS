using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AiAssistant.Models.Requests;

/// <summary>
/// Request model for generating AI-powered question suggestions for a given page/process context.
/// </summary>
public class SuggestionsRequest
{
    /// <summary>
    /// The UI process/page identifier (e.g. "/inventory/items"). Used to load the page-specific AI prompt.
    /// </summary>
    [Required]
    [JsonPropertyName("process")]
    public string Process { get; set; } = string.Empty;

    /// <summary>
    /// Optional: current user ID for personalised suggestions.
    /// </summary>
    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Optional: current user display name for personalised suggestions.
    /// </summary>
    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// Optional: UI language code used to localize the generated suggestions.
    /// </summary>
    [JsonPropertyName("lang")]
    public string Lang { get; set; } = string.Empty;

    /// <summary>
    /// Optional system prompt override for broad admin chat surfaces.
    /// </summary>
    [JsonPropertyName("system_prompt_id")]
    public int? SystemPromptId { get; set; }

    /// <summary>
    /// Number of suggestion questions to generate. Defaults to 4.
    /// </summary>
    [Range(1, 20)]
    [JsonPropertyName("count")]
    public int Count { get; set; } = 4;
}
