using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;

namespace Authentication.Interfaces
{
    public interface IUsers
    {
        Task<AuthResponse> ResetPassword(string userId, string newPassword);

        Task<AuthResponse> RegisterUser(UserRequest userReq, string userId);

        Task<AuthResponse> UpdateUser(UserRequest userReq, string userId);
        Task<AuthResponse> DeleteUser(string userIdDel, string userId);
        
        Task<RoleResponse> GetRole(string userId);
        Task<UserLangResponse> UpdateLangAsync(UserLangRequest userReq, string userId);

        Task<MasterResponse> ClearLogOn(string userId);
    }
}
