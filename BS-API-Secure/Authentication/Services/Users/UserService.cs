using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Authentication.Services.Users
{
    public class UserService: IUsers
    {
        private readonly IAuth _auth;
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        public UserService(IAuth auth) {
            _auth = auth;
        }
        public async Task<AuthResponse> ResetPassword(string userId, string newPassword)
        {
            try
            {
                var validationResponse = _auth.ValidatePassword(userId, newPassword);
                if (validationResponse.message_code != "0")
                    return validationResponse;
                // Update the password in the database  
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = $"UPDATE [{schema}].t_com_user SET password = @password WHERE user_id = @userId";
                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@userId", userId);
                cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(newPassword));

                var rowsAffected = await cmd.ExecuteNonQueryAsync();

                if (rowsAffected == 0)
                    return _auth.CreateErrorResponse("1", "User not found or password update failed.");

                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "Password reset successfully."
                };
            }
            catch (Exception ex)
            {
                return _auth.CreateErrorResponse("1", $"An error occurred: {ex.Message}");
            }
        }
       
    }
}
