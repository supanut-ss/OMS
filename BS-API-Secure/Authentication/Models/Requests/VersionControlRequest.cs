using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class VersionControlRequest
    {
        [Required]
        public string version_control_name { get; set; }
        [Required]
        public string application_license { get; set; } = string.Empty;
    }
}
