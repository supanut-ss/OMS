
namespace TokenManagement.Models
{
    public class JwtSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public int ExpiresInMinutes { get; set; } = 30;
        public List<string> ValidAudiences { get; set; } = new();
    }

}
