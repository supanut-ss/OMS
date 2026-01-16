namespace Notification.Models
{
    public class NotifyRequest
    {
        public string Type { get; set; }
        public string? Group { get; set; }
        public string? UserId { get; set; }
        public string Message { get; set; }
        public string? Title { get; set; }
    }
 
}