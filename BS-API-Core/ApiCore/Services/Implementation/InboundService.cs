using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using System.Data;
using System.Text.Json;
using Dapper;

namespace ApiCore.Services.Implementation
{
    public class InboundService : IInbound
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<InboundService> _logger;

        public InboundService(ISqlConnectionFactory connectionFactory, ILogger<InboundService> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<InboundResponse> SaveInboundAsync(SaveInboundRequest request)
        {
            var response = new InboundResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_inbound_bulk_save", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters - Header
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inbound_master_id", 
                        request.InboundMasterId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_inbound_order_number", 
                        request.InboundOrderNumber ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_warehouse_id", request.WarehouseId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_warehouse", request.Warehouse ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_owner_id", request.OwnerId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_owner_code", request.OwnerCode ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_order_type", request.OrderType ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_order_status", request.OrderStatus));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dte_order_date", request.OrderDate));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_supplier_id", request.SupplierId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_customer_id", request.CustomerId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_description", request.Description ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dte_expected_delivery_date", request.ExpectedDeliveryDate ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def1", request.UserDef1 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def2", request.UserDef2 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def3", request.UserDef3 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def4", request.UserDef4 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def5", request.UserDef5 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_def6", request.UserDef6 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_user_def7", request.UserDef7 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_user_def8", request.UserDef8 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dte_user_def9", request.UserDef9 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dte_user_def10", request.UserDef10 ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? "API"));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Language ?? "EN"));

