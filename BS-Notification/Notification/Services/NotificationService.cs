using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Notification.Hubs;
using Notification.Interfaces;
using Notification.Models;
using Notification.Models.Requests;
using Notification.Models.Responses;
using System.Data;
using TokenManagement.Database;

namespace Notification.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly IHubContext<NotificationHub> _hub;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(IDbConnectionFactory connectionFactory, IHubContext<NotificationHub> hub, ILogger<NotificationService> logger)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
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

                await using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                await using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_by_user", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchUserId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intLimit", limit));

                var pOutCode = _connectionFactory.CreateOutputParameter("@out_vchErrorCode", DbType.String, 50);
                var pOutMsg = _connectionFactory.CreateOutputParameter("@out_vchErrorMessage", DbType.String, 500);
                var pTotal = _connectionFactory.CreateOutputParameter("@out_intTotal", DbType.Int32, 0);
                var pUnreadTotal = _connectionFactory.CreateOutputParameter("@out_intUnreadTotal", DbType.Int32, 0);

                cmd.Parameters.Add(pOutCode);
                cmd.Parameters.Add(pOutMsg);
                cmd.Parameters.Add(pTotal);
                cmd.Parameters.Add(pUnreadTotal);

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
                        create_date = reader.GetDateTime(reader.GetOrdinal("create_date")),
                        read_date = reader["read_date"] as DateTime?
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
                await using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                await using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_mark_read", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchUserId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intNotifyId", notifyId));

                var pOutCode = _connectionFactory.CreateOutputParameter("@out_vchErrorCode", DbType.String, 50);
                var pOutMsg = _connectionFactory.CreateOutputParameter("@out_vchErrorMessage", DbType.String, 500);
                var pTotal = _connectionFactory.CreateOutputParameter("@out_intTotal", DbType.Int32, 0);
                var pUnreadTotal = _connectionFactory.CreateOutputParameter("@out_intUnreadTotal", DbType.Int32, 0);

                cmd.Parameters.Add(pOutCode);
                cmd.Parameters.Add(pOutMsg);
                cmd.Parameters.Add(pTotal);
                cmd.Parameters.Add(pUnreadTotal);

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
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_insert", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchType", "info"));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchTitle", "Notification"));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchDescription", request.Message));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchLink", DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchFromUser", form_user));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchToUser", to_user));

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
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_soft_delete", conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchUserId", userId));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intNotifyId", notifyId));

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
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var tran = conn.BeginTransaction();
                try
                {
                    using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_noti_insert_all_users", conn);
                    cmd.Transaction = tran;

                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchType", request.Type));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchTitle", request.Title));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchDescription", request.Message));
                    cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchFromUser", fromUser));

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

        public async Task<BannerResponse> GetBannerAsync()
        {
            var response = new BannerResponse();

            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_get_banner", conn);

                using var reader = await cmd.ExecuteReaderAsync();

                var bannerDict = new Dictionary<int, BannerItem>();

                // ===============================
                // Result Set 1 : Banner Main
                // ===============================
                while (await reader.ReadAsync())
                {
                    var banner = new BannerItem
                    {
                        id = reader.GetInt32(reader.GetOrdinal("id")),
                        type = reader["type"]?.ToString() ?? "",
                        title = reader["title"]?.ToString() ?? "",
                        description = reader["description"]?.ToString() ?? "",
                        link = reader["link"]?.ToString(),
                        create_date = reader.GetDateTime(reader.GetOrdinal("create_date")),
                        list = new List<BannerLink>()
                    };

                    bannerDict.Add(banner.id, banner);
                }

                // ===============================
                // Result Set 2 : Banner Detail
                // ===============================
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        int bannerId = reader.GetInt32(reader.GetOrdinal("banner_id"));

                        if (bannerDict.ContainsKey(bannerId))
                        {
                            bannerDict[bannerId].list.Add(new BannerLink
                            {
                                name = reader["name"]?.ToString(),
                                imageUrl = reader["imageUrl"]?.ToString() ?? ""
                            });
                        }
                    }
                }

                response.data = bannerDict.Values.ToList();
                response.message_code = 0;
                response.message_text = "success";

                return response;
            }
            catch (Exception ex)
            {
                return new BannerResponse
                {
                    message_code = 1,
                    message_text = ex.Message
                };
            }
        }
        public async Task<BannerResponse> ManageBannerAsync(ManageBannerRequest request)
        {
            var response = new BannerResponse();

            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_manage_banner", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchAction", request.action));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intId", (object?)request.id ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchType", (object?)request.type ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchTitle", (object?)request.title ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchDescription", (object?)request.description ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchLink", (object?)request.link ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchStartDate", (object?)request.start_date ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchEndDate", (object?)request.end_date ?? DBNull.Value));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intPriority", request.priority));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_bitIsActive", request.is_active));
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_vchUpdateBy", (object?)request.update_by ?? DBNull.Value));

                // ===============================
                // Table-Valued Parameter (SQL Server specific)
                // ===============================
                var table = new DataTable();
                table.Columns.Add("name", typeof(string));
                table.Columns.Add("imageUrl", typeof(string));
                table.Columns.Add("sort_order", typeof(int));

                foreach (var item in request.details)
                {
                    table.Rows.Add(item.name, item.imageUrl, item.sort_order);
                }

                var tvpParam = new SqlParameter("@BannerDetails", table)
                {
                    SqlDbType = SqlDbType.Structured,
                    TypeName = "noti.BannerDetailType"
                };

                cmd.Parameters.Add(tvpParam);

                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    response.message_code = Convert.ToInt32(reader["message_code"]);
                    response.message_text = reader["message_text"].ToString() ?? "";
                }

                return response;
            }
            catch (Exception ex)
            {
                return new BannerResponse
                {
                    message_code = 1,
                    message_text = ex.Message
                };
            }
        }

        public async Task<BannerResponse> DeleteBannerAsync(DeleteBannerRequest request)
        {
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_delete_banner", conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intId", request.id));
                var pOutCode = _connectionFactory.CreateOutputParameter("@out_vchErrorCode", DbType.String, 50);
                var pOutMsg = _connectionFactory.CreateOutputParameter("@out_vchErrorMessage", DbType.String, 500);
                cmd.Parameters.Add(pOutCode);
                cmd.Parameters.Add(pOutMsg);
                await cmd.ExecuteNonQueryAsync();
                var response = new BannerResponse
                {
                    message_code = int.TryParse(pOutCode.Value?.ToString(), out var code) ? code : 0,
                    message_text = pOutMsg.Value?.ToString() ?? "deleted"
                };
                return response;
            }
            catch (Exception ex)
            {
                return new BannerResponse
                {
                    message_code = 1,
                    message_text = ex.Message
                };
            }
        }

        public async Task<BannerResponse> GetBannerDetailAsync(int bannerId)
        {
            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();
                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_get_banner_detail", conn);
                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intId", bannerId));
                using var reader = await cmd.ExecuteReaderAsync();
                var response = new BannerResponse();
                if (await reader.ReadAsync())
                {
                    response.message_code = 0;
                    response.message_text = "success";
                    response.data.Add(new BannerItem
                    {
                        id = reader.GetInt32(reader.GetOrdinal("id")),
                        type = reader["type"]?.ToString() ?? "",
                        title = reader["title"]?.ToString() ?? "",
                        description = reader["description"]?.ToString() ?? "",
                        link = reader["link"]?.ToString(),
                        create_date = reader.GetDateTime(reader.GetOrdinal("create_date")),
                        list = new List<BannerLink>()
                    });
                }
                return response;
            }
            catch (Exception ex)
            {
                return new BannerResponse
                {
                    message_code = 1,
                    message_text = ex.Message
                };
            }
        }

        public async Task<BannerResponse> GetBannerByIdAsync(int id)
        {
            var response = new BannerResponse();

            try
            {
                using var conn = _connectionFactory.CreateConnection();
                await conn.OpenAsync();

                using var cmd = _connectionFactory.CreateProcedureCommand("noti.usp_get_banner_by_id", conn);

                cmd.Parameters.Add(_connectionFactory.CreateParameter("@in_intId", id));

                using var reader = await cmd.ExecuteReaderAsync();

                BannerItem? banner = null;

                // -------------------------
                // Result 1 : Banner Header
                // -------------------------
                if (await reader.ReadAsync())
                {
                    banner = new BannerItem
                    {
                        id = reader.GetInt32(reader.GetOrdinal("id")),
                        type = reader["type"]?.ToString() ?? "",
                        title = reader["title"]?.ToString() ?? "",
                        description = reader["description"]?.ToString() ?? "",
                        link = reader["link"] as string,
                        create_date = reader.GetDateTime(reader.GetOrdinal("create_date")),
                        list = new List<BannerLink>()
                    };

                    response.data.Add(banner);
                }

                // -------------------------
                // Result 2 : Banner Detail
                // -------------------------
                if (banner != null && await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        banner.list.Add(new BannerLink
                        {
                            name = reader["name"]?.ToString(),
                            imageUrl = reader["imageUrl"]?.ToString() ?? ""
                        });
                    }
                }

                response.message_code = 0;
                response.message_text = "success";

                return response;
            }
            catch (Exception ex)
            {
                return new BannerResponse
                {
                    message_code = 1,
                    message_text = ex.Message
                };
            }
        }

    }
}
