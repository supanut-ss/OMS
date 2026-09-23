using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Models.Responses
{
    public class ControllerResponse : ControllerBase
    {
        [NonAction]
        public string GetClientIpAddress()
        {
            // 1. ดึง IP Address ขาเข้ามาปกติ
            var remoteIp = HttpContext?.Connection?.RemoteIpAddress;
            string ipAddress = null;

            if (remoteIp != null)
            {
                // 🔥 ไม้เด็ด: ถ้ามันเป็น IPv4-Mapped (มี ::ffff:) ให้ดึงเฉพาะ IPv4 ข้างหลังออกมา
                if (remoteIp.IsIPv4MappedToIPv6)
                {
                    ipAddress = remoteIp.MapToIPv4().ToString(); // จะเหลือแค่ "192.168.1.55"
                }
                else
                {
                    ipAddress = remoteIp.ToString();
                }
            }

            // 2. กรณีถ้าระบบผ่าน Proxy / Load Balancer (ดึงจาก Header)
            if (HttpContext?.Request?.Headers.TryGetValue("X-Forwarded-For", out var forwardedHeader) == true)
            {
                var forwardedIp = forwardedHeader.FirstOrDefault();
                if (!string.IsNullOrEmpty(forwardedIp))
                {
                    // เผื่อใน Header ก็ติด ::ffff: มาด้วย ให้ล้างออกซะ
                    if (forwardedIp.StartsWith("::ffff:"))
                    {
                        forwardedIp = forwardedIp.Replace("::ffff:", "");
                    }
                    ipAddress = forwardedIp;
                }
            }

            return ipAddress ?? "UNKNOWN_IP";
        }
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
