using OmsApi.Models.Auth;
using OmsApi.Models.Common;

namespace OmsApi.Services.Interfaces
{
    /// <summary>
    /// Service for managing OAuth authentication with platforms
    /// </summary>
    public interface IPlatformAuthService
    {
        /// <summary>สร้าง OAuth authorization URL</summary>
        string GetAuthorizationUrl(PlatformType platform, string? state = null);

        /// <summary>แลก authorization code เป็น access token</summary>
        Task<TokenInfo> HandleCallbackAsync(PlatformType platform, string code, string? shopId = null);

        /// <summary>Refresh expired access token</summary>
        Task<TokenInfo> RefreshTokenAsync(PlatformType platform, string refreshToken, string? shopId = null);

        /// <summary>บันทึก Platform Sandbox token ที่ได้จาก Sandbox Console/Testing Tools</summary>
        Task<TokenInfo> ImportSandboxTokenAsync(PlatformType platform, SandboxTokenRequest request);
    }
}
