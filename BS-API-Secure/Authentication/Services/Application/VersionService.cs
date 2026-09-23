using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using TokenManagement.Database;

namespace Authentication.Services.Application
{
    public class VersionService : IVersionControl
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";

        public VersionService(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }
        public async Task<VersionControlResponse> GetVersionControlAsync(VersionControlRequest request)
        {
            VersionControlResponse response = new VersionControlResponse();
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                var sql = @$"  
               SELECT v.*
               FROM {schema}.t_com_version_control v
               INNER JOIN {schema}.t_com_application a ON a.app_id = v.app_id  
               WHERE v.version_control_name= @version_control_name AND a.is_active = @isActive AND a.license_key = @licenseKey";
                using (var cmd = _connectionFactory.CreateCommand(sql, conn))
                {
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@version_control_name", request.version_control_name));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@isActive", true));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@licenseKey", request.application_license));
                    using var reader = await cmd.ExecuteReaderAsync();

                    if (!await reader.ReadAsync())
                    {

                        response.message_code = "2";
                        response.message_text = "No version found.";
                    }
                    else
                    {
                        response.message_code = "0";
                        response.message_text = "Success";
                        response.version = reader["version_control_code"].ToString() ?? "";
                    }
                }
            }
            catch (Exception ex)
            {
                response.message_text = ex.Message;
                response.message_code = "1";
            }
            return response;
        }
    }
}
