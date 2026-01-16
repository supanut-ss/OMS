using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Notification.Attribute
{
    public class WorkerAuthorizeAttribute : System.Attribute // Explicitly qualify 'Attribute'  
    {
        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var headers = context.HttpContext.Request.Headers;

            if (!headers.TryGetValue("X-WORKER-KEY", out var key))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            if (key != Environment.GetEnvironmentVariable("WORKER_KEY"))
            {
                context.Result = new UnauthorizedResult();
                return;
            }
        }
    }

}
