using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Azure.Core;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Authentication.Services
{
    public class AliveService : IAlive
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly IClientInfo _clientInfo;
        public AliveService(IClientInfo clientInfo)
        {
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }
        public async Task<AliveUserResponse> GetAliveUser()
        {
            using (var conn = new SqlConnection(_connectionString)) {
                await conn.OpenAsync();
                using var cmd = new SqlCommand("sec.usp_get_user_alive", conn);
                
                    cmd.CommandType = CommandType.StoredProcedure;
                    using var reader = await cmd.ExecuteReaderAsync() ;
                var response = new AliveUserResponse
                {
                    message_code = "0",
                    message_text = "Success",
                    data = new List<AliveUserData>()
                };

                if (reader.HasRows)
                {
                    while (await reader.ReadAsync())
                    {
                        var data = new AliveUserData
                        {
                            user_id = reader["user_id"].ToString() ?? "",
                            first_name = reader["first_name"].ToString() ?? "",
                            last_name = reader["last_name"].ToString() ?? "",
                            device_info = reader["device_info"].ToString() ?? "",
                            ip_address = reader["ip_address"].ToString() ?? "",
                            last_alive_time = (DateTime)(reader["last_alive_time"] ?? DateTime.MinValue as DateTime?) ,
                            refresh_token_expiry = (DateTime)(reader["refresh_token_expiry"] ?? DateTime.MinValue as DateTime?),
                            status = reader["status"].ToString() ?? ""
                        };

                        response.data.Add(data);
                    }
                }

                return response;
            }
        }
        public async Task<MasterResponse> UpdateAliveUser(AliveUserRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.refresh_token))
            {
                throw new ArgumentException("Invalid request: refresh_token is required.");
            }
            using (var conn = new SqlConnection(_connectionString))
            {
                using var cmd = new SqlCommand("sec.usp_update_user_alive", conn);

                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@in_vchRefreshToken", request.refresh_token);
                cmd.Parameters.AddWithValue("@in_vchDeviceInfo", _clientInfo.GetClientDeviceInfo()); // Optional, can be set to empty string if not used
                cmd.Parameters.AddWithValue("@in_vchIpAddress", _clientInfo.GetClientIpAddress());
                cmd.Parameters.AddWithValue("@in_delLatitude", request.location?.latitude ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@in_delLongitude", request.location?.longitude ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@in_delAccuracy", request.location?.accuracy ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@in_bigTimestamp", request.location != null ? DateTimeOffset.FromUnixTimeMilliseconds(request.location.timestamp).DateTime : (object)DBNull.Value);
                var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var errorMsgParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };



                cmd.Parameters.Add(errorCodeParam);
                cmd.Parameters.Add(errorMsgParam);
                await conn.OpenAsync();
                await cmd.ExecuteNonQueryAsync();

                string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                string errorMessage = errorMsgParam.Value?.ToString() ?? "error";
                return new MasterResponse
                {
                    message_code = errorCode,
                    message_text = errorMessage
                };
            }
         }
    }
}
