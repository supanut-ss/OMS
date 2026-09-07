using OmsApi.Models.Common;

namespace OmsApi.Extensions;

public static class PlatformShopIdResolver
{
    public static string Resolve(PlatformType platform, string? requestedShopId)
    {
        if (!string.IsNullOrWhiteSpace(requestedShopId))
            return requestedShopId.Trim();

        var environmentVariable = $"{platform.ToString().ToUpperInvariant()}_DEFAULT_SHOP_ID";
        var defaultShopId = Environment.GetEnvironmentVariable(environmentVariable)?.Trim();
        if (string.IsNullOrWhiteSpace(defaultShopId))
        {
            throw new InvalidOperationException(
                $"{environmentVariable} is not configured. Set the platform shop ID in the OMS environment.");
        }

        return defaultShopId;
    }
}
