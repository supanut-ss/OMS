using Authentication.Interfaces;
using Authentication.Models.Data;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using System.Data;
using System.Data.Common;
using TokenManagement.Database;

namespace Authentication.Services.Resource
{
    public class ResourceService : IResource
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";

        public ResourceService(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }
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
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                var sql = @$"  
               SELECT r.*
               FROM {schema}.t_com_resource r  
               INNER JOIN {schema}.t_com_application a ON a.app_id = r.app_id  
               WHERE r.platform = @platform AND r.is_active = @isActive AND a.license_key = @licenseKey";

                using var cmd = _connectionFactory.CreateCommand(sql, conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@platform", platform));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@isActive", 1));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@licenseKey", licenseKey));

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
                            is_active = reader["is_active"] != DBNull.Value && Convert.ToBoolean(reader["is_active"]),
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

                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using (var cmd = _connectionFactory.CreateCommand($"{schema}.usp_update_resource", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_Resource_ID", resourceDataRequest?.resource_id ?? 0));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_App_ID", resourceDataRequest.app_id));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Platform", resourceDataRequest.platform));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Resource_Group", resourceDataRequest.resource_group));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Resource_Name", resourceDataRequest.resource_name));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Resource_EN", resourceDataRequest.resource_en));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Resource_TH", resourceDataRequest.resource_th));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Resource_Other", resourceDataRequest.resource_other));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Description_EN", resourceDataRequest.description_en));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Description_TH", resourceDataRequest.description_th));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Description_Other", resourceDataRequest.descrption_other));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_Is_Active", resourceDataRequest.is_active));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_Create_By", userId));

                    var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_ErrorCode", DbType.String, 50);
                    cmd.Parameters.Add(errorCodeParam);

                    var errorMessageParam = _connectionFactory.CreateOutputParameter("@out_vch_ErrorMessage", DbType.String, 500);
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
