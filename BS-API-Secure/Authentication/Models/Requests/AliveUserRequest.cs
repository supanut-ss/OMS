using System.ComponentModel.DataAnnotations;

namespace Authentication.Models.Requests
{
    public class AliveUserRequest
    {
        [Required]
        public string refresh_token { get; set; } = string.Empty;
        public UserLocation? location { get; set; }
    }
    public class  UserLocation
    {
        public string? latitude { get; set; }
        public string? longitude { get; set; }
        public string? accuracy { get; set; }
        public long timestamp { get; set; }
    }
}
