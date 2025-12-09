using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Models.Responses
{
    public class ControllerResponse : ControllerBase
    {
        protected IActionResult AccessResponseSuccess<T>(string status, T access, int code = 0)
        {
            return Ok(access);
        }
        protected IActionResult AccessResponseDataSuccess<T>(string status, T access, int code = 0)
        {
            return Ok(new
            {
                message_code = code,
                message_status = status,
                data = access
            });
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
