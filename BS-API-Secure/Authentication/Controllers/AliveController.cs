using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers
{
    [Route("alive")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class AliveController : ControllerResponse
    {
        private readonly IAlive _alive;
        public AliveController(IAlive alive)
        {
            _alive = alive ?? throw new ArgumentNullException(nameof(alive));   
        }
        [HttpGet("user")]
        public async Task<IActionResult> GetAliveUser()
        {
            try
            {
                var response = await _alive.GetAliveUser();
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No alive users found.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
        [HttpPost("status")]
        public async Task<IActionResult> UpdateStatus(AliveUserRequest request) {
            try { 
                var response = await _alive.UpdateAliveUser(request);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("Failed to update alive user status.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
    }
}
