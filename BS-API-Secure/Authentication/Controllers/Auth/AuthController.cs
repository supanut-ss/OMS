using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using TokenManagement.Handler;
using TokenManagement.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
namespace Authentication.Controllers.Auth
{
    [ApiController]
    [Route("/auth")]
    public class AuthController : ControllerResponse
    {
        private readonly IAuth _iauth;
        public AuthController(IAuth auth)
        {
            _iauth = auth ?? throw new ArgumentNullException(nameof(auth));

        }
        [HttpPost("login")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> Login(TokenRequest request)
        {
            try
            {
                return _iauth == null
                    ? ResponseUnauthorized("Authentication service is not available.")
                    : string.IsNullOrEmpty(request.usersname) || string.IsNullOrEmpty(request.password)
                        ? ResponseError("Username and password are required.", 2)
                        : await _iauth.GetTokenAsync(request.application_license, request.usersname, request.password,request.fcm_token) is AuthResponse token
                            ? AccessResponseSuccess("success", token)
                            : ResponseUnauthorized("Invalid username or password.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }

        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [HttpPost("logout")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> logout(LogoutRequest request)
        {
            var userId = User.FindFirst("UserId")?.Value;
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(request.refresh_token)) {
                return ResponseUnauthorized("Authentication service is not available.");
            }
            return _iauth == null
                    ? ResponseUnauthorized("Authentication service is not available.") :
                    await _iauth.EndRevoke(request.refresh_token, userId) is AuthResponse token
                            ? AccessResponseSuccess("success", token)
                            : ResponseUnauthorized("Invalid username or password.");
        }

        [HttpPost("refresh")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> RefreshToken(RefreshTokenRequest request)
        {
            try
            {
                return _iauth == null
                    ? ResponseUnauthorized("Authentication service is not available.")
                    : string.IsNullOrEmpty(request.refresh_token)
                        ? ResponseError("Username and password are required.", 2) :
                        await _iauth.RenewAccessTokenAsync(request.refresh_token) is AuthResponse token
                            ? AccessResponseSuccess("success", token)
                            : ResponseUnauthorized("Invalid refresh token.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }

    }
}
