using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IAutoComplete
    {
        Task<AutoCompleteResponse> AutoCompleteAsync(AutoCompleteRequest request);
    }
}
