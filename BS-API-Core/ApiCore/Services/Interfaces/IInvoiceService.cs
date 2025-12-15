using ApiCore.Models.Requests;
using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces
{
    public interface IInvoiceService
    {
        Task<InvoiceResponse> DeleteInvoice(int invoiceId);
        Task<InvoiceResponse> InsertOrUpdateInvoice(InvoiceRequest invoiceRequest, string userId);
    }
}
