using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IInventory
    {
        Task<InventoryResponse> ChangeLocation(ChangeLocationRequest request);
        Task<InventoryResponse> StatusChange(StatusChangeRequest request);
        Task<InventoryResponse> Adjustment(AdjustmentRequest request);
        Task<InventoryResponse> AdjustIn(AdjustInRequest request);
    }
}
