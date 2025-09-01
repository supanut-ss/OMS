using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;

namespace TokenManagement.Management.CustomsAuthentication
{
    public class CustomJwtAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly string _secretKey;
        private readonly string _validIssuer;
        private readonly string _validAudience;

        // ❌ ไม่ต้องใช้ ISystemClock แล้ว
        public CustomJwtAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
            _secretKey = Environment.GetEnvironmentVariable("ISSUER_SIGIN_KEY") ?? "";
            _validIssuer = Environment.GetEnvironmentVariable("VALID_ISSUER") ?? "";
            _validAudience = Environment.GetEnvironmentVariable("VALID_AUDIENCE") ?? "";
        }

        // ไม่มี await จริง ๆ → ไม่ต้อง async
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.ContainsKey("Authorization"))
                return Task.FromResult(AuthenticateResult.Fail("Missing Authorization Header"));

            var authHeader = Request.Headers["Authorization"].ToString();
            if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                return Task.FromResult(AuthenticateResult.Fail("Invalid Authorization Header"));

            var token = authHeader.Substring("Bearer ".Length).Trim();

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_secretKey);

            try
            {
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = !string.IsNullOrEmpty(_validIssuer),
                    ValidIssuer = _validIssuer,
                    ValidateAudience = !string.IsNullOrEmpty(_validAudience),
                    ValidAudience = _validAudience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, // ใช้ TimeProvider ได้ถ้าต้องการ
                };

                tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var claims = jwtToken.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();

                var identity = new ClaimsIdentity(claims, Scheme.Name);
                var principal = new ClaimsPrincipal(identity);
                var ticket = new AuthenticationTicket(principal, Scheme.Name);

                return Task.FromResult(AuthenticateResult.Success(ticket));
            }
            catch (SecurityTokenExpiredException)
            {
                Context.Items["AuthErrorMessage"] = "Token expired";
                return Task.FromResult(AuthenticateResult.Fail("Token expired"));
            }
            catch (Exception ex)
            {
                var msg = $"Invalid token: {ex.Message}";
                Logger.LogError(ex, msg);
                Context.Items["AuthErrorMessage"] = msg;
                return Task.FromResult(AuthenticateResult.Fail(msg));
            }
        }

        // อันนี้ยังต้อง async เพราะมี await อยู่
        protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
        {
            Response.StatusCode = 401;
            Response.ContentType = "application/json";

            var errorMessage = "Authentication failed";

            if (Context.Items.TryGetValue("AuthErrorMessage", out var value) && value is string msg)
            {
                errorMessage = msg;
            }

            var json = System.Text.Json.JsonSerializer.Serialize(new { error = errorMessage });
            await Response.WriteAsync(json);
        }
    }
}
