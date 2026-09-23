using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Dapper;
using System.Data;
using System.Net.NetworkInformation;
using System.Text.Json;

namespace ApiCore.Services.Implementation
{
    public class CountService : ICount
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<CountService> _logger;

        public CountService(ISqlConnectionFactory connectionFactory, ILogger<CountService> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<CountResponse> InsertCountPlanAsync(CountMasterRequest request)
        {
            var response = new CountResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_count_insert_plan", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters - Header 
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_warehouse_id", request.WarehouseId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_warehouse", request.Warehouse ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_owner_id", request.OwnerId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_owner_code", request.OwnerCode ?? (object)DBNull.Value));
                   // cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_count_number", request.CountNumber ?? (object)DBNull.Value));
                   // cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_count_status", request.CountStatus));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_count_type", request.CountType)); 
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_description", request.Description ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_count_plan_date", request.CountPlanDate ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value)); 

                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? "API"));

                    // Input parameters - Details as JSON
                    var detailsJson = JsonSerializer.Serialize(request.Details, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    });
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_json_details", detailsJson));

                    // Output parameters
                    var outIdParam = cmd.CreateParameter();
                    outIdParam.ParameterName = "@out_int_count_master_id";
                    outIdParam.DbType = DbType.Int64;
                    outIdParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(outIdParam);

                    var outOrderNoParam = cmd.CreateParameter();
                    outOrderNoParam.ParameterName = "@out_vch_count_number";
                    outOrderNoParam.DbType = DbType.String;
                    outOrderNoParam.Size = 50;
                    outOrderNoParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(outOrderNoParam);

                    var errorCodeParam = cmd.CreateParameter();
                    errorCodeParam.ParameterName = "@out_vch_error_code";
                    errorCodeParam.DbType = DbType.String;
                    errorCodeParam.Size = 50;
                    errorCodeParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(errorCodeParam);

                    var errorMessageParam = cmd.CreateParameter();
                    errorMessageParam.ParameterName = "@out_vch_error_message";
                    errorMessageParam.DbType = DbType.String;
                    errorMessageParam.Size = 255;
                    errorMessageParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(errorMessageParam);

                    await conn.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();

                    // อ่านค่า output parameters
                    var errorCode = errorCodeParam.Value?.ToString() ?? "500";
                    var errorMessage = errorMessageParam.Value?.ToString() ?? "Unknown error";
                    var outId = outIdParam.Value != DBNull.Value ? Convert.ToInt64(outIdParam.Value) : (long?)null;
                    var outOrderNo = outOrderNoParam.Value?.ToString();

                    response.Success = errorCode == "0";
                    response.Message = errorMessage;
                    response.CountMasterId = outId;
                    response.CountNumber = outOrderNo;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SaveInboundAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }

        public async Task<DeleteCountResponse> DeleteCountPlanAsync(DeleteCountRequest request)
        {
            var response = new DeleteCountResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_count_plan_delete", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_count_master_id", request.CountMasterId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? "API"));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Language ?? "EN"));

                    // Output parameters
                    var errorCodeParam = cmd.CreateParameter();
                    errorCodeParam.ParameterName = "@out_vch_error_code";
                    errorCodeParam.DbType = DbType.String;
                    errorCodeParam.Size = 50;
                    errorCodeParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(errorCodeParam);

                    var errorMessageParam = cmd.CreateParameter();
                    errorMessageParam.ParameterName = "@out_vch_error_message";
                    errorMessageParam.DbType = DbType.String;
                    errorMessageParam.Size = 255;
                    errorMessageParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(errorMessageParam);

                    await conn.OpenAsync();
                    await cmd.ExecuteNonQueryAsync();

                    // อ่านค่า output parameters
                    var errorCode = errorCodeParam.Value?.ToString() ?? "500";
                    var errorMessage = errorMessageParam.Value?.ToString() ?? "Unknown error";

                    response.Success = errorCode == "0";
                    response.Message = errorMessage;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteInboundOrderAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }

        public async Task<CountCycleResponse> GetCountCycleCountDataAsync(CountCycleRequest request)
        {
            var response = new CountCycleResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_count_get_inventory", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_from_location", string.IsNullOrEmpty(request.LocationFrom) ? (object)DBNull.Value : request.LocationFrom));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_to_location", string.IsNullOrEmpty(request.LocationTo) ? (object)DBNull.Value : request.LocationTo));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_category", string.IsNullOrEmpty(request.Category) ? (object)DBNull.Value : request.Category));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_number", string.IsNullOrEmpty(request.ItemNumber) ? (object)DBNull.Value : request.ItemNumber));

                    List<CountCycleDetailResponse> listData = new List<CountCycleDetailResponse>();

                    await conn.OpenAsync();
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {

                        while (await reader.ReadAsync())
                        {
                            listData.Add(new CountCycleDetailResponse
                            {
                                InventoryIdSerial = reader["inventory_id_serial"]?.ToString(),
                                InventoryId = reader["inventory_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["inventory_id"]),
                                WarehouseId = reader["warehouse_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["warehouse_id"]),
                                Warehouse = reader["warehouse"]?.ToString(),
                                OwnerId = reader["owner_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["owner_id"]),
                                OwnerCode = reader["owner_code"]?.ToString(),
                                ZoneId = reader["zone_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["zone_id"]),
                                Zone = reader["zone"]?.ToString(),
                                LocationId = reader["location_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["location_id"]),
                                Location = reader["location"]?.ToString(),
                                LocType = reader["loc_type"]?.ToString(),
                                ItemMasterId = reader["item_master_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["item_master_id"]),
                                ItemNumber = reader["item_number"]?.ToString(),
                                ItemDescription = reader["item_description"]?.ToString(),
                                CategoryId = reader["category_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["category_id"]),
                                ItemCategory = reader["item_category"]?.ToString(),
                                ItemUomId = reader["item_uom_id"] == DBNull.Value ? 0 : Convert.ToInt32(reader["item_uom_id"]),
                                Uom = reader["uom"]?.ToString(),
                                Quantity = reader["quantity"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["quantity"]),
                                QuantityAllocated = reader["quantity_allocated"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["quantity_allocated"]),
                                InvStatus = reader["inv_status"]?.ToString(),
                                ReceiveDate = reader["receive_date"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["receive_date"]),
                                LotNumber = reader["lot_number"]?.ToString(),
                                ExpiryDate = reader["expiry_date"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["expiry_date"]),
                                SerialNumber = reader["serial_number"]?.ToString()
                            });
                        }
                    }

                    if (listData.Count == 0)
                    {
                        response.Success = true;
                        response.Message = "No data found";
                        response.Data = new List<CountCycleDetailResponse>();

                        return response;
                    }
 

                    response.Success = true;
                    response.Message = "Success";
                    response.Data = listData;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetCountCycleCountDataAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }
    }
}
