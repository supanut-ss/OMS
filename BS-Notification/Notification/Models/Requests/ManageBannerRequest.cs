namespace Notification.Models.Requests
{
    public class ManageBannerRequest
    {
        public string action { get; set; } = string.Empty;
        public int? id { get; set; }

        public string? type { get; set; }
        public string? title { get; set; }
        public string? description { get; set; }
        public string? link { get; set; }
        public DateTime? start_date { get; set; }
        public DateTime? end_date { get; set; }
        public int priority { get; set; } = 0;
        public bool is_active { get; set; } = true;
        public string? update_by { get; set; }

        public List<ManageBannerDetail> details { get; set; } = new();
    }

    public class ManageBannerDetail
    {
        public string? name { get; set; }
        public string imageUrl { get; set; } = string.Empty;
        public int sort_order { get; set; }
    }
    public class DeleteBannerRequest
    {
        public int id { get; set; }
    }
}
