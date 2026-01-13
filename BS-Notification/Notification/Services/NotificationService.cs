using Microsoft.AspNetCore.SignalR;
using Notification.Hubs;
using Notification.Models;

namespace Notification.Services
{
    public class NotificationService
    {
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
    }
}
