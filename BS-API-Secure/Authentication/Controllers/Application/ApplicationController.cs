using Authentication.Interfaces;
using Authentication.Models.Requests;
using Authentication.Models.Responses;
using Authentication.Models.Responses.Application;
using Authentication.Prototype;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Authentication.Controllers.Application
{
    [Route("application")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ApplicationController : ControllerResponse
    {
        private readonly IApplication _iapplication;
        public ApplicationController(IApplication application) {
            _iapplication = application ?? throw new ArgumentNullException(nameof(application));
        }
        
        [HttpPost("register")]
        public IActionResult RegisterApplication(ApplicationRequest request)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseUnauthorized("Unauthorized");
                }
                //if (userId != Encryption.Decrypt(Environment.GetEnvironmentVariable("USERNAME_ADMIN") ?? ""))
                //{
                //    return ResponseForbidden("Forbidden");
                //}
                return _iapplication == null
                    ? ResponseUnauthorized("Application service is not available.")
                    : request == null
                        ? ResponseError("Invalid application request.", 2)
                        : string.IsNullOrEmpty(request.application_name) || request.application_of_use == 0 || string.IsNullOrEmpty(request.application_owner) || string.IsNullOrEmpty(request.application_contact) || string.IsNullOrEmpty(request.application_email) 
                            ? ResponseError("All fields are required.", 3)
                            : _iapplication.RegisterApplication(request).Result is ApplicationResponse app
                                ? app.message_code == "0" || app.message_code== "200" ? ResponseSuccess("success", app.message_text, int.Parse(app.message_code)):ResponseError(app.message_text,int.Parse(app.message_code))
                                : ResponseError("Failed to register application.", 4);

            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
        [HttpPost("update/license")]
        public IActionResult UpdateApplicationLicense(ApplicationUpdateRequest request)
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseUnauthorized("Unauthorized");
                }
                if (userId != Encryption.Decrypt(Environment.GetEnvironmentVariable("USERNAME_ADMIN") ?? ""))
                {
                    return ResponseForbidden("Forbidden");
                }
                return _iapplication == null
                    ? ResponseUnauthorized("Application service is not available.")
                    : request == null
                        ? ResponseError("Invalid application request.", 2)
                        : string.IsNullOrEmpty(request.license_key) || request.application_of_use == 0 
                            ? ResponseError("All fields are required.", 3)
                            : _iapplication.UpdateApplicationLicense(request).Result is ApplicationResponse app
                                ? app.message_code == "0" || app.message_code == "200" ? ResponseSuccess("success", app.message_text, int.Parse(app.message_code)) : ResponseError(app.message_text, int.Parse(app.message_code))
                                : ResponseError("Failed to update application license.", 4);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
        [HttpGet("list")]
        public IActionResult GetApplicationList()
        {
            try
            {
                var userId = User.FindFirst("UserId")?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return ResponseUnauthorized("Unauthorized");
                }
                if (userId != Encryption.Decrypt(Environment.GetEnvironmentVariable("USERNAME_ADMIN") ?? ""))
                {
                    return ResponseForbidden("Forbidden");
                }
                return _iapplication == null
                    ? ResponseUnauthorized("Application service is not available.")
                    : _iapplication.GetApplicationList().Result is ApplicationListResponse appList
                        ? appList.message_code == "0" || appList.message_code == "200" ? AccessResponseSuccess("success", appList, int.Parse(appList.message_code)) : ResponseError(appList.message_text, int.Parse(appList.message_code))
                        : ResponseError("Failed to retrieve application list.", 4);
            }
            catch (Exception ex)
            {
                return ResponseError(ex.Message, 1);
            }
        }
    }
}
