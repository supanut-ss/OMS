using Authentication.Models.Requests;

namespace Authentication.Interfaces
{
    public interface IActivityLog
    {
        Task LogActivityAsync(ActivityLogRequest request, string username);
    }
}
