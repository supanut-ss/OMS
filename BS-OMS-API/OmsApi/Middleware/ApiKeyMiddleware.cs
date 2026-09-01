namespace OmsApi.Middleware
{
    /// <summary>
    /// Middleware ตรวจสอบ API Key จาก header X-Api-Key
    /// ตั้งค่า OMS_API_KEY ใน environment variables เพื่อเปิดใช้งาน
    /// ถ้าไม่ได้ตั้งค่า OMS_API_KEY จะอนุญาตทุก request (dev mode)
    /// </summary>
    public class ApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private const string ApiKeyHeader = "X-Api-Key";

        public ApiKeyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Skip Swagger UI and OpenAPI spec paths
            var path = context.Request.Path.Value ?? string.Empty;
            if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase) ||
                IsOAuthBrowserPath(path))
            {
                await _next(context);
                return;
            }

            var requiredKey = Environment.GetEnvironmentVariable("OMS_API_KEY");

            // No API key configured → dev mode, allow all
            if (string.IsNullOrWhiteSpace(requiredKey))
            {
                await _next(context);
                return;
            }

            if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var providedKey) ||
                !string.Equals(providedKey, requiredKey, StringComparison.Ordinal))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"message\":\"Unauthorized: Invalid or missing API key. Include 'X-Api-Key' header.\"}");
                return;
            }

            await _next(context);
        }

        private static bool IsOAuthBrowserPath(string path)
        {
            if (!path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase))
                return false;
            return path.EndsWith("/authorize", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/auth-url", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/callback", StringComparison.OrdinalIgnoreCase);
        }
    }
}
