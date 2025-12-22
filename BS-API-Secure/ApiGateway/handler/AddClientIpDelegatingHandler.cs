namespace ApiGateway.handler
{
    public class AddClientIpDelegatingHandler : DelegatingHandler
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AddClientIpDelegatingHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var ip = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            if (!string.IsNullOrWhiteSpace(ip))
            {
                // ถ้ามี X-Forwarded-For อยู่แล้ว ให้ append chain
                if (request.Headers.Contains("X-Forwarded-For"))
                {
                    var existing = request.Headers.GetValues("X-Forwarded-For").FirstOrDefault();
                    request.Headers.Remove("X-Forwarded-For");
                    request.Headers.Add("X-Forwarded-For", $"{existing}, {ip}");
                }
                else
                {
                    request.Headers.Add("X-Forwarded-For", ip);
                }

                // คุณยังอาจเพิ่ม X-Client-IP ด้วย (optional)
                if (!request.Headers.Contains("X-Client-IP"))
                    request.Headers.Add("X-Client-IP", ip);
            }

            return base.SendAsync(request, cancellationToken);
        }
    }
}
