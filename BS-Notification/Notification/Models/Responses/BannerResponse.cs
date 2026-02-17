namespace Notification.Models.Responses
{
    public class BannerResponse
    {
        public int message_code { get; set; }
        public string message_text { get; set; } = string.Empty;
        public List<BannerItem> data { get; set; } = new List<BannerItem>();
    }
    public class BannerItem
    {
        public string type { get; set; }
        public int id { get; set; }
        public string title { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty; 
        public List<BannerLink> list { get; set; } = new List<BannerLink>();
        public string link { get; set; } = string.Empty;
        public DateTime create_at { get; set; }
    }
    public class BannerLink
    {
        public string? name { get; set; }
        public string imageUrl { get; set; } = string.Empty;
    }
}
