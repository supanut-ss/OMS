using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Authentication.Services.Resource
{
    public class ResourceService : IResource
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        public async Task<ResourceResponse> GetAsync(ResourceRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var platform = request.platform ?? throw new ArgumentNullException(nameof(request.platform));
            var licenseKey = request.application_license ?? throw new ArgumentNullException(nameof(request.application_license));
            ResourceResponse response = new ResourceResponse();
            try
            {
                response.message_code = "0";
                response.message_text = "success";
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = @$"  
               SELECT r.*
               FROM [{schema}].t_com_resource r  
               INNER JOIN [{schema}].t_com_application a ON a.app_id = r.app_id  
               WHERE r.platform = @platform AND r.is_active = 'YES' AND a.license_key = @licenseKey";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@platform", platform);
                cmd.Parameters.AddWithValue("@licenseKey", licenseKey);

                using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {

                    response.message_code = "2";
                    response.message_text = "No resources found.";
                }
                else
                {
                    response.data = new List<ResourceItem>();
                    do
                    {
                        var item = new ResourceItem
                        {
                            resource_group = reader["resource_group"]?.ToString() ?? string.Empty,
                            resource_name = reader["resource_name"]?.ToString() ?? string.Empty,
                            resource_en = reader["resource_en"]?.ToString() ?? string.Empty,
                            resource_th = reader["resource_th"]?.ToString() ?? string.Empty,
                            resource_other = reader["resource_other"]?.ToString() ?? string.Empty,
                            description_en = reader["description_en"]?.ToString() ?? string.Empty,
                            description_th = reader["description_th"]?.ToString() ?? string.Empty,
                            descrption_other = reader["descrption_other"]?.ToString() ?? string.Empty,
                            is_active = reader["is_active"]?.ToString() ?? string.Empty,
                            create_by = reader["create_by"]?.ToString() ?? string.Empty,
                            create_date = reader["create_date"] != DBNull.Value ? Convert.ToDateTime(reader["create_date"]).ToString("yyyy-MM-dd HH:mm:ss") : string.Empty
                        };
                        response.data.Add(item);
                    } while (await reader.ReadAsync());
                }
            }
            catch (Exception ex)
            {
                response.message_code = "1";
                response.message_text = ex.Message;
            }
            return response;
        }

        public async Task<ResourceDataResponse> UpdateAsync(ResourceDataRequest resourceDataRequest, string userId)
        {
            try
            {
                ResourceDataResponse response = new ResourceDataResponse
                {
                    message_code = "0",
                    message_text = "Update successful."
                };

                if (resourceDataRequest == null)
                {
                    response.message_code = "2";
                    response.message_text = "Resource data request is null.";
                    return response;
                }

                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using (var cmd = new SqlCommand($"[{schema}].usp_update_resource", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.AddWithValue("@in_intResourceID", resourceDataRequest?.resource_id ?? 0);
                    cmd.Parameters.AddWithValue("@in_intAppID", resourceDataRequest.app_id);
                    cmd.Parameters.AddWithValue("@in_vchPlatform", resourceDataRequest.platform);
                    cmd.Parameters.AddWithValue("@in_vchResourceGroup", resourceDataRequest.resource_group);
                    cmd.Parameters.AddWithValue("@in_vchResourceName", resourceDataRequest.resource_name);
                    cmd.Parameters.AddWithValue("@in_vchResourceEN", resourceDataRequest.resource_en);
                    cmd.Parameters.AddWithValue("@in_vchResourceTH", resourceDataRequest.resource_th);
                    cmd.Parameters.AddWithValue("@in_vchResourceOther", resourceDataRequest.resource_other);
                    cmd.Parameters.AddWithValue("@in_vchDescriptionEN", resourceDataRequest.description_en);
                    cmd.Parameters.AddWithValue("@in_vchDescriptionTH", resourceDataRequest.description_th);
                    cmd.Parameters.AddWithValue("@in_vchDescriptionOther", resourceDataRequest.descrption_other);
                    cmd.Parameters.AddWithValue("@in_vchIsActive", resourceDataRequest.is_active);
                    cmd.Parameters.AddWithValue("@in_vchCreateBy", userId);

                    var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                    {
                        Direction = ParameterDirection.Output
                    };
                    cmd.Parameters.Add(errorCodeParam);

                    var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                    {
                        Direction = ParameterDirection.Output
                    };
                    cmd.Parameters.Add(errorMessageParam);

                    await cmd.ExecuteNonQueryAsync();

                    response.message_code = errorCodeParam.Value?.ToString() ?? "0";
                    response.message_text = errorMessageParam.Value?.ToString() ?? "Update successful.";
                }

                return response;
            }
            catch (Exception ex)
            {
                return new ResourceDataResponse
                {
                    message_code = "1",
                    message_text = ex.Message
                };
            }
        }
    }
}
