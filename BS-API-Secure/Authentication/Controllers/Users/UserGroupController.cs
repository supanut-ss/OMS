using Authentication.Interfaces;
using Authentication.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Users
{
    [Route("usergroup")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class UserGroupController : ControllerResponse
    {
        private readonly IMenu _imenu;
        public UserGroupController(IMenu menu)
        {
            _imenu = menu ?? throw new ArgumentNullException(nameof(menu));
        }

        
    }
}
