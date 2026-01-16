using Microsoft.Data.SqlClient;
using System.Data;
using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Models;

namespace BS_Notify_Worker.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly string _conn;

        public NotificationRepository(IConfiguration config)
        {
            _conn = Environment.GetEnvironmentVariable("SERVERDB")
                ?? throw new ArgumentNullException("ConnectionString");
        }

        public async Task<List<NotificationItem>> PickForDispatchAsync(int limit)
        {
            var list = new List<NotificationItem>();

            using var conn = new SqlConnection(_conn);
            await conn.OpenAsync();

            using var cmd = new SqlCommand("noti.usp_noti_pick_for_dispatch", conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@limit", limit);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                list.Add(new NotificationItem
                {
                    id = reader.GetInt32(reader.GetOrdinal("id")),
                    type = reader.GetString(reader.GetOrdinal("type")),
                    title = reader.GetString(reader.GetOrdinal("title")),
                    description = reader["description"] as string ?? "",
                    link = reader["link"] as string ?? "",
                    to_user = reader.GetString(reader.GetOrdinal("to_user")),
                    from_user = reader.GetString(reader.GetOrdinal("from_user")),
                });
            }
            
            return list;
        }

        public async Task MarkDispatchedAsync(int id)
        {
            using var conn = new SqlConnection(_conn);
            await conn.OpenAsync();

            using var cmd = new SqlCommand("noti.usp_noti_mark_dispatched", conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@in_intId", id);

            await cmd.ExecuteNonQueryAsync();
        }
    }
}
