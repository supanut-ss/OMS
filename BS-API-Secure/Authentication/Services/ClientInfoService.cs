using Authentication.Interfaces;
using System.Net;
namespace Authentication.Services
{
    public class ClientInfoService : IClientInfo
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ClientInfoService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string GetClientIpAddress()
        {
            // 1. ดึง IP Address ขาเข้ามาปกติ  
            var remoteIp = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress;
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
            if (_httpContextAccessor.HttpContext?.Request?.Headers.TryGetValue("X-Forwarded-For", out var forwardedHeader) == true)
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

        public string GetClientDeviceInfo()
        {
            var context = _httpContextAccessor.HttpContext;
            var userAgent = context?.Request.Headers["X-Client-Device"].FirstOrDefault() ?? context?.Request.Headers["User-Agent"].ToString() ?? "Unknown";
            return userAgent; // สามารถ parse เพิ่มเติมเป็น Browser/OS ได้  
        }
    }
}
