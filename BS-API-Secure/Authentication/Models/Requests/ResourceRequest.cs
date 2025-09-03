using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class ResourceRequest
    {
        [Required]
        public string application_license  { get; set; } = string.Empty;
        [Required]
        public string platform { get; set; } = string.Empty;
    }
}
