using Authentication.Models.Requests;
using Authentication.Models.Responses;

namespace Authentication.Interfaces
{
    public interface IAlive
    {
        Task<AliveUserResponse> GetAliveUser();
        Task<MasterResponse> UpdateAliveUser(AliveUserRequest request);
    }
}
