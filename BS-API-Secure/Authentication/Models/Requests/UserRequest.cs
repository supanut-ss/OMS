using System.Text.Json.Serialization;

namespace Authentication.Models.Requests
{
    public class UserRequest
    {
        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;
        [JsonPropertyName("user_group_id")]
        public int UserGroupId { get; set; }
        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;
        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;
        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
        [JsonPropertyName("locale_id")]
        public string LocaleId { get; set; } = string.Empty;
        [JsonPropertyName("department")]
        public string Department { get; set; } = string.Empty;
        [JsonPropertyName("supervisor")]
        public string Supervisor { get; set; } = string.Empty;
        [JsonPropertyName("email_address")]
        public string Email { get; set; } = string.Empty;
        [JsonPropertyName("domain")]
        public string Domian { get; set; } = string.Empty;
        [JsonPropertyName("is_active")]
        public string IsActive { get; set; } = string.Empty;
    }
}
