using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Requests;
using Authentication.Models.Responses.Application;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Azure;
using Azure.Core;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Authentication.Services.Application
{
    public class ApplicationService: IApplication
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";

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
                using (var conn = new SqlConnection(_connectionString))
                using (var cmd = new SqlCommand($"[{schema}].usp_insert_application", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    //encrypt
                    string encrypted_application_of_use = Encryption.Encrypt(request.application_of_use.ToString());
                    string encrypted_application_expire = Encryption.Encrypt(request.application_expire.ToString("yyyy-MM-dd"));
                    // applicaion_name , application_owner , application_expire, application_of_use ออกมาเป็น license
                    string encrypted_application_license = Encryption.Encrypt($"{request.application_name},{request.application_owner}");

                    cmd.Parameters.AddWithValue("@in_vchApplicationName", request.application_name);
                    cmd.Parameters.AddWithValue("@in_vchApplicatioDescription", request.application_description);
                    cmd.Parameters.AddWithValue("@in_vchApplicationOfUse", encrypted_application_of_use);
                    cmd.Parameters.AddWithValue("@in_vchApplicationOwner", request.application_owner);
                    cmd.Parameters.AddWithValue("@in_vchApplicationContact", request.application_contact);
                    cmd.Parameters.AddWithValue("@in_vchApplicationEmail", request.application_email);
                    cmd.Parameters.AddWithValue("@in_vchApplicationExpire", encrypted_application_expire);
                    cmd.Parameters.AddWithValue("@in_vchLicenseKey", encrypted_application_license);
                    cmd.Parameters.AddWithValue("@in_vchCreateBy", "api_register");

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
                if(string.IsNullOrEmpty(request.license_key))
                {
                    return new ApplicationResponse
                    {
                        message_code = "1",
                        message_text = "Application contact."
                    };
                }
                ApplicationResponse response = new ApplicationResponse();
                using (var conn = new SqlConnection(_connectionString)) {
                    using (var cmd = new SqlCommand($"[{schema}].usp_update_application", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        //encrypt
                        string encrypted_application_of_use = Encryption.Encrypt(request.application_of_use.ToString());
                        string encrypted_application_expire = Encryption.Encrypt(request.application_expire.ToString("yyyy-MM-dd"));
                        cmd.Parameters.AddWithValue("@in_vchApplicationOfUse", encrypted_application_of_use);
                        cmd.Parameters.AddWithValue("@in_vchApplicationExpire", encrypted_application_expire);
                        cmd.Parameters.AddWithValue("@in_vchLicenseKey", request.license_key);

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
            ApplicationListResponse response = new ApplicationListResponse() {
                message_text = string.Empty,
                message_code = string.Empty
            };
            try {
                using (var conn = new SqlConnection(_connectionString)) { 
                    using(var cmd = new SqlCommand($"select * from [{schema}].v_com_application", conn))
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
            catch (Exception ex) {
                response.message_code = "1";
                response.message_code = $"An error occurred while retrieving the application list. {ex.Message}";
            }
            return response;
        }

        public ApplicationResponse CheckApplicationExpire(VComApplication vComApplication)
        {
            ApplicationResponse response = new ApplicationResponse();
            try {
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
            catch (Exception ex) {
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
                using (var conn = new SqlConnection(_connectionString))
                {
                    using (var cmd = new SqlCommand($"select * from sec.v_com_application WHERE license_key = @in_vchLicenseKey ", conn))
                    {
                        cmd.Parameters.AddWithValue("@in_vchLicenseKey", license_key);

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
                                vComApplication.application_name = reader.GetString(reader.GetOrdinal("application_name")) ?? "";
                                vComApplication.application_description = reader.GetString(reader.GetOrdinal("application_description")) ?? "";
                                vComApplication.application_of_use = int.TryParse(Encryption.Decrypt(reader.GetString(reader.GetOrdinal("application_of_use")) ?? "0"), out int ofUse) ? ofUse : 0;
                                vComApplication.application_owner = reader.GetString(reader.GetOrdinal("application_owner")) ?? "";
                                vComApplication.application_contact = reader.GetString(reader.GetOrdinal("application_contact")) ?? "";
                                vComApplication.application_email = reader.GetString(reader.GetOrdinal("application_email")) ?? "";
                                vComApplication.application_expire = DateOnly.TryParse(Encryption.Decrypt(reader.GetString(reader.GetOrdinal("application_expire")) ?? DateOnly.MinValue.ToString()), out DateOnly expireDate) ? expireDate : DateOnly.MinValue;
                                vComApplication.license_type = reader.GetString(reader.GetOrdinal("license_type")) ?? "";
                                vComApplication.license_date = reader.GetDateTime(reader.GetOrdinal("license_date"));
                                vComApplication.license_update_date = reader.IsDBNull(reader.GetOrdinal("license_update_date")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("license_update_date"));
                                vComApplication.license_key = reader.GetString(reader.GetOrdinal("license_key")) ?? "";
                                vComApplication.is_active = reader.GetString(reader.GetOrdinal("is_active")) ?? "";
                                vComApplication.access_failed_count_limit = reader.GetInt32(reader.GetOrdinal("access_failed_count_limit"));
                                vComApplication.created_by = reader.GetString(reader.GetOrdinal("create_by")) ?? "";
                                vComApplication.created_date = reader.GetDateTime(reader.GetOrdinal("create_date"));
                                vComApplication.updated_by = reader.GetString(reader.GetOrdinal("update_by")) ?? "";
                                vComApplication.updated_date = reader.IsDBNull(reader.GetOrdinal("update_date")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("update_date"));

                            }
                        }
                    }
                }
            }
            catch
            {
                vComApplication = new VComApplication();
            }
            return vComApplication;
        }
    }
}
