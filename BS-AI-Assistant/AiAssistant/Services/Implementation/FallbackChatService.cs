using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AiAssistant.Models.Entities;
using AiAssistant.Models.Responses;
using AiAssistant.Services.Interfaces;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Calls the configured AI provider's chat completions endpoint with automatic model fallback.
/// Provider config (BaseUrl, ChatEndpoint, model list) is loaded from the database via
/// IAiProviderConfigService (cached 5 min) so it can be changed at runtime without redeployment.
/// API key is loaded from the database and decrypted at runtime, with env fallback during migration.
/// Models are tried in configured priority order. Retryable errors: 429, 500, 503, timeout.
/// Non-retryable: 400 (bad request), 401 (auth failure).
/// </summary>
public class FallbackChatService : IFallbackChatService
{
    private readonly HttpClient _httpClient;
    private readonly IAiProviderConfigService _providerConfigService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FallbackChatService> _logger;

    // HTTP status codes that trigger a fallback to the next model.
    // 400 is included because OpenRouter returns 400 "not a valid model ID" when a free
    // model is removed or renamed — treating it as retriable lets the service fall through
    // to the next model in the priority list instead of aborting immediately.
    private static readonly HashSet<int> _retryableStatusCodes = [400, 429, 500, 502, 503, 504];

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public FallbackChatService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IAiProviderConfigService providerConfigService,
        ILogger<FallbackChatService> logger)
    {
        // HttpClient is used without a preset BaseAddress — full URL is built per request
        _httpClient = httpClientFactory.CreateClient("OpenRouter");
        _configuration = configuration;
        _providerConfigService = providerConfigService;
        _logger = logger;
    }

    public async Task<FallbackChatResult> CompleteAsync(IList<FallbackMessage> messages)
    {
        // Load provider config from DB (cached — typically no DB hit)
        var config = await _providerConfigService.GetActiveConfigAsync();
        var apiKey = ResolveApiKey(config);

        if (config.Models.Count == 0)
            throw new InvalidOperationException("No models configured in AI provider config.");

        var failedModels = new List<string>();

        for (int i = 0; i < config.Models.Count; i++)
        {
            var model = config.Models[i];
            try
            {
                _logger.LogInformation("Trying model [{Index}/{Total}]: {Model}", i + 1, config.Models.Count, model);
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(config.TimeoutSeconds));
                var result = await CallModelAsync(model, messages, config.FullEndpointUrl, apiKey, cts.Token);
                result.AttemptCount = i + 1;
                result.FailedModels = failedModels;
                _logger.LogInformation("Model {Model} succeeded. Tokens: {Total}", model, result.TotalTokens);
                return result;
            }
            catch (ModelRetryException ex)
            {
                _logger.LogWarning("Model {Model} failed with retriable error (HTTP {Status}): {Reason}. Trying next...",
                    model, ex.StatusCode, ex.Message);
                failedModels.Add($"{model} (HTTP {ex.StatusCode})");
            }
            catch (TaskCanceledException)
            {
                _logger.LogWarning("Model {Model} timed out. Trying next...", model);
                failedModels.Add($"{model} (timeout)");
            }
        }

        throw new InvalidOperationException(
            $"All {config.Models.Count} model(s) failed. Attempted: {string.Join(", ", failedModels)}");
    }

    private async Task<FallbackChatResult> CallModelAsync(
        string model,
        IList<FallbackMessage> messages,
        string fullEndpointUrl,
        string apiKey,
        CancellationToken cancellationToken = default)
    {
        var requestBody = new OpenAiChatRequest
        {
            Model = model,
            Messages = messages.Select(m =>
            {
                // Multimodal: build content array [text + image_url]
                if (m is FallbackMultimodalMessage mm)
                {
                    return new OpenAiMessage
                    {
                        Role = mm.Role,
                        Content = new List<object>
                        {
                            new { type = "text", text = mm.Content },
                            new { type = "image_url", image_url = new { url = $"data:{mm.ImageMimeType};base64,{mm.ImageBase64}" } }
                        }
                    };
                }
                // Plain text message
                return new OpenAiMessage { Role = m.Role, Content = m.Content };
            }).ToList()
        };

        var json = JsonSerializer.Serialize(requestBody, _jsonOptions);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, fullEndpointUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
        httpRequest.Headers.Add("HTTP-Referer", "https://github.com/bs-platform/ai-assistance");
        httpRequest.Headers.Add("X-Title", "BS-AI-Assistance");

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync();

        // Retriable errors → let the caller try the next model
        if (_retryableStatusCodes.Contains((int)response.StatusCode))
        {
            throw new ModelRetryException((int)response.StatusCode,
                $"Provider returned {(int)response.StatusCode} for model '{model}': {responseBody[..Math.Min(200, responseBody.Length)]}");
        }

        // Non-retriable errors → rethrow immediately
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Provider non-retriable error {(int)response.StatusCode} for model '{model}': {responseBody}");
        }

        var parsed = JsonSerializer.Deserialize<OpenAiChatResponse>(responseBody, _jsonOptions)
            ?? throw new InvalidOperationException($"Failed to deserialize response from model '{model}'.");

        var content = parsed.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
        var usage = parsed.Usage;

        return new FallbackChatResult
        {
            Content = content,
            ModelUsed = model,
            PromptTokens = usage?.PromptTokens ?? 0,
            CompletionTokens = usage?.CompletionTokens ?? 0,
            TotalTokens = usage?.TotalTokens ?? 0
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
    // Request / Response DTOs (OpenAI chat completions format)
    // -------------------------------------------------------------------------

    private class OpenAiChatRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<OpenAiMessage> Messages { get; set; } = [];

        /// <summary>
        /// Must be explicitly false — some OpenRouter models default to streaming (SSE)
        /// which returns "data: {...}\ndata: [DONE]\n" instead of plain JSON, causing
        /// JsonException even on HTTP 200 responses.
        /// </summary>
        [JsonPropertyName("stream")]
        public bool Stream { get; set; } = false;
    }

    private class OpenAiMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        /// <summary>
        /// Either a plain string (text-only) or a List&lt;object&gt; (multimodal content array).
        /// System.Text.Json serializes both correctly to the OpenAI chat completions format.
        /// </summary>
        [JsonPropertyName("content")]
        public object Content { get; set; } = string.Empty;
    }

    private class OpenAiChatResponse
    {
        [JsonPropertyName("choices")]
        public List<OpenAiChoice>? Choices { get; set; }

        [JsonPropertyName("usage")]
        public OpenAiUsage? Usage { get; set; }
    }

    private class OpenAiChoice
    {
        [JsonPropertyName("message")]
        public OpenAiResponseMessage? Message { get; set; }
    }

    /// <summary>
    /// Response-only message DTO. The AI always returns content as a plain string.
    /// (Distinct from OpenAiMessage which has object Content for outbound multimodal requests.)
    /// </summary>
    private class OpenAiResponseMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private class OpenAiUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }
}

/// <summary>
/// Exception thrown when a model fails with a retriable HTTP status (429, 500, 503, etc.)
/// so the caller knows to try the next model in the fallback chain.
/// </summary>
public class ModelRetryException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

