using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class ApplicationRequest
    {
        [Required]
        public string application_name { get; set; } = string.Empty;
        public string application_description { get; set; } = string.Empty;
        [Required]
        public int application_of_use { get; set; }
        [Required]
        public string application_owner { get; set; } = string.Empty;
        [Required]
        public string application_contact { get; set; } = string.Empty;
        [Required]
        public string application_email { get; set; } = string.Empty;
        [Required]
        public DateOnly application_expire { get; set; }
    }
    public class ApplicationUpdateRequest 
    {
        [Required]
        public string license_key { get; set; } = string.Empty;

        [Required]
        public int application_of_use { get; set; }
        [Required]
        public DateOnly application_expire { get; set; }
    }
}
