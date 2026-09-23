using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using DotNetEnv;
using System.Data;
using System.Data.Common;

namespace ApiCore.Services.Implementation
{
    public class InventoryService : IInventory
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<InventoryService> _logger;

        public InventoryService(ISqlConnectionFactory connectionFactory, ILogger<InventoryService> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        // ฟังก์ชันช่วยดึงข้อมูลเดิมจาก View โดยใช้ร่วมกันผ่าน DbConnection เดียวกัน
        private async Task<InventorySerial> GetInventorySerial(DbConnection conn, string inventoryIdSerial)
        {
            int? inventoryId = inventoryIdSerial.Split('|').Length > 0 ? int.Parse(inventoryIdSerial.Split('|')[0]) : (int?)null;
            string? serialNumber = inventoryIdSerial.Split('|').Length > 1 ? inventoryIdSerial.Split('|')[1] : null;

            var query = string.IsNullOrEmpty(serialNumber)
                ? @"SELECT * FROM inv.v_inv_inventory_for_change WHERE inventory_id = @inventory_id"
                : @"SELECT * FROM inv.v_inv_inventory_for_change WHERE inventory_id = @inventory_id AND serial_number = @serial_number";

            using (var cmd = _connectionFactory.CreateCommand(query, conn))
            {
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@inventory_id", inventoryId));
                if (!string.IsNullOrEmpty(serialNumber))
                {
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@serial_number", serialNumber));
                }
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        return new InventorySerial
                        {
                            InventoryId = GetIntOrDefault(reader, "inventory_id"),
                            WarehouseId = GetIntOrDefault(reader, "warehouse_id"),
                            Warehouse = GetStringOrNull(reader, "warehouse"),
                            OwnerId = GetIntOrDefault(reader, "owner_id"),
                            OwnerCode = GetStringOrNull(reader, "owner_code"),
                            ZoneId = GetIntOrDefault(reader, "zone_id"),
                            Zone = GetStringOrNull(reader, "zone"),
                            LocationId = GetIntOrDefault(reader, "location_id"),
                            Location = GetStringOrNull(reader, "location"),
                            LocationType = GetStringOrNull(reader, "loc_type"),
                            ItemMasterId = GetIntOrDefault(reader, "item_master_id"),
                            ItemNumber = GetStringOrNull(reader, "item_number"),
                            ItemDescription = GetStringOrNull(reader, "item_description"),
                            CategoryId = GetIntOrDefault(reader, "category_id"),
                            ItemCategory = GetStringOrNull(reader, "item_category"),
                            Uom = GetStringOrNull(reader, "uom"),
                            Quantity = GetDecimalOrDefault(reader, "quantity"),
                            QuantityAllocated = GetDecimalOrDefault(reader, "quantity_allocated"),
                            InventoryStatus = GetStringOrNull(reader, "inv_status"),
                            ReceiveDate = GetDateTimeOrNull(reader, "receive_date"),
                            ExpiryDate = GetDateTimeOrNull(reader, "expiry_date"),
                            LotNumber = GetStringOrNull(reader, "lot_number"),
                            SerialNumber = GetStringOrNull(reader, "serial_number")
                        };
                    }
                }
            }
            return new InventorySerial();
        }
        //เปลี่ยนไปเรียก ALTER PROCEDURE [inv].[usp_generate_reference_id]
        //    @out_vch_reference_id NVARCHAR(50) OUTPUT
        
        private async Task<string> GenerateReferenceId(DbConnection conn)
        {
            using (var cmd = _connectionFactory.CreateCommand("inv.usp_generate_reference_id", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                var referenceIdParam = cmd.CreateParameter();
                referenceIdParam.ParameterName = "@out_vch_reference_id";
                referenceIdParam.DbType = DbType.String;
                referenceIdParam.Size = 50;
                referenceIdParam.Direction = ParameterDirection.Output;
                cmd.Parameters.Add(referenceIdParam);
                await cmd.ExecuteNonQueryAsync();
                return referenceIdParam.Value?.ToString() ?? Guid.NewGuid().ToString();
            }
        }
        // 1. ฟังก์ชันย้ายโลเคชัน
        public async Task<InventoryResponse> ChangeLocation(ChangeLocationRequest request)
        {
            var response = new InventoryResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    await conn.OpenAsync();

                    var referenceId = await GenerateReferenceId(conn);

                    foreach (var invId in request.InventoryIdSerials)
                    {
                        try
                        {
                            // ดึงข้อมูล Master ของสินค้าชิ้นนี้ขึ้นมาก่อนเพื่อส่งเข้า Store Proc
                            var serialInfo = await GetInventorySerial(conn, invId);

                            using (var cmd = _connectionFactory.CreateCommand("inv.usp_inventory_putaway", conn))
                            {
                                cmd.CommandType = CommandType.StoredProcedure;

                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inventory_id", serialInfo.InventoryId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_number", serialInfo.ItemNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_location", serialInfo.Location ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lot_number", serialInfo.LotNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_expiry_date", serialInfo.ExpiryDate ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_serial_number", serialInfo.SerialNumber ?? (object)DBNull.Value));

                                // ดึงค่าแชร์ร่วมกันมาจากด้านบนของ Request 
                                var resolvedQty = request.InventoryIdSerials.Count > 1
                                    ? serialInfo.Quantity
                                    : request.Quantity ?? serialInfo.Quantity;
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_qty", resolvedQty ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_target_location", request.Location));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Lang ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_reference_id", referenceId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_tran_type", "INV_MOVE"));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_sub_tran_type", "CHANGE_LOCATION"));

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

                                await cmd.ExecuteNonQueryAsync();

                                var errorCode = errorCodeParam.Value?.ToString() ?? "500";
                                var errorMessage = errorMessageParam.Value?.ToString() ?? "Unknown error";

                                if (errorCode != "0")
                                {
                                    var displayItem = serialInfo.ItemNumber ?? $"ID {serialInfo.InventoryId}";
                                    var displaySerial = serialInfo.SerialNumber ?? "N/A";
                                    response.Errors.Add($"Item {displayItem} : Serial {displaySerial}: {errorMessage}");
                                }
                            }
                        }
                        catch (Exception itemEx)
                        {
                            _logger.LogError(itemEx, $"Runtime Error during moving Inventory ID: {invId}");
                            response.Errors.Add($"Inventory ID {invId}: {itemEx.Message}");
                        }
                    }
                }

                // สรุปผล
                if (response.Errors.Any())
                {
                    response.Success = false;
                    response.Message = "Completed with some errors.";
                }
                else
                {
                    response.Success = true;
                    response.Message = "All items moved successfully.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical: Change Location failed at connection level");
                response.Success = false;
                response.Message = $"Critical Connection Error: {ex.Message}";
            }

            return response;
        }

        // 2. ฟังก์ชันเปลี่ยนสถานะสินค้า
        public async Task<InventoryResponse> StatusChange(StatusChangeRequest request)
        {
            var response = new InventoryResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    await conn.OpenAsync();

                    var referenceId = await GenerateReferenceId(conn);

                    foreach (var invId in request.InventoryIdSerials)
                    {
                        try
                        {
                            var serialInfo = await GetInventorySerial(conn, invId);

                            using (var cmd = _connectionFactory.CreateCommand("inv.usp_inventory_change_status", conn))
                            {
                                cmd.CommandType = CommandType.StoredProcedure;

                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inventory_id", serialInfo.InventoryId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_number", serialInfo.ItemNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_uom", serialInfo.Uom ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lot_number", serialInfo.LotNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_expiry_date", serialInfo.ExpiryDate ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_serial_number", serialInfo.SerialNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_location", serialInfo.Location ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_from_inv_status", serialInfo.InventoryStatus ?? (object)DBNull.Value));

                                // ดึงค่าแชร์ร่วมกันมาจากด้านบนของ Request
                                var resolvedQty = request.InventoryIdSerials.Count > 1
                                    ? serialInfo.Quantity
                                    : request.Quantity ?? serialInfo.Quantity;
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_qty", resolvedQty ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_to_inv_status", request.InventoryStatus));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Lang ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId ?? (object)DBNull.Value));

                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_reference_id", referenceId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? (object)DBNull.Value));

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

                                await cmd.ExecuteNonQueryAsync();

                                var errorCode = errorCodeParam.Value?.ToString() ?? "500";
                                var errorMessage = errorMessageParam.Value?.ToString() ?? "Unknown error";

                                if (errorCode != "0")
                                {
                                    var displayItem = serialInfo.ItemNumber ?? $"ID {serialInfo.InventoryId}";
                                    var displaySerial = serialInfo.SerialNumber ?? "N/A";
                                    response.Errors.Add($"Item {displayItem} : Serial {displaySerial}: {errorMessage}");
                                }
                            }
                        }
                        catch (Exception itemEx)
                        {
                            _logger.LogError(itemEx, $"Runtime Error during changing status for Inventory ID: {invId}");
                            response.Errors.Add($"Inventory ID {invId}: {itemEx.Message}");
                        }
                    }
                }

                // สรุปผล
                if (response.Errors.Any())
                {
                    response.Success = false;
                    response.Message = "Completed with some errors.";
                }
                else
                {
                    response.Success = true;
                    response.Message = "All items status changed successfully.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical: Status Change failed at connection level");
                response.Success = false;
                response.Message = $"Critical Connection Error: {ex.Message}";
            }

            return response;
        }
        public async Task<InventoryResponse> Adjustment(AdjustmentRequest request)
        {
            var response = new InventoryResponse();

            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    await conn.OpenAsync();

                    foreach (var item in request.Items) // วนลูปผ่านคลาสลูกทีละคู่
                    {
                        try
                        {
                            // 1. เอา item.InventoryId ไปคิวรีหาข้อมูลจาก View เดิมก่อน
                            var serialInfo = await GetInventorySerial(conn, item.InventoryIdSerials);

                            // 2. เรียกใช้ Store Procedure ของ Adjustment (สมมติชื่อ usp_inventory_adjustment)
                            using (var cmd = _connectionFactory.CreateCommand("inv.usp_inventory_adjustment", conn))
                            {
                                string? SerialDisplay = request.AdjustmentType == "ADJUST_IN" ? item.SerialNumber : serialInfo.SerialNumber;
                                cmd.CommandType = CommandType.StoredProcedure;

                                // พารามิเตอร์เฉพาะตัวของชิ้นนั้นๆ
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_inventory_id", serialInfo.InventoryId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_qty", item.Quantity)); // ใช้ Qty เฉพาะของมันเอง
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_number", serialInfo.ItemNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_location", serialInfo.Location ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lot_number", serialInfo.LotNumber ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_expiry_date", serialInfo.ExpiryDate ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_inv_status", serialInfo.InventoryStatus ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_serial_number", SerialDisplay ?? (object)DBNull.Value));
                                // พารามิเตอร์ส่วนกลางจาก Header ด้านบน
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_adj_type", request.AdjustmentType ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? (object)DBNull.Value));
                                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Lang ?? (object)DBNull.Value));

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

                                await cmd.ExecuteNonQueryAsync();

                                var errorCode = errorCodeParam.Value?.ToString() ?? "500";
                                var errorMessage = errorMessageParam.Value?.ToString() ?? "Unknown error";

                                if (errorCode != "0")
                                {
                                    var displayItem = serialInfo.ItemNumber ?? $"ID {serialInfo.InventoryId}";
                                    var displaySerial = serialInfo.SerialNumber ?? "N/A";
                                    response.Errors.Add($"Item {displayItem} : Serial {displaySerial}: {errorMessage}");
                                }
                            }
                        }
                        catch (Exception itemEx)
                        {
                            var displayInventoryIdSerial = string.IsNullOrWhiteSpace(item.InventoryIdSerials)
                                ? "N/A"
                                : item.InventoryIdSerials;

                            _logger.LogError(itemEx, "Runtime Error during adjustment for Inventory ID/Serial: {InventoryIdSerial}", displayInventoryIdSerial);
                            response.Errors.Add($"Inventory ID/Serial {displayInventoryIdSerial}: {itemEx.Message}");
                        }
                    }
                }
                // สรุปผล
                if (response.Errors.Any())
                {
                    response.Success = false;
                    response.Message = "Completed with some errors.";
                }
                else
                {
                    response.Success = true;
                    response.Message = "All items adjusted successfully.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical: Adjustment failed at connection level");
                response.Success = false;
                response.Message = $"Critical Connection Error: {ex.Message}";
            }
            // ... ส่วนสรุปผล Success / Message ...
            return response;
        }
        public async Task<InventoryResponse> AdjustIn(AdjustInRequest request)
        {
            var response = new InventoryResponse();
            try
            {
                using (var conn = _connectionFactory.CreateConnection())
                {
                    await conn.OpenAsync();

                    try
                    {
                        using (var cmd = _connectionFactory.CreateCommand("inv.usp_inventory_adjustment_new_stock", conn))
                        {
                            cmd.CommandType = CommandType.StoredProcedure;

                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_item_number", request.ItemNumber));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lot_number", request.LotNumber ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_expiry_date", request.ExpiryDate ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_serial_number", request.SerialNumber ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dec_qty", request.Quantity));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_location", request.Location));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_inv_status", request.InventoryStatus ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_dt_receive_date", request.ReceiveDate));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_remark", request.Remark ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", request.UserId));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_device", request.Device ?? (object)DBNull.Value));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_lang", request.Lang ?? (object)DBNull.Value));

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

                            await cmd.ExecuteNonQueryAsync();

                            response.Success = errorCodeParam.Value?.ToString() == "0";
                            response.Message = errorMessageParam.Value?.ToString() ?? "Unknown error";

                        }
                    }
                    catch (Exception itemEx)
                    {
                        _logger.LogError(itemEx, $"Runtime Error during moving Item number: {request.ItemNumber}");
                        response.Errors.Add($"Item number {request.ItemNumber}: {itemEx.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical: Adjust In failed at connection level");
                response.Success = false;
                response.Message = $"Critical Connection Error: {ex.Message}";
            }

            return response;
        }

        #region Helper Methods
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
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        private static int GetIntOrDefault(DbDataReader reader, string columnName, int defaultValue = 0)
        {
            if (!HasColumn(reader, columnName)) return defaultValue;
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt32(reader.GetValue(ordinal));
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

        #endregion
    }
}