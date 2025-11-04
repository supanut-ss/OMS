using Microsoft.AspNetCore.Mvc;
using Authentication.Models.Responses.Auth;
using Authentication.Models.Responses.Application;

namespace Authentication.Models.Responses
{
    public class ControllerResponse : ControllerBase
    {
        //protected IActionResult AccessResponseSuccess(string status, ApplicationListResponse access, int code = 0)
        //{
        //    return Ok(access);
        //}
        //protected IActionResult AccessResponseSuccess(string status, AuthResponse access, int code = 0)
        //{
        //    return Ok(access);
        //}
        //protected IActionResult AccessResponseSuccess(string status, AliveUserResponse access, int code = 0)
        //{
        //    return Ok(access);
        //}
        //protected IActionResult AccessResponseSuccess(string status, MasterResponse access, int code = 0)
        //{
        //    return Ok(access);
        //}

        protected IActionResult AccessResponseSuccess<T>(string status, T access, int code = 0)
        {
            if (code == 1) return BadRequest(access);
            else return Ok(access);
        }
        protected IActionResult ResponseSuccess(string status, string message, int code = 0)
        {
            return Ok(new
            {
                message_code = code,
                message_status = status,
                message_text = message
            });
        }

        protected IActionResult ResponseError(string message, int code = 1)
        {
            return BadRequest(new
            {
                message_code = code,
                message_status = "error",
                message_text = message
            });
        }

        protected IActionResult ResponseUnauthorized(string message = "Unauthorized")
        {
            return Unauthorized(new
            {
                message_code = 401,
                message_status = "unauthorized",
                message_text = message
            });
        }

        protected IActionResult ResponseForbidden(string message = "Forbidden")
        {
            return StatusCode(403, new
            {
                message_code = 403,
                message_status = "forbidden",
                message_text = message
            });
        }

        protected IActionResult ResponseNotFound(string message = "Not found")
        {
            return NotFound(new
            {
                message_code = 404,
                message_status = "not_found",
                message_text = message
            });
        }
    }
}
