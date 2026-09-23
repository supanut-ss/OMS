using Authentication.Interfaces;
using Authentication.Models.Requests;
using TokenManagement.Database;

namespace Authentication.Services
{
    public class ActivityLogService : IActivityLog
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly IClientInfo _clientInfo;
        public ActivityLogService(IDbConnectionFactory connectionFactory, IClientInfo clientInfo)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }
        public async Task LogActivityAsync(ActivityLogRequest request, string username)
        {
            try
            {
                var clientIp = _clientInfo.GetClientIpAddress();
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateCommand(@"
            INSERT INTO sec.t_activity_log
            (user_id, action_type, page, entity, entity_id, method, url, status_code, description, client_ip)
            VALUES
            (@username, @action_type, @page, @entity, @entity_id, @method, @url, @status_code, @description, @client_ip)
        ", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@username", username ?? ""));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@action_type", request.ActionType ?? ""));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@page", request.Page ?? ""));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@entity", (object?)request.Entity ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@entity_id", (object?)request.EntityId ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@method", (object?)request.Method ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@url", (object?)request.Url ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@status_code", (object?)request.Status ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@description", (object?)request.Description ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@client_ip", clientIp ?? ""));

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
