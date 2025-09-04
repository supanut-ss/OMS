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

        public async Task<MasterResponse> SaveAssignMenu(List<MenuAssignRequest> listMenu)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                //ทำการลบข้อมูล ที่ไม่ได้ทำการ Check ออกทั้งหมดก่อนจะ Insert หรืออัพเดทเมนูเข้าไป
                var sql = $"DELETE [{schema}].t_com_user_group_menu WHERE  password = @password WHERE user_id = @userId";
                using var cmd = new SqlCommand(sql, conn);
                //cmd.Parameters.AddWithValue("@userId", userId);
                //cmd.Parameters.AddWithValue("@password", Encryption.Encrypt(newPassword));

                var rowsAffected = await cmd.ExecuteNonQueryAsync();

                if (rowsAffected == 0)
                    return new MenuResponse
                    {
                        message_code = "1",
                        message_text = "Error Update",
                    }; ;

                //Insert AND Update


                var response = new MenuResponse
                {
                    message_code = "0",
                    message_text = "Success",
                };


                return response;
            }
        }

    }
}
