using System.Text.Json.Serialization;

namespace AiAssistant.Models.Responses;

public class FavoritePromptItemResponse
{
    [JsonPropertyName("ai_fav_id")]
    public long AiFavId { get; set; }

    [JsonPropertyName("process")]
    public string Process { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("user_message")]
    public string UserMessage { get; set; } = string.Empty;

    [JsonPropertyName("create_date")]
    public DateTime CreateDate { get; set; }

    [JsonPropertyName("update_date")]
    public DateTime? UpdateDate { get; set; }
}

public class FavoritePromptListResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("favorites")]
    public List<FavoritePromptItemResponse> Favorites { get; set; } = [];

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
}

public class FavoritePromptToggleResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("is_favorite")]
    public bool IsFavorite { get; set; }

    [JsonPropertyName("ai_fav_id")]
    public long AiFavId { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
}
