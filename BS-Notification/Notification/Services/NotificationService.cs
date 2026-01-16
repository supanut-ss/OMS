using Microsoft.AspNetCore.Components.Routing;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Notification.Hubs;
using Notification.Interfaces;
using Notification.Models;
using Notification.Models.Requests;
using Notification.Models.Responses;
using System.Data;
using System.Reflection.PortableExecutable;

namespace Notification.Services
{
    public class NotificationService : INotificationService
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB_SECURITY")
                ?? throw new ArgumentNullException(nameof(_connectionString));
        private readonly IHubContext<NotificationHub> _hub;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(IHubContext<NotificationHub> hub, ILogger<NotificationService> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        public async Task NotifyAll(NotifyRequest notify)
        {
            _logger.LogInformation("NotifyAll called with message={Message}", notify);
            try
            {
                await _hub.Clients.All.SendAsync("ReceiveAll", notify);
                _logger.LogInformation("NotifyAll SendAsync completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during NotifyAll SendAsync");
                throw;
            }
        }

        public async Task NotifyUser(string userId, NotifyRequest request)
        {
            _logger.LogInformation("NotifyUser called for user={UserId} message={Message}", userId, request);
            try
            {
                await _hub.Clients.Group(userId)
                                  .SendAsync("ReceiveUser", request);
                _logger.LogInformation("NotifyUser SendAsync completed for user={UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during NotifyUser SendAsync for user={UserId}", userId);
                throw;
            }
        }

        public async Task<NotifyResponse> GetNotifyListAsync(string userId, int limit)
        {
            try
            {
                var list = new List<NotificationItem>();

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = new SqlCommand("noti.usp_noti_by_user", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                cmd.Parameters.Add(new SqlParameter("@in_vchUserId", SqlDbType.NVarChar, 100)
                {
                    Value = userId
                });

                cmd.Parameters.Add(new SqlParameter("@in_intLimit", SqlDbType.Int)
                {
                    Value = limit
                });

                var pOutCode = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutMsg = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };
                var pTotal = new SqlParameter("@out_intTotal", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                var pUnreadTotal = new SqlParameter("@out_intUnreadTotal", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };

                cmd.Parameters.AddRange(new[]
                {
            pOutCode,
            pOutMsg,
            pTotal,
            pUnreadTotal
        });

                await using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    list.Add(new NotificationItem
                    {
                        id = reader.GetInt32(reader.GetOrdinal("id")),
                        type = reader.GetString(reader.GetOrdinal("type")),
                        title = reader.GetString(reader.GetOrdinal("title")),
                        description = reader["description"] as string,
                        link = reader["link"] as string,
                        is_read = reader.GetBoolean(reader.GetOrdinal("is_read")),
                        from_user = reader.GetString(reader.GetOrdinal("from_user")),
                        to_user = reader.GetString(reader.GetOrdinal("to_user")),
                        create_at = reader.GetDateTime(reader.GetOrdinal("create_at")),
                        read_at = reader["read_at"] as DateTime?
                    });
                }

                // 🔥 สำคัญ: consume result set ที่เหลือ (กัน output หาย)
                while (await reader.NextResultAsync()) { }

                // ✅ อ่าน OUTPUT หลัง reader ปิดจริง
                var errorCode = pOutCode.Value?.ToString();
                var errorMsg = pOutMsg.Value?.ToString();

                var total = Convert.ToInt32(pTotal.Value ?? 0);
                var unreadTotal = Convert.ToInt32(pUnreadTotal.Value ?? 0);

                _logger.LogInformation(
                    "GetNotifyListAsync completed user={UserId}, count={Count}, total={Total}, unread={Unread}",
                    userId, list.Count, total, unreadTotal
                );

                return new NotifyResponse
                {
                    message_code = int.TryParse(errorCode, out var code) ? code : 0,
                    message_text = errorMsg ?? "success",
                    total = total,
                    unread_total = unreadTotal,
                    data = list
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNotifyListAsync for user={UserId}", userId);
                return new NotifyResponse
                {
                    message_code = 500,
                    message_text = ex.Message
                };
            }
        }

        public async Task<NotifyResponse> MarkNotifyAsRead(string userId, int notifyId)
        {
            try
            {
                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = new SqlCommand("noti.usp_noti_mark_read", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                cmd.Parameters.Add(new SqlParameter("@in_vchUserId", SqlDbType.NVarChar, 100)
                {
                    Value = userId
                });

                cmd.Parameters.Add(new SqlParameter("@in_intNotifyId", SqlDbType.Int)
                {
                    Value = notifyId
                });

                var pOutCode = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var pOutMsg = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };
                var pTotal = new SqlParameter("@out_intTotal", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                var pUnreadTotal = new SqlParameter("@out_intUnreadTotal", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };

                cmd.Parameters.AddRange(new[]
                {
            pOutCode,
            pOutMsg,
            pTotal,
            pUnreadTotal
        });

                // ✅ ExecuteNonQuery เหมาะที่สุด
                await cmd.ExecuteNonQueryAsync();

                var errorCode = pOutCode.Value?.ToString();
                var errorMsg = pOutMsg.Value?.ToString();

                var total = Convert.ToInt32(pTotal.Value ?? 0);
                var unreadTotal = Convert.ToInt32(pUnreadTotal.Value ?? 0);

                _logger.LogInformation(
                    "MarkNotifyAsRead user={UserId}, notifyId={NotifyId}, total={Total}, unread={Unread}",
                    userId, notifyId, total, unreadTotal
                );

                return new NotifyResponse
                {
                    message_code = int.TryParse(errorCode, out var code) ? code : 0,
                    message_text = errorMsg ?? "marked as read",
                    total = total,
                    unread_total = unreadTotal
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MarkNotifyAsRead user={UserId} notifyId={NotifyId}", userId, notifyId);
                return new NotifyResponse
                {
                    message_code = 500,
                    message_text = ex.Message
                };
            }
        }


        public async Task<NotifyResponse> SaveNotificationToDatabase(string form_user, string to_user, NotifyRequest request)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("noti.usp_noti_insert", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                cmd.Parameters.AddWithValue("@in_vchType", "info");
                cmd.Parameters.AddWithValue("@in_vchTitle", "Notification");
                cmd.Parameters.AddWithValue("@in_vchDescription", request.Message);
                cmd.Parameters.AddWithValue("@in_vchLink", DBNull.Value);
                cmd.Parameters.AddWithValue("@in_vchFromUser", form_user);
                cmd.Parameters.AddWithValue("@in_vchToUser", to_user);

               var res =  await cmd.ExecuteNonQueryAsync();
                if (res <= 0)
                {
                    return new NotifyResponse
                    {
                        message_code = 500,
                        message_text = "failed to save notification"
                    };
                }
                else
                {
                    await _hub.Clients.Group(to_user)
                                      .SendAsync("ReceiveUser", request);
                }
                return new NotifyResponse
                {
                    message_code = 0,
                    message_text = "notification saved"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SaveNotificationToDatabase");
                return new NotifyResponse
                {
                    message_code = 500,
                    message_text = ex.Message
                };
            }
        }
        public async Task<NotifyResponse> DeleteNotification(string userId, int notifyId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("noti.usp_noti_soft_delete", conn)
                {
                    CommandType = CommandType.StoredProcedure
                };
                cmd.Parameters.AddWithValue("@in_vchUserId", userId);
                cmd.Parameters.AddWithValue("@in_intNotifyId", notifyId);

                await cmd.ExecuteNonQueryAsync();

                return new NotifyResponse
                {
                    message_code = 0,
                    message_text = "deleted"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteNotification");
                return new NotifyResponse
                {
                    message_code = 500,
                    message_text = ex.Message
                };
            }
        }
        public async Task<NotifyResponse> SaveAndNotifyAll(string fromUser, NotifyRequest request)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var tran = conn.BeginTransaction();
                try
                {
                    using var cmd = new SqlCommand("noti.usp_noti_insert_all_users", conn, tran)
                    {
                        CommandType = CommandType.StoredProcedure
                    };

                    cmd.Parameters.AddWithValue("@in_vchType", request.Type);
                    cmd.Parameters.AddWithValue("@in_vchTitle", request.Title);
                    cmd.Parameters.AddWithValue("@in_vchDescription", request.Message);
                    cmd.Parameters.AddWithValue("@in_vchFromUser", fromUser);

                    await cmd.ExecuteNonQueryAsync();
                    tran.Commit();
                }
                catch
                {
                    tran.Rollback();
                    throw;
                }
                await _hub.Clients.All.SendAsync("ReceiveAll", request);

                return new NotifyResponse
                {
                    message_code = 0,
                    message_text = "saved and notified all users"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SaveAndNotifyAll");
                return new NotifyResponse
                {
                    message_code = 500,
                    message_text = ex.Message
                };
            }
        }
        public async Task PushToUserAsync(NotifyPushRequest req)
        {
            await _hub.Clients
                .Group(req.userId)
                .SendAsync("ReceiveUser", req);

            _logger.LogInformation(
                "Push sent to user={UserId} title={Title}",
                req.userId, req.title);
        }


    }
}
