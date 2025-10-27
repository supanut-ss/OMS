namespace Authentication.Models.Requests
{
    public class UserRequest
    {
        public string user_id { get; set; } = string.Empty;
        public int user_group_id { get; set; }    
        public string first_name { get; set; } = string.Empty;
        public string last_name { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
        public string locale_id { get; set; } = string.Empty;
        public string department { get; set; } = string.Empty;
        public string supervisor { get; set; } = string.Empty;
        public string email_address { get; set; } = string.Empty;
        public string domain { get; set; } = string.Empty;
        public string is_active { get; set; } = string.Empty;
    }
}
