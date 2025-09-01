namespace Authentication.Models.Responses.Auth
{
    public class AuthResponse
    {
        public string message_code { get; set; } = string.Empty;
        public string message_text { get; set; } = string.Empty;
        public AuthDataResponse? data { get; set; } = new AuthDataResponse();
    }
    public class  AuthDataResponse 
    {
        public string access_token { get; set; } = string.Empty;
        public string refresh_token { get; set; } = string.Empty;

    }
}
