using System.Collections.Concurrent;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OmsApi.Extensions;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Services.Interfaces;

namespace OmsApi.Services.Implementation;

public sealed class PlatformCredentialService : IPlatformCredentialService
{
    private static readonly ConcurrentDictionary<long, SemaphoreSlim> RefreshLocks = new();
    private static readonly TimeSpan RefreshWindow = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDataProtector _tokenProtector;
    private readonly ILogger<PlatformCredentialService> _logger;

    public PlatformCredentialService(
        IServiceScopeFactory scopeFactory,
        IDataProtectionProvider protectionProvider,
        ILogger<PlatformCredentialService> logger)
    {
        _scopeFactory = scopeFactory;
        _tokenProtector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");
        _logger = logger;
    }

    public async Task<T> ExecuteAsync<T>(
        PlatformType platform,
        string? shopId,
        Func<PlatformAccessCredential, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);

        var credential = await ResolveAsync(platform, shopId, cancellationToken);
        try
        {
            return await operation(credential);
        }
        catch (PlatformApiException ex) when (IsInvalidAccessToken(ex))
        {
            _logger.LogWarning(
                "{Platform} rejected the stored access token for shop {ShopId}; refreshing once",
                platform,
                credential.ShopId);

            var refreshed = await RefreshAsync(
                credential,
                forceRefresh: true,
                rejectedAccessToken: credential.AccessToken,
                cancellationToken);
            return await operation(refreshed);
        }
    }

    public async Task<IReadOnlyList<PlatformCredentialSelection>> GetActiveCredentialSelectionsAsync(
        CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rows = await db.PlatformCredentials.AsNoTracking()
            .Where(x => x.IsActive == "YES" && x.RequiresReauthorization == "NO")
            .OrderBy(x => x.Platform)
            .ThenBy(x => x.ShopId)
            .Select(x => new { x.Platform, x.ShopId })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x => Enum.TryParse<PlatformType>(x.Platform, true, out var platform)
                ? new PlatformCredentialSelection(platform, x.ShopId)
                : null)
            .Where(x => x != null)
            .Cast<PlatformCredentialSelection>()
            .ToList();
    }

    private async Task<PlatformAccessCredential> ResolveAsync(
        PlatformType platform,
        string? requestedShopId,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var platformName = platform.ToString();
        var shopId = ResolveRequestedShopId(platform, requestedShopId);

        var query = db.PlatformCredentials.AsNoTracking()
            .Where(x =>
                x.Platform == platformName &&
                x.IsActive == "YES" &&
                x.RequiresReauthorization == "NO");
        if (!string.IsNullOrWhiteSpace(shopId))
            query = query.Where(x => x.ShopId == shopId);

        var credentials = await query
            .OrderByDescending(x => x.UpdateDate)
            .Take(2)
            .ToListAsync(cancellationToken);

        if (credentials.Count == 0)
        {
            throw new PlatformCredentialException(
                "CREDENTIAL_NOT_FOUND",
                $"No active {platformName} credential was found for shop '{shopId}'.");
        }

        if (string.IsNullOrWhiteSpace(shopId) && credentials.Count > 1)
        {
            throw new PlatformCredentialException(
                "SHOP_ID_REQUIRED",
                $"More than one active {platformName} shop credential exists. Specify shopId.");
        }

        var credential = credentials[0];
        if (credential.AccessTokenExpiresDate <= DateTime.UtcNow.Add(RefreshWindow))
        {
            return await RefreshAsync(
                ToContext(platform, credential, string.Empty),
                forceRefresh: false,
                rejectedAccessToken: null,
                cancellationToken);
        }

        string accessToken;
        try
        {
            accessToken = _tokenProtector.Unprotect(credential.AccessTokenEncrypted);
        }
        catch (Exception ex)
        {
            throw new PlatformCredentialException(
                "CREDENTIAL_DECRYPT_FAILED",
                $"The stored {platformName} credential for shop '{credential.ShopId}' could not be decrypted.",
                ex);
        }

        await TouchLastUseAsync(credential.PlatformCredentialId, cancellationToken);
        return ToContext(platform, credential, accessToken);
    }

    private async Task<PlatformAccessCredential> RefreshAsync(
        PlatformAccessCredential current,
        bool forceRefresh,
        string? rejectedAccessToken,
        CancellationToken cancellationToken)
    {
        var refreshLock = RefreshLocks.GetOrAdd(current.PlatformCredentialId, _ => new SemaphoreSlim(1, 1));
        await refreshLock.WaitAsync(cancellationToken);
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var credential = await db.PlatformCredentials.SingleOrDefaultAsync(
                x => x.PlatformCredentialId == current.PlatformCredentialId,
                cancellationToken)
                ?? throw new PlatformCredentialException(
                    "CREDENTIAL_NOT_FOUND",
                    $"The stored {current.Platform} credential for shop '{current.ShopId}' no longer exists.");

            if (!string.Equals(credential.IsActive, "YES", StringComparison.OrdinalIgnoreCase))
            {
                throw new PlatformCredentialException(
                    "CREDENTIAL_NOT_FOUND",
                    $"The stored {current.Platform} credential for shop '{credential.ShopId}' is inactive.");
            }
            if (string.Equals(credential.RequiresReauthorization, "YES", StringComparison.OrdinalIgnoreCase))
            {
                throw new PlatformCredentialException(
                    "REAUTHORIZATION_REQUIRED",
                    $"The stored {current.Platform} credential for shop '{credential.ShopId}' must be authorized again.");
            }

            string latestAccessToken;
            try
            {
                latestAccessToken = _tokenProtector.Unprotect(credential.AccessTokenEncrypted);
            }
            catch (Exception ex)
            {
                throw new PlatformCredentialException(
                    "CREDENTIAL_DECRYPT_FAILED",
                    $"The stored {current.Platform} credential for shop '{credential.ShopId}' could not be decrypted.",
                    ex);
            }

            var anotherRequestAlreadyRefreshed =
                forceRefresh &&
                rejectedAccessToken != null &&
                !string.Equals(latestAccessToken, rejectedAccessToken, StringComparison.Ordinal) &&
                credential.AccessTokenExpiresDate > DateTime.UtcNow.Add(RefreshWindow);
            var tokenIsStillUsable =
                !forceRefresh &&
                credential.AccessTokenExpiresDate > DateTime.UtcNow.Add(RefreshWindow);
            if (anotherRequestAlreadyRefreshed || tokenIsStillUsable)
            {
                credential.LastUseDate = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return ToContext(current.Platform, credential, latestAccessToken);
            }

            if (string.IsNullOrWhiteSpace(credential.RefreshTokenEncrypted) ||
                credential.RefreshTokenExpiresDate <= DateTime.UtcNow)
            {
                await MarkRequiresReauthorizationAsync(
                    db,
                    credential,
                    "The refresh token is missing or expired.",
                    cancellationToken);
                throw new PlatformCredentialException(
                    "REAUTHORIZATION_REQUIRED",
                    $"The stored {current.Platform} credential for shop '{credential.ShopId}' must be authorized again.");
            }

            string refreshToken;
            try
            {
                refreshToken = _tokenProtector.Unprotect(credential.RefreshTokenEncrypted);
            }
            catch (Exception ex)
            {
                await MarkRequiresReauthorizationAsync(
                    db,
                    credential,
                    "The refresh token could not be decrypted.",
                    cancellationToken);
                throw new PlatformCredentialException(
                    "REAUTHORIZATION_REQUIRED",
                    $"The stored {current.Platform} credential for shop '{credential.ShopId}' must be authorized again.",
                    ex);
            }

            try
            {
                var authService = scope.ServiceProvider.GetRequiredService<IPlatformAuthService>();
                var refreshed = await authService.RefreshTokenAsync(
                    current.Platform,
                    refreshToken,
                    credential.ShopId);

                var updated = await db.PlatformCredentials.SingleAsync(
                    x => x.PlatformCredentialId == credential.PlatformCredentialId,
                    cancellationToken);
                updated.LastUseDate = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);

                return new PlatformAccessCredential(
                    updated.PlatformCredentialId,
                    current.Platform,
                    updated.ShopId,
                    refreshed.AccessToken);
            }
            catch (PlatformCredentialException)
            {
                throw;
            }
            catch (Exception ex)
            {
                credential.LastError = Truncate(ex.Message, 2000);
                credential.UpdateDate = DateTime.UtcNow;
                await db.SaveChangesAsync(CancellationToken.None);
                throw new PlatformCredentialException(
                    "TOKEN_REFRESH_FAILED",
                    $"Unable to refresh the stored {current.Platform} credential for shop '{credential.ShopId}'.",
                    ex);
            }
        }
        finally
        {
            refreshLock.Release();
        }
    }

    private async Task TouchLastUseAsync(long credentialId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var credential = await db.PlatformCredentials.SingleOrDefaultAsync(
            x => x.PlatformCredentialId == credentialId,
            cancellationToken);
        if (credential == null) return;

        credential.LastUseDate = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task MarkRequiresReauthorizationAsync(
        ApplicationDbContext db,
        PlatformCredential credential,
        string error,
        CancellationToken cancellationToken)
    {
        credential.RequiresReauthorization = "YES";
        credential.LastError = Truncate(error, 2000);
        credential.UpdateDate = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static string? ResolveRequestedShopId(PlatformType platform, string? requestedShopId)
    {
        if (!string.IsNullOrWhiteSpace(requestedShopId))
            return requestedShopId.Trim();

        return Environment.GetEnvironmentVariable(
            $"{platform.ToString().ToUpperInvariant()}_DEFAULT_SHOP_ID")?.Trim();
    }

    private static PlatformAccessCredential ToContext(
        PlatformType platform,
        PlatformCredential credential,
        string accessToken) =>
        new(credential.PlatformCredentialId, platform, credential.ShopId, accessToken);

    private static bool IsInvalidAccessToken(PlatformApiException exception)
    {
        if (string.Equals(exception.Code, "36009005", StringComparison.OrdinalIgnoreCase))
            return true;

        var error = string.Concat(exception.Code, " ", exception.Message);
        var normalized = new string(error
            .Where(char.IsLetterOrDigit)
            .Select(char.ToLowerInvariant)
            .ToArray());
        return normalized.Contains("accesstoken", StringComparison.Ordinal) ||
               normalized.Contains("acceesstoken", StringComparison.Ordinal);
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
