namespace Notification.Models.Responses
{
    public class NotifyResponse
    {
        public int message_code { get; set; }
        public string message_text { get; set; }
        public List<NotificationItem>? data { get; set; }
        public int? total { get; set; }
        public int? unread_total { get; set; }
    }
    public class NotificationItem {

        public int id { get; set; }
        public string type { get; set; }
        public string title { get; set; }
        public string description { get; set; }
        public string link { get; set; }
        public bool is_read { get; set; }
        public string from_user { get; set; }
        public string to_user { get; set; }
        public DateTime create_at { get; set; }
        public DateTime? read_at { get; set; }
    }
    
}
