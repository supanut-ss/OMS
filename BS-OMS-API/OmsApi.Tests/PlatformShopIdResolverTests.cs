using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;

namespace OmsApi.Tests;

public class PlatformShopIdResolverTests
{
    [Theory]
    [InlineData(PlatformType.Shopee)]
    [InlineData(PlatformType.Lazada)]
    [InlineData(PlatformType.TikTok)]
    public async Task SelectsOnlyActiveCredentialForEachPlatform(PlatformType platform)
    {
        await using var db = CreateDb();
        db.PlatformCredentials.Add(new PlatformCredential { Platform = platform.ToString(), ShopId = "active", IsActive = "YES", RequiresReauthorization = "NO" });
        db.PlatformCredentials.Add(new PlatformCredential { Platform = platform.ToString(), ShopId = "inactive", IsActive = "NO", RequiresReauthorization = "NO" });
        db.PlatformCredentials.Add(new PlatformCredential { Platform = platform.ToString(), ShopId = "reauth", IsActive = "YES", RequiresReauthorization = "YES" });
        await db.SaveChangesAsync();
        Assert.Equal("active", await PlatformShopIdResolver.ResolveAsync(db, platform, null));
    }

    [Fact]
    public async Task RequiresShopIdWhenMultipleCredentialsExist()
    {
        await using var db = CreateDb();
        db.PlatformCredentials.AddRange(
            new PlatformCredential { Platform = "TikTok", ShopId = "one", IsActive = "YES", RequiresReauthorization = "NO" },
            new PlatformCredential { Platform = "TikTok", ShopId = "two", IsActive = "YES", RequiresReauthorization = "NO" });
        await db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<PlatformCredentialException>(() => PlatformShopIdResolver.ResolveAsync(db, PlatformType.TikTok, null));
        Assert.Equal("SHOP_ID_REQUIRED", error.Code);
        Assert.Equal("two", await PlatformShopIdResolver.ResolveAsync(db, PlatformType.TikTok, " two "));
    }

    [Fact]
    public async Task ReportsMissingCredential()
    {
        await using var db = CreateDb();
        var error = await Assert.ThrowsAsync<PlatformCredentialException>(() => PlatformShopIdResolver.ResolveAsync(db, PlatformType.TikTok, null));
        Assert.Equal("CREDENTIAL_NOT_FOUND", error.Code);
    }

    private static ApplicationDbContext CreateDb() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
}
