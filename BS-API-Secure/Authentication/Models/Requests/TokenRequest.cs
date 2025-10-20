using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class TokenRequest
    {
        [Required]
        public string application_license { get; set; } = string.Empty;
        [Required]
        public string usersname { get; set; } = string.Empty;
        [Required]
        public string password { get; set; } = string.Empty;
        public string fcm_token { get; set; } = string.Empty;
    }
}
