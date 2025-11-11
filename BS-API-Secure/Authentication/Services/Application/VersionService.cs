using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Microsoft.Data.SqlClient;

namespace Authentication.Services.Application
{
    public class VersionService : IVersionControl
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        public async Task<VersionControlResponse> GetVersionControlAsync(VersionControlRequest request)
        {
          VersionControlResponse response = new VersionControlResponse();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                var sql = @$"  
               SELECT v.*
               FROM[{schema}].t_com_version_control v
               INNER JOIN [{schema}].t_com_application a ON a.app_id = v.app_id  
               WHERE v.version_control_name= @version_control_name AND a.is_active = 'YES' AND a.license_key = @licenseKey";
                using (var cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@version_control_name", request.version_control_name);
                    cmd.Parameters.AddWithValue("@licenseKey", request.application_license);
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
            catch (Exception ex) { 
                response.message_text = ex.Message;
                response.message_code = "1";
            }
            return response;
        }
    }
}
