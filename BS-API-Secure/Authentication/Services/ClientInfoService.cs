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
            var context = _httpContextAccessor.HttpContext;

            if (context == null)
                return "Unknown";
            var ip = context?.Request.Headers["X-Client-IP"].FirstOrDefault() ?? context?.Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? "";

            if (!string.IsNullOrEmpty(ip))
            {
                return ip.Split(',')[0].Trim();
            }
            if (context?.Connection?.RemoteIpAddress != null) // Check for null explicitly
            {
                var remoteIp = context.Connection.RemoteIpAddress; // No need for null coalescing operator

                // Check if the IP is a loopback address
                if (IPAddress.IsLoopback(remoteIp))
                    return "127.0.0.1";

                return remoteIp.MapToIPv4().ToString(); // Convert to IPv4 if necessary
            }
            return "Unknown";
        }


        public string GetClientDeviceInfo()
        {
            var context = _httpContextAccessor.HttpContext;
            var userAgent = context?.Request.Headers["User-Agent"].ToString() ?? "Unknown"; 
            return userAgent; // สามารถ parse เพิ่มเติมเป็น Browser/OS ได้
        }
    }
}
