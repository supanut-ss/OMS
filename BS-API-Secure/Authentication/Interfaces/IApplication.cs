using Authentication.Models.Data;
using Authentication.Models.Requests;
using Authentication.Models.Responses.Application;

namespace Authentication.Interfaces
{
    public interface IApplication
    {
        Task<ApplicationResponse> RegisterApplication(ApplicationRequest request);
        Task<ApplicationResponse> UpdateApplicationLicense(ApplicationUpdateRequest request);
        Task<ApplicationListResponse> GetApplicationList();
        Task<VComApplication> GetApplicationByLicense(string license_key);
        ApplicationResponse CheckApplicationExpire(VComApplication vComApplication);
    }
}
