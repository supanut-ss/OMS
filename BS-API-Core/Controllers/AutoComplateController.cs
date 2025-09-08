using BS_API_Core.Interfaces;
using BS_API_Core.Models.Requests;
using BS_API_Core.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BS_API_Core.Controllers
{
    [Route("autocomplate")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class AutoComplateController : ControllerResponse
    {
        private readonly IAutoComplate _autoComplate;
        public AutoComplateController(IAutoComplate autoComplate)
        {
            _autoComplate = autoComplate;
        }
        [HttpPost]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> Post([FromBody] AutoComplateRequest request)
        {
            try
            {
                var result = await _autoComplate.AutoComplateAsync(request);
                return result != null ?
                    AccessResponseSuccess("success", result) :
                    ResponseNotFound("Data not found");
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message);
            }
        }
    }
}
