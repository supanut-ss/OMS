using System.Data;
using System.Data.Common;
using System.Text.Json;
using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;

namespace ApiCore.Services.Implementation
{
    public class OutboundService : IOutbound
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        public OutboundService(ISqlConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        private DbParameter AddOutputParam(DbCommand cmd, string name, DbType type, int size = 0)
        {
            var parameter = cmd.CreateParameter();
            parameter.ParameterName = name;
            parameter.DbType = type;
            if (size > 0)
            {
                parameter.Size = size;
            }

            parameter.Direction = ParameterDirection.Output;
            cmd.Parameters.Add(parameter);
            return parameter;
        }

        private async Task<object?> SaveOutboundAsync(string operation, OutboundRequest request, string userId)
        {
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateCommand("inv.usp_inv_outbound", conn);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_operation", operation));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_js_outbound_master", JsonSerializer.Serialize(request.OutboundMaster)));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_js_outbound_details", JsonSerializer.Serialize(request.OutboundDetails ?? new List<OutboundDetailRequest>())));
                AddOutputParam(cmd, "@out_int_row_count", DbType.Int32);
                AddOutputParam(cmd, "@out_vch_message", DbType.String, 4000);
                var masterIdParam = AddOutputParam(cmd, "@out_int_outbound_master_id", DbType.Int32);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));

                await cmd.ExecuteNonQueryAsync();

                var outboundMasterId = masterIdParam.Value == DBNull.Value ? 0 : Convert.ToInt32(masterIdParam.Value);
                if (outboundMasterId <= 0)
                {
                    return null;
                }

                return await GetOutboundAsync(outboundMasterId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SaveOutboundAsync Error: {ex.Message}");
                throw;
            }
        }

        private static bool HasColumn(DbDataReader reader, string columnName)
        {
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (string.Equals(reader.GetName(i), columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private static string? GetStringOrNull(DbDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName)) return null;
            var ordinal = reader.GetOrdinal(columnName);
            if (reader.IsDBNull(ordinal)) return null;

            var value = reader.GetValue(ordinal);
            return value == null || value == DBNull.Value ? null : Convert.ToString(value);
        }

        private static int GetIntOrDefault(DbDataReader reader, string columnName, int defaultValue = 0)
        {
            if (!HasColumn(reader, columnName)) return defaultValue;
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt32(reader.GetValue(ordinal));
        }

        private static long GetLongOrDefault(DbDataReader reader, string columnName, long defaultValue = 0)
        {
            if (!HasColumn(reader, columnName)) return defaultValue;
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt64(reader.GetValue(ordinal));
        }

        private static decimal GetDecimalOrDefault(DbDataReader reader, string columnName, decimal defaultValue = 0)
        {
            if (!HasColumn(reader, columnName)) return defaultValue;
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToDecimal(reader.GetValue(ordinal));
        }

        private static DateTime? GetDateTimeOrNull(DbDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName)) return null;
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToDateTime(reader.GetValue(ordinal));
        }

        private static DateTime GetDateTimeOrDefault(DbDataReader reader, string columnName, DateTime defaultValue)
        {
            return GetDateTimeOrNull(reader, columnName) ?? defaultValue;
        }

        public async Task<object> GetOutboundAsync(int outbound_master_id)
        {
            OutboundResponse response = new OutboundResponse();
            OutboundMaster outboundMaster = new OutboundMaster();
            OutboundPickHeader pickHeader = new OutboundPickHeader();
            List<OutboundDetails> outboundDetail = new List<OutboundDetails>();
            List<OutboundPickDetails> pickDetails = new List<OutboundPickDetails>();
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    await conn.OpenAsync();
                    // Get Outbound Master
                    var query = @"SELECT * FROM inv.v_inv_outbound_master WHERE outbound_master_id = @outbound_master_id";
                    using (var cmd = _connectionFactory.CreateCommand(query, conn))
                    {
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outbound_master_id));
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                outboundMaster.OutboundMasterId = GetIntOrDefault(reader, "outbound_master_id");
                                outboundMaster.OutboundOrderNumber = GetStringOrNull(reader, "outbound_order_number") ?? string.Empty;
                                outboundMaster.WarehouseId = GetIntOrDefault(reader, "warehouse_id");
                                outboundMaster.Warehouse = GetStringOrNull(reader, "warehouse") ?? string.Empty;
                                outboundMaster.OwnerId = GetIntOrDefault(reader, "owner_id");
                                outboundMaster.OwnerCode = GetStringOrNull(reader, "owner_code") ?? string.Empty;
                                outboundMaster.OrderType = GetStringOrNull(reader, "order_type") ?? GetStringOrNull(reader, "owner_type") ?? string.Empty;
                                outboundMaster.OrderStatus = GetStringOrNull(reader, "order_status") ?? string.Empty;
                                outboundMaster.Description = GetStringOrNull(reader, "description") ?? string.Empty;
                                outboundMaster.OrderDate = GetDateTimeOrDefault(reader, "order_date", DateTime.MinValue);
                                outboundMaster.DeliveryDatePlan = GetDateTimeOrNull(reader, "delivery_date_plan");
                                outboundMaster.ShipDatePlan = GetDateTimeOrNull(reader, "ship_date_plan");
                                outboundMaster.DeliveryDateActual = GetDateTimeOrNull(reader, "delivery_date_actual");
                                outboundMaster.ShipDateActual = GetDateTimeOrNull(reader, "ship_date_actual");
                                outboundMaster.ReleaseBy = GetStringOrNull(reader, "release_by") ?? string.Empty;
                                outboundMaster.ReleaseDate = GetDateTimeOrNull(reader, "release_date");
                                outboundMaster.CloseBy = GetStringOrNull(reader, "close_by") ?? string.Empty;
                                outboundMaster.CloseDate = GetDateTimeOrNull(reader, "close_date");
                                outboundMaster.CloseRemark = GetStringOrNull(reader, "close_remark") ?? string.Empty;
                                outboundMaster.CancelBy = GetStringOrNull(reader, "cancel_by") ?? string.Empty;
                                outboundMaster.CancelDate = GetDateTimeOrNull(reader, "cancel_date");
                                outboundMaster.CancelRemark = GetStringOrNull(reader, "cancel_remark") ?? string.Empty;
                                outboundMaster.CustomerOrderNumber = GetStringOrNull(reader, "customer_order_number") ?? string.Empty;
                                outboundMaster.CustomerPurchaseOrder = GetStringOrNull(reader, "customer_purchase_order") ?? GetStringOrNull(reader, "customer_po") ?? string.Empty;
                                outboundMaster.CustomerId = GetIntOrDefault(reader, "customer_id");
                                outboundMaster.CustomerCode = GetStringOrNull(reader, "customer_code") ?? string.Empty;
                                outboundMaster.CustomerName = GetStringOrNull(reader, "customer_name") ?? string.Empty;
                                outboundMaster.CustomerAddressLine1 = GetStringOrNull(reader, "customer_address_line1") ?? string.Empty;
                                outboundMaster.CustomerAddressLine2 = GetStringOrNull(reader, "customer_address_line2") ?? string.Empty;
                                outboundMaster.CustomerAddressLine3 = GetStringOrNull(reader, "customer_address_line3") ?? string.Empty;
                                outboundMaster.ShipToCode = GetStringOrNull(reader, "ship_to_code") ?? string.Empty;
                                outboundMaster.ShipToName = GetStringOrNull(reader, "ship_to_name") ?? string.Empty;
                                outboundMaster.ShipToAddressLine1 = GetStringOrNull(reader, "ship_to_address_line1") ?? string.Empty;
                                outboundMaster.ShipToAddressLine2 = GetStringOrNull(reader, "ship_to_address_line2") ?? string.Empty;
                                outboundMaster.ShipToAddressLine3 = GetStringOrNull(reader, "ship_to_address_line3") ?? string.Empty;
                                outboundMaster.PickType = GetStringOrNull(reader, "pick_type") ?? string.Empty;
                                outboundMaster.Remark = GetStringOrNull(reader, "remark") ?? string.Empty;
                                outboundMaster.UserDef1 = GetStringOrNull(reader, "user_def1") ?? string.Empty;
                                outboundMaster.UserDef2 = GetStringOrNull(reader, "user_def2") ?? string.Empty;
                                outboundMaster.UserDef3 = GetStringOrNull(reader, "user_def3") ?? string.Empty;
                                outboundMaster.UserDef4 = GetStringOrNull(reader, "user_def4") ?? string.Empty;
                                outboundMaster.UserDef5 = GetStringOrNull(reader, "user_def5") ?? string.Empty;
                                outboundMaster.UserDef6 = GetStringOrNull(reader, "user_def6") ?? string.Empty;
                                outboundMaster.UserDef7 = GetStringOrNull(reader, "user_def7") ?? string.Empty;
                                outboundMaster.UserDef8 = GetStringOrNull(reader, "user_def8") ?? string.Empty;
                                outboundMaster.UserDef9 = GetStringOrNull(reader, "user_def9") ?? string.Empty;
                                outboundMaster.UserDef10 = GetStringOrNull(reader, "user_def10") ?? string.Empty;
                                outboundMaster.CreateBy = GetStringOrNull(reader, "create_by") ?? string.Empty;
                                outboundMaster.CreateDate = GetDateTimeOrDefault(reader, "create_date", DateTime.MinValue);
                                outboundMaster.UpdateBy = GetStringOrNull(reader, "update_by");
                                outboundMaster.UpdateDate = GetDateTimeOrNull(reader, "update_date");
                            }
                        }
                    }
                    // Get Outbound Details
                    query = @"SELECT * FROM inv.v_inv_outbound_detail WHERE outbound_master_id = @outbound_master_id";
                    using (var cmd = _connectionFactory.CreateCommand(query, conn))
                    {
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outbound_master_id));
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                OutboundDetails detail = new OutboundDetails();
                                detail.OutboundDetailId = GetLongOrDefault(reader, "outbound_detail_id");
                                detail.OutboundMasterId = GetIntOrDefault(reader, "outbound_master_id");
                                detail.OutboundOrderNumber = GetStringOrNull(reader, "outbound_order_number") ?? string.Empty;
                                detail.LineNumber = GetIntOrDefault(reader, "line_number");
                                detail.ItemMasterId = GetIntOrDefault(reader, "item_master_id");
                                detail.ItemNumber = GetStringOrNull(reader, "item_number") ?? string.Empty;
                                detail.ItemDescription = GetStringOrNull(reader, "item_description") ?? string.Empty;
                                detail.Price = GetDecimalOrDefault(reader, "price");
                                detail.ItemUomId = HasColumn(reader, "item_uom_id")
                                    ? GetIntOrDefault(reader, "item_uom_id")
                                    : GetIntOrDefault(reader, "currency_code");
                                detail.Uom = GetStringOrNull(reader, "uom") ?? string.Empty;
                                detail.QuantityOrder = GetDecimalOrDefault(reader, "quantity_order");
                                detail.QuantityPick = GetDecimalOrDefault(reader, "quantity_pick");
                                detail.QuantityStage = GetDecimalOrDefault(reader, "quantity_stage");
                                detail.QuantityShip = GetDecimalOrDefault(reader, "quantity_ship");
                                detail.InvStatus = GetStringOrNull(reader, "inv_status") ?? string.Empty;
                                detail.LotNumber = GetStringOrNull(reader, "lot_number") ?? string.Empty;
                                detail.ExpiryDate = GetDateTimeOrNull(reader, "expiry_date");
                                detail.SerialNumber = GetStringOrNull(reader, "serial_number") ?? string.Empty;
                                detail.UserDef1 = GetStringOrNull(reader, "user_def1") ?? string.Empty;
                                detail.UserDef2 = GetStringOrNull(reader, "user_def2") ?? string.Empty;
                                detail.UserDef3 = GetStringOrNull(reader, "user_def3") ?? string.Empty;
                                detail.UserDef4 = GetStringOrNull(reader, "user_def4") ?? string.Empty;
                                detail.UserDef5 = GetStringOrNull(reader, "user_def5") ?? string.Empty;
                                detail.UserDef6 = GetStringOrNull(reader, "user_def6") ?? string.Empty;
                                detail.UserDef7 = GetStringOrNull(reader, "user_def7") ?? string.Empty;
                                detail.UserDef8 = GetStringOrNull(reader, "user_def8") ?? string.Empty;
                                detail.UserDef9 = GetStringOrNull(reader, "user_def9") ?? string.Empty;
                                detail.UserDef10 = GetStringOrNull(reader, "user_def10") ?? string.Empty;
                                detail.CreateBy = GetStringOrNull(reader, "create_by") ?? string.Empty;
                                detail.CreateDate = GetDateTimeOrDefault(reader, "create_date", DateTime.MinValue);
                                detail.UpdateBy = GetStringOrNull(reader, "update_by");
                                detail.UpdateDate = GetDateTimeOrNull(reader, "update_date");
                                detail.LotControl = GetStringOrNull(reader, "lot_control") ?? string.Empty;
                                detail.ExpiryDateControl = GetStringOrNull(reader, "expiry_date_control") ?? string.Empty;
                                detail.SnControl = GetStringOrNull(reader, "sn_control") ?? string.Empty;
                                outboundDetail.Add(detail);
                            }
                        }
                    }
                    // pick header
                    query = @"SELECT * FROM [inv].[v_inv_outbound_pick_header] WHERE outbound_master_id = @outbound_master_id";
                    using (var cmd = _connectionFactory.CreateCommand(query, conn))
                    {
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outbound_master_id));
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                pickHeader = new OutboundPickHeader
                                {
                                    OutboundPickHeaderId = GetLongOrDefault(reader, "outbound_pick_header_id"),
                                    PickListNumber = GetStringOrNull(reader, "pick_list_number") ?? string.Empty,
                                    OutboundMasterId = GetIntOrDefault(reader, "outbound_master_id"),
                                    OutboundOrderNumber = GetStringOrNull(reader, "outbound_order_number") ?? string.Empty,
                                    PickListStatus = GetStringOrNull(reader, "pick_list_status") ?? string.Empty,
                                    PickProgress = GetStringOrNull(reader, "pick_progress") ?? string.Empty,
                                    TotalPickLines = GetIntOrDefault(reader, "total_pick_lines"),
                                    TotalQuantityPlan = GetDecimalOrDefault(reader, "total_quantity_plan"),
                                    TotalQuantityPick = GetDecimalOrDefault(reader, "total_quantity_pick"),
                                    TotalQuantityStage = GetDecimalOrDefault(reader, "total_quantity_stage"),
                                    TotalQuantityShip = GetDecimalOrDefault(reader, "total_quantity_ship"),
                                    ShipBy = GetStringOrNull(reader, "ship_by") ?? string.Empty,
                                    ShipDate = GetDateTimeOrNull(reader, "ship_date"),
                                    Description = GetStringOrNull(reader, "description") ?? string.Empty,
                                    CreateBy = GetStringOrNull(reader, "create_by") ?? string.Empty,
                                    CreateDate = GetDateTimeOrDefault(reader, "create_date", DateTime.MinValue),
                                    UpdateBy = GetStringOrNull(reader, "update_by"),
                                    UpdateDate = GetDateTimeOrNull(reader, "update_date")
                                };
                            }

                        }
                    }
                    // pick details
                    query = @"SELECT * FROM [inv].[v_inv_outbound_pick_detail] WHERE outbound_master_id = @outbound_master_id";
                    using (var cmd = _connectionFactory.CreateCommand(query, conn))
                    {
                        cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outbound_master_id));
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                pickDetails.Add(new OutboundPickDetails
                                {
                                    OutboundPickDetailId = GetLongOrDefault(reader, "outbound_pick_detail_id"),
                                    OutboundPickHeaderId = GetLongOrDefault(reader, "outbound_pick_header_id"),
                                    PickListNumber = GetStringOrNull(reader, "pick_list_number") ?? string.Empty,
                                    OutboundMasterId = GetIntOrDefault(reader, "outbound_master_id"),
                                    OutboundOrderNumber = GetStringOrNull(reader, "outbound_order_number") ?? string.Empty,
                                    OutboundDetailId = GetLongOrDefault(reader, "outbound_detail_id"),
                                    LocationId = GetIntOrDefault(reader, "location_id"),
                                    Location = GetStringOrNull(reader, "location") ?? string.Empty,
                                    StgLocationId = GetIntOrDefault(reader, "stg_location_id"),
                                    StgLocation = GetStringOrNull(reader, "stg_location") ?? string.Empty,
                                    LineNumber = GetIntOrDefault(reader, "line_number"),
                                    ItemMasterId = GetIntOrDefault(reader, "item_master_id"),
                                    ItemNumber = GetStringOrNull(reader, "item_number") ?? string.Empty,
                                    ItemDescription = GetStringOrNull(reader, "item_description") ?? string.Empty,
                                    QuantityPlan = GetDecimalOrDefault(reader, "quantity_plan"),
                                    QuantityPick = GetDecimalOrDefault(reader, "quantity_pick"),
                                    QuantityStage = GetDecimalOrDefault(reader, "quantity_stage"),
                                    QuantityShip = GetDecimalOrDefault(reader, "quantity_ship"),
                                    ItemUomId = GetIntOrDefault(reader, "item_uom_id"),
                                    Uom = GetStringOrNull(reader, "uom") ?? string.Empty,
                                    PickInvStatus = GetStringOrNull(reader, "pick_inv_status") ?? string.Empty,
                                    LotNumber = GetStringOrNull(reader, "lot_number") ?? string.Empty,
                                    ExpiryDate = GetDateTimeOrNull(reader, "expiry_date"),
                                    SerialNumber = GetStringOrNull(reader, "serial_number") ?? string.Empty,
                                    ReceiveDate = GetDateTimeOrNull(reader, "receive_date"),
                                    CreateBy = GetStringOrNull(reader, "create_by") ?? string.Empty,
                                    CreateDate = GetDateTimeOrDefault(reader, "create_date", DateTime.MinValue),
                                    UpdateBy = GetStringOrNull(reader, "update_by"),
                                    UpdateDate = GetDateTimeOrNull(reader, "update_date"),
                                    LotControl = GetStringOrNull(reader, "lot_control") ?? string.Empty,
                                    ExpiryDateControl = GetStringOrNull(reader, "expiry_date_control") ?? string.Empty,
                                    SnControl = GetStringOrNull(reader, "sn_control") ?? string.Empty,
                                    CategoryId = GetIntOrDefault(reader, "category_id"),
                                    ItemCategory = GetStringOrNull(reader, "item_category") ?? string.Empty,
                                    InventoryType = GetStringOrNull(reader, "inventory_type") ?? string.Empty
                                });
                            }
                        }
                    }

                    response.Data = new
                    {
                        outbound_master = outboundMaster,
                        outbound_details = outboundDetail,
                        pick_header = pickHeader,
                        pick_details = pickDetails
                    };
                    response.MessageStatus = "success";
                    response.MessageCode = 0;
                }


            }
            catch (Exception ex)
            {
                response.MessageStatus = "error";
                response.MessageCode = 1;
                response.Data = ex.Message;
            }
            return response;
        }

        public async Task<object?> InsertOutboundAsync(OutboundRequest request, string userId)
        {
            return await SaveOutboundAsync("INSERT", request, userId);
        }

        public async Task<object?> UpdateOutboundAsync(int outboundMasterId, OutboundRequest request, string userId)
        {
            request.OutboundMaster.outbound_master_id = outboundMasterId;
            return await SaveOutboundAsync("UPDATE", request, userId);
        }

        public async Task<object?> DeleteOutboundAsync(int outboundMasterId, string userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var transaction = await conn.BeginTransactionAsync();
            try
            {
                var existsQuery = @"SELECT COUNT(1)
                                    FROM inv.t_inv_outbound_master
                                    WHERE outbound_master_id = @outbound_master_id";
                using var existsCmd = _connectionFactory.CreateCommand(existsQuery, conn);
                existsCmd.Transaction = transaction;
                existsCmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outboundMasterId));
                var exists = Convert.ToInt32(await existsCmd.ExecuteScalarAsync() ?? 0) > 0;
                if (!exists)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                var deleteDetailQuery = @"DELETE FROM inv.t_inv_outbound_detail
                                          WHERE outbound_master_id = @outbound_master_id";
                using var deleteDetailCmd = _connectionFactory.CreateCommand(deleteDetailQuery, conn);
                deleteDetailCmd.Transaction = transaction;
                deleteDetailCmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outboundMasterId));
                var deletedDetailRows = await deleteDetailCmd.ExecuteNonQueryAsync();

                var deleteMasterQuery = @"DELETE FROM inv.t_inv_outbound_master
                                          WHERE outbound_master_id = @outbound_master_id";
                using var deleteMasterCmd = _connectionFactory.CreateCommand(deleteMasterQuery, conn);
                deleteMasterCmd.Transaction = transaction;
                deleteMasterCmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outboundMasterId));
                var deletedMasterRows = await deleteMasterCmd.ExecuteNonQueryAsync();

                if (deletedMasterRows <= 0)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                await transaction.CommitAsync();

                return new
                {
                    outbound_master_id = outboundMasterId,
                    message_text = "Outbound deleted successfully.",
                    affected_master_rows = deletedMasterRows,
                    affected_detail_rows = deletedDetailRows,
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<object> ExecuteOutboundActionAsync(string procedureName, OutboundActionRequest request, string userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand(procedureName, conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.device ?? "WEB"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.lang ?? "en-US"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_outbound_master_id", request.outbound_master_id));

            var errorCodeParam = AddOutputParam(cmd, "@out_vch_error_code", DbType.String, 50);
            var errorMessageParam = AddOutputParam(cmd, "@out_vch_error_message", DbType.String, 500);

            await cmd.ExecuteNonQueryAsync();

            var errorCode = errorCodeParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorCodeParam.Value) ?? string.Empty;
            var errorMessage = errorMessageParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorMessageParam.Value) ?? string.Empty;
            var isSuccess = string.IsNullOrWhiteSpace(errorCode) || string.Equals(errorCode, "0", StringComparison.OrdinalIgnoreCase);

            return new
            {
                outbound_master_id = request.outbound_master_id,
                error_code = errorCode,
                error_message = errorMessage,
                message_status = isSuccess ? "success" : "error",
            };
        }

        private async Task<object> CheckPickingListBeforeReleaseSystemAsync(OutboundActionRequest request, string userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand("inv.usp_outbound_check_picking_list", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.device ?? "WEB"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.lang ?? "en-US"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_outbound_master_id", request.outbound_master_id));

            var errorCodeParam = AddOutputParam(cmd, "@out_vch_error_code", DbType.String, 50);
            var errorMessageParam = AddOutputParam(cmd, "@out_vch_error_message", DbType.String, 500);
            List<OutboundItemPickList> items = new();

            using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    items.Add(new OutboundItemPickList
                    {
                        ItemMasterId = GetLongOrDefault(reader, "item_master_id"),
                        ItemNumber = GetStringOrNull(reader, "item_number") ?? string.Empty,
                        ItemDescription = GetStringOrNull(reader, "item_description") ?? string.Empty,
                        LotNumber = GetStringOrNull(reader, "lot_number") ?? string.Empty,
                        ExpiryDate = GetDateTimeOrNull(reader, "expiry_date"),
                        InvStatus = GetStringOrNull(reader, "inv_status") ?? string.Empty,
                        BalanceQty = GetDecimalOrDefault(reader, "order_balance_qty"),
                        InvBalanceQty = GetDecimalOrDefault(reader, "inv_balance_qty"),
                    });
                }
            }

            var errorCode = errorCodeParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorCodeParam.Value) ?? string.Empty;
            var errorMessage = errorMessageParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorMessageParam.Value) ?? string.Empty;
            var isSuccess = string.IsNullOrWhiteSpace(errorCode) || string.Equals(errorCode, "0", StringComparison.OrdinalIgnoreCase);

            return new
            {
                outbound_master_id = request.outbound_master_id,
                error_code = errorCode,
                error_message = errorMessage,
                message_status = isSuccess ? "success" : "error",
                items = items
            };
        }

        private async Task<long?> ResolveWarehouseIdAsync(long outboundMasterId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string query = @"SELECT TOP 1 warehouse_id
                                   FROM inv.t_inv_outbound_master WITH (NOLOCK)
                                   WHERE outbound_master_id = @outbound_master_id";
            using var cmd = _connectionFactory.CreateCommand(query, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outboundMasterId));

            var result = await cmd.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value)
            {
                return null;
            }

            var warehouseId = Convert.ToInt64(result);
            return warehouseId > 0 ? warehouseId : null;
        }

        private async Task<long?> ResolveOwnerIdAsync(long outboundMasterId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string query = @"SELECT TOP 1 owner_id
                                   FROM inv.t_inv_outbound_master WITH (NOLOCK)
                                   WHERE outbound_master_id = @outbound_master_id";
            using var cmd = _connectionFactory.CreateCommand(query, conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@outbound_master_id", outboundMasterId));

            var result = await cmd.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value)
            {
                return null;
            }

            var ownerId = Convert.ToInt64(result);
            return ownerId > 0 ? ownerId : null;
        }

        public async Task<object> ReleaseUserAsync(OutboundActionRequest request, string userId)
        {
            return await ExecuteOutboundActionAsync("inv.usp_outbound_release_user", request, userId);
        }

        public async Task<object> ReleaseSystemAsync(OutboundActionRequest request, string userId)
        {
            if (request.IsCheckPickList == false)
            {
                object? pickingListCheck = await CheckPickingListBeforeReleaseSystemAsync(request, userId);
                dynamic result = pickingListCheck;
                if (result.message_status != "success")
                {
                    return new
                    {
                        outbound_master_id = request.outbound_master_id,
                        error_code = result.error_code,
                        error_message = string.IsNullOrWhiteSpace((string)result.error_message)
                            ? "Picking list validation failed."
                            : (string)result.error_message,
                        message_status = "error",
                        items = result.items // ส่ง items กลับไปด้วย
                    };
                }
            }

            return await ExecuteOutboundActionAsync("inv.usp_outbound_release_system", request, userId);
        }

        public async Task<object> UnreleaseUserAsync(OutboundActionRequest request, string userId)
        {
            return await ExecuteOutboundActionAsync("inv.usp_outbound_unrelease_user", request, userId);
        }

        public async Task<object> UnreleaseSystemAsync(OutboundActionRequest request, string userId)
        {
            var warehouseId = request.warehouse_id;
            if (!(warehouseId.HasValue && warehouseId.Value > 0))
            {
                warehouseId = await ResolveWarehouseIdAsync(request.outbound_master_id);
            }

            var ownerId = request.owner_id;
            if (!(ownerId.HasValue && ownerId.Value > 0))
            {
                ownerId = await ResolveOwnerIdAsync(request.outbound_master_id);
            }

            if (!(warehouseId.HasValue && warehouseId.Value > 0))
            {
                return new
                {
                    outbound_master_id = request.outbound_master_id,
                    error_code = "999",
                    error_message = "warehouse_id is required for unrelease system.",
                    message_status = "error",
                };
            }

            if (!(ownerId.HasValue && ownerId.Value > 0))
            {
                return new
                {
                    outbound_master_id = request.outbound_master_id,
                    error_code = "999",
                    error_message = "owner_id is required for unrelease system.",
                    message_status = "error",
                };
            }

            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand("inv.usp_outbound_unrelease_system", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.device ?? "WEB"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.lang ?? "en-US"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_outbound_master_id", request.outbound_master_id));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_warehouse_id", warehouseId.Value));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_owner_id", ownerId.Value));

            var errorCodeParam = AddOutputParam(cmd, "@out_vch_error_code", DbType.String, 50);
            var errorMessageParam = AddOutputParam(cmd, "@out_vch_error_message", DbType.String, 500);

            await cmd.ExecuteNonQueryAsync();

            var errorCode = errorCodeParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorCodeParam.Value) ?? string.Empty;
            var errorMessage = errorMessageParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorMessageParam.Value) ?? string.Empty;
            var isSuccess = string.IsNullOrWhiteSpace(errorCode) || string.Equals(errorCode, "0", StringComparison.OrdinalIgnoreCase);

            return new
            {
                outbound_master_id = request.outbound_master_id,
                warehouse_id = warehouseId.Value,
                owner_id = ownerId.Value,
                error_code = errorCode,
                error_message = errorMessage,
                message_status = isSuccess ? "success" : "error",
            };
        }

        public async Task<object> CancelOrderAsync(OutboundActionRequest request, string userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand("inv.usp_outbound_cancel_order", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.device ?? "WEB"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.lang ?? "en-US"));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_outbound_master_id", request.outbound_master_id));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_cancel_remark", request.cancel_remark ?? string.Empty));

            var errorCodeParam = AddOutputParam(cmd, "@out_vch_error_code", DbType.String, 50);
            var errorMessageParam = AddOutputParam(cmd, "@out_vch_error_message", DbType.String, 500);

            await cmd.ExecuteNonQueryAsync();

            var errorCode = errorCodeParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorCodeParam.Value) ?? string.Empty;
            var errorMessage = errorMessageParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorMessageParam.Value) ?? string.Empty;
            var isSuccess = string.IsNullOrWhiteSpace(errorCode) || string.Equals(errorCode, "0", StringComparison.OrdinalIgnoreCase);

            return new
            {
                outbound_master_id = request.outbound_master_id,
                error_code = errorCode,
                error_message = errorMessage,
                message_status = isSuccess ? "success" : "error",
            };
        }

        public async Task<object> ConfirmShipAsync(long outbound_master_id, string userId, string device = "WEB", string lang = "en-US")
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand("inv.usp_outbound_ship_confirm", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", device));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", lang));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_outbound_master_id", outbound_master_id));

            var errorCodeParam = AddOutputParam(cmd, "@out_vch_error_code", DbType.String, 50);
            var errorMessageParam = AddOutputParam(cmd, "@out_vch_error_message", DbType.String, 500);

            await cmd.ExecuteNonQueryAsync();

            var errorCode = errorCodeParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorCodeParam.Value) ?? string.Empty;
            var errorMessage = errorMessageParam.Value == DBNull.Value ? string.Empty : Convert.ToString(errorMessageParam.Value) ?? string.Empty;
            var isSuccess = string.IsNullOrWhiteSpace(errorCode) || string.Equals(errorCode, "0", StringComparison.OrdinalIgnoreCase);

            return new
            {
                outbound_master_id = outbound_master_id,
                error_code = errorCode,
                error_message = errorMessage,
                message_status = isSuccess ? "success" : "error",
            };
        }
    }
}
