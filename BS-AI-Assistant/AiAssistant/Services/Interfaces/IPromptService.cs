using AiAssistant.Models.Entities;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service for loading and assembling prompts from the database.
/// </summary>
public interface IPromptService
{
    /// <summary>
    /// Gets the active system prompt.
    /// </summary>
    Task<SystemPrompt?> GetActiveSystemPromptAsync();

    /// <summary>
    /// Gets a system prompt by its ID (must be active).
    /// </summary>
    Task<SystemPrompt?> GetSystemPromptByIdAsync(int systemPromptId);

    /// <summary>
    /// Gets the page-specific AI configuration by process path.
    /// </summary>
    Task<AiPageConfig?> GetPageConfigAsync(string process);

    /// <summary>
    /// Gets all active process paths that have AI configurations.
    /// </summary>
    Task<IEnumerable<string>> GetActiveProcessesAsync();

    /// <summary>
    /// Builds the combined prompt from system prompt + page config.
    /// </summary>
    Task<(string combinedPrompt, int? systemPromptId, int? aiConfigId)> BuildCombinedPromptAsync(string process, int? systemPromptId = null);
}
