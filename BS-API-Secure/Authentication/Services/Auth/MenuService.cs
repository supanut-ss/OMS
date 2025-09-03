using Authentication.Interfaces;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Authentication.Services.Auth
{
    public class MenuService : IMenu
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY") ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly IClientInfo _clientInfo;
        public MenuService(IClientInfo clientInfo)
        {
            _clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        }

        public async Task<MenuResponse> GetAuthenMenu(int groupId,string platform)
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
                            ParentMenuId = reader["parent_menu_id"] != DBNull.Value ? int.Parse(reader["parent_menu_id"].ToString() ?? "0") : null,
                            MenuId = reader["menu_id"] != DBNull.Value ? int.Parse(reader["menu_id"].ToString() ?? "0") : 0,
                            ParentMenuId = reader["parent_menu_id"] != DBNull.Value ? int.Parse(reader["parent_menu_id"].ToString() ?? "0") : 0,
                            MenuName = reader["menu_name"].ToString() ?? "",
                            MenuGroup = reader["menu_group"].ToString() ?? "",
                            MenuPath = reader["process"].ToString() ?? "",
                            MenuGroupSequence =  reader["menu_group_sequence"] != DBNull.Value ? int.Parse(reader["menu_group_sequence"].ToString() ?? "0") : 0,
                            MenuSequence = reader["menu_sequence"] != DBNull.Value ? int.Parse(reader["menu_sequence"].ToString() ?? "0") : 0, 
                        };

                        response.data.Add(data);
                    }
                }

                return response;
            }
        }

    }
}
