
namespace Authentication.Models.Data
{
    public class TComUser
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LocaleId { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public int AccessFailedCount { get; set; } = 0;
        public int UserGroupId { get; set; }
        public string Domain { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

      
    }
}
