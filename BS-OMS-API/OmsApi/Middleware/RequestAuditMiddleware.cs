using System.Data;
using System.Diagnostics;
using Microsoft.Data.SqlClient;

namespace OmsApi.Middleware;

/// <summary>Logs request metadata, without credentials, query strings or bodies.</summary>
public sealed class RequestAuditMiddleware(RequestDelegate next, ILogger<RequestAuditMiddleware> logger)
{
    internal const string AuthResultKey = "OmsAudit.AuthResult";
    internal const string ReasonKey = "OmsAudit.Reason";

    public async Task InvokeAsync(HttpContext context)
    {
        var started = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();
        var failed = false;
        try { await next(context); }
        catch { failed = true; throw; }
        finally
        {
            stopwatch.Stop();
            var route = (context.GetEndpoint() as Microsoft.AspNetCore.Routing.RouteEndpoint)?.RoutePattern.RawText ?? "unmatched";
            var status = failed ? StatusCodes.Status500InternalServerError : context.Response.StatusCode;
            logger.LogInformation("OMS request {Method} {Route} returned {StatusCode}; remote {RemoteAddress}; trace {TraceId}",
                context.Request.Method, route, status,
                context.Connection.RemoteIpAddress?.ToString(), context.TraceIdentifier);

            var connectionString = Environment.GetEnvironmentVariable("OMS_DB_CONNECTION_STRING");
            try
            {
                if (string.IsNullOrWhiteSpace(connectionString))
                    throw new InvalidOperationException("OMS_DB_CONNECTION_STRING is not configured.");
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                await using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync(timeout.Token);
                await using var command = connection.CreateCommand();
                command.CommandTimeout = 3;
                command.CommandText = @"INSERT INTO oms.t_oms_api_request_log
                    (request_time_utc, trace_id, client_ip, http_method, request_route, request_type,
                     auth_result, result_reason, http_status_code, duration_ms)
                    VALUES (@time, @trace, @ip, @method, @route, @type, @auth, @reason, @status, @duration)";
                command.Parameters.Add("@time", SqlDbType.DateTime2).Value = started;
                AddText(command, "@trace", SqlDbType.VarChar, 128, context.TraceIdentifier);
                AddText(command, "@ip", SqlDbType.VarChar, 45, context.Connection.RemoteIpAddress?.ToString());
                AddText(command, "@method", SqlDbType.VarChar, 10, context.Request.Method);
                AddText(command, "@route", SqlDbType.NVarChar, 500, route);
                var type = route.StartsWith("api/webhooks/", StringComparison.OrdinalIgnoreCase) ? "WEBHOOK"
                    : route.StartsWith("api/auth/", StringComparison.OrdinalIgnoreCase) && route.EndsWith("/callback", StringComparison.OrdinalIgnoreCase) ? "CALLBACK"
                    : "API";
                AddText(command, "@type", SqlDbType.VarChar, 32, type);
                AddText(command, "@auth", SqlDbType.VarChar, 32, context.Items[AuthResultKey] as string ?? "NOT_CHECKED");
                AddText(command, "@reason", SqlDbType.NVarChar, 500, context.Items[ReasonKey] as string);
                command.Parameters.Add("@status", SqlDbType.SmallInt).Value = (short)status;
                command.Parameters.Add("@duration", SqlDbType.BigInt).Value = stopwatch.ElapsedMilliseconds;
                await command.ExecuteNonQueryAsync(timeout.Token);
            }
            catch (Exception ex)
            {
                logger.LogWarning("Unable to persist request audit for trace {TraceId}: {ErrorType}", context.TraceIdentifier, ex.GetType().Name);
            }
        }
    }

    private static void AddText(SqlCommand command, string name, SqlDbType type, int length, string? value)
    {
        var parameter = command.Parameters.Add(name, type, length);
        parameter.Value = value == null ? DBNull.Value : value.Length > length ? value[..length] : value;
    }
}
