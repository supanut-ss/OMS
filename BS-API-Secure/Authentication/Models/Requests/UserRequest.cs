namespace Authentication.Models.Requests
{
    public class UserRequest
    {
        public string UserId { get; set; } = string.Empty;
        public int UserGroupId { get; set; }    
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string LocaleId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Supervisor { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Domian { get; set; } = string.Empty;
        public string IsActive { get; set; } = string.Empty;
    }
}
