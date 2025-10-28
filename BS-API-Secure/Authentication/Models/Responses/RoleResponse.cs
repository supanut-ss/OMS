namespace Authentication.Models.Responses
{
    public class RoleResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public string role { get; set; }
    }
}
