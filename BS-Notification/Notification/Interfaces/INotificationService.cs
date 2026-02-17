using Notification.Models;
using Notification.Models.Requests;
using Notification.Models.Responses;

namespace Notification.Interfaces
{
    public interface INotificationService
    {
        Task<NotifyResponse> GetNotifyListAsync(string userId,int limit);
        Task<NotifyResponse> MarkNotifyAsRead(string userId, int notifyId);
        Task<NotifyResponse> DeleteNotification(string userId, int notifyId);
        Task<NotifyResponse> SaveNotificationToDatabase(string form_user, string to_user, NotifyRequest request);
        Task<NotifyResponse> SaveAndNotifyAll(string from_user, NotifyRequest request);
        Task PushToUserAsync(NotifyPushRequest req);
        Task<BannerResponse> GetBannerAsync();
        Task<BannerResponse> DeleteBannerAsync(DeleteBannerRequest request);
        Task<BannerResponse> GetBannerDetailAsync(int bannerId);
        Task<BannerResponse> GetBannerByIdAsync(int id);
    }
}
