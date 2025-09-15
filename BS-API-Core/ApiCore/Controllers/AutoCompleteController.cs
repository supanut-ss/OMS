using ApiCore.Services.Interfaces;
using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ApiCore.Controllers
{
    [Route("autocomplete")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class AutoCompleteController : ControllerResponse
    {
        private readonly IAutoComplete _autoComplete;
        public AutoCompleteController(IAutoComplete autoComplete)
        {
            _autoComplete = autoComplete;
        }
        [HttpPost]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> Post([FromBody] AutoCompleteRequest request)
        {
            try
            {
                var result = await _autoComplete.AutoCompleteAsync(request);
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
