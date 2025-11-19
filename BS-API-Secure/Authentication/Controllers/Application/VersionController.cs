using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Application
{
    [Route("[controller]")]
    [ApiController]
    public class VersionController : ControllerResponse
    {
        private readonly IVersionControl version;
        public VersionController(IVersionControl _version)
        {
            version = _version;
        }
        [HttpPost]
        public async Task<IActionResult> GetVersion(VersionControlRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.version_control_name) || string.IsNullOrEmpty(request.application_license))
                {
                    return BadRequest();
                }
                else
                {
                    VersionControlResponse response = await version.GetVersionControlAsync(request);
                    return response == null ? NotFound() : Ok(response);
                }
            }
            catch (Exception ex) {
                return ResponseError(ex.Message, 1);
            }
        }
    }
}
