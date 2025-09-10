using BS_API_Core.Models.Requests;
using BS_API_Core.Models.Responses;

namespace BS_API_Core.Interfaces
{
    public interface IAutoComplate
    {
        Task<AutoComplateResponse> AutoComplateAsync(AutoComplateRequest request);
    }
}
