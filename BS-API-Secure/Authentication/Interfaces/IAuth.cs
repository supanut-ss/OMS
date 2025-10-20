using Authentication.Models.Requests;
using Authentication.Models.Responses.Auth;

namespace Authentication.Interfaces
{
    public interface IAuth
    {
        Task<AuthResponse> EndRevoke(string refresh_token,string user_id);
        Task<AuthResponse> GetTokenAsync(string license,string username, string password, string fcm_token);
        Task<AuthResponse> RenewAccessTokenAsync(string refreshToken);
        Task<AuthResponse> LockUser(string userId, int count);
        Task<(AuthResponse response, int access_failed)> AddAccessFailed(string userId,bool u);
        AuthResponse CreateErrorResponse(string code, string message);
        AuthResponse ValidatePassword(string users_id,string password);
    }
}
