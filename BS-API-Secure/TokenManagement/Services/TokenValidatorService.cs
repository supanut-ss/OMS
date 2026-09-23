using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using TokenManagement.Database;
using TokenManagement.Interfaces;

namespace TokenManagement.Services
{
    public class TokenValidatorService : ITokenValidatorService
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public TokenValidatorService(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        public async Task<string> GenerateRefreshToken(string userId, string accessToken)
        {
            return await GenerateUniqueRefreshTokenAsync(userId, accessToken);
        }

        public async Task<bool> IsAccessTokenValidAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using (var cmd = _connectionFactory.CreateProcedureCommand("sec.usp_access_token_expire", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_access_token", token));
                var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);
                cmd.Parameters.Add(errorCodeParam);
                cmd.Parameters.Add(errorMsgParam);
                await cmd.ExecuteNonQueryAsync();

                var outCode = errorCodeParam.Value?.ToString();

                if (outCode == "0")
                {
                    // token valid → auto-revoke expired refresh tokens
                    using var revokeCmd = _connectionFactory.CreateProcedureCommand("sec.usp_auto_revoke_expired_refresh_token", conn);
                    revokeCmd.CommandType = CommandType.StoredProcedure;

                    var revokeErrorCode = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                    var revokeErrorMsg = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);
                    revokeCmd.Parameters.Add(revokeErrorCode);
                    revokeCmd.Parameters.Add(revokeErrorMsg);
                    await revokeCmd.ExecuteNonQueryAsync();

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
            while (await RefreshTokenExists(userId, refreshToken, accessToken));

            return refreshToken;
        }

        private async Task<bool> RefreshTokenExists(string userId, string refreshToken, string accessToken)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var cmd = _connectionFactory.CreateProcedureCommand("sec.usp_refresh_token_expire", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_access_token", accessToken));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_refresh_token", refreshToken));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
            var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);
            cmd.Parameters.Add(errorCodeParam);
            cmd.Parameters.Add(errorMsgParam);
            await cmd.ExecuteNonQueryAsync();
            return errorCodeParam.Value?.ToString() == "1";
        }
    }
}
