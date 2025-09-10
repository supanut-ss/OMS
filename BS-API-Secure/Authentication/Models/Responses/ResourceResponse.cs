namespace Authentication.Models.Responses
{
    public class ResourceResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public List<ResourceItem>? data { get; set; } = new List<ResourceItem>();
    }
    public class ResourceItem
    {
        public string resource_group { get; set; } = string.Empty;
        public string resource_name { get; set; } = string.Empty;
        public string resource_en { get; set; } = string.Empty;
        public string resource_th { get; set; } = string.Empty;
        public string resource_other { get; set; } = string.Empty;
        public string description_en { get; set; } = string.Empty;
        public string description_th { get; set; } = string.Empty;
        public string descrption_other { get; set; } = string.Empty;
        public string is_active { get; set; } = string.Empty;
        public string create_by { get; set; } = string.Empty;
        public string create_date { get; set; } = string.Empty;
    }
}
