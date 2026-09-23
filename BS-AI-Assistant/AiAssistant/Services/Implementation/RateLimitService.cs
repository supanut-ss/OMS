using System.Text.Json;
using System.Text.Json.Serialization;
using AiAssistant.Models.Entities;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Calls the OpenRouter /api/v1/key endpoint to retrieve API key usage and rate limit details.
/// </summary>
public class RateLimitService : IRateLimitService
{
    private readonly HttpClient _httpClient;
    private readonly IAiProviderConfigService _providerConfigService;
    private readonly IConfiguration _configuration;
    private readonly bool _isFreeTierModel;
    private readonly ILogger<RateLimitService> _logger;

    // JSON options with camelCase + allow number reading from strings
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public RateLimitService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IAiProviderConfigService providerConfigService,
        ILogger<RateLimitService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("OpenRouter");
        _configuration = configuration;
        _providerConfigService = providerConfigService;

        // Check if any configured model is on the free tier
        var models = configuration.GetSection("OpenRouter:Models").Get<string[]>()
            ?? [configuration["OpenRouter:DefaultModel"] ?? ""];
        _isFreeTierModel = models.Any(m => m.EndsWith(":free", StringComparison.OrdinalIgnoreCase));
        _logger = logger;
    }

    public async Task<RateLimitResponse> GetRateLimitInfoAsync()
    {
        var providerConfig = await _providerConfigService.GetActiveConfigAsync();
        var apiKey = ResolveApiKey(providerConfig);

        using var request = new HttpRequestMessage(HttpMethod.Get, "https://openrouter.ai/api/v1/key");
        request.Headers.Add("Authorization", $"Bearer {apiKey}");

        _logger.LogInformation("Fetching OpenRouter rate limit info...");

        var httpResponse = await _httpClient.SendAsync(request);
        var json = await httpResponse.Content.ReadAsStringAsync();

        _logger.LogDebug("OpenRouter /key response: {Json}", json);

        if (!httpResponse.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"OpenRouter returned {(int)httpResponse.StatusCode}: {json}");
        }

        var raw = JsonSerializer.Deserialize<OpenRouterKeyResponse>(json, _jsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize OpenRouter key response.");

        var data = raw.Data;

        // Determine free tier daily limit
        int dailyLimit = data.IsFreeTier ? 50 : 1000;  // <10 credits = 50/day, ≥10 = 1000/day
        string note = data.IsFreeTier
            ? "Free tier (no credits purchased): 50 free-model requests/day, 20 req/min."
            : "Credits purchased: 1,000 free-model requests/day, 20 req/min.";

        return new RateLimitResponse
        {
            Label = data.Label,
            IsFreeTier = data.IsFreeTier,
            Limit = data.Limit,
            LimitRemaining = data.LimitRemaining,
            LimitReset = data.LimitReset,
            Usage = data.Usage,
            UsageDaily = data.UsageDaily,
            UsageWeekly = data.UsageWeekly,
            UsageMonthly = data.UsageMonthly,
            FreeTierInfo = _isFreeTierModel ? new FreeTierLimits
            {
                RequestsPerMinute = 20,
                RequestsPerDay = dailyLimit,
                Note = note
            } : null
        };
    }

    private string ResolveApiKey(AiProviderConfig config)
    {
        if (!string.IsNullOrWhiteSpace(config.ApiKey))
            return config.ApiKey;

        var fallbackApiKey = _configuration["OpenRouter:ApiKey"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(fallbackApiKey))
        {
            _logger.LogWarning("Using OpenRouter API key from configuration fallback because the database key is empty.");
        }

        return fallbackApiKey;
    }

    // -------------------------------------------------------------------------
    // Internal deserialization models matching OpenRouter's /key response schema
    // -------------------------------------------------------------------------

    private class OpenRouterKeyResponse
    {
        [JsonPropertyName("data")]
        public OpenRouterKeyData Data { get; set; } = new();
    }

    private class OpenRouterKeyData
    {
        [JsonPropertyName("label")]
        public string? Label { get; set; }

        [JsonPropertyName("limit")]
        public decimal? Limit { get; set; }

        [JsonPropertyName("limit_reset")]
        public string? LimitReset { get; set; }

        [JsonPropertyName("limit_remaining")]
        public decimal? LimitRemaining { get; set; }

        [JsonPropertyName("usage")]
        public decimal Usage { get; set; }

        [JsonPropertyName("usage_daily")]
        public decimal UsageDaily { get; set; }

        [JsonPropertyName("usage_weekly")]
        public decimal UsageWeekly { get; set; }

        [JsonPropertyName("usage_monthly")]
        public decimal UsageMonthly { get; set; }

        [JsonPropertyName("is_free_tier")]
        public bool IsFreeTier { get; set; }
    }
}
