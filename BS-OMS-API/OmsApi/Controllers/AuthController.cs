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
        /// <returns>Redirect to platform OAuth page</returns>
        [HttpGet("{platform}/authorize")]
        [SwaggerOperation(Summary = "Redirect to platform OAuth authorization page")]
        [SwaggerResponse(302, "Redirect to OAuth page")]
        [SwaggerResponse(400, "Invalid platform")]
        public IActionResult Authorize(string platform)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var authUrl = _authService.GetAuthorizationUrl(platformType);

                _logger.LogInformation("🔑 Redirecting to {Platform} OAuth: {Url}", platform, authUrl);
                return Redirect(authUrl);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Get OAuth authorization URL without redirect (returns URL as string)
        /// </summary>
        [HttpGet("{platform}/auth-url")]
        [SwaggerOperation(Summary = "Get OAuth authorization URL")]
        public IActionResult GetAuthUrl(string platform)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var authUrl = _authService.GetAuthorizationUrl(platformType);
                return Ok(ApiResponse<object>.Ok(new { url = authUrl }));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// OAuth callback endpoint — receives authorization code from platform
        /// </summary>
        [HttpGet("{platform}/callback")]
        [SwaggerOperation(Summary = "Handle OAuth callback from platform")]
        public async Task<IActionResult> Callback(string platform, [FromQuery] string code, [FromQuery] string? shop_id = null)
        {
            try
            {
                var platformType = ParsePlatform(platform);
                var tokenInfo = await _authService.HandleCallbackAsync(platformType, code, shop_id);

                _logger.LogInformation("✅ {Platform} OAuth success: token received", platform);
                return Ok(ApiResponse<TokenInfo>.Ok(tokenInfo, "Authorization successful"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ OAuth callback error for {Platform}", platform);
                return BadRequest(ApiResponse<string>.Fail($"OAuth error: {ex.Message}"));
            }
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
