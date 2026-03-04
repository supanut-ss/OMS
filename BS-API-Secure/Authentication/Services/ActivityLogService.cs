using Authentication.Interfaces;
using Authentication.Models.Requests;
using Microsoft.Data.SqlClient;

namespace Authentication.Services
{
    public class ActivityLogService : IActivityLog
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly IClientInfo _clientInfo;
        public ActivityLogService(IClientInfo clientInfo)
        {
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }
        public async Task LogActivityAsync(ActivityLogRequest request, string username)
        {
            try
            {
                var clientIp = _clientInfo.GetClientIpAddress();
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(@"
            INSERT INTO sec.t_activity_log
            (user_id, action_type, page, entity, entity_id, method, url, status_code, description, client_ip)
            VALUES
            (@username, @action_type, @page, @entity, @entity_id, @method, @url, @status_code, @description, @client_ip)
        ", conn);

                cmd.Parameters.AddWithValue("@username", username ?? "");
                cmd.Parameters.AddWithValue("@action_type", request.ActionType ?? "");
                cmd.Parameters.AddWithValue("@page", request.Page ?? "");
                cmd.Parameters.AddWithValue("@entity", (object?)request.Entity ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@entity_id", (object?)request.EntityId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@method", (object?)request.Method ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@url", (object?)request.Url ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@status_code", (object?)request.Status ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@client_ip", clientIp ?? "");

                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                // Log the exception (you can use a logging framework here)
                Console.Error.WriteLine($"Error logging activity: {ex.Message}");
            }
        }
    }
}
