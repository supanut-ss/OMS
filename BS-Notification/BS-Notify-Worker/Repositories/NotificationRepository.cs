using System.Data;
using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Models;
using TokenManagement.Database;

namespace BS_Notify_Worker.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public NotificationRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        }

        public async Task<List<NotificationItem>> PickForDispatchAsync(int limit)
        {
            var list = new List<NotificationItem>();

            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_pick_for_dispatch", conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@limit", limit));

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
            using var conn = _connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_mark_dispatched", conn);
            cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intId", id));

            await cmd.ExecuteNonQueryAsync();
        }
    }
}

