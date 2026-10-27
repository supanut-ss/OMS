using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Services.Implementation;

namespace OmsApi.Tests;

public sealed class PlatformAuthSessionTests
{
    [Fact]
    public async Task GetAuthorizationUrl_SelectsDefaultMarketAppAndPersistsHashedState()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new ApplicationDbContext(options);
        var protectionProvider = new EphemeralDataProtectionProvider();
        var protector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");

        db.PlatformApps.Add(new PlatformApp
        {
            Platform = "Lazada",
            AppName = "Lazada TH",
            AppKeyEncrypted = protector.Protect("app-key"),
            AppSecretEncrypted = protector.Protect("app-secret"),
            RedirectUrl = "https://oms.example.test/api/auth/lazada/callback",
            CountryCode = "TH",
            Environment = (System.Environment.GetEnvironmentVariable("OMS_PLATFORM_ENVIRONMENT") ?? "PRODUCTION")
                .Trim()
                .ToUpperInvariant(),
            IsDefault = "YES",
            IsActive = "YES",
            CreateDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new PlatformAuthService(
            NullLogger<PlatformAuthService>.Instance,
            db,
            protectionProvider);

        var url = await service.GetAuthorizationUrlAsync(
            PlatformType.Lazada,
            "th",
            "test-user");

        Assert.StartsWith("https://auth.lazada.com/oauth/authorize?", url);
        Assert.DoesNotContain("app-secret", url);
        var session = await db.OAuthSessions.SingleAsync();
        Assert.Equal("PENDING", session.Status);
        Assert.Equal("Lazada", session.Platform);
        Assert.Equal("test-user", session.RequestedBy);
        Assert.Equal(32, session.StateHash.Length);
        Assert.True(session.ExpiresDate > session.CreateDate);
    }
}
