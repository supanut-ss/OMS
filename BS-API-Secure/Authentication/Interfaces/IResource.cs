using Authentication.Models.Requests;
using Authentication.Models.Responses;

namespace Authentication.Interfaces
{
    public interface IResource
    {
        Task<ResourceResponse> GetAsync(ResourceRequest request);
        Task<ResourceDataResponse> UpdateAsync(ResourceDataRequest resourceDataRequest,string userId);
    }
}
