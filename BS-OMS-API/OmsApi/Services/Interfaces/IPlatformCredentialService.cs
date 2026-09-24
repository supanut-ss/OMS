using OmsApi.Models.Auth;
using OmsApi.Models.Common;

namespace OmsApi.Services.Interfaces;

/// <summary>
/// Resolves encrypted platform credentials, refreshes expiring tokens and retries
/// one operation when a platform rejects the stored access token.
/// </summary>
public interface IPlatformCredentialService
{
    Task<T> ExecuteAsync<T>(
        PlatformType platform,
        string? shopId,
        Func<PlatformAccessCredential, Task<T>> operation,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlatformCredentialSelection>> GetActiveCredentialSelectionsAsync(
        CancellationToken cancellationToken = default);
}
