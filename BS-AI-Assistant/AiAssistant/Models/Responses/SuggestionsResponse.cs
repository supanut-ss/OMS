using System.Text.Json.Serialization;

namespace AiAssistant.Models.Responses;

/// <summary>
/// Response model containing AI-generated question suggestions for a given page/process.
/// </summary>
public class SuggestionsResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// List of suggested questions the user can click to ask quickly.
    /// </summary>
    [JsonPropertyName("suggestions")]
    public List<string> Suggestions { get; set; } = [];

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
}
