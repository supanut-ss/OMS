using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class AuthenResetPassword
    {
        [Required]
        public string new_password { get; set; } = "";
        [Required]
        public string confirm_password { get; set; } = "";
    }
}
