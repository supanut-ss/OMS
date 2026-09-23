using AiAssistant.Models.Entities;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Provides AI provider configuration (BaseUrl, ChatEndpoint, model list) loaded
/// from the database. Results are cached to minimise DB roundtrips.
/// Falls back to appsettings values when the database table is empty.
/// </summary>
public interface IAiProviderConfigService
{
    /// <summary>
    /// Returns the active provider configuration with its ordered model list.
    /// Cached for 5 minutes; never null (returns config-based defaults if DB is empty).
    /// </summary>
    Task<AiProviderConfig> GetActiveConfigAsync();

    /// <summary>
    /// Removes the cached config so the next call reloads from the database.
    /// Useful after an admin changes the provider settings.
    /// </summary>
    void InvalidateCache();
}
