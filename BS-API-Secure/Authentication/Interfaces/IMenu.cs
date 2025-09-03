using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;

namespace Authentication.Interfaces
{
    public interface IMenu
    {
        Task<MenuResponse> GetAuthenMenu(int groupId, string platform);
    }
}
