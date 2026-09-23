using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Azure;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Net.Mail;
using System.Transactions;
using TokenManagement.Database;

namespace Authentication.Services.Users
{
    public class UserService : IUsers
    {
        private readonly IAuth _auth;
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        public UserService(IAuth auth, IDbConnectionFactory connectionFactory)
        {
            _auth = auth;
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }


        public async Task<AuthResponse> ResetPassword(string userId, string newPassword)
        {
            try
            {
                var validationResponse = _auth.ValidatePassword(userId, newPassword);
                if (validationResponse.message_code != "0")
                    return validationResponse;
                // Update the password in the database  
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                var sql = $"UPDATE {schema}.t_com_user SET password = @password WHERE user_id = @userId";
                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@password", Encryption.Encrypt(newPassword)));

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

                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                // Check if user id already exists
                var checkSql = $"SELECT COUNT(1) FROM {schema}.t_com_user WHERE user_id = @userId";
                using (var checkCmd = _connectionFactory.CreateCommand(checkSql, conn))
                {
                    checkCmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userReq.UserId ?? string.Empty));
                    var existsObj = await checkCmd.ExecuteScalarAsync();
                    if (existsObj != null && Convert.ToInt32(existsObj) > 0)
                    {
                        return _auth.CreateErrorResponse("1", "User ID already exists.");
                    }
                }

                var sql = $" INSERT INTO {schema}.t_com_user " +
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
                      ", [is_active]" +
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

                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@user_id", userReq.UserId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@password", Encryption.Encrypt(userReq.Password)));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@user_group_id", userReq.UserGroupId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@first_name", userReq.FirstName));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@last_name", userReq.LastName));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@locale_id", userReq.LocaleId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@department", userReq.Department));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@supervisor", userReq.Supervisor));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@email_address", userReq.Email));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@domain", userReq.Domian));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@is_active", userReq.IsActive));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@create_by", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@create_date", DateTime.Now));

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

                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                // Check that the target user exists
                var checkSql = $"SELECT COUNT(1) FROM {schema}.t_com_user WHERE user_id = @userId";
                using (var checkCmd = _connectionFactory.CreateCommand(checkSql, conn))
                {
                    checkCmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userReq.UserId));
                    var existsObj = await checkCmd.ExecuteScalarAsync();
                    if (existsObj == null || Convert.ToInt32(existsObj) == 0)
                        return _auth.CreateErrorResponse("1", "User not found.");
                }

                // Build update statement; include password only if provided
                var sql = $"UPDATE {schema}.t_com_user SET " +
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

                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userReq.UserId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@user_group_id", userReq.UserGroupId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@first_name", userReq.FirstName ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@last_name", userReq.LastName ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@locale_id", userReq.LocaleId ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@department", userReq.Department ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@supervisor", userReq.Supervisor ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@email_address", userReq.Email ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@domain", userReq.Domian ?? string.Empty));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@is_active", userReq.IsActive));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@update_by", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@update_date", DateTime.Now));

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

        public async Task<AuthResponse> DeleteUser(string userIdDel, string userId)
        {
            try
            {
                if (userIdDel == null || string.IsNullOrWhiteSpace(userIdDel))
                    return _auth.CreateErrorResponse("1", "UserId is required for update.");

                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                // Check that the target user exists
                var checkSql = $"SELECT COUNT(1) FROM {schema}.t_com_user WHERE user_id = @userId";
                using (var checkCmd = _connectionFactory.CreateCommand(checkSql, conn))
                {
                    checkCmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userIdDel));
                    var existsObj = await checkCmd.ExecuteScalarAsync();
                    if (existsObj == null || Convert.ToInt32(existsObj) == 0)
                        return _auth.CreateErrorResponse("1", "User not found.");
                }

                // Build update statement; include password only if provided
                var sql = $"DELETE FROM {schema}.t_com_user";

                sql += " WHERE user_id = @userId";

                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userIdDel));

                //if (includePassword)
                //    cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(userReq.Password));

                var rowsAffected = await cmd.ExecuteNonQueryAsync();
                if (rowsAffected == 0)
                    return _auth.CreateErrorResponse("1", "Delete failed.");

                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "User Deleted successfully."
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
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                var sql = $"SELECT ug.name " +
                          $"FROM {schema}.t_com_user u " +
                          $"JOIN {schema}.t_com_user_group ug ON u.user_group_id = ug.user_group_id " +
                          $"WHERE u.user_id = @userId";
                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
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

        public async Task<UserLangResponse> UpdateLangAsync(UserLangRequest userReq, string userId)
        {
            UserLangResponse response = new UserLangResponse();
            try
            {
                if (string.IsNullOrEmpty(userReq.lang))
                {
                    response.message_code = "1";
                    response.message_text = "lang is required.";
                }
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                var sql = $"UPDATE {schema}.t_com_user SET locale_id = @locale_id WHERE user_id = @userId";
                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@locale_id", userReq.lang));
                await cmd.ExecuteNonQueryAsync();
                conn.Close();
                response.message_code = "0";
                response.message_text = "Success";
            }
            catch (Exception ex)
            {
                response.message_code = "1";
                response.message_text = $"An error occurred: {ex.Message}";
            }
            return response;
        }


        public async Task<MasterResponse> ClearLogOn(string userId)
        {
            var response = new MenuResponse
            {
                message_code = "0",
                message_text = "Success",
            };

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    //????????????? ?????????????? Check ???????????????? Insert ????????????????????
                    using var cmd = _connectionFactory.CreateCommand("sec.usp_clear_user_logon_token", conn);

                    cmd.CommandType = CommandType.StoredProcedure;

                    var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                    var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);

                    // You need to provide groupId and platform variables or get them from item
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));

                    cmd.Parameters.Add(errorCodeParam);
                    cmd.Parameters.Add(errorMsgParam);

                    await conn.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();

                    if (errorCodeParam.Value.ToString() != "0")
                    {
                        response.message_code = errorCodeParam.Value.ToString() ?? "1";
                        response.message_text = errorMsgParam.Value.ToString() ?? "1";
                    }

                    return response;
                }
            }
            catch (Exception ex)
            {
                response.message_code = "-1";
                response.message_text = "Exception : " + ex.Message;
                throw;
            }
        }
    }
}
