using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers;

[Route("api/oms-orders")]
[ApiController]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public sealed class OmsOrdersController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public OmsOrdersController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("{platform}/{orderId}/resync")]
    public async Task<IActionResult> ResyncOrder(
        string platform,
        string orderId,
        [FromQuery] string? shopId,
        CancellationToken cancellationToken)
    {
        var normalizedPlatform = platform.Trim().ToLowerInvariant();
        if (normalizedPlatform is not ("shopee" or "lazada" or "tiktok"))
            return BadRequest(new { message = "Platform must be shopee, lazada, or tiktok." });
        if (string.IsNullOrWhiteSpace(orderId))
            return BadRequest(new { message = "Order ID is required." });

        var baseUrl = Environment.GetEnvironmentVariable("OMS_API_URL");
        var apiKey = Environment.GetEnvironmentVariable("OMS_API_KEY");
        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var omsBaseUri) ||
            (omsBaseUri.Scheme != Uri.UriSchemeHttp && omsBaseUri.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "OMS API is not configured on the server." });
        }

        var path = $"api/Order/{Uri.EscapeDataString(normalizedPlatform)}/{Uri.EscapeDataString(orderId.Trim())}";
        var query = string.IsNullOrWhiteSpace(shopId)
            ? string.Empty
            : $"?shopId={Uri.EscapeDataString(shopId.Trim())}";
        var target = new Uri(new Uri(omsBaseUri.AbsoluteUri.TrimEnd('/') + "/"), path + query);

        using var request = new HttpRequestMessage(HttpMethod.Get, target);
        request.Headers.Add("X-Api-Key", apiKey);

        try
        {
            using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return new ContentResult
            {
                StatusCode = (int)response.StatusCode,
                Content = content,
                ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json",
            };
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "Could not reach OMS API." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout,
                new { message = "OMS API request timed out." });
        }
    }

    [HttpGet("{platform}/{orderId}/waybills")]
    public async Task<IActionResult> GetWaybills(
        string platform,
        string orderId,
        [FromQuery] string shopId,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizePlatform(platform, out var normalizedPlatform, out _))
            return BadRequest(new { message = "Platform must be shopee, lazada, or tiktok." });
        if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(shopId))
            return BadRequest(new { message = "Order ID and Shop ID are required." });

        var path =
            $"api/Shipping/waybills/{Uri.EscapeDataString(normalizedPlatform)}/{Uri.EscapeDataString(orderId.Trim())}" +
            $"?shopId={Uri.EscapeDataString(shopId.Trim())}";
        return await ProxyOmsJsonAsync(HttpMethod.Get, path, null, cancellationToken);
    }

    [HttpPost("{platform}/{orderId}/waybills/ensure")]
    public async Task<IActionResult> EnsureWaybills(
        string platform,
        string orderId,
        [FromQuery] string shopId,
        CancellationToken cancellationToken)
    {
        if (!TryNormalizePlatform(platform, out _, out var platformCode))
            return BadRequest(new { message = "Platform must be shopee, lazada, or tiktok." });
        if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(shopId))
            return BadRequest(new { message = "Order ID and Shop ID are required." });

        var body = JsonSerializer.Serialize(new
        {
            Platform = platformCode,
            ShopId = shopId.Trim(),
            PlatformOrderId = orderId.Trim(),
            ShippingDocumentType = "NORMAL_AIR_WAYBILL",
        });
        return await ProxyOmsJsonAsync(
            HttpMethod.Post,
            "api/Shipping/waybills/ensure",
            body,
            cancellationToken);
    }

    [HttpGet("{platform}/{orderId}/waybills/file")]
    public async Task<IActionResult> DownloadWaybill(
        string platform,
        string orderId,
        [FromQuery] string shopId,
        [FromQuery] string? packageId,
        [FromQuery] bool markPrinted = true,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormalizePlatform(platform, out var normalizedPlatform, out _))
            return BadRequest(new { message = "Platform must be shopee, lazada, or tiktok." });
        if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(shopId))
            return BadRequest(new { message = "Order ID and Shop ID are required." });

        var settings = GetOmsSettings();
        if (settings == null)
            return OmsNotConfigured();

        var query = $"?shopId={Uri.EscapeDataString(shopId.Trim())}&markPrinted={markPrinted.ToString().ToLowerInvariant()}";
        if (!string.IsNullOrWhiteSpace(packageId))
            query += $"&packageId={Uri.EscapeDataString(packageId.Trim())}";
        var path =
            $"api/Shipping/waybills/{Uri.EscapeDataString(normalizedPlatform)}/{Uri.EscapeDataString(orderId.Trim())}/file{query}";
        using var request = CreateOmsRequest(HttpMethod.Get, settings.Value, path);

        try
        {
            using var response = await _httpClientFactory.CreateClient().SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = Encoding.UTF8.GetString(content),
                    ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json",
                };
            }

            var fileName = response.Content.Headers.ContentDisposition?.FileNameStar ??
                           response.Content.Headers.ContentDisposition?.FileName ??
                           $"{orderId.Trim()}-waybill.pdf";
            return File(
                content,
                response.Content.Headers.ContentType?.ToString() ?? "application/pdf",
                fileName.Trim('"'));
        }
        catch (HttpRequestException)
        {
            return OmsUnavailable();
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return OmsTimeout();
        }
    }

    private async Task<IActionResult> ProxyOmsJsonAsync(
        HttpMethod method,
        string path,
        string? jsonBody,
        CancellationToken cancellationToken)
    {
        var settings = GetOmsSettings();
        if (settings == null)
            return OmsNotConfigured();

        using var request = CreateOmsRequest(method, settings.Value, path);
        if (jsonBody != null)
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        try
        {
            using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return new ContentResult
            {
                StatusCode = (int)response.StatusCode,
                Content = content,
                ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json",
            };
        }
        catch (HttpRequestException)
        {
            return OmsUnavailable();
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return OmsTimeout();
        }
    }

    private static bool TryNormalizePlatform(
        string platform,
        out string normalizedPlatform,
        out int platformCode)
    {
        normalizedPlatform = platform.Trim().ToLowerInvariant();
        platformCode = normalizedPlatform switch
        {
            "shopee" => 0,
            "lazada" => 1,
            "tiktok" => 2,
            _ => -1,
        };
        return platformCode >= 0;
    }

    private static (Uri BaseUri, string ApiKey)? GetOmsSettings()
    {
        var baseUrl = Environment.GetEnvironmentVariable("OMS_API_URL");
        var apiKey = Environment.GetEnvironmentVariable("OMS_API_KEY");
        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var omsBaseUri) ||
            (omsBaseUri.Scheme != Uri.UriSchemeHttp && omsBaseUri.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }

        return (new Uri(omsBaseUri.AbsoluteUri.TrimEnd('/') + "/"), apiKey);
    }

    private static HttpRequestMessage CreateOmsRequest(
        HttpMethod method,
        (Uri BaseUri, string ApiKey) settings,
        string path)
    {
        var request = new HttpRequestMessage(method, new Uri(settings.BaseUri, path));
        request.Headers.Add("X-Api-Key", settings.ApiKey);
        return request;
    }

    private ObjectResult OmsNotConfigured() => StatusCode(
        StatusCodes.Status503ServiceUnavailable,
        new { message = "OMS API is not configured on the server." });

    private ObjectResult OmsUnavailable() => StatusCode(
        StatusCodes.Status502BadGateway,
        new { message = "Could not reach OMS API." });

    private ObjectResult OmsTimeout() => StatusCode(
        StatusCodes.Status504GatewayTimeout,
        new { message = "OMS API request timed out." });
}
