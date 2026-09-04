using OmsApi.Models.Common;
using OmsApi.Models.Shipping;

namespace OmsApi.Services.Interfaces;

public interface IPlatformDocumentService
{
    Task<List<PlatformDocumentResult>> EnsureWaybillsAsync(
        PlatformType platform,
        string shopId,
        string platformOrderId,
        IReadOnlyCollection<PlatformPackageRecordResult> packages,
        string shippingDocumentType = "NORMAL_AIR_WAYBILL",
        CancellationToken cancellationToken = default);

    Task<List<PlatformDocumentResult>> GetDocumentsAsync(
        PlatformType platform,
        string shopId,
        string platformOrderId,
        CancellationToken cancellationToken = default);

    Task<PlatformDocumentFile?> GetFileAsync(
        PlatformType platform,
        string shopId,
        string platformOrderId,
        string? platformPackageId,
        bool markPrinted,
        CancellationToken cancellationToken = default);
}
