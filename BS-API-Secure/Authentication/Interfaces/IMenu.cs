using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;

namespace Authentication.Interfaces
{
    public interface IMenu
    {
        Task<MenuResponse> GetAuthenMenu(int groupId, string platform,string userId);

        Task<MasterResponse> SaveAssignMenu(List<MenuAssignRequest> listMenu, string userId);

        Task<MasterResponse> Favorite(MenuFavoriteRequest request, string userId);
    }
}
