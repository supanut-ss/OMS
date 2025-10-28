using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Users
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("users")]
    [ApiController]
    public class UsersController : ControllerResponse
    {
        private readonly IUsers _iusers;
        public UsersController(IUsers users)
        {
            _iusers = users;
        }
        [HttpPost("reset_password")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> ResetPassword(AuthenResetPassword request)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value;
                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(request.new_password) || string.IsNullOrEmpty(request.confirm_password))
                {
                    return ResponseUnauthorized("Authentication service is not available.");
                }
                if (request.new_password != request.confirm_password)
                {
                    return ResponseError("Password and Confirm Password do not match.", 2);
                }
                return _iusers == null
                    ? ResponseUnauthorized("Authentication service is not available.")
                    : await _iusers.ResetPassword(userId, request.confirm_password) is AuthResponse token
                        ? AccessResponseSuccess("success", token)
                        : ResponseUnauthorized("Invalid username or password.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }


        [HttpPost("register")]
        public async Task<IActionResult> RegisterUser(UserRequest userReq)
        {
            try
            {
                string userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");

                var response = await _iusers.RegisterUser(userReq, userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found User.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }

        [HttpPost("update")]
        public async Task<IActionResult> UpdateUser(UserRequest userReq)
        {
            try
            {
                string userId = User.FindFirst("UserId")?.Value ?? "";

                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");

                var response = await _iusers.UpdateUser(userReq, userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found User.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
        [HttpGet("role")]
        public async Task<IActionResult> GetRole()
        {
            try
            {
                string userId = User.FindFirst("UserId")?.Value ?? "";
                if (string.IsNullOrEmpty(userId))
                    ResponseNotFound("No found User Id.");
                var response = await _iusers.GetRole(userId);
                return response != null ? AccessResponseSuccess("success", response) : ResponseNotFound("No found Role.");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
    }
}
