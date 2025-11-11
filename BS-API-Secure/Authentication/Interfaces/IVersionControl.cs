using Authentication.Models.Requests;
using Authentication.Models.Responses;

namespace Authentication.Interfaces
{
    public interface IVersionControl
    {
        Task<VersionControlResponse> GetVersionControlAsync(VersionControlRequest request);
    }
}
