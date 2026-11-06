using OmsApi.Models.Common;
using OmsApi.Models.Auth;
using Microsoft.EntityFrameworkCore;

namespace OmsApi.Extensions;

public static class PlatformShopIdResolver
{
    public static async Task<string> ResolveAsync(ApplicationDbContext db, PlatformType platform, string? requestedShopId, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(requestedShopId))
            return requestedShopId.Trim();

        var platformName = platform.ToString();
        var shops = await db.PlatformCredentials.AsNoTracking()
            .Where(x => x.Platform == platformName && x.IsActive == "YES" && x.RequiresReauthorization == "NO")
            .Select(x => x.ShopId).Take(2).ToListAsync(cancellationToken);
        if (shops.Count == 0)
            throw new PlatformCredentialException("CREDENTIAL_NOT_FOUND", $"No active {platformName} credential was found.");
        if (shops.Count > 1)
            throw new PlatformCredentialException("SHOP_ID_REQUIRED", $"More than one active {platformName} shop credential exists. Specify shopId.");
        return shops[0];
    }
}
