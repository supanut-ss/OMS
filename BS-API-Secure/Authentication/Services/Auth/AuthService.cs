using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Cryptography;
using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using TokenManagement.Handler;
using TokenManagement.Interfaces;
using Azure.Core;
using System.Collections.Generic;
using Sprache;
using Authentication.Models.Requests;
using System.Text.Json;
namespace Authentication.Services.Auth
{
    public class AuthService : IAuth
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly ITokenValidatorService _tokenValidatorService;

        private readonly JwtHelper _jwtHelper;
        private readonly IClientInfo _clientInfo;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        private readonly int accessFailureLimit = int.Parse(Environment.GetEnvironmentVariable("ACCESS_FAILURE_LIMIT") ?? "5");
        private readonly IApplication _application;
        public AuthService(ITokenValidatorService tokenValidator,IClientInfo clientInfo, JwtHelper jwtHelper,IApplication application)
        {
            _tokenValidatorService = tokenValidator ?? throw new ArgumentNullException(nameof(tokenValidator));
            _jwtHelper = jwtHelper;
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
            _application = application ?? throw new ArgumentNullException(nameof(application));
        }

        public async Task<AuthResponse> GetTokenAsync(string license, string username, string password,string fcm_token)
        {
            if (string.IsNullOrEmpty(license))
                return CreateErrorResponse("1", "License key cannot be null or empty.");
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return CreateErrorResponse("1", "Username and password cannot be null or empty.");
            // ตรวจสอบ license key
            var vComApplication = await _application.GetApplicationByLicense(license);
            if (vComApplication.application_id == 0)
            {
                return CreateErrorResponse("1", "Invalid license key."+ _connectionString);
            }
            var licenseCheck = _application.CheckApplicationExpire(vComApplication);
            if (licenseCheck.message_code != "0")
            {
                return CreateErrorResponse(licenseCheck.message_code, licenseCheck.message_text);
            }

            // เริ่มกระบวนการตรวจสอบผู้ใช้
            TComUser userinfo = await GetUserFromDatabase(username);
            if (userinfo == null)
            {
                return CreateErrorResponse("1", "Invalid username !!");
            }
            else
            {
                if (string.IsNullOrEmpty(userinfo.Domain))
                {
                    if (!AuthenticateWithDatabase(userinfo.Password, password))
                    {
                        return await HandleAccessFailure(vComApplication, username);
                    }
                }
                else
                {
                    if (!await AuthenticateWithAD(userinfo.Domain, 389, username, password))
                    {
                        return await HandleAccessFailure(vComApplication, username);
                    }

                }
                //check limit user login online ตาม license key
                bool isLimitReached = await IsLicenseLimitReached(vComApplication.license_key, userinfo.UserId, vComApplication.application_of_use);
                if (isLimitReached)
                {
                    return CreateErrorResponse("1", "License limit reached. Cannot login more users.");
                }
                // สร้าง JWT token และ refresh token
                //string role = userinfo.UserId == Encryption.Decrypt(Environment.GetEnvironmentVariable("USERNAME_ADMIN") ?? "") ? "SuperAdmin" : userinfo.UserGroupId.ToString() ?? "User";
                string role = userinfo.UserGroupId.ToString() ?? "unkonw";
                var token = _jwtHelper.GenerateToken(userinfo.UserId, role, userinfo.FirstName, userinfo.FirstName, userinfo.LastName, userinfo.Email, userinfo.LocaleId);
                var refresh = await _tokenValidatorService.GenerateRefreshToken(userinfo.UserId, token);

                // อัพเดต refresh token ในฐานข้อมูล
                AuthResponse updateResult = await UpdateRefreshToken(userinfo.UserId, token, refresh, "", 0);
                if (updateResult.message_code != "0")
                    return CreateErrorResponse(updateResult.message_code, updateResult.message_text);

                // ตรวจสอบว่าผู้ใช้ถูกล็อคหรือไม่
                if (userinfo.IsActive == false)
                {
                    return CreateErrorResponse("1", "User account is locked. Please contact support.");
                }
                if (userinfo.AccessFailedCount > 0)
                {
                    // อัพเดตจำนวนครั้งที่เข้าสู่ระบบล้มเหลวเป็น 0
                    var lockResponse = await LockUser(username, 0);
                    if (lockResponse.message_code != "0")
                        return lockResponse;
                }
                if (!string.IsNullOrEmpty(fcm_token))
                {
                    await UpdateFcmToken(userinfo.UserId, fcm_token);
                }
                else
                {
                    await UpdateFcmToken(userinfo.UserId, "");
                }
                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "Login successful.",
                    data = new AuthDataResponse
                    {
                        access_token = token,
                        refresh_token = refresh,
                    }
                };
            }
        }

        private async Task<string> UpdateFcmToken(string userId, string fcm_token)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                var sql = $"UPDATE [{schema}].t_com_user SET fcm_token = @fcm_token WHERE user_id = @userId";
                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@userId", userId);
                cmd.Parameters.AddWithValue("@fcm_token", fcm_token);
                await cmd.ExecuteNonQueryAsync();
                conn.Close();
                return "success";
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }
        private async Task<bool> IsLicenseLimitReached(string licenseKey, string userId, int application_of_use)
        {
            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            var sql = @$"  
               SELECT COUNT(r.token_id) AS ActiveUsers  
               FROM [{schema}].t_com_refresh_token r  
               INNER JOIN [{schema}].t_com_user u ON u.user_id = r.user_id
               INNER JOIN [{schema}].t_com_user_group g ON g.user_group_id = u.user_group_id  
               INNER JOIN [{schema}].t_com_application a ON a.app_id = g.app_id  
               WHERE r.user_id = @userId AND r.is_revoked = 'YES' AND a.license_key = @licenseKey";

            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@userId", userId);
            cmd.Parameters.AddWithValue("@licenseKey", licenseKey);

            object? v = await cmd.ExecuteScalarAsync();
            var activeUsers = v != null ? (int)v : 0;

            return activeUsers >= application_of_use;
        }

        private async Task<bool> AuthenticateWithAD(string domain,int port, string username, string password)
        {
            var ldapAuthService = new LdapAuthService();
            bool isAuth = await ldapAuthService.AuthenAD(domain,
                                                         port,
                                                         username, password);

            if (!isAuth) return false;

            return true;
        }

        private  bool AuthenticateWithDatabase(string encrypt_password, string password)
        {
            return Encryption.Decrypt(encrypt_password) == password;
        }

        private async Task<TComUser> GetUserFromDatabase(string username)
        {
            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            var sql = $"SELECT u.user_id , u.first_name , u.last_name , u.email_address , u.locale_id ,u.is_active,u.access_failed_count,u.user_group_id, u.domain , u.password FROM [{schema}].t_com_user u WHERE u.user_id = @userId AND u.is_active='YES'";
                

            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@userId", username);

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return new TComUser();

            return new TComUser
            {
                UserId = reader["user_id"].ToString() ?? "",
                FirstName = reader["first_name"].ToString() ?? "",
                LastName = reader["last_name"].ToString() ?? "",
                Email = reader["email_address"].ToString() ?? "",
                LocaleId = reader["locale_id"].ToString() ?? "",
                IsActive = reader["is_active"].ToString() == "YES",
                Domain = reader["domain"].ToString() ?? "",
                Password = reader["password"].ToString() ?? "",
                AccessFailedCount = reader["access_failed_count"] != DBNull.Value ? int.Parse(reader["access_failed_count"].ToString() ?? "0") : 0,
                UserGroupId = reader["user_group_id"] != DBNull.Value ? int.Parse(reader["user_group_id"].ToString() ?? "0") : 0
            };
        }

        public AuthResponse CreateErrorResponse(string code, string message)
        {
            return new AuthResponse { message_code = code, message_text = message };
        }

        public async Task<AuthResponse> UpdateRefreshToken(string userId, string accessToken, string refreshToken, string newRefreshToken, int revoked)
        {
            using (var conn = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand($"[{schema}].usp_refresh_token", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                // กำหนดพารามิเตอร์สำหรับ stored procedure
                // คำนวณเวลาหมดอายุ
                DateTime accessTokenExpiry = DateTime.Now.AddMinutes(int.Parse(Environment.GetEnvironmentVariable("EXPIRES") ?? "15"));
                DateTime refreshTokenExpiry = DateTime.Now.AddMinutes(int.Parse(Environment.GetEnvironmentVariable("REFRESH") ?? "60"));

                cmd.Parameters.AddWithValue("@in_vchUserID", userId);
                cmd.Parameters.AddWithValue("@in_vchAccessToken", accessToken);
                cmd.Parameters.AddWithValue("@in_vchRefreshToken", refreshToken);
                cmd.Parameters.AddWithValue("@in_vchNewRefreshToken", newRefreshToken);
                cmd.Parameters.AddWithValue("@in_dtAccessTokenExpiry", accessTokenExpiry);
                cmd.Parameters.AddWithValue("@in_dtRefreshTokenExpiry", refreshTokenExpiry);
                cmd.Parameters.AddWithValue("@in_bitRevokeOldToken", 0);
                cmd.Parameters.AddWithValue("@in_vchDeviceInfo", _clientInfo.GetClientDeviceInfo()); // Optional, can be set to empty string if not used
                cmd.Parameters.AddWithValue("@in_vchIpAddress", _clientInfo.GetClientIpAddress());

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

                return new AuthResponse { message_code = errorCode, message_text = errorMessage };
            }

        }

        public async Task<AuthResponse> RenewAccessTokenAsync(string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return CreateErrorResponse("1", "refresh token cannot be null or empty.");
            using var conn = new SqlConnection(_connectionString);

            await conn.OpenAsync();
            var sql = $"SELECT * FROM [{schema}].t_com_refresh_token r " +
                $"INNER JOIN [{schema}].t_com_user u ON u.user_id = r.user_id " +
                "WHERE refresh_token = @refreshToken AND is_revoked = 'YES'";

            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@refreshToken", refreshToken);

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return CreateErrorResponse("1", "refresh data cannot be null or empty.");

            var userinfo = new TComUser
            {
                UserId = reader["user_id"].ToString() ?? "",
                FirstName = reader["first_name"].ToString() ?? "",
                LastName = reader["last_name"].ToString() ?? "",
                Email = reader["email_address"].ToString() ?? "",
                LocaleId = reader["locale_id"].ToString() ?? "",
                IsActive = reader["is_active"].ToString() == "YES"
            };
            string role = userinfo.UserGroupId.ToString() ?? "unkonw";
            var token = _jwtHelper.GenerateToken(userinfo.UserId,role, userinfo.FirstName, userinfo.FirstName, userinfo.LastName, userinfo.Email, userinfo.LocaleId);
            var newRefreshToken = await _tokenValidatorService.GenerateRefreshToken(userinfo.UserId, token);
            var updateResult = await UpdateRefreshToken(userinfo.UserId, token, refreshToken, newRefreshToken, 1);
            if (updateResult.message_code != "0")
            {
                return CreateErrorResponse(updateResult.message_code, updateResult.message_text);
            }
            return new AuthResponse()
            {
                message_text = "Token renewed successfully.",
                message_code = "0",
                data = new AuthDataResponse { access_token = token, refresh_token = newRefreshToken }
            };
        }

        public async Task<AuthResponse> EndRevoke(string refresh_token, string user_id)
        {
            if (string.IsNullOrWhiteSpace(refresh_token))
                return CreateErrorResponse("1", "Refresh token cannot be null or empty.");

            if (string.IsNullOrWhiteSpace(user_id))
                return CreateErrorResponse("1", "User ID cannot be null or empty.");

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            var sql = @$"
                UPDATE [{schema}].t_com_refresh_token
                SET is_revoked = 'NO', revoked_date = @revokeDate , is_alive = 'NO'
                WHERE user_id = @user_id AND refresh_token = @refreshToken
                  AND is_revoked = 'YES'";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@user_id", user_id);
            cmd.Parameters.AddWithValue("@refreshToken", refresh_token);
            cmd.Parameters.AddWithValue("@revokeDate", DateTime.Now);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
                return CreateErrorResponse("1", "No matching refresh token found or already revoked.");
            await UpdateFcmToken(user_id, "");
            return new AuthResponse
            {
                message_code = "0",
                message_text = "Logout successfully."
            };
        }

        public async Task<AuthResponse> LockUser(string userId, int count)
        {
            return await UpdateLocked(userId,count);
        }
       

        public async Task<(AuthResponse response, int access_failed)> AddAccessFailed(string userId, bool u)
        {
            using (var conn = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand("[{schema}].usp_update_access_failed", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                // กำหนดพารามิเตอร์สำหรับ stored procedure

                cmd.Parameters.AddWithValue("@in_vchUserID", userId);
                cmd.Parameters.AddWithValue("@in_blUpdate", u);
                var accessFailed = new SqlParameter("@out_intAccessFailed", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var errorMsgParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };
                cmd.Parameters.Add(accessFailed);
                cmd.Parameters.Add(errorCodeParam);
                cmd.Parameters.Add(errorMsgParam);

                conn.Open();
                await cmd.ExecuteNonQueryAsync();
                int accessFailedCount = (int)(accessFailed.Value ?? 0);
                string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                string errorMessage = errorMsgParam.Value?.ToString() ?? "error";

                return (new AuthResponse { message_code = errorCode, message_text = errorMessage }, accessFailedCount);
            }
        }
        private async Task<AuthResponse> UpdateLocked(string userId, int count)
        {
            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            var sql = $"UPDATE [{schema}].t_com_user SET access_failed_count = @count WHERE user_id = @userId";
            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@userId", userId);
            cmd.Parameters.AddWithValue("@count", count);
            var rowsAffected = await cmd.ExecuteNonQueryAsync();
            if (rowsAffected == 0)
                return CreateErrorResponse("1", "User not found or already in the desired state.");
            return new AuthResponse
            {
                message_code = "0",
                message_text = count > 0 ? "User locked successfully." : "User unlocked successfully."
            };
        }

        private async Task<AuthResponse> HandleAccessFailure(VComApplication vComApplication, string username)
        {
            if (vComApplication.access_failed_count_limit > 0)
            {
                var (response, accessFailedCount) = await AddAccessFailed(username, true);
                if (response.message_code != "0")
                    return response;

                // Check if the failure count exceeds the limit  
                if (accessFailedCount >= accessFailureLimit)
                {
                    // Lock the user account if the limit is exceeded  
                    var lockResponse = await LockUser(username, accessFailureLimit);
                    if (lockResponse.message_code != "0")
                        return lockResponse;
                }
            }
            return CreateErrorResponse("1", "Invalid password !!");
        }

        // The ResetPassword method is incomplete and missing its implementation.  
        // Below is the completed implementation of the ResetPassword method,  
        // including the missing HasRepeatedCharacters method.  

        public AuthResponse ValidatePassword(string userId, string newPassword)
        {
            string wording = "Password policy must be at least 8 characters long, contain both uppercase and lowercase letters, include at least one number, and have a special character.";
            // Validate userId is not null or empty  
            if (string.IsNullOrWhiteSpace(userId))
              return CreateErrorResponse("1", wording);
            //  return CreateErrorResponse("1", "User ID cannot be null or empty.");

            // Validate newPassword meets minimum length requirement  
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password must be at least 8 characters long.");

            // Validate newPassword contains both letters and numbers  
            if (newPassword.All(char.IsLetter) || newPassword.All(char.IsDigit))
                return CreateErrorResponse("1", wording);
            //  return CreateErrorResponse("1", "New password must contain both letters and numbers.");

            // Validate newPassword does not contain whitespace  
            if (newPassword.Any(char.IsWhiteSpace))
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password cannot contain whitespace characters.");

            // Validate newPassword does not contain the userId  
            if (newPassword.Contains(userId, StringComparison.OrdinalIgnoreCase))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain the username.");

            // Validate newPassword does not contain the word 'password'  
            if (newPassword.Contains("password", StringComparison.OrdinalIgnoreCase))
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password cannot contain the word 'password'.");

            // Validate newPassword contains at least 4 unique characters  
            if (newPassword.Distinct().Count() < 4)
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password must contain at least 4 unique characters.");

            // Validate newPassword does not contain sequences of 3 or more consecutive characters  
            if (HasSequentialCharacters(newPassword, 3))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain sequences of 3 or more consecutive characters.");

            // Validate newPassword does not contain the same character repeated 3 or more times in a row  
            if (HasRepeatedCharacters(newPassword, 3))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain the same character repeated 3 or more times in a row.");

            return new AuthResponse { message_code = "0", message_text = "Password is valid." };
        }

        // Helper method to check for repeated characters in a string  
        private bool HasRepeatedCharacters(string input, int repeatCount)
        {
            if (string.IsNullOrEmpty(input) || repeatCount < 2)
                return false;

            for (int i = 0; i <= input.Length - repeatCount; i++)
            {
                bool isRepeated = true;

                for (int j = 1; j < repeatCount; j++)
                {
                    if (input[i + j] != input[i])
                    {
                        isRepeated = false;
                        break;
                    }
                }

                if (isRepeated)
                    return true;
            }

            return false;
        }

        private bool HasSequentialCharacters(string newPassword, int sequenceLength)
        {
            if (string.IsNullOrEmpty(newPassword) || sequenceLength < 2)
                return false;

            for (int i = 0; i <= newPassword.Length - sequenceLength; i++)
            {
                bool isSequential = true;

                for (int j = 1; j < sequenceLength; j++)
                {
                    if (newPassword[i + j] != newPassword[i] + j)
                    {
                        isSequential = false;
                        break;
                    }
                }

                if (isSequential)
                    return true;
            }
            return false;
        }

       
    }
}
