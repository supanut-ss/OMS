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
                var validationResponse = _auth.ValidatePassword(userReq.user_id, userReq.password);
                if (validationResponse.message_code != "0")
                    return validationResponse;

                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check if user id already exists
                var checkSql = $"SELECT COUNT(1) FROM [{schema}].t_com_user WHERE user_id = @userId";
                using (var checkCmd = new SqlCommand(checkSql, conn))
                {
                    checkCmd.Parameters.AddWithValue("@userId", userReq.user_id ?? string.Empty);
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
                cmd.Parameters.AddWithValue("@user_id", userReq.user_id);
                cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(userReq.password));
                cmd.Parameters.AddWithValue("@user_group_id", userReq.user_group_id);
                cmd.Parameters.AddWithValue("@first_name", userReq.first_name);
                cmd.Parameters.AddWithValue("@last_name", userReq.last_name);
                cmd.Parameters.AddWithValue("@locale_id", userReq.locale_id);
                cmd.Parameters.AddWithValue("@department", userReq.department);
                cmd.Parameters.AddWithValue("@supervisor", userReq.supervisor);
                cmd.Parameters.AddWithValue("@email_address", userReq.email_address);
                cmd.Parameters.AddWithValue("@domain", userReq.department);
                cmd.Parameters.AddWithValue("@is_active", userReq.is_active);
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
                if (userReq == null || string.IsNullOrWhiteSpace(userReq.user_id))
                    return _auth.CreateErrorResponse("1", "UserId is required for update.");

                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check that the target user exists
                var checkSql = $"SELECT COUNT(1) FROM [{schema}].t_com_user WHERE user_id = @userId";
                using (var checkCmd = new SqlCommand(checkSql, conn))
                {
                    checkCmd.Parameters.AddWithValue("@userId", userReq.user_id);
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

                var includePassword = !string.IsNullOrEmpty(userReq.password);
                if (includePassword)
                    sql += ", password = @password";

                sql += " WHERE user_id = @userId";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@userId", userReq.user_id);
                cmd.Parameters.AddWithValue("@user_group_id", userReq.user_group_id);
                cmd.Parameters.AddWithValue("@first_name", userReq.first_name ?? string.Empty);
                cmd.Parameters.AddWithValue("@last_name", userReq.last_name ?? string.Empty);
                cmd.Parameters.AddWithValue("@locale_id", userReq.last_name ?? string.Empty);
                cmd.Parameters.AddWithValue("@department", userReq.department ?? string.Empty);
                cmd.Parameters.AddWithValue("@supervisor", userReq.supervisor ?? string.Empty);
                cmd.Parameters.AddWithValue("@email_address", userReq.email_address ?? string.Empty);
                cmd.Parameters.AddWithValue("@domain", userReq.domain ?? string.Empty);
                cmd.Parameters.AddWithValue("@is_active", userReq.is_active ?? string.Empty);
                cmd.Parameters.AddWithValue("@update_by", userId);
                cmd.Parameters.AddWithValue("@update_date", DateTime.Now);

                if (includePassword)
                    cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(userReq.password));

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

        public async Task<RoleResponse> GetRole(string userId)
        {
            RoleResponse response = new RoleResponse();
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    response.message_code = "1";
                    response.message_text = "UserId is required.";
                    return response;
                }
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                var sql = $"SELECT ug.name " +
                          $"FROM [{schema}].t_com_user u " +
                          $"JOIN [{schema}].t_com_user_group ug ON u.user_group_id = ug.user_group_id " +
                          $"WHERE u.user_id = @userId";
                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@userId", userId);
                var roleObj = await cmd.ExecuteScalarAsync();
                if (roleObj != null)
                {
                    response.message_code = "0";
                    response.message_text = "Role retrieved successfully.";
                    response.role = roleObj.ToString();
                }
                else
                {
                    response.message_code = "1";
                    response.message_text = "User not found or role not assigned.";
                }
            }
            catch (Exception ex)
            { 
                response.message_code = "1";
                response.message_text = $"An error occurred: {ex.Message}";
            }
            return response;
         }
    }
}
