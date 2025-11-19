namespace Authentication.Models.Requests
{
    public class ResourceDataRequest
    {
        public int? resource_id { get; set; }
        public int app_id { get; set; }
        public string platform { get; set; } = string.Empty;
        public string resource_group { get; set; } = string.Empty;
        public string resource_name { get; set; } = string.Empty;
        public string resource_en { get; set; } = string.Empty;
        public string resource_th { get; set; } = string.Empty;
        public string resource_other { get; set; } = string.Empty;
        public string description_en { get; set; } = string.Empty;
        public string description_th { get; set; } = string.Empty;
        public string descrption_other { get; set; } = string.Empty;
        public string is_active { get; set; } = string.Empty;
    }
}
