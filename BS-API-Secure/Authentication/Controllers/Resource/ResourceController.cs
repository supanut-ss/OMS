using Authentication.Interfaces;
using Authentication.Models.Requests;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Resource
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("resource")]
    [ApiController]
    public class ResourceController : ControllerBase
    {
        private readonly IResource _resource;
        public ResourceController(IResource resource)
        {
            _resource = resource;
        }
        [HttpPost()]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> GetResource(ResourceRequest request)
        {
            try
            {
                return _resource == null
                    ? Unauthorized("Resource service is not available.")
                    : string.IsNullOrEmpty(request.appliceation_license) || string.IsNullOrEmpty(request.platform)
                        ? BadRequest("Application license and platform are required.")
                        : await _resource.GetAsync(request) is var resourceResponse
                            ? Ok(resourceResponse)
                            : Unauthorized("Invalid request.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
