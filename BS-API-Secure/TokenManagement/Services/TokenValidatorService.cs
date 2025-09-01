using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Cryptography;
using TokenManagement.Interfaces;

namespace TokenManagement.Services
{
    public class TokenValidatorService : ITokenValidatorService
    {
        private readonly string _connectionString;

        public TokenValidatorService()
        {
            _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? "";
        }

        public async Task<string> GenerateRefreshToken(string userId, string accessToken)
        {
            return await GenerateUniqueRefreshTokenAsync(userId, accessToken);
        }

        public async Task<bool> IsAccessTokenValidAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            using var conn = new SqlConnection(_connectionString);
            using (var cmd = new SqlCommand("sec.usp_access_token_expire", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                // กำหนดพารามิเตอร์สำหรับ stored procedure

                cmd.Parameters.AddWithValue("@in_vchAccessToken", token);
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

                var outCode = cmd.Parameters["@out_vchErrorCode"].Value.ToString();
                var outMsg = cmd.Parameters["@out_vchErrorMessage"].Value.ToString();

                if (outCode == "0")
                {
                        // ถ้า token ไม่ valid → เรียก SP auto revoke refresh token
                        using var revokeCmd = new SqlCommand("sec.usp_auto_revoke_expired_refresh_token", conn);
                        revokeCmd.CommandType = System.Data.CommandType.StoredProcedure;

                        // เพิ่ม output parameters
                        revokeCmd.Parameters.Add("@out_vchErrorCode", System.Data.SqlDbType.NVarChar, 50)
                            .Direction = System.Data.ParameterDirection.Output;
                        revokeCmd.Parameters.Add("@out_vchErrorMessage", System.Data.SqlDbType.NVarChar, 500)
                            .Direction = System.Data.ParameterDirection.Output;
                        await revokeCmd.ExecuteNonQueryAsync();

                         outCode = revokeCmd.Parameters["@out_vchErrorCode"].Value.ToString();
                         outMsg = revokeCmd.Parameters["@out_vchErrorMessage"].Value.ToString();

                    return true;
                }
                else
                {
                    return false;
                }
                
            }
        }
        private async Task<string> GenerateUniqueRefreshTokenAsync(string userId, string accessToken)
        {
            string refreshToken;
            do
            {
                refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            }
            while (await RefreshTokenExists(userId,refreshToken, accessToken));

            return refreshToken;
        }

        private async Task<bool> RefreshTokenExists(string userId,string refreshToken, string accessToken)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                using (var cmd = new SqlCommand("sec.usp_refresh_token_expire", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    // กำหนดพารามิเตอร์สำหรับ stored procedure

                    cmd.Parameters.AddWithValue("@in_vchAccessToken", accessToken);
                    cmd.Parameters.AddWithValue("@in_vchRefreshToken", refreshToken);
                    cmd.Parameters.AddWithValue("@in_vchUserId", userId);
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
                    var outCode = cmd.Parameters["@out_vchErrorCode"].Value.ToString();
                    var outMsg = cmd.Parameters["@out_vchErrorMessage"].Value.ToString();
                    if (outCode == "0") {
                        return false;
                    }
                    else
                    {
                        return true;
                    }
                }
            }
        }
    }
}
