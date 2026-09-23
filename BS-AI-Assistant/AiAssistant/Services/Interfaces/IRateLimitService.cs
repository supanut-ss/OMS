using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service for querying OpenRouter API key information and rate limits.
/// </summary>
public interface IRateLimitService
{
    /// <summary>
    /// Calls GET https://openrouter.ai/api/v1/key to retrieve API key usage and rate limit info.
    /// </summary>
    Task<RateLimitResponse> GetRateLimitInfoAsync();
}
