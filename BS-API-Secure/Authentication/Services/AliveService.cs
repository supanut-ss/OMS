using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Azure.Core;
using System.Data;
using System.Data.Common;
using TokenManagement.Database;

namespace Authentication.Services
{
    public class AliveService : IAlive
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly IClientInfo _clientInfo;
        public AliveService(IDbConnectionFactory connectionFactory, IClientInfo clientInfo)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }
        public async Task<AliveUserResponse> GetAliveUser()
        {
            using (var conn = _connectionFactory.CreateConnection()) {
                await conn.OpenAsync();
                using var cmd = _connectionFactory.CreateCommand("sec.usp_get_user_alive", conn);
                
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
            using (var conn = _connectionFactory.CreateConnection())
            {
                using var cmd = _connectionFactory.CreateCommand("sec.usp_update_user_alive", conn);

                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_refresh_token", request.refresh_token));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device_info", _clientInfo.GetClientDeviceInfo())); // Optional, can be set to empty string if not used
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_ip_address", _clientInfo.GetClientIpAddress()));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_del_latitude", request.location?.latitude ?? (object)DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_del_longitude", request.location?.longitude ?? (object)DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_del_accuracy", request.location?.accuracy ?? (object)DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_big_timestamp", request.location != null ? DateTimeOffset.FromUnixTimeMilliseconds(request.location.timestamp).DateTime : (object)DBNull.Value));
                var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);



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
