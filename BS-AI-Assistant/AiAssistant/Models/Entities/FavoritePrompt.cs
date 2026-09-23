namespace AiAssistant.Models.Entities;

/// <summary>
/// Entity mapping for ais.t_ai_favorite_prompts table.
/// </summary>
public class FavoritePrompt
{
    public long AiFavId { get; set; }
    public string Process { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserMessage { get; set; } = string.Empty;
    public DateTime CreateDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool? IsActive { get; set; }
}
