using AiAssistant.Models.Entities;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Loads AI provider configuration from ais.t_ai_provider_config + ais.t_ai_model_priority
/// using a single query with NOLOCK hints to avoid adding lock overhead to normal transactions.
/// Results are cached in IMemoryCache for 5 minutes so the database is only hit once per
/// cache window regardless of request volume.
/// Falls back to appsettings/env values when the table is empty (e.g. fresh dev environment).
/// </summary>
public class AiProviderConfigService : IAiProviderConfigService
{
    private readonly string _connectionString;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiProviderConfigService> _logger;

    private const string CacheKey = "ai:provider_config:active";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    // Single JOIN query — one roundtrip, NOLOCK on both tables to avoid shared lock
    // overhead during busy transaction periods. Config data is non-critical read-only.
    private const string Sql = @"
        SELECT
            c.provider_config_id    AS ProviderId,
            c.provider_name         AS ProviderName,
            c.base_url              AS BaseUrl,
            c.chat_endpoint         AS ChatEndpoint,
            c.api_key               AS ApiKey,
            c.timeout_seconds       AS TimeoutSeconds,
            c.allow_file_attachment AS AllowFileAttachment,
            c.allowed_file_types    AS AllowedFileTypes,
            m.model_name            AS ModelName,
            m.priority_order        AS PriorityOrder
        FROM  ais.t_ai_provider_config  c WITH (NOLOCK)
        LEFT  JOIN ais.t_ai_model_priority m WITH (NOLOCK)
              ON  m.provider_config_id = c.provider_config_id
              AND m.is_active = 1
        WHERE c.is_active = 1
        ORDER BY c.provider_config_id ASC, m.priority_order ASC";

    public AiProviderConfigService(
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<AiProviderConfigService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    public async Task<AiProviderConfig> GetActiveConfigAsync()
    {
        if (_cache.TryGetValue(CacheKey, out AiProviderConfig? cached) && cached != null)
            return cached;

        var config = await LoadFromDatabaseAsync() ?? BuildFallbackConfig();

        _cache.Set(CacheKey, config, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration,
            // Low priority so memory pressure can evict it; it will just reload from DB
            Priority = CacheItemPriority.Low
        });

        return config;
    }

    public void InvalidateCache() => _cache.Remove(CacheKey);

    // -------------------------------------------------------------------------

    private async Task<AiProviderConfig?> LoadFromDatabaseAsync()
    {
        try
        {
            using var connection = new SqlConnection(_connectionString);

            // Dynamic query: returns one row per model (config columns repeat)
            var rows = (await connection.QueryAsync<ProviderConfigRow>(Sql)).ToList();

            if (rows.Count == 0)
            {
                _logger.LogInformation(
                    "No active provider config found in ais.t_ai_provider_config. Using appsettings fallback.");
                return null;
            }

            var first = rows[0];
            var models = rows
                .Where(r => r.ModelName != null)
                .OrderBy(r => r.PriorityOrder)
                .Select(r => r.ModelName!)
                .ToList();

            // Decrypt API key — if decryption fails keep it null so callers fall through to the
            // appsettings fallback rather than accidentally sending the ciphertext blob as a Bearer token.
            string? resolvedApiKey = null;
            if (!string.IsNullOrWhiteSpace(first.ApiKey))
            {
                resolvedApiKey = AiSecretCrypto.TryDecrypt(first.ApiKey);
                if (resolvedApiKey == null)
                    _logger.LogWarning(
                        "Failed to decrypt API key for provider '{Provider}'. " +
                        "The key will be empty and the appsettings fallback will be used. " +
                        "Verify that AI_PROVIDER_SECRET_KEY matches the value used when the key was saved.",
                        first.ProviderName);
            }

            var config = new AiProviderConfig
            {
                ProviderConfigId = first.ProviderId,
                ProviderName = first.ProviderName,
                BaseUrl = first.BaseUrl,
                ChatEndpoint = first.ChatEndpoint,
                ApiKey = resolvedApiKey,
                TimeoutSeconds = first.TimeoutSeconds,
                AllowFileAttachment = first.AllowFileAttachment,
                AllowedFileTypes = first.AllowedFileTypes,
                Models = models
            };

            _logger.LogInformation(
                "Loaded provider config from DB: {Provider} | {BaseUrl}{Endpoint} | {ModelCount} model(s) | cache TTL: {Ttl}min",
                config.ProviderName, config.BaseUrl, config.ChatEndpoint, models.Count, CacheDuration.TotalMinutes);

            return config;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load AI provider config from database. Using appsettings fallback.");
            return null;
        }
    }

    /// <summary>
    /// Builds config from appsettings / environment variables as a last resort
    /// so the service works even without DB rows (e.g. local dev, first deploy).
    /// </summary>
    private AiProviderConfig BuildFallbackConfig()
    {
        var baseUrl = _configuration["OpenRouter:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "https://openrouter.ai";

        var endpoint = _configuration["OpenRouter:ChatEndpoint"];
        if (string.IsNullOrWhiteSpace(endpoint)) endpoint = "/api/v1/chat/completions";

        var modelArray = _configuration.GetSection("OpenRouter:Models").Get<string[]>();
        if (modelArray == null || modelArray.Length == 0)
        {
            var single = _configuration["OpenRouter:DefaultModel"] ?? "openai/gpt-4o-mini";
            modelArray = [single];
        }

        _logger.LogWarning(
            "Using appsettings fallback for AI provider config: {BaseUrl}{Endpoint} | {ModelCount} model(s)",
            baseUrl, endpoint, modelArray.Length);

        return new AiProviderConfig
        {
            ProviderName = "OpenRouter (fallback)",
            BaseUrl = baseUrl,
            ChatEndpoint = endpoint,
            TimeoutSeconds = 60,
            Models = modelArray
        };
    }

    // Dapper projection DTO (private — only used inside this class)
    private sealed class ProviderConfigRow
    {
        public int ProviderId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public string ChatEndpoint { get; set; } = string.Empty;
        public string? ApiKey { get; set; }
        public int TimeoutSeconds { get; set; }
        public bool AllowFileAttachment { get; set; }
        public string? AllowedFileTypes { get; set; }
        public string? ModelName { get; set; }
        public int PriorityOrder { get; set; }
    }
}
