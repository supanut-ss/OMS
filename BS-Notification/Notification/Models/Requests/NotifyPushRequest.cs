namespace Notification.Models.Requests
{
    public class NotifyPushRequest
    {
        public string type { get; set; }
        public string userId { get; set; }
        public string title { get; set; }
        public string message { get; set; }
        public string link { get; set; }
    }
}
