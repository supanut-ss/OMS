using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Azure.Core;
using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using TokenManagement.Database;

namespace Authentication.Services.Auth
{
    public class MenuService : IMenu
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        private readonly IClientInfo _clientInfo;
        public MenuService(IDbConnectionFactory connectionFactory, IClientInfo clientInfo)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }

        public async Task<MasterResponse> Favorite(MenuFavoriteRequest request, string userId)
        {
            using (var conn = _connectionFactory.CreateConnection())
            {
                await conn.OpenAsync();
                using var cmd = _connectionFactory.CreateCommand("sec.usp_menu_favorite", conn);

                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_menu_id", request.menu_id));

                var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);
                cmd.Parameters.Add(errorCodeParam);
                cmd.Parameters.Add(errorMsgParam);
                await cmd.ExecuteNonQueryAsync();

                string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                string errorMessage = errorMsgParam.Value?.ToString() ?? "error";

                return new MasterResponse { message_code = errorCode, message_text = errorMessage };
            }
        }

        public async Task<MenuResponse> GetAuthenMenu(int groupId, string platform, string userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateCommand($"{schema}.usp_get_menu_assign", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_user_group_id", groupId));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_platform", platform.ToUpper()));
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_user_id", userId));

            using var reader = await cmd.ExecuteReaderAsync();

            var response = new MenuResponse
            {
                message_code = "0",
                message_text = "Success",
                data = new List<MenuDataResponse>()
            };

            while (await reader.ReadAsync())
            {
                var data = new MenuDataResponse
                {
                    user_group_id = reader["user_group_id"] != DBNull.Value ? int.Parse(reader["user_group_id"].ToString() ?? "0") : 0,
                    is_add_view = reader["is_add_view"] != DBNull.Value ? Convert.ToBoolean(reader["is_add_view"]) : false,
                    is_edit_view = reader["is_edit_view"] != DBNull.Value ? Convert.ToBoolean(reader["is_edit_view"]) : false,
                    is_delete_view = reader["is_delete_view"] != DBNull.Value ? Convert.ToBoolean(reader["is_delete_view"]) : false,
                    is_view = reader["is_view"] != DBNull.Value ? Convert.ToBoolean(reader["is_view"]) : false,
                    parent_menu_id = reader["parent_menu_id"] != DBNull.Value ? int.Parse(reader["parent_menu_id"].ToString() ?? "0") : 0,
                    menu_id = reader["menu_id"] != DBNull.Value ? int.Parse(reader["menu_id"].ToString() ?? "0") : 0,
                    menu_name = reader["menu_name"].ToString() ?? "",
                    menu_group = reader["menu_group"].ToString() ?? "",
                    menu_path = reader["process"].ToString() ?? "",
                    menu_group_sequence = reader["menu_group_sequence"] != DBNull.Value ? int.Parse(reader["menu_group_sequence"].ToString() ?? "0") : 0,
                    menu_sequence = reader["menu_sequence"] != DBNull.Value ? int.Parse(reader["menu_sequence"].ToString() ?? "0") : 0,
                    menu_favorite_id = reader["manu_favorite_id"] != DBNull.Value ? int.Parse(reader["manu_favorite_id"].ToString() ?? "0") : 0,
                };
                response.data.Add(data);
            }

            return response;
        }

        public async Task<MasterResponse> SaveAssignMenu(List<MenuAssignRequest> listMenu, string userId)
        {
            var response = new MenuResponse
            {
                message_code = "0",
                message_text = "Success",
            };

            using (var conn = _connectionFactory.CreateConnection())
            {
                await conn.OpenAsync();

                // Begin a transaction
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        foreach (var item in listMenu)
                        {
                            //ทำการลบข้อมูล ที่ไม่ได้ทำการ Check ออกทั้งหมดก่อนจะ Insert หรืออัพเดทเมนูเข้าไป
                            using var cmd = _connectionFactory.CreateCommand("sec.usp_update_menu_assign", conn);
                            cmd.Transaction = transaction;

                            cmd.CommandType = CommandType.StoredProcedure;

                            var errorCodeParam = _connectionFactory.CreateOutputParameter("@out_vch_error_code", DbType.String, 50);
                            var errorMsgParam = _connectionFactory.CreateOutputParameter("@out_vch_error_message", DbType.String, 500);

                            // You need to provide groupId and platform variables or get them from item
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_user_group_id", item.UserGroupId));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_int_menu_id", item.menu_id));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_is_add_view", item.IsAddView));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_is_edit_view", item.IsEditView));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_is_delete_view", item.IsDeleteView));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bit_is_view", item.IsView));
                            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vch_create_by", userId));
                            cmd.Parameters.Add(errorCodeParam);
                            cmd.Parameters.Add(errorMsgParam);

                            await cmd.ExecuteNonQueryAsync();

                            if (errorCodeParam.Value.ToString() != "0")
                            {
                                response.message_code = errorCodeParam.Value.ToString() ?? "1";
                                response.message_text = errorMsgParam.Value.ToString() ?? "1";
                                break;
                            }
                        }

                        if (response.message_code == "0")
                        {
                            transaction.Commit();
                        }
                        else
                        {
                            transaction.Rollback();
                        }
                    }
                    catch (Exception ex)
                    {
                        response.message_code = "-1";
                        response.message_text = "Exception : " + ex.Message;
                        transaction.Rollback();
                        throw;
                    }
                }
                return response;
            }

        }
    }
}
