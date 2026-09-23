using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using TokenManagement.Database;
using TokenManagement.Handler;
using TokenManagement.Interfaces;
using Azure.Core;
using System.Collections.Generic;
using Sprache;
using Authentication.Models.Requests;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Data.SqlClient;
namespace Authentication.Services.Auth
{
    public class AuthService : IAuth
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly ITokenValidatorService _tokenValidatorService;

        private readonly JwtHelper _jwtHelper;
        private readonly IClientInfo _clientInfo;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        private readonly int accessFailureLimit = int.Parse(Environment.GetEnvironmentVariable("ACCESS_FAILURE_LIMIT") ?? "5");
        private readonly IApplication _application;
        public AuthService(IDbConnectionFactory connectionFactory, ITokenValidatorService tokenValidator, IClientInfo clientInfo, JwtHelper jwtHelper, IApplication application)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _tokenValidatorService = tokenValidator ?? throw new ArgumentNullException(nameof(tokenValidator));
            _jwtHelper = jwtHelper;
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
            _application = application ?? throw new ArgumentNullException(nameof(application));
        }

        public async Task<AuthResponse> GetTokenAsync(string license, string username, string password, string fcm_token, string platform)
        {
            if (string.IsNullOrEmpty(license))
                return CreateErrorResponse("1", "License key cannot be null or empty.");
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return CreateErrorResponse("1", "Username and password cannot be null or empty.");
            var normalizedPlatform = NormalizePlatform(platform);
            if (normalizedPlatform == null)
                return CreateErrorResponse("1", "Platform must be 'web' or 'mobile'.");

            // ตรวจสอบ license key
            var vComApplication = await _application.GetApplicationByLicense(license);
            if (vComApplication.application_id == 0)
            {
                return CreateErrorResponse("1", $"Invalid license key. [{vComApplication.application_description}]");
            }
            var licenseCheck = _application.CheckApplicationExpire(vComApplication);
            if (licenseCheck.message_code != "0")
            {
                return CreateErrorResponse(licenseCheck.message_code, licenseCheck.message_text);
            }

            TComUser? userinfo;
            try { userinfo = await GetUserFromDatabase(username); }
            catch (Exception ex) { return CreateErrorResponse("1", $"[GetUserFromDatabase] {ex.GetType().Name}: {ex.Message}"); }

            if (userinfo == null)
            {
                return CreateErrorResponse("1", "Invalid username !!");
            }
            else
            {
                if (string.IsNullOrEmpty(userinfo.Domain))
                {
                    bool authOk;
                    try { authOk = AuthenticateWithDatabase(userinfo.Password, password); }
                    catch (Exception ex) { return CreateErrorResponse("1", $"[AuthenticateWithDatabase] {ex.GetType().Name}: {ex.Message}"); }
                    if (!authOk)
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

                bool isLimitReached;
                try { isLimitReached = await IsLicenseLimitReached(vComApplication.license_key, userinfo.UserId, vComApplication.application_of_use); }
                catch (Exception ex) { return CreateErrorResponse("1", $"[IsLicenseLimitReached] {ex.GetType().Name}: {ex.Message}"); }
                if (isLimitReached)
                {
                    return CreateErrorResponse("1", "License limit reached. Cannot login more users.");
                }

                string role = userinfo.UserGroupId.ToString() ?? "unknown";
                string token;
                var (hasActiveSession, activeAccessToken, activeRefreshToken) = await HasActiveSession(userinfo.UserId, normalizedPlatform);
                if (!hasActiveSession && !string.IsNullOrEmpty(activeAccessToken) && !string.IsNullOrEmpty(activeRefreshToken))
                {
                    return CreateErrorResponse("1", "An active session already exists for this user on the same platform. Please logout from other sessions before logging in again.");
                }
                else if (hasActiveSession && !string.IsNullOrEmpty(activeAccessToken) && !string.IsNullOrEmpty(activeRefreshToken))
                {
                    return new AuthResponse
                    {
                        message_code = "0",
                        message_text = "Login successful. Active session found.",
                        data = new AuthDataResponse
                        {
                            access_token = activeAccessToken,
                            refresh_token = activeRefreshToken,
                        }
                    };
                }
                else
                {

                    var (accessTokenMinutes, refreshTokenMinutes) = ResolveTokenLifetime(normalizedPlatform);

                    try { token = _jwtHelper.GenerateToken(userinfo.UserId, role, userinfo.FirstName, userinfo.FirstName, userinfo.LastName, userinfo.Email, userinfo.LocaleId, accessTokenMinutes, normalizedPlatform); }
                    catch (Exception ex) { return CreateErrorResponse("1", $"[GenerateToken] {ex.GetType().Name}: {ex.Message}"); }

                    string refresh;
                    try { refresh = await _tokenValidatorService.GenerateRefreshToken(userinfo.UserId, token); }
                    catch (Exception ex) { return CreateErrorResponse("1", $"[GenerateRefreshToken] {ex.GetType().Name}: {ex.Message}"); }

                    // Persist the newly issued access and refresh tokens.
                    AuthResponse updateResult = await UpdateRefreshToken(userinfo.UserId, token, refresh, "", 0, accessTokenMinutes, refreshTokenMinutes);
                    if (updateResult.message_code != "0")
                        return CreateErrorResponse(updateResult.message_code, updateResult.message_text);

                    // Reject login if the account is already locked.
                    if (userinfo.IsActive == false)
                    {
                        return CreateErrorResponse("1", "User account is locked. Please contact support.");
                    }
                    if (userinfo.AccessFailedCount > 0)
                    {
                        // Reset the failed access counter after a successful login.
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
        }

        private async Task<string> UpdateFcmToken(string userId, string fcm_token)
        {
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                var sql = $"UPDATE {schema}.t_com_user SET fcm_token = @fcm_token WHERE user_id = @userId";
                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@fcm_token", fcm_token));
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
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @$"  
               SELECT COUNT(r.token_id) AS ActiveUsers  
               FROM {schema}.t_com_refresh_token r  
               INNER JOIN {schema}.t_com_user u ON u.user_id = r.user_id
               INNER JOIN {schema}.t_com_user_group g ON g.user_group_id = u.user_group_id  
               INNER JOIN {schema}.t_com_application a ON a.app_id = g.app_id  
               WHERE r.user_id = @userId AND r.is_revoked = 1 AND a.license_key = @licenseKey";

            using var cmd = _connectionFactory.CreateCommand(sql, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@licenseKey", licenseKey));

            object? v = await cmd.ExecuteScalarAsync();
            var activeUsers = v != null ? Convert.ToInt32(v) : 0;

            return activeUsers >= application_of_use;
        }

        private async Task<bool> AuthenticateWithAD(string domain, int port, string username, string password)
        {
            var ldapAuthService = new LdapAuthService();
            bool isAuth = await ldapAuthService.AuthenAD(domain,
                                                         port,
                                                         username, password);

            if (!isAuth) return false;

            return true;
        }

        private bool AuthenticateWithDatabase(string encrypt_password, string password)
        {
            try
            {
                return Encryption.Decrypt(encrypt_password) == password;
            }
            catch
            {
                // password in DB is not encrypted — compare directly
                return encrypt_password == password;
            }
        }

        private async Task<TComUser?> GetUserFromDatabase(string username)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = $"SELECT u.user_id , u.first_name , u.last_name , u.email_address , u.locale_id ,u.is_active,u.access_failed_count,u.user_group_id, u.domain , u.password FROM {schema}.t_com_user u WHERE u.user_id = @userId AND u.is_active = @isActive";


            using var cmd = _connectionFactory.CreateCommand(sql, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", username));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@isActive", true));

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new TComUser
            {
                UserId = reader["user_id"].ToString() ?? "",
                FirstName = reader["first_name"].ToString() ?? "",
                LastName = reader["last_name"].ToString() ?? "",
                Email = reader["email_address"].ToString() ?? "",
                LocaleId = reader["locale_id"].ToString() ?? "",
                IsActive = reader["is_active"] != DBNull.Value && Convert.ToBoolean(reader["is_active"]),
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

        public async Task<AuthResponse> UpdateRefreshToken(string userId, string accessToken, string refreshToken, string newRefreshToken, int revoked, int accessTokenMinutes, int refreshTokenMinutes)
        {
            using (var conn = _connectionFactory.CreateConnection())
            using (var cmd = _connectionFactory.CreateProcedureCommand($"{schema}.usp_refresh_token", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                // The stored procedure handles token persistence and rotation metadata.
                DateTime accessTokenExpiry = DateTime.Now.AddMinutes(accessTokenMinutes);
                DateTime refreshTokenExpiry = DateTime.Now.AddMinutes(refreshTokenMinutes);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_access_token", accessToken));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_refresh_token", refreshToken));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_new_refresh_token", newRefreshToken));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_access_token_expiry", accessTokenExpiry));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_refresh_token_expiry", refreshTokenExpiry));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_revoke_old_token", false));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device_info", _clientInfo.GetClientDeviceInfo()));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_ip_address", _clientInfo.GetClientIpAddress()));

                var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);

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

            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var transaction = conn.BeginTransaction();

            try
            {
                var sql = $@"
            SELECT TOP 1
                r.*,
                u.*
            FROM {schema}.t_com_refresh_token r WITH (UPDLOCK, ROWLOCK)
            INNER JOIN {schema}.t_com_user u
                ON u.user_id = r.user_id
            WHERE r.refresh_token = @refreshToken
                AND r.is_revoked = 1
                AND r.refresh_token_expiry > GETDATE()";

                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Transaction = transaction;
                cmd.Parameters.Add(
                    _connectionFactory.CreateParameter(
                        "@refreshToken",
                        refreshToken
                    )
                );
                var userinfo = new UserInfoResponse();
                string currentAccessToken = "";
                DateTime accessTokenExpiry = DateTime.MinValue;

                bool hasRefreshData;
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    hasRefreshData = await reader.ReadAsync();
                    if (hasRefreshData)
                    {
                        userinfo = new UserInfoResponse
                        {
                            UserId = reader["user_id"]?.ToString() ?? "",
                            FirstName = reader["first_name"]?.ToString() ?? "",
                            LastName = reader["last_name"]?.ToString() ?? "",
                            Email = reader["email_address"]?.ToString() ?? "",
                            LocaleId = reader["locale_id"]?.ToString() ?? "",
                            UserGroupId = reader["user_group_id"]?.ToString() ?? "",
                            IsActive =
                                reader["is_active"] != DBNull.Value &&
                                Convert.ToBoolean(reader["is_active"])
                        };

                        currentAccessToken =
                            reader["access_token"]?.ToString() ?? "";

                        accessTokenExpiry =
                            reader["access_token_expiry"] != DBNull.Value
                                ? Convert.ToDateTime(
                                    reader["access_token_expiry"]
                                )
                                : DateTime.MinValue;
                    }
                }

                if (!hasRefreshData)
                {
                    transaction.Rollback();
                    return CreateErrorResponse(
                        "1",
                        "refresh data cannot be null or empty."
                    );
                }

                // -------------------------------------------------
                // ถ้า Access Token ยังเหลืออายุ > 1 นาที
                // คืน Token เดิมเลย
                // Tab B,C,D จะได้ Token เดียวกับ Tab A
                // -------------------------------------------------

                if (accessTokenExpiry > DateTime.Now.AddMinutes(1))
                {
                    transaction.Commit();

                    return new AuthResponse
                    {
                        message_code = "0",
                        message_text = "Token already refreshed.",
                        data = new AuthDataResponse
                        {
                            access_token = currentAccessToken,
                            refresh_token = refreshToken
                        }
                    };
                }

                // -------------------------------------------------
                // Access Token หมดอายุจริง
                // สร้างใหม่
                // -------------------------------------------------

                var platform =
                    GetPlatformFromToken(currentAccessToken);

                var (
                    accessTokenMinutes,
                    refreshTokenMinutes
                ) = ResolveTokenLifetime(platform);

                string role =
                    string.IsNullOrWhiteSpace(userinfo.UserGroupId)
                        ? "unknown"
                        : userinfo.UserGroupId;

                var newAccessToken =
                    _jwtHelper.GenerateToken(
                        userinfo.UserId,
                        role,
                        userinfo.FirstName,
                        userinfo.FirstName,
                        userinfo.LastName,
                        userinfo.Email,
                        userinfo.LocaleId,
                        accessTokenMinutes,
                        platform
                    );

                var updateSql = $@"
            UPDATE {schema}.t_com_refresh_token
            SET
                access_token = @access_token,
                access_token_expiry = DATEADD(MINUTE,@access_minutes,GETDATE()),
                last_alive_time = GETDATE()
            WHERE refresh_token = @refresh_token";

                using var updateCmd =
                    _connectionFactory.CreateCommand(
                        updateSql,
                        conn
                    );

                updateCmd.Transaction = transaction;

                updateCmd.Parameters.Add(
                    _connectionFactory.CreateParameter(
                        "@access_token",
                        newAccessToken
                    )
                );

                updateCmd.Parameters.Add(
                    _connectionFactory.CreateParameter(
                        "@access_minutes",
                        accessTokenMinutes
                    )
                );

                updateCmd.Parameters.Add(
                    _connectionFactory.CreateParameter(
                        "@refresh_token",
                        refreshToken
                    )
                );

                await updateCmd.ExecuteNonQueryAsync();

                transaction.Commit();

                return new AuthResponse
                {
                    message_code = "0",
                    message_text = "Token renewed successfully.",
                    data = new AuthDataResponse
                    {
                        access_token = newAccessToken,
                        refresh_token = refreshToken
                    }
                };
            }
            catch (Exception ex)
            {
                try
                {
                    transaction.Rollback();
                }
                catch
                {
                }

                return CreateErrorResponse(
                    "1",
                    ex.Message
                );
            }
        }
        public async Task<AuthResponse> EndRevoke(string refresh_token, string user_id)
        {
            if (string.IsNullOrWhiteSpace(refresh_token))
                return CreateErrorResponse("1", "Refresh token cannot be null or empty.");

            if (string.IsNullOrWhiteSpace(user_id))
                return CreateErrorResponse("1", "User ID cannot be null or empty.");

            await using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @$"
                UPDATE {schema}.t_com_refresh_token
                SET is_revoked = 0, revoked_date = @revokeDate , is_alive = 0
                WHERE user_id = @user_id AND refresh_token = @refreshToken
                  AND is_revoked =1";

            await using var cmd = _connectionFactory.CreateCommand(sql, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@user_id", user_id));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@refreshToken", refresh_token));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@revokeDate", DateTime.Now));

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
            return await UpdateLocked(userId, count);
        }


        public async Task<(AuthResponse response, int access_failed)> AddAccessFailed(string userId, bool u)
        {
            using (var conn = _connectionFactory.CreateConnection())
            using (var cmd = _connectionFactory.CreateProcedureCommand($"{schema}.usp_update_access_failed", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                // The stored procedure increments and returns the failed access count.

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bl_update", u));
                var accessFailed = _connectionFactory.CreateOutputParameter("@out_int_access_failed", DbType.Int32);
                var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);
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
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = $"UPDATE {schema}.t_com_user SET access_failed_count = @count WHERE user_id = @userId";
            using var cmd = _connectionFactory.CreateCommand(sql, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@count", count));
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

                // Check whether the failure count reaches the configured limit.
                if (accessFailedCount >= accessFailureLimit)
                {
                    // Lock the user account when the limit is exceeded.
                    var lockResponse = await LockUser(username, accessFailureLimit);
                    if (lockResponse.message_code != "0")
                        return lockResponse;
                }
            }
            return CreateErrorResponse("1", "Invalid password !!");
        }

        // Validate password complexity before allowing password updates.

        public AuthResponse ValidatePassword(string userId, string newPassword)
        {
            string wording = "Password policy must be at least 8 characters long, contain both uppercase and lowercase letters, include at least one number, and have a special character.";
            // Validate userId is not null or empty.
            if (string.IsNullOrWhiteSpace(userId))
                return CreateErrorResponse("1", wording);
            //  return CreateErrorResponse("1", "User ID cannot be null or empty.");

            // Validate newPassword meets minimum length requirement.
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password must be at least 8 characters long.");

            // Validate newPassword contains both letters and numbers.
            if (newPassword.All(char.IsLetter) || newPassword.All(char.IsDigit))
                return CreateErrorResponse("1", wording);
            //  return CreateErrorResponse("1", "New password must contain both letters and numbers.");

            // Validate newPassword does not contain whitespace.
            if (newPassword.Any(char.IsWhiteSpace))
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password cannot contain whitespace characters.");

            // Validate newPassword does not contain the userId.
            if (newPassword.Contains(userId, StringComparison.OrdinalIgnoreCase))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain the username.");

            // Validate newPassword does not contain the word 'password'.
            if (newPassword.Contains("password", StringComparison.OrdinalIgnoreCase))
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password cannot contain the word 'password'.");

            // Validate newPassword contains at least 4 unique characters.
            if (newPassword.Distinct().Count() < 4)
                return CreateErrorResponse("1", wording);
            // return CreateErrorResponse("1", "New password must contain at least 4 unique characters.");

            // Validate newPassword does not contain sequences of 3 or more consecutive characters.
            if (HasSequentialCharacters(newPassword, 3))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain sequences of 3 or more consecutive characters.");

            // Validate newPassword does not contain the same character repeated 3 or more times in a row.
            if (HasRepeatedCharacters(newPassword, 3))
                return CreateErrorResponse("1", wording);
            //return CreateErrorResponse("1", "New password cannot contain the same character repeated 3 or more times in a row.");

            return new AuthResponse { message_code = "0", message_text = "Password is valid." };
        }

        // Helper method to check for repeated characters in a string.
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

        private static (int accessTokenMinutes, int refreshTokenMinutes) ResolveTokenLifetime(string platform)
        {
            return platform == "mobile"
                ? (30, 60)
                : (60, 120);
        }
        private static string? NormalizePlatform(string platform)
        {
            if (string.IsNullOrWhiteSpace(platform))
                return "web";

            var normalized = platform.Trim().ToLowerInvariant();
            if (normalized is "web" or "mobile")
                return normalized;

            return null;
        }

        private string GetPlatformFromToken(string accessToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return "web";

            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadJwtToken(accessToken);
                var platform = jwtToken.Claims.FirstOrDefault(c => c.Type == "Platform")?.Value;
                var normalizedPlatform = NormalizePlatform(platform ?? "web");
                return normalizedPlatform ?? "web";
            }
            catch
            {
                return "web";
            }
        }
        private async Task<(bool, string, string)> HasActiveSession(string userId, string platform)
        {
            var normalizedPlatform = NormalizePlatform(platform) ?? "web";

            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @$"
                SELECT 
                access_token
                ,refresh_token
                FROM {schema}.t_com_refresh_token
                WHERE user_id = @userId
                  AND is_revoked = 1
                  AND refresh_token_expiry > @now";

            using var cmd = _connectionFactory.CreateCommand(sql, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@userId", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@now", DateTime.Now));

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var activeAccessToken = reader["access_token"]?.ToString() ?? string.Empty;
                var activeRefreshToken = reader["refresh_token"]?.ToString() ?? string.Empty;
                if (GetPlatformFromToken(activeAccessToken) == normalizedPlatform && !string.IsNullOrEmpty(activeAccessToken) && !string.IsNullOrEmpty(activeRefreshToken))
                {
                    return (true, activeAccessToken, activeRefreshToken);
                }
                else if (GetPlatformFromToken(activeAccessToken) == normalizedPlatform)
                {
                    // If there's an active session with missing tokens, treat it as no active session to allow new login.
                    return (false, string.Empty, string.Empty);
                }
            }

            return (false, string.Empty, string.Empty);
        }

    }
}
