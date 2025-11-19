using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
using Azure.Core;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.RegularExpressions;

namespace Authentication.Services.Auth
{
    public class MenuService : IMenu
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly string schema = Environment.GetEnvironmentVariable("DB_SCHEMA") ?? "sec";
        private readonly IClientInfo _clientInfo;
        public MenuService(IClientInfo clientInfo)
        {
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }

        public async Task<MasterResponse> Favorite(MenuFavoriteRequest request, string userId)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using var cmd = new SqlCommand("sec.usp_menu_favorite", conn);

                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@in_vchUserID", userId);
                cmd.Parameters.AddWithValue("@in_IntMenuId", request.menu_id);

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
                await cmd.ExecuteNonQueryAsync();

                string errorCode = errorCodeParam.Value?.ToString() ?? "1";
                string errorMessage = errorMsgParam.Value?.ToString() ?? "error";

                return new MasterResponse { message_code = errorCode, message_text = errorMessage };
            }
         }

        public async Task<MenuResponse> GetAuthenMenu(int groupId, string platform,string userId)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using var cmd = new SqlCommand("sec.usp_get_menu_assign", conn);

                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@in_intUserGroupId", groupId);
                cmd.Parameters.AddWithValue("@in_vchPlatform", platform);
                cmd.Parameters.AddWithValue("@in_vchUserId", userId);

                using var reader = await cmd.ExecuteReaderAsync();
                var response = new MenuResponse
                {
                    message_code = "0",
                    message_text = "Success",
                    data = new List<MenuDataResponse>()
                };

                if (reader.HasRows)
                {
                    while (await reader.ReadAsync())
                    {
                        var data = new MenuDataResponse
                        {
                            user_group_id = reader["user_group_id"] != DBNull.Value ? int.Parse(reader["user_group_id"].ToString() ?? "0") : 0,
                            is_add_view = reader["is_add_view"].ToString() ?? "",
                            is_edit_view = reader["is_edit_view"].ToString() ?? "",
                            is_delete_view = reader["is_delete_view"].ToString() ?? "",
                            is_view = reader["is_view"].ToString() ?? "",
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
                }

                return response;
            }
        }

        public async Task<MasterResponse> SaveAssignMenu(List<MenuAssignRequest> listMenu, string userId)
        {
            var response = new MenuResponse
            {
                message_code = "0",
                message_text = "Success",
            };

            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                // Begin a transaction using SqlTransaction
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        foreach (var item in listMenu)
                        {
                            //ทำการลบข้อมูล ที่ไม่ได้ทำการ Check ออกทั้งหมดก่อนจะ Insert หรืออัพเดทเมนูเข้าไป
                            using var cmd = new SqlCommand("sec.usp_update_menu_assign", conn, transaction);

                            cmd.CommandType = CommandType.StoredProcedure;

                            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50) { Direction = ParameterDirection.Output };
                            var errorMsgParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500) { Direction = ParameterDirection.Output };

                            // You need to provide groupId and platform variables or get them from item
                            cmd.Parameters.AddWithValue("@in_intUserGroupId", item.UserGroupId);
                            cmd.Parameters.AddWithValue("@in_intMenuId", item.menu_id);
                            cmd.Parameters.AddWithValue("@in_vchIsAddView", item.IsAddView);
                            cmd.Parameters.AddWithValue("@in_vchIsEditView", item.IsEditView); 
                            cmd.Parameters.AddWithValue("@in_vchIsDeleteView", item.IsDeleteView);
                            cmd.Parameters.AddWithValue("@in_vchIsView", item.IsView);
                            cmd.Parameters.AddWithValue("@in_vchCreateBy", userId);
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
