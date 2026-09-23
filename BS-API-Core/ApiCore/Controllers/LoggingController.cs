using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ApiCore.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public partial class LoggingController : ControllerBase
    {
        private static readonly SemaphoreSlim LogWriteLock = new(1, 1);
        private static readonly HashSet<string> AllowedLevels = new(StringComparer.OrdinalIgnoreCase)
        {
            "debug",
            "info",
            "warn",
            "error"
        };

        [HttpPost("log")]
        public async Task<IActionResult> Log([FromBody] LogRequest request)
        {
            try
            {
                var serverNow = DateTimeOffset.Now;
                var level = NormalizeLevel(request.Level);
                var logDir = Path.Combine(AppContext.BaseDirectory, "Logs", serverNow.ToString("yyyy-MM"));
                Directory.CreateDirectory(logDir);

                var logFile = Path.Combine(logDir, $"{serverNow:yyyy-MM-dd}.log");
                var logEntry = JsonSerializer.Serialize(new
                {
                    server_timestamp = serverNow.ToString("O"),
                    client_timestamp = SanitizeText(request.Timestamp, 80),
                    level,
                    message = SanitizeText(request.Message, 4000),
                    stack = SanitizeText(request.Stack, 12000),
                    url = SanitizeText(request.Url, 2000),
                    user_agent = SanitizeText(request.UserAgent, 1000),
                    online = request.Online,
                    app_name = SanitizeText(request.AppName, 200),
                    environment = SanitizeText(request.Environment, 100),
                    details = request.Details
                }) + Environment.NewLine;

                await LogWriteLock.WaitAsync();
                try
                {
                    await System.IO.File.AppendAllTextAsync(logFile, logEntry);
                }
                finally
                {
                    LogWriteLock.Release();
                }

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error logging: {ex.Message}");
            }
        }

        private static string NormalizeLevel(string? level)
        {
            if (string.IsNullOrWhiteSpace(level)) return "error";
            var normalized = level.Trim().ToLowerInvariant();
            return AllowedLevels.Contains(normalized) ? normalized : "error";
        }

        private static string SanitizeText(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var sanitized = SensitiveValueRegex().Replace(value, "$1=[REDACTED]");
            return sanitized.Length > maxLength
                ? sanitized[..maxLength] + "...[TRUNCATED]"
                : sanitized;
        }

        [GeneratedRegex("(?i)(password|pass|token|access_token|refresh_token|authorization|secret|pin|otp)\\s*[:=]\\s*[^\\s,;]+")]
        private static partial Regex SensitiveValueRegex();
    }

    public class LogRequest
    {
        public string? Level { get; set; }
        public string? Message { get; set; }
        public string? Stack { get; set; }
        public string? Url { get; set; }
        public string? UserAgent { get; set; }
        public bool? Online { get; set; }
        public string? Timestamp { get; set; }
        public string? AppName { get; set; }
        public string? Environment { get; set; }
        public object? Details { get; set; }
    }
}
