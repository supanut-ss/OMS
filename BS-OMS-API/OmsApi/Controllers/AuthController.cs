using Microsoft.AspNetCore.Mvc;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace OmsApi.Controllers
{
    /// <summary>
    /// OAuth authentication endpoints for platform authorization
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IPlatformAuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly IHostEnvironment _environment;

        public AuthController(
            IPlatformAuthService authService,
            ILogger<AuthController> logger,
            IHostEnvironment environment)
        {
            _authService = authService;
            _logger = logger;
            _environment = environment;
        }

        /// <summary>
        /// Get OAuth authorization URL for a platform
        /// </summary>
        /// <param name="platform">Platform name: shopee, lazada, tiktok</param>
        /// <param name="platformAppShopId">Configured App Master and shop mapping identifier</param>
        /// <param name="cancellationToken">Request cancellation token</param>
        /// <returns>Redirect to platform OAuth page</returns>
        [HttpGet("{platform}/authorize")]
        [SwaggerOperation(Summary = "Redirect to platform OAuth authorization page")]
        [SwaggerResponse(302, "Redirect to OAuth page")]
        [SwaggerResponse(400, "Invalid platform")]
        public async Task<IActionResult> Authorize(string platform, [FromQuery] long platformAppShopId, CancellationToken cancellationToken)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var authUrl = await _authService.GetAuthorizationUrlAsync(platformType, platformAppShopId, cancellationToken);

                _logger.LogInformation("🔑 Redirecting to {Platform} OAuth: {Url}", platform, authUrl);
                return Redirect(authUrl);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Unable to create OAuth URL for {Platform}", platform);
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Get OAuth authorization URL without redirect (returns URL as string)
        /// </summary>
        [HttpGet("{platform}/auth-url")]
        [SwaggerOperation(Summary = "Get OAuth authorization URL")]
        public async Task<IActionResult> GetAuthUrl(string platform, [FromQuery] long platformAppShopId, CancellationToken cancellationToken)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var authUrl = await _authService.GetAuthorizationUrlAsync(platformType, platformAppShopId, cancellationToken);
                return Ok(ApiResponse<object>.Ok(new { url = authUrl }));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Unable to create OAuth URL for {Platform}", platform);
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// OAuth callback endpoint — receives authorization code from platform
        /// </summary>
        [HttpGet("{platform}/callback")]
        [SwaggerOperation(Summary = "Handle OAuth callback from platform")]
        public async Task<IActionResult> Callback(
            string platform,
            [FromQuery] string? code = null,
            [FromQuery] string? shop_id = null,
            [FromQuery] string? state = null,
            [FromQuery] string? error = null)
        {
            var connectorUrl = Environment.GetEnvironmentVariable("OMS_FRONTEND_CONNECTOR_URL")?.Trim();
            try
            {
                if (!string.IsNullOrWhiteSpace(error))
                    return OAuthResult(connectorUrl, platform, false);
                if (string.IsNullOrWhiteSpace(code))
                    return OAuthResult(connectorUrl, platform, false);

                var platformType = ParsePlatform(platform);
                await _authService.HandleCallbackAsync(platformType, code, shop_id, state);

                _logger.LogInformation("{Platform} OAuth authorization completed", platform);
                return OAuthResult(connectorUrl, platform, true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OAuth callback failed for {Platform}", platform);
                return OAuthResult(connectorUrl, platform, false);
            }
        }

        private IActionResult OAuthResult(string? connectorUrl, string platform, bool success)
        {
            if (!Uri.TryCreate(connectorUrl, UriKind.Absolute, out var target) ||
                (target.Scheme != Uri.UriSchemeHttps && !_environment.IsDevelopment()))
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { success = false, message = "OAuth return URL is not configured." });

            var builder = new UriBuilder(target);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(builder.Query);
            var values = query.ToDictionary(pair => pair.Key, pair => (string?)pair.Value.ToString());
            values["oauth"] = success ? "success" : "error";
            values["platform"] = platform.ToLowerInvariant();
            builder.Query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.AddQueryString("", values).TrimStart('?');
            return Redirect(builder.Uri.ToString());
        }

        /// <summary>
        /// Refresh an expired access token
        /// </summary>
        [HttpPost("{platform}/refresh")]
        [SwaggerOperation(Summary = "Refresh expired access token")]
        public async Task<IActionResult> RefreshToken(string platform, [FromBody] RefreshTokenRequest request)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var tokenInfo = await _authService.RefreshTokenAsync(platformType, request.RefreshToken, request.ShopId);

                return Ok(ApiResponse<TokenInfo>.Ok(tokenInfo, "Token refreshed successfully"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Token refresh error for {Platform}", platform);
                return BadRequest(ApiResponse<string>.Fail($"Refresh error: {ex.Message}"));
            }
        }

        /// <summary>บันทึก token จาก Platform Sandbox แบบเข้ารหัส (Development หรือ ST ที่เปิดใช้งาน)</summary>
        [HttpPost("sandbox-token")]
        [SwaggerOperation(Summary = "Import Platform Sandbox token (Development/ST only)")]
        [SwaggerResponse(200, "Sandbox credential encrypted and saved")]
        [SwaggerResponse(404, "Endpoint is disabled outside Development/ST")]
        public async Task<IActionResult> ImportSandboxToken([FromBody] SandboxTokenRequest request)
        {
            var sandboxImportEnabled = _environment.IsDevelopment() ||
                _environment.IsStaging() ||
                string.Equals(
                    Environment.GetEnvironmentVariable("OMS_ENABLE_SANDBOX_TOKEN_IMPORT")?.Trim(),
                    "YES",
                    StringComparison.OrdinalIgnoreCase);
            if (!sandboxImportEnabled)
                return NotFound();

            try
            {
                var platform = ParsePlatform(request.Platform);
                var tokenInfo = await _authService.ImportSandboxTokenAsync(platform, request);
                return Ok(ApiResponse<object>.Ok(new
                {
                    platform = platform.ToString(),
                    shopId = tokenInfo.ShopId,
                    environment = "SANDBOX",
                    expiresAt = tokenInfo.ExpiresAt,
                    refreshTokenSaved = !string.IsNullOrWhiteSpace(request.RefreshToken)
                }, $"{platform} Sandbox credential encrypted and saved"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        private static string BuildExceptionDetails(Exception exception)
        {
            var details = new List<string>();

            for (Exception? current = exception; current != null; current = current.InnerException)
            {
                var message = string.IsNullOrWhiteSpace(current.Message)
                    ? "(no message)"
                    : current.Message;

                details.Add($"{current.GetType().Name}: {message}");
            }

            return string.Join(" --> ", details);
        }

        private static PlatformType ParsePlatform(string platform)
        {
            return platform.ToLowerInvariant() switch
            {
                "shopee" => PlatformType.Shopee,
                "lazada" => PlatformType.Lazada,
                "tiktok" => PlatformType.TikTok,
                _ => throw new ArgumentException($"Invalid platform: '{platform}'. Supported: shopee, lazada, tiktok")
            };
        }
    }
}
