namespace AiAssistant.Models.Responses;

/// <summary>
/// Response model for the OpenRouter API key / rate limit check endpoint.
/// </summary>
public class RateLimitResponse
{
    /// <summary>Human-readable label of the API key.</summary>
    public string? Label { get; set; }

    /// <summary>Whether the user is on the free tier (has not purchased credits).</summary>
    public bool IsFreeTier { get; set; }

    /// <summary>Credit limit for the key (null = unlimited).</summary>
    public decimal? Limit { get; set; }

    /// <summary>Remaining credits for the key (null = unlimited).</summary>
    public decimal? LimitRemaining { get; set; }

    /// <summary>Type of limit reset (e.g. "monthly"), or null if never resets.</summary>
    public string? LimitReset { get; set; }

    /// <summary>Total credits used all-time.</summary>
    public decimal Usage { get; set; }

    /// <summary>Credits used today (UTC day).</summary>
    public decimal UsageDaily { get; set; }

    /// <summary>Credits used this week (UTC week, starting Monday).</summary>
    public decimal UsageWeekly { get; set; }

    /// <summary>Credits used this month (UTC month).</summary>
    public decimal UsageMonthly { get; set; }

    /// <summary>Free tier request limits info.</summary>
    public FreeTierLimits? FreeTierInfo { get; set; }
}

/// <summary>
/// Free tier rate limit information.
/// </summary>
public class FreeTierLimits
{
    public int RequestsPerMinute { get; set; } = 20;
    public int RequestsPerDay { get; set; }
    public string Note { get; set; } = string.Empty;
}
