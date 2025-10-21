using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Net.Mail;

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


        public async Task<AuthResponse> RegisterUser(UserRequest userReq, string userId)
        {
            try
            {
                var validationResponse = _auth.ValidatePassword(userReq.UserId, userReq.Password);
                if (validationResponse.message_code != "0")
                    return validationResponse;

                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check if user id already exists
                var checkSql = $"SELECT COUNT(1) FROM [{schema}].t_com_user WHERE user_id = @userId";
                using (var checkCmd = new SqlCommand(checkSql, conn))
                {
                    checkCmd.Parameters.AddWithValue("@userId", userReq.UserId ?? string.Empty);
                    var existsObj = await checkCmd.ExecuteScalarAsync();
                    if (existsObj != null && Convert.ToInt32(existsObj) > 0)
                    {
                        return _auth.CreateErrorResponse("1", "User ID already exists.");
                    }
                }

                var sql = $" INSERT INTO [{schema}].t_com_user " +
                      "([user_id]" +
                      ", [user_group_id]" +
                      ", [first_name]" +
                      ", [last_name]" +
                      ", [password]" +
                      ", [locale_id]" +
                      ", [department]" +
                      ", [supervisor]" +
                      ", [email_address]" +
                      ", [domain]" +
                      ", [is_active]"+
                      ", [create_by]" +
                      ", [create_date])" +
                      "   VALUES  " +
                      "(@user_id" +
                      ",@user_group_id" +
                      ",@first_name" +
                      ",@last_name" +
                      ",@password" +
                      ",@locale_id" +
                      ",@department" +
                      ",@supervisor" +
                      ",@email_address" +
                      ",@domain" +
                      ",@is_active" + 
                      ",@create_by" +
                      ",@create_date) ";  

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@user_id", userReq.UserId);
                cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(userReq.Password));
                cmd.Parameters.AddWithValue("@user_group_id", userReq.UserGroupId);
                cmd.Parameters.AddWithValue("@first_name", userReq.FirstName);
                cmd.Parameters.AddWithValue("@last_name", userReq.LastName);
                cmd.Parameters.AddWithValue("@locale_id", userReq.LocaleId);
                cmd.Parameters.AddWithValue("@department", userReq.Department);
                cmd.Parameters.AddWithValue("@supervisor", userReq.Supervisor);
                cmd.Parameters.AddWithValue("@email_address", userReq.Email);
                cmd.Parameters.AddWithValue("@domain", userReq.Domian);
                cmd.Parameters.AddWithValue("@is_active", userReq.IsActive);
                cmd.Parameters.AddWithValue("@create_by", userId);
                cmd.Parameters.AddWithValue("@create_date", DateTime.Now);

                var rowsAffected = await cmd.ExecuteNonQueryAsync();
                if (rowsAffected == 0)
                    return _auth.CreateErrorResponse("1", "Insert failed.");

                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "Insert User Successfully."
                };
            }
            catch (Exception ex)
            {
                return _auth.CreateErrorResponse("1", $"An error occurred: {ex.Message}");
            }
         
        }

        public async Task<AuthResponse> UpdateUser(UserRequest userReq, string userId)
        {
            try
            {
                if (userReq == null || string.IsNullOrWhiteSpace(userReq.UserId))
                    return _auth.CreateErrorResponse("1", "UserId is required for update.");

                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check that the target user exists
                var checkSql = $"SELECT COUNT(1) FROM [{schema}].t_com_user WHERE user_id = @userId";
                using (var checkCmd = new SqlCommand(checkSql, conn))
                {
                    checkCmd.Parameters.AddWithValue("@userId", userReq.UserId);
                    var existsObj = await checkCmd.ExecuteScalarAsync();
                    if (existsObj == null || Convert.ToInt32(existsObj) == 0)
                        return _auth.CreateErrorResponse("1", "User not found.");
                }

                // Build update statement; include password only if provided
                var sql = $"UPDATE [{schema}].t_com_user SET " +
                          "user_group_id = @user_group_id, " +
                          "first_name = @first_name, " +
                          "last_name = @last_name, " +
                          "locale_id = @locale_id, " +
                          "department = @department, " +
                          "supervisor = @supervisor, " +
                          "email_address = @email_address, " +
                          "domain = @domain, " +
                          "is_active = @is_active, " +
                          "update_by = @update_by, " +
                          "update_date = @update_date";

                //var includePassword = !string.IsNullOrEmpty(userReq.Password);
                //if (includePassword)
                //    sql += ", password = @password";

                sql += " WHERE user_id = @userId";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@userId", userReq.UserId);
                cmd.Parameters.AddWithValue("@user_group_id", userReq.UserGroupId);
                cmd.Parameters.AddWithValue("@first_name", userReq.FirstName ?? string.Empty);
                cmd.Parameters.AddWithValue("@last_name", userReq.LastName ?? string.Empty);
                cmd.Parameters.AddWithValue("@locale_id", userReq.LocaleId ?? string.Empty);
                cmd.Parameters.AddWithValue("@department", userReq.Department ?? string.Empty);
                cmd.Parameters.AddWithValue("@supervisor", userReq.Supervisor ?? string.Empty);
                cmd.Parameters.AddWithValue("@email_address", userReq.Email ?? string.Empty);
                cmd.Parameters.AddWithValue("@domain", userReq.Domian ?? string.Empty);
                cmd.Parameters.AddWithValue("@is_active", userReq.IsActive ?? string.Empty);
                cmd.Parameters.AddWithValue("@update_by", userId);
                cmd.Parameters.AddWithValue("@update_date", DateTime.Now);

                //if (includePassword)
                //    cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(userReq.Password));

                var rowsAffected = await cmd.ExecuteNonQueryAsync();
                if (rowsAffected == 0)
                    return _auth.CreateErrorResponse("1", "Update failed.");

                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "User updated successfully."
                };
            }
            catch (Exception ex)
            {
                return _auth.CreateErrorResponse("1", $"An error occurred: {ex.Message}");
            }
        }

    }
}
