using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Requests;
using Authentication.Models.Responses.Application;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Azure;
using Azure.Core;
using System.Data;
using System.Data.Common;
using TokenManagement.Database;

namespace Authentication.Services.Application
{
    public class ApplicationService : IApplication
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";

        public ApplicationService(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        public async Task<ApplicationResponse> RegisterApplication(ApplicationRequest request)
        {
            try
            {
                if (request == null)
                {
                    return new ApplicationResponse
                    {
                        message_code = "1",
                        message_text = "Invalid application request."
                    };
                }
                if (string.IsNullOrEmpty(request.application_name))
                {
                    return new ApplicationResponse
                    {
                        message_code = "1",
                        message_text = "Application name."
                    };
                }
                ApplicationResponse response = new ApplicationResponse();
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand($"{schema}.usp_insert_application", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    //encrypt
                    string encrypted_application_of_use = Encryption.Encrypt(request.application_of_use.ToString());
                    string encrypted_application_expire = Encryption.Encrypt(request.application_expire.ToString("yyyy-MM-dd"));
                    // applicaion_name , application_owner , application_expire, application_of_use ????????? license
                    string encrypted_application_license = Encryption.Encrypt($"{request.application_name},{request.application_owner}");

                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Name", request.application_name));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Description", request.application_description));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Of_Use", encrypted_application_of_use));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Owner", request.application_owner));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Contact", request.application_contact));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Email", request.application_email));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Expire", encrypted_application_expire));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_License_Key", encrypted_application_license));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_License_Type", request.license_type));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Create_By", "api_register"));

                    var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_Error_Code", DbType.String, 50);
                    var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_Error_Message", DbType.String, 500);

                    cmd.Parameters.Add(errorCodeParam);
                    cmd.Parameters.Add(errorMsgParam);

                    await conn.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();

                    string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                    string errorMessage = errorMsgParam.Value?.ToString() ?? "error";

                    response.message_code = errorCode;
                    response.message_text = errorMessage;
                }


                return response;
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("500", $"An error occurred while registering the application. \n {ex.Message}");

            }
        }

        public async Task<ApplicationResponse> UpdateApplicationLicense(ApplicationUpdateRequest request)
        {
            try
            {
                if (request == null)
                {
                    return new ApplicationResponse
                    {
                        message_code = "1",
                        message_text = "Invalid application request."
                    };
                }
                if (string.IsNullOrEmpty(request.license_key))
                {
                    return new ApplicationResponse
                    {
                        message_code = "1",
                        message_text = "Application contact."
                    };
                }
                ApplicationResponse response = new ApplicationResponse();
                using (var conn = _connectionFactory.CreateConnection())
                {
                    using (var cmd = _connectionFactory.CreateCommand($"{schema}.usp_update_application", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        //encrypt
                        string encrypted_application_of_use = Encryption.Encrypt(request.application_of_use.ToString());
                        string encrypted_application_expire = Encryption.Encrypt(request.application_expire.ToString("yyyy-MM-dd"));
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Of_Use", encrypted_application_of_use));
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Application_Expire", encrypted_application_expire));
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_License_Key", request.license_key));

                        var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_Error_Code", DbType.String, 50);
                        var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_Error_Message", DbType.String, 500);

                        cmd.Parameters.Add(errorCodeParam);
                        cmd.Parameters.Add(errorMsgParam);

                        await conn.OpenAsync();
                        await cmd.ExecuteNonQueryAsync();

                        string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                        string errorMessage = errorMsgParam.Value?.ToString() ?? "error";

                        response.message_code = errorCode;
                        response.message_text = errorMessage;
                    }
                }
                return response;

            }
            catch (Exception ex)
            {
                return CreateErrorResponse("500", $"An error occurred while updating the application. \n {ex.Message}");
            }
        }
        private static ApplicationResponse CreateErrorResponse(string code, string message)
        {
            return new ApplicationResponse { message_code = code, message_text = message };
        }

        public async Task<ApplicationListResponse> GetApplicationList()
        {
            ApplicationListResponse response = new ApplicationListResponse()
            {
                message_text = string.Empty,
                message_code = string.Empty
            };
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    using (var cmd = _connectionFactory.CreateCommand($"select * from {schema}.v_com_application", conn))
                    {
                        await conn.OpenAsync();
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            List<ApplicationData> applications = new List<ApplicationData>();

                            while (await reader.ReadAsync())
                            {
                                var application = new ApplicationData
                                {
                                    application_id = reader.GetInt32(reader.GetOrdinal("app_id")),
                                    application_name = reader.GetString(reader.GetOrdinal("application_name")) ?? "",
                                    application_of_use = int.TryParse(Encryption.Decrypt(reader.GetString(reader.GetOrdinal("application_of_use")) ?? "0"), out int ofUse) ? ofUse : 0,
                                    application_owner = reader.GetString(reader.GetOrdinal("application_owner")) ?? "",
                                    application_contact = reader.GetString(reader.GetOrdinal("application_contact")) ?? "",
                                    application_email = reader.GetString(reader.GetOrdinal("application_email")) ?? "",
                                    application_expire = DateOnly.TryParse(Encryption.Decrypt(reader.GetString(reader.GetOrdinal("application_expire")) ?? DateOnly.MinValue.ToString()), out DateOnly expireDate) ? expireDate : DateOnly.MinValue,
                                    application_license = reader.GetString(reader.GetOrdinal("license_key")) ?? "",
                                    create_date = reader.GetDateTime(reader.GetOrdinal("create_date")),
                                    update_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? null : reader.GetDateTime(reader.GetOrdinal("update_date"))
                                };
                                applications.Add(application);
                            }
                            response.message_code = "0";
                            response.message_text = "";
                            response.data = applications;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                response.message_code = "1";
                response.message_code = $"An error occurred while retrieving the application list. {ex.Message}";
            }
            return response;
        }

        public ApplicationResponse CheckApplicationExpire(VComApplication vComApplication)
        {
            ApplicationResponse response = new ApplicationResponse();
            try
            {
                if (vComApplication.application_expire < DateOnly.FromDateTime(DateTime.Now))
                {
                    response.message_code = "2";
                    response.message_text = "Application license has expired.";
                }
                else
                {
                    response.message_code = "0";
                    response.message_text = "Application license is valid.";
                }

            }
            catch (Exception ex)
            {
                response.message_code = "1";
                response.message_text = $"An error occurred while checking the application expire.\n {ex.Message}";
            }
            return response;
        }


        public async Task<VComApplication> GetApplicationByLicense(string license_key)
        {
            VComApplication vComApplication = new VComApplication();
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    using (var cmd = _connectionFactory.CreateCommand($"select * from sec.v_com_application WHERE license_key = @in_vch_License_Key ", conn))
                    {
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_License_Key", license_key));

                        await conn.OpenAsync();
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {

                            if (!await reader.ReadAsync())
                            {
                                return new VComApplication();
                            }
                            else
                            {
                                vComApplication.application_id = reader.GetInt32(reader.GetOrdinal("app_id"));
                                vComApplication.application_name = reader.IsDBNull(reader.GetOrdinal("application_name")) ? "" : reader.GetString(reader.GetOrdinal("application_name"));
                                vComApplication.application_description = reader.IsDBNull(reader.GetOrdinal("application_description")) ? "" : reader.GetString(reader.GetOrdinal("application_description"));
                                vComApplication.application_of_use = int.TryParse(Encryption.Decrypt(reader.IsDBNull(reader.GetOrdinal("application_of_use")) ? "0" : reader.GetString(reader.GetOrdinal("application_of_use"))), out int ofUse) ? ofUse : 0;
                                vComApplication.application_owner = reader.IsDBNull(reader.GetOrdinal("application_owner")) ? "" : reader.GetString(reader.GetOrdinal("application_owner"));
                                vComApplication.application_contact = reader.IsDBNull(reader.GetOrdinal("application_contact")) ? "" : reader.GetString(reader.GetOrdinal("application_contact"));
                                vComApplication.application_email = reader.IsDBNull(reader.GetOrdinal("application_email")) ? "" : reader.GetString(reader.GetOrdinal("application_email"));
                                vComApplication.application_expire = DateOnly.TryParse(Encryption.Decrypt(reader.IsDBNull(reader.GetOrdinal("application_expire")) ? DateOnly.MinValue.ToString() : reader.GetString(reader.GetOrdinal("application_expire"))), out DateOnly expireDate) ? expireDate : DateOnly.MinValue;
                                vComApplication.license_type = reader.IsDBNull(reader.GetOrdinal("license_type")) ? "" : reader.GetString(reader.GetOrdinal("license_type"));
                                vComApplication.license_date = reader.IsDBNull(reader.GetOrdinal("license_date")) ? DateTime.MinValue : reader.GetDateTime(reader.GetOrdinal("license_date"));
                                vComApplication.license_update_date = reader.IsDBNull(reader.GetOrdinal("license_update_date")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("license_update_date"));
                                vComApplication.license_key = reader.IsDBNull(reader.GetOrdinal("license_key")) ? "" : reader.GetString(reader.GetOrdinal("license_key"));
                                vComApplication.is_active = reader.IsDBNull(reader.GetOrdinal("is_active")) ? false : Convert.ToBoolean(reader.GetValue(reader.GetOrdinal("is_active")));
                                vComApplication.access_failed_count_limit = reader.IsDBNull(reader.GetOrdinal("access_failed_count_limit")) ? 0 : reader.GetInt32(reader.GetOrdinal("access_failed_count_limit"));
                                vComApplication.created_by = reader.IsDBNull(reader.GetOrdinal("create_by")) ? "" : reader.GetString(reader.GetOrdinal("create_by"));
                                vComApplication.created_date = reader.IsDBNull(reader.GetOrdinal("create_date")) ? DateTime.MinValue : reader.GetDateTime(reader.GetOrdinal("create_date"));
                                vComApplication.updated_by = reader.IsDBNull(reader.GetOrdinal("update_by")) ? "" : reader.GetString(reader.GetOrdinal("update_by"));
                                vComApplication.updated_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("update_date"));

                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                vComApplication = new VComApplication { application_description = ex.Message };
            }
            return vComApplication;
        }
    }
}
