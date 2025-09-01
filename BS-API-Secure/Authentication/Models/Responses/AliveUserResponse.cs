namespace Authentication.Models.Responses
{
    public class AliveUserResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public List<AliveUserData>? data { get; set; } = new List<AliveUserData>();
    }
    public class AliveUserData
    {
        public string user_id { get; set; } = string.Empty;
        public string first_name { get; set; } = string.Empty;
        public string last_name { get; set; } = string.Empty;
        public string device_info { get; set; } = string.Empty;
        public string ip_address { get; set; } = string.Empty;
        public DateTime last_alive_time { get; set; }
        public DateTime refresh_token_expiry { get; set; }
        public string status { get; set; } = string.Empty;
    }
}
