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
    private readonly IConfiguration _configuration;

    public OmsOrdersController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
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

        var baseUrl = _configuration["OMS_API_URL"];
        var apiKey = _configuration["OMS_API_KEY"];
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
}
