using System.Net.Http.Json;
using System.Text.Json;
using System.Text;
using BS_Notify_Worker.Interfaces;
using BS_Notify_Worker.Models;
using BS_Notify_Worker.Logging;

namespace BS_Notify_Worker.Pushers
{
    public class SignalRNotificationPusher : INotificationPusher
    {
        private readonly HttpClient _http;
        //private readonly 
        public SignalRNotificationPusher(HttpClient http)
        {
            _http = http;
        }

        public async Task PushAsync(NotificationItem n)
        {
            FileLogger.WriteLog("==== Start Send Noti ====");
            var payload = new
            {
                id = n.id,
                type = n.type,
                title = n.title,
                message = n.description,
                link = n.link,
                userId = n.to_user,
                from_user = n.from_user
            };

            var json = JsonSerializer.Serialize(payload);

            var req = new HttpRequestMessage(HttpMethod.Post, "/bs-notification/api/notify/push");
            req.Headers.Add("X-WORKER-KEY", Environment.GetEnvironmentVariable("WORKER_KEY") ?? "secret123");

            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            FileLogger.WriteLog($"response => {res}");
            if (!res.IsSuccessStatusCode)
            {
                var body = await res.Content.ReadAsStringAsync();
                FileLogger.WriteLog($"Push failed ({res.StatusCode}): {body}");
                throw new Exception($"Push failed ({res.StatusCode}): {body}");
            }
            FileLogger.WriteLog("==== End Send Noti ====");
        }
    }
}
