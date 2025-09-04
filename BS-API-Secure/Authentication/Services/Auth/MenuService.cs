using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Authentication.Prototype;
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

        public async Task<MenuResponse> GetAuthenMenu(int groupId, string platform)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using var cmd = new SqlCommand("sec.usp_get_menu_assign", conn);

                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@in_intUserGroupId", groupId);
                cmd.Parameters.AddWithValue("@in_vchPlatform", platform);


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
                            UserGroupId = reader["user_group_id"] != DBNull.Value ? int.Parse(reader["user_group_id"].ToString() ?? "0") : 0,
                            IsAddView = reader["is_add_view"].ToString() ?? "",
                            IsEditView = reader["is_edit_view"].ToString() ?? "",
                            IsDeleteView = reader["is_delete_view"].ToString() ?? "",
                            IsView = reader["is_view"].ToString() ?? "",
                            ParentMenuId = reader["parent_menu_id"] != DBNull.Value ? int.Parse(reader["parent_menu_id"].ToString() ?? "0") : 0,
                            MenuId = reader["menu_id"] != DBNull.Value ? int.Parse(reader["menu_id"].ToString() ?? "0") : 0,
                            MenuName = reader["menu_name"].ToString() ?? "",
                            MenuGroup = reader["menu_group"].ToString() ?? "",
                            MenuPath = reader["process"].ToString() ?? "",
                            MenuGroupSequence = reader["menu_group_sequence"] != DBNull.Value ? int.Parse(reader["menu_group_sequence"].ToString() ?? "0") : 0,
                            MenuSequence = reader["menu_sequence"] != DBNull.Value ? int.Parse(reader["menu_sequence"].ToString() ?? "0") : 0,
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
