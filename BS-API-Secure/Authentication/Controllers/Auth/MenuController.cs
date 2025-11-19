using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Application;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Auth
{
    [Route("menu")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class MenuController : ControllerResponse
    {
        private readonly IMenu _imenu;
        public MenuController(IMenu menu)
        {
            _imenu = menu ?? throw new ArgumentNullException(nameof(menu));
        }

        [HttpGet]
        public async Task<IActionResult> GetMenuByUser(string platform)
        {
            try
            {
                var usergroupid = Convert.ToInt32(User.FindFirst("Role")?.Value);
                string userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");
                var response = await _imenu.GetAuthenMenu(usergroupid, platform, userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Menu.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }

        [HttpGet("menuAssign")]
        public async Task<IActionResult> GetMenuAssign(int user_group_id, string platform)
        {
            try
            {
                if (user_group_id == 0)
                    ResponseNotFound("No found Menu.");

                var response = await _imenu.GetAuthenMenu(user_group_id, platform,"");
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Menu.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }


        [HttpPost("saveAssign")]
        public async Task<IActionResult> SaveMenuAssign(List<MenuAssignRequest> _listMenuAssign)
        {
            try
            {
                string userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");

                var response = await _imenu.SaveAssignMenu(_listMenuAssign, userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Menu.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
        [HttpPost("favorite")]
        public async Task<IActionResult> Favorite(MenuFavoriteRequest request)
        {
            try
            {
                string userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");
                var response = await _imenu.Favorite(request,userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Menu Favorite.");
            }
            catch(Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }

    }
}
