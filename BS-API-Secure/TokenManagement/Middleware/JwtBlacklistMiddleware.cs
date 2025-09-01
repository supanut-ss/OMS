
using Microsoft.AspNetCore.Http;
using TokenManagement.Interfaces;

namespace TokenManagement.Middleware
{
    public class JwtBlacklistMiddleware
    {
        private readonly RequestDelegate _next;

        public JwtBlacklistMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, ITokenValidatorService tokenValidator)
        {
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            var token = authHeader?.StartsWith("Bearer ") == true
                ? authHeader.Substring("Bearer ".Length).Trim()
                : null;
            // If there's no token, just continue to the next middleware
            if (!string.IsNullOrEmpty(token))
            {
                bool isValid = await tokenValidator.IsAccessTokenValidAsync(token);
                if (!isValid)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Items["AuthErrorMessage"] = "Access token is revoked or expired";
                    context.Response.ContentType = "application/json";

                    var errorMessage = "Authentication failed";

                    if (context.Items.TryGetValue("AuthErrorMessage", out var value) && value is string msg)
                    {
                        errorMessage = msg;
                    }

                    var json = System.Text.Json.JsonSerializer.Serialize(new { error = errorMessage });
                    await context.Response.WriteAsync(json);
                    return;
                }
            }

            await _next(context);
        }
    }
}