                    // Input parameters - Details as JSON
                    var detailsJson = JsonSerializer.Serialize(request.Details, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    });
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_json_details", detailsJson));

                    // Output parameters
                    var outIdParam = cmd.CreateParameter();
                    outIdParam.ParameterName = "@out_int_inbound_master_id";
                    outIdParam.DbType = DbType.Int64;
                    outIdParam.Direction = ParameterDirection.Output;
                    cmd.Parameters.Add(outIdParam);

                    var outOrderNoParam = cmd.CreateParameter();
                    outOrderNoParam.ParameterName = "@out_vch_inbound_order_number";
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
                    response.InboundMasterId = outId;
                    response.InboundOrderNumber = outOrderNo;
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


        public async Task<DeleteInboundOrderResponse> DeleteInboundOrderAsync(DeleteInboundOrderRequest request)
        {
            var response = new DeleteInboundOrderResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_inbound_delete_order", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inbound_master_id", request.InboundMasterId));
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

        public async Task<CloseInboundOrderResponse> CloseInboundOrderAsync(CloseInboundOrderRequest request)
        {
            var response = new CloseInboundOrderResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_inbound_close_order", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // Input parameters
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inbound_master_id", request.InboundMasterId));
                    //cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_close_remark", request.Remark ?? (object)DBNull.Value));
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
                _logger.LogError(ex, "CloseInboundOrderAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }

        public async Task<ReceiptResponse> CloseReceiptAsync(CloseReceiptRequest request)
        {
            var response = new ReceiptResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                using (var cmd = _connectionFactory.CreateCommand("inv.usp_inbound_close_receipt", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    //cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inbound_master_id", request.InboundMasterId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_receipt_header_id", request.ReceiptHeaderId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId ?? (object)DBNull.Value));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? "API"));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Language ?? "EN"));
                    
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
                _logger.LogError(ex, "CloseReceiptAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }

        public async Task<ReceiptResponse> SaveReceiptAsync(SaveReceiptRequest request)
        {
            var response = new ReceiptResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    var sql = @"
                        UPDATE [inv].[t_inv_inbound_receipt_header]
                        SET [user_def1] = @UserDef1
                           ,[user_def2] = @UserDef2
                           ,[user_def3] = @UserDef3
                           ,[user_def4] = @UserDef4
                           ,[user_def5] = @UserDef5
                           ,[user_def6] = @UserDef6
                           ,[user_def7] = @UserDef7
                           ,[user_def8] = @UserDef8
                           ,[user_def9] = @UserDef9
                           ,[user_def10] = @UserDef10
                           ,[update_by] = @UserId
                           ,[update_date] = GETDATE()
                        WHERE [receipt_header_id] = @ReceiptHeaderId
                          AND [inbound_master_id] = @InboundMasterId";

                    await conn.OpenAsync();

                    var rowsAffected = await conn.ExecuteAsync(sql, new
                    {
                        ReceiptHeaderId = request.ReceiptHeaderId,
                        InboundMasterId = request.InboundMasterId,
                        UserDef1 = request.UserDef1,
                        UserDef2 = request.UserDef2,
                        UserDef3 = request.UserDef3,
                        UserDef4 = request.UserDef4,
                        UserDef5 = request.UserDef5,
                        UserDef6 = request.UserDef6,
                        UserDef7 = request.UserDef7,
                        UserDef8 = request.UserDef8,
                        UserDef9 = request.UserDef9,
                        UserDef10 = request.UserDef10,
                        UserId = request.UserId
                    });

                    if (rowsAffected > 0)
                    {
                        response.Success = true;
                        response.Message = request.Language?.ToUpper() == "TH" ? "Receipt updated successfully" : "อัพเดทข้อมูลสำเร็จ";
                    }
                    else
                    {
                        response.Success = false;
                        response.Message = "No records updated. Please check receipt_header_id and inbound_master_id";
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SaveReceiptAsync failed");
                response.Success = false;
                response.Message = $"Error: {ex.Message}";
            }

            return response;
        }

        public async Task<ReceiptHeaderResponse?> GetReceiptAsync(int receiptHeaderId)
        {
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    var sql = @"
                        SELECT [receipt_header_id] AS ReceiptHeaderId
                              ,[receipt_number] AS ReceiptNumber
                              ,[inbound_master_id] AS InboundMasterId
                              ,[inbound_order_number] AS InboundOrderNumber
                              ,[receipt_status] AS ReceiptStatus
                              ,[user_def1] AS UserDef1
                              ,[user_def2] AS UserDef2
                              ,[user_def3] AS UserDef3
                              ,[user_def4] AS UserDef4
                              ,[user_def5] AS UserDef5
                              ,[user_def6] AS UserDef6
                              ,[user_def7] AS UserDef7
                              ,[user_def8] AS UserDef8
                              ,[user_def9] AS UserDef9
                              ,[user_def10] AS UserDef10
                              ,[close_by] AS CloseBy
                              ,[close_date] AS CloseDate
                              ,[create_by] AS CreateBy
                              ,[create_date] AS CreateDate
                              ,[update_by] AS UpdateBy
                              ,[update_date] AS UpdateDate
                        FROM [inv].[t_inv_inbound_receipt_header]
                        WHERE [receipt_header_id] = @ReceiptHeaderId";

                    var result = await conn.QueryFirstOrDefaultAsync<ReceiptHeaderResponse>(sql, new { ReceiptHeaderId = receiptHeaderId });
                    return result;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetReceiptAsync failed");
                throw;
            }
        }

        public async Task<List<InboundDetailResponse>> GetInboundDetailsAsync(int inboundMasterId)
        {
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    var sql = @"
                        SELECT [inbound_detail_id] AS InboundDetailId
                              ,[inbound_master_id] AS InboundMasterId
                              ,[inbound_order_number] AS InboundOrderNumber
                              ,[line_number] AS LineNumber
                              ,[item_master_id] AS ItemMasterId
                              ,[item_number] AS ItemNumber
                              ,[item_description] AS ItemDescription
                              ,[item_uom_id] AS ItemUomId
                              ,[uom] AS Uom
                              ,[quantity_order] AS QuantityOrder
                              ,[quantity_received] AS QuantityReceived
                              ,[inv_status] AS InvStatus
                              ,[lot_number] AS LotNumber
                              ,[expiry_date] AS ExpiryDate
                              ,[serial_number] AS SerialNumber
                              ,[user_def1] AS UserDef1
                              ,[user_def2] AS UserDef2
                              ,[user_def3] AS UserDef3
                              ,[user_def4] AS UserDef4
                              ,[user_def5] AS UserDef5
                              ,[user_def6] AS UserDef6
                              ,[user_def7] AS UserDef7
                              ,[user_def8] AS UserDef8
                              ,[user_def9] AS UserDef9
                              ,[user_def10] AS UserDef10
                              ,[create_by] AS CreateBy
                              ,[create_date] AS CreateDate
                              ,[update_by] AS UpdateBy
                              ,[update_date] AS UpdateDate
                              ,[lot_control] AS LotControl
                              ,[expiry_date_control] AS ExpiryDateControl
                              ,[sn_control] AS SnControl
                        FROM [inv].[v_inv_inbound_detail]
                        WHERE [inbound_master_id] = @InboundMasterId
                        ORDER BY [line_number]";

                    var result = await conn.QueryAsync<InboundDetailResponse>(sql, new { InboundMasterId = inboundMasterId });
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetInboundDetailsAsync failed");
                throw;
            }
        }
    }
}
