using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class RefreshTokenRequest
    {
        [Required]
        public string refresh_token { get; set; } = string.Empty;
    }
}
