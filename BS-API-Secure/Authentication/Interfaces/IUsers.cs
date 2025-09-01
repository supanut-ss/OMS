using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;

namespace Authentication.Interfaces
{
    public interface IUsers
    {
        Task<AuthResponse> ResetPassword(string userId, string newPassword);
    }
}
