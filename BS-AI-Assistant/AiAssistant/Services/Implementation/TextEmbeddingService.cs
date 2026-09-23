using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;

namespace AiAssistant.Services.Implementation;

public sealed class TextEmbeddingService : ITextEmbeddingService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly string _connectionString;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TextEmbeddingService> _logger;

    public TextEmbeddingService(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<TextEmbeddingService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<TextEmbeddingResult> CreateEmbeddingAsync(string text, CancellationToken cancellationToken = default)
    {
        var config = await GetActiveProviderAsync();
        if (config is null || IsLocal(config.ProviderName))
        {
            return CreateLocal(text);
        }

        try
        {
            return await CreateExternalAsync(text, config, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "External embedding provider failed. Falling back to local embedding.");
            return CreateLocal(text);
        }
    }

    private async Task<TextEmbeddingResult> CreateExternalAsync(
        string text,
        EmbeddingProviderConfig config,
        CancellationToken cancellationToken)
    {
        var endpoint = BuildEndpoint(config.BaseUrl, config.EmbeddingEndpoint);
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { input = text, model = config.EmbeddingModel }),
            Encoding.UTF8,
            "application/json");

        var apiKey = ResolveApiKey(config.ApiKeyEnvName);
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(config.TimeoutSeconds, 5, 300)));

        var client = _httpClientFactory.CreateClient("Embeddings");
        using var response = await client.SendAsync(request, timeout.Token);
        var payload = await response.Content.ReadAsStringAsync(timeout.Token);
        response.EnsureSuccessStatusCode();

        var vector = ParseOpenAiCompatibleEmbedding(payload);
        Normalize(vector);

        return new TextEmbeddingResult
        {
            Provider = config.ProviderName,
            Model = config.EmbeddingModel,
            Dimension = vector.Length,
            Vector = vector,
            EmbeddingJson = JsonSerializer.Serialize(vector, JsonOptions)
        };
    }

    private async Task<EmbeddingProviderConfig?> GetActiveProviderAsync()
    {
        const string sql = """
            IF OBJECT_ID(N'ais.t_ai_embedding_provider_config', N'U') IS NOT NULL
            BEGIN
                SELECT TOP (1)
                    [provider_name] AS ProviderName,
                    [base_url] AS BaseUrl,
                    [embedding_endpoint] AS EmbeddingEndpoint,
                    [embedding_model] AS EmbeddingModel,
                    [api_key_env_name] AS ApiKeyEnvName,
                    [dimension] AS Dimension,
                    [timeout_seconds] AS TimeoutSeconds
                FROM [ais].[t_ai_embedding_provider_config]
                WHERE [is_active] = 1
                ORDER BY [embedding_provider_config_id] DESC;
            END
            """;

        try
        {
            using var connection = new SqlConnection(_connectionString);
            return await connection.QueryFirstOrDefaultAsync<EmbeddingProviderConfig>(sql);
        }
        catch (SqlException ex) when (ex.Number is 208 or 207)
        {
            return null;
        }
    }

    private string? ResolveApiKey(string? apiKeyEnvName)
    {
        if (string.IsNullOrWhiteSpace(apiKeyEnvName))
        {
            return null;
        }

        return _configuration[apiKeyEnvName] ?? Environment.GetEnvironmentVariable(apiKeyEnvName);
    }

    private static TextEmbeddingResult CreateLocal(string text)
    {
        var vector = LocalTextEmbedding.CreateVector(text);
        return new TextEmbeddingResult
        {
            Provider = LocalTextEmbedding.Provider,
            Model = LocalTextEmbedding.Model,
            Dimension = LocalTextEmbedding.Dimension,
            Vector = vector,
            EmbeddingJson = JsonSerializer.Serialize(vector, JsonOptions)
        };
    }

    private static bool IsLocal(string? providerName) =>
        string.IsNullOrWhiteSpace(providerName) ||
        string.Equals(providerName, "local", StringComparison.OrdinalIgnoreCase);

    private static string BuildEndpoint(string baseUrl, string endpoint)
    {
        var root = (baseUrl ?? string.Empty).TrimEnd('/');
        var path = string.IsNullOrWhiteSpace(endpoint) ? "/v1/embeddings" : endpoint.Trim();
        if (!path.StartsWith('/'))
        {
            path = "/" + path;
        }

        return root + path;
    }

    private static float[] ParseOpenAiCompatibleEmbedding(string payload)
    {
        using var document = JsonDocument.Parse(payload);
        var embedding = document.RootElement
            .GetProperty("data")[0]
            .GetProperty("embedding");

        return embedding.EnumerateArray()
            .Select(value => value.GetSingle())
            .ToArray();
    }

    private static void Normalize(float[] vector)
    {
        double norm = 0;
        foreach (var value in vector)
        {
            norm += value * value;
        }

        if (norm == 0)
        {
            return;
        }

        var scale = (float)(1.0 / Math.Sqrt(norm));
        for (var i = 0; i < vector.Length; i++)
        {
            vector[i] *= scale;
        }
    }

    private sealed class EmbeddingProviderConfig
    {
        public string ProviderName { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public string EmbeddingEndpoint { get; set; } = "/v1/embeddings";
        public string EmbeddingModel { get; set; } = string.Empty;
        public string? ApiKeyEnvName { get; set; }
        public int Dimension { get; set; }
        public int TimeoutSeconds { get; set; } = 60;
    }
}
