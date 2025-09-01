namespace Authentication.Models.Responses.Application
{
    public class ApplicationListResponse 
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public List<ApplicationData>? data { get; set; } = new List<ApplicationData>();
    }
    public class ApplicationData
    {
        public int application_id { get; set; }
        public string application_name { get; set; } = "";
        public int application_of_use { get; set; }
        public string application_owner { get; set; } = "";
        public string application_contact { get; set; } = "";
        public string application_email { get; set; } = "";
        public DateOnly application_expire { get; set; }
        public string application_license { get; set; } = "";
        public DateTime create_date { get; set; }
        public DateTime? update_date { get; set; }
    }
}
