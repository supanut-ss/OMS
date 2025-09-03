using Authentication.Interfaces;
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

        [HttpGet("menuAuth")]
        public async Task<IActionResult> GetMenuByUser(string platform)
        {
            try
            {
                var usergroupid = Convert.ToInt32(User.FindFirst("Role")?.Value);

                var response = await _imenu.GetAuthenMenu(usergroupid, platform);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Menu.");
                //NotFound(new
                //               {
                //                   message_code = 404,
                //                   message_status = "not_found",
                //                   message_text = "No found Menu."
                //               });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message_code = 1,
                    message_status = "error",
                    message_text = ex.Message
                }); 
            }
        }

    }
}
