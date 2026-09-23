namespace Authentication.Models.Responses.Auth
{
    public class AuthResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public AuthDataResponse? data { get; set; } = new AuthDataResponse();
    }
    public class AuthDataResponse
    {
        public string access_token { get; set; } = string.Empty;
        public string refresh_token { get; set; } = string.Empty;

    }
    public class UserInfoResponse
    {
        public string UserId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LocaleId { get; set; } = string.Empty;
        public string UserGroupId { get; set; } = string.Empty;
        public bool IsActive { get; set; } = false;
    }
}
