using BS_Notify_Worker.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BS_Notify_Worker.Interfaces
{
    internal interface INotificationRepository
    {
        Task<List<NotificationItem>> PickForDispatchAsync(int limit);
        Task MarkDispatchedAsync(int id);
    }
}
