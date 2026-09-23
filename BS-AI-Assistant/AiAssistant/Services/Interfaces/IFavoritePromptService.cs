using AiAssistant.Models.Entities;

namespace AiAssistant.Services.Interfaces;

public interface IFavoritePromptService
{
    Task<IReadOnlyList<FavoritePrompt>> GetFavoritesAsync(string process, string userId);
    Task<(bool isFavorite, long aiFavId)> ToggleFavoriteAsync(string process, string userId, string userMessage);
}
