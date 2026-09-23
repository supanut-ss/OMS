using AiAssistant.Models.Responses;

namespace AiAssistant.Services.Interfaces;

/// <summary>
/// Service that aggregates dashboard statistics for the AI Admin Console overview panel.
/// </summary>
public interface IOverviewStatsService
{
    Task<OverviewStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default);
}
