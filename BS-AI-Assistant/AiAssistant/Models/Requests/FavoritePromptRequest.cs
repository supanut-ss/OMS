using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AiAssistant.Models.Requests;

/// <summary>
/// Request model for toggling favorite prompt state.
/// </summary>
public class FavoritePromptRequest
{
    [Required]
    [JsonPropertyName("process")]
    public string Process { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("user_message")]
    public string UserMessage { get; set; } = string.Empty;
}
