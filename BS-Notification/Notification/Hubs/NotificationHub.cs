using Microsoft.AspNetCore.SignalR;

namespace Notification.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        // when user connect -> map connection with user id
        public override async Task OnConnectedAsync()
        {
            try
            {
                var claimSub = Context.User?.FindFirst("sub")?.Value;
                var queryUserId = Context.GetHttpContext()?.Request.Query["userId"].FirstOrDefault();
                var userId = claimSub ?? queryUserId;

                _logger.LogInformation("OnConnectedAsync ConnectionId={ConnectionId} claimSub={ClaimSub} queryUserId={QueryUserId} remoteIp={RemoteIp}",
                    Context.ConnectionId, claimSub, queryUserId, Context.GetHttpContext()?.Connection?.RemoteIpAddress?.ToString());

                if (!string.IsNullOrEmpty(userId))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                    _logger.LogInformation("Added connection {ConnectionId} to group {UserId}", Context.ConnectionId, userId);
                }
                else
                {
                    _logger.LogWarning("No userId found for connection {ConnectionId}", Context.ConnectionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OnConnectedAsync for connection {ConnectionId}", Context.ConnectionId);
            }

            await base.OnConnectedAsync();
        }

        // send to all users
        public async Task SendToAll(string message)
        {
            await Clients.All.SendAsync("ReceiveAll", message);
        }

        // send to specific user
        public async Task SendToUser(string userId, string message)
        {
            await Clients.Group(userId)
                         .SendAsync("ReceiveUser", message);
        }
    }
}
