using ApiCore.Models.Responses;

namespace ApiCore.Services.Interfaces;

public interface IPartAttachmentService
{
    Task<PartAttachmentResponse?> GetAsync(long partId);
    Task<PartAttachmentResponse> UpsertAsync(long partId, IFormFile file, string createBy);
    Task<bool> DeleteAttachmentAsync(long partId);
    Task<bool> DeletePartAsync(long partId);
}
