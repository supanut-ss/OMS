using System.Runtime.CompilerServices;

namespace Authentication.Models.Data
{
    public class VComApplication
    {
        public int application_id { get; set; }
        public string application_description { get; set; } = string.Empty;
        public string application_name { get; set; } = string.Empty;
        public int application_of_use { get; set; }
        public string application_owner { get; set; } = string.Empty;
        public string application_contact { get; set; } = string.Empty;
        public string application_email { get; set; } = string.Empty;
        public DateOnly application_expire { get; set; }
        public string license_type { get; set; } = string.Empty;
        public DateTime license_date { get; set; } 
        public DateTime? license_update_date { get; set; }
        public string license_key { get; set; } = string.Empty;
        public string is_active { get; set; } = string.Empty;
        public int access_failed_count_limit { get; set; }
        public string created_by { get; set; } = string.Empty;
        public DateTime created_date { get; set; }
        public string updated_by { get; set; } = string.Empty;
        public DateTime? updated_date { get; set; }

    }
}
