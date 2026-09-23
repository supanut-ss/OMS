using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IInbound
    {
        Task<InboundResponse> SaveInboundAsync(SaveInboundRequest request);
        Task<DeleteInboundOrderResponse> DeleteInboundOrderAsync(DeleteInboundOrderRequest request);
        Task<CloseInboundOrderResponse> CloseInboundOrderAsync(CloseInboundOrderRequest request);
        Task<ReceiptResponse> CloseReceiptAsync(CloseReceiptRequest request);
        Task<ReceiptResponse> SaveReceiptAsync(SaveReceiptRequest request);
        Task<ReceiptHeaderResponse?> GetReceiptAsync(int receiptHeaderId);
        Task<List<InboundDetailResponse>> GetInboundDetailsAsync(int inboundMasterId);
    }
}
