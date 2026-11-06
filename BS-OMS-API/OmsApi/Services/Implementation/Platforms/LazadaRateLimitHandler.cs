using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using OmsApi.Models.Common;

namespace OmsApi.Services.Implementation.Platforms;

/// <summary>Spaces requests from this OMS process per Lazada shop.</summary>
internal sealed class LazadaRateLimitHandler : DelegatingHandler
{
    private sealed class ShopGate
    {
        public readonly SemaphoreSlim Mutex = new(1, 1);
        public long NextRequestTimestamp;
    }

    private static readonly ConcurrentDictionary<long, ShopGate> Gates = new();
    private readonly TimeSpan _interval;
    private readonly TimeSpan _retryDelay;
    private readonly int _maxReadRetries;

    public LazadaRateLimitHandler() : this(TimeSpan.FromMilliseconds(1100), TimeSpan.FromMilliseconds(1500), 2) { }

    internal LazadaRateLimitHandler(TimeSpan interval, TimeSpan retryDelay, int maxReadRetries)
    {
        _interval = interval;
        _retryDelay = retryDelay;
        _maxReadRetries = maxReadRetries;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var credential = PlatformCredentialExecutionContext.Require(PlatformType.Lazada);
        var gate = Gates.GetOrAdd(credential.PlatformCredentialId, _ => new ShopGate());
        await gate.Mutex.WaitAsync(cancellationToken);
        try
        {
            for (var attempt = 0; ; attempt++)
            {
                var remaining = Stopwatch.GetElapsedTime(Stopwatch.GetTimestamp(), gate.NextRequestTimestamp);
                if (remaining > TimeSpan.Zero)
                    await Task.Delay(remaining, cancellationToken);

                // A request may have reached Lazada even if the transport fails.
                // Reserve the next slot before sending, including on errors.
                gate.NextRequestTimestamp = Stopwatch.GetTimestamp() + (long)(_interval.TotalSeconds * Stopwatch.Frequency);
                var sendRequest = attempt == 0 ? request : CloneGetRequest(request);
                var response = await base.SendAsync(sendRequest, cancellationToken);
                if (!IsRetryableRead(request))
                    return response;

                var limit = await GetRateLimitAsync(response, cancellationToken);
                if (limit == null)
                    return response;

                if (attempt >= _maxReadRetries)
                {
                    response.Dispose();
                    throw new PlatformApiException("Lazada", limit.Value.Code, limit.Value.Message, limit.Value.RequestId);
                }

                response.Dispose();
                await Task.Delay(_retryDelay, cancellationToken);
            }
        }
        finally
        {
            gate.Mutex.Release();
        }
    }

    private static bool IsRetryableRead(HttpRequestMessage request)
    {
        if (request.Method != HttpMethod.Get || request.RequestUri == null) return false;
        var path = request.RequestUri.AbsolutePath.TrimEnd('/');
        return new[] { "/orders/get", "/order/get", "/order/items/get", "/products/get", "/shipment/providers/get", "/logistic/order/trace" }
            .Any(endpoint => path.EndsWith(endpoint, StringComparison.OrdinalIgnoreCase));
    }

    private static HttpRequestMessage CloneGetRequest(HttpRequestMessage request)
    {
        var clone = new HttpRequestMessage(HttpMethod.Get, request.RequestUri)
        {
            Version = request.Version,
            VersionPolicy = request.VersionPolicy
        };
        foreach (var header in request.Headers)
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        return clone;
    }

    private static async Task<(string Code, string Message, string? RequestId)?> GetRateLimitAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.Content == null) return null;
        var mediaType = response.Content.Headers.ContentType?.MediaType;
        if (mediaType != null && !mediaType.Contains("json", StringComparison.OrdinalIgnoreCase)) return null;
        if (response.Content.Headers.ContentLength > 1024 * 1024) return null;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.ValueKind != JsonValueKind.Object) return null;
            if (!json.RootElement.TryGetProperty("code", out var code)) return null;
            var value = code.ToString();
            if (!string.Equals(value, "SellerCallLimit", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(value, "ApiCallLimit", StringComparison.OrdinalIgnoreCase)) return null;
            var message = json.RootElement.TryGetProperty("message", out var text) ? text.ToString() : "Request frequency limit reached.";
            var requestId = json.RootElement.TryGetProperty("request_id", out var id) ? id.ToString() : null;
            return (value, message, requestId);
        }
        catch (JsonException) { return null; }
    }
}
