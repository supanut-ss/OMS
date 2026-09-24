using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OmsApi.Extensions;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;
using OmsApi.Services.Implementation;
using OmsApi.Services.Interfaces;

namespace OmsApi.Tests;

public class PlatformCredentialServiceTests
{
    [Fact]
    public async Task ExecuteAsync_UsesStoredToken_WhenItIsStillValid()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "valid-token",
            accessExpiresAt: DateTime.UtcNow.AddHours(1),
            refreshExpiresAt: DateTime.UtcNow.AddDays(1));

        var service = provider.GetRequiredService<IPlatformCredentialService>();
        var usedToken = await service.ExecuteAsync(
            PlatformType.Shopee,
            "shop-1",
            credential => Task.FromResult(credential.AccessToken));

        Assert.Equal("valid-token", usedToken);
        Assert.Equal(0, provider.GetRequiredService<FakeAuthState>().RefreshCalls);

        await using var scope = provider.CreateAsyncScope();
        var row = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()
            .PlatformCredentials.SingleAsync();
        Assert.NotNull(row.LastUseDate);
    }

    [Fact]
    public async Task ExecuteAsync_RefreshesBeforeCallingPlatform_WhenTokenIsExpiring()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "expired-token",
            accessExpiresAt: DateTime.UtcNow.AddMinutes(1),
            refreshExpiresAt: DateTime.UtcNow.AddDays(1));

        var service = provider.GetRequiredService<IPlatformCredentialService>();
        var usedToken = await service.ExecuteAsync(
            PlatformType.Shopee,
            "shop-1",
            credential => Task.FromResult(credential.AccessToken));

        Assert.Equal("refreshed-token", usedToken);
        Assert.Equal(1, provider.GetRequiredService<FakeAuthState>().RefreshCalls);
    }

    [Fact]
    public async Task ExecuteAsync_RefreshesAndRetriesOnce_WhenPlatformRejectsToken()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "rejected-token",
            accessExpiresAt: DateTime.UtcNow.AddHours(1),
            refreshExpiresAt: DateTime.UtcNow.AddDays(1));

        var attempts = 0;
        var service = provider.GetRequiredService<IPlatformCredentialService>();
        var usedToken = await service.ExecuteAsync(
            PlatformType.Shopee,
            "shop-1",
            credential =>
            {
                attempts++;
                if (attempts == 1)
                {
                    throw new PlatformApiException(
                        "Shopee",
                        "invalid_access_token",
                        "The access token is invalid.");
                }

                return Task.FromResult(credential.AccessToken);
            });

        Assert.Equal("refreshed-token", usedToken);
        Assert.Equal(2, attempts);
        Assert.Equal(1, provider.GetRequiredService<FakeAuthState>().RefreshCalls);
    }

    [Fact]
    public async Task ExecuteAsync_MarksReauthorization_WhenRefreshTokenIsExpired()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "expired-token",
            accessExpiresAt: DateTime.UtcNow.AddMinutes(-1),
            refreshExpiresAt: DateTime.UtcNow.AddMinutes(-1));

        var service = provider.GetRequiredService<IPlatformCredentialService>();
        var exception = await Assert.ThrowsAsync<PlatformCredentialException>(() =>
            service.ExecuteAsync(
                PlatformType.Shopee,
                "shop-1",
                credential => Task.FromResult(credential.AccessToken)));

        Assert.Equal("REAUTHORIZATION_REQUIRED", exception.Code);

        await using var scope = provider.CreateAsyncScope();
        var row = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()
            .PlatformCredentials.SingleAsync();
        Assert.Equal("YES", row.RequiresReauthorization);
    }

    [Fact]
    public async Task ExecuteAsync_RefreshesOnlyOnce_ForConcurrentExpiringRequests()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "expired-token",
            accessExpiresAt: DateTime.UtcNow.AddMinutes(-1),
            refreshExpiresAt: DateTime.UtcNow.AddDays(1));

        var service = provider.GetRequiredService<IPlatformCredentialService>();
        var operations = Enumerable.Range(0, 2)
            .Select(_ => service.ExecuteAsync(
                PlatformType.Shopee,
                "shop-1",
                credential => Task.FromResult(credential.AccessToken)))
            .ToArray();

        var tokens = await Task.WhenAll(operations);

        Assert.All(tokens, token => Assert.Equal("refreshed-token", token));
        Assert.Equal(1, provider.GetRequiredService<FakeAuthState>().RefreshCalls);
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotRetryMoreThanOnce()
    {
        await using var provider = CreateProvider();
        await SeedCredentialAsync(
            provider,
            accessToken: "rejected-token",
            accessExpiresAt: DateTime.UtcNow.AddHours(1),
            refreshExpiresAt: DateTime.UtcNow.AddDays(1));

        var attempts = 0;
        var service = provider.GetRequiredService<IPlatformCredentialService>();
        await Assert.ThrowsAsync<PlatformApiException>(() =>
            service.ExecuteAsync<string>(
                PlatformType.Shopee,
                "shop-1",
                _ =>
                {
                    attempts++;
                    throw new PlatformApiException(
                        "Shopee",
                        "invalid_access_token",
                        "The access token is invalid.");
                }));

        Assert.Equal(2, attempts);
        Assert.Equal(1, provider.GetRequiredService<FakeAuthState>().RefreshCalls);
    }

    private static ServiceProvider CreateProvider()
    {
        var services = new ServiceCollection();
        var databaseName = Guid.NewGuid().ToString("N");
        services.AddLogging();
        services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
        services.AddSingleton<FakeAuthState>();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        services.AddScoped<IPlatformAuthService, FakePlatformAuthService>();
        services.AddScoped<IPlatformCredentialService, PlatformCredentialService>();
        return services.BuildServiceProvider();
    }

    private static async Task SeedCredentialAsync(
        ServiceProvider provider,
        string accessToken,
        DateTime accessExpiresAt,
        DateTime refreshExpiresAt)
    {
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var protector = provider.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("OmsApi.PlatformCredentials.v1");
        db.PlatformCredentials.Add(new PlatformCredential
        {
            Platform = PlatformType.Shopee.ToString(),
            ShopId = "shop-1",
            AccessTokenEncrypted = protector.Protect(accessToken),
            RefreshTokenEncrypted = protector.Protect("refresh-token"),
            AccessTokenExpiresDate = accessExpiresAt,
            RefreshTokenExpiresDate = refreshExpiresAt,
            IsActive = "YES",
            RequiresReauthorization = "NO",
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    private sealed class FakeAuthState
    {
        public int RefreshCalls { get; set; }
    }

    private sealed class FakePlatformAuthService : IPlatformAuthService
    {
        private readonly ApplicationDbContext _db;
        private readonly IDataProtector _protector;
        private readonly FakeAuthState _state;

        public FakePlatformAuthService(
            ApplicationDbContext db,
            IDataProtectionProvider protectionProvider,
            FakeAuthState state)
        {
            _db = db;
            _protector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");
            _state = state;
        }

        public string GetAuthorizationUrl(PlatformType platform, string? state = null) =>
            throw new NotSupportedException();

        public Task<TokenInfo> HandleCallbackAsync(
            PlatformType platform,
            string code,
            string? shopId = null) =>
            throw new NotSupportedException();

        public async Task<TokenInfo> RefreshTokenAsync(
            PlatformType platform,
            string refreshToken,
            string? shopId = null)
        {
            _state.RefreshCalls++;
            var row = await _db.PlatformCredentials.SingleAsync(x =>
                x.Platform == platform.ToString() && x.ShopId == shopId);
            var now = DateTime.UtcNow;
            row.AccessTokenEncrypted = _protector.Protect("refreshed-token");
            row.AccessTokenExpiresDate = now.AddHours(1);
            row.LastRefreshDate = now;
            row.UpdateDate = now;
            await _db.SaveChangesAsync();

            return new TokenInfo
            {
                Platform = platform,
                ShopId = shopId,
                AccessToken = "refreshed-token",
                RefreshToken = refreshToken,
                ExpiresAt = row.AccessTokenExpiresDate,
                RefreshExpiresAt = row.RefreshTokenExpiresDate ?? now
            };
        }

        public Task<TokenInfo> ImportSandboxTokenAsync(
            PlatformType platform,
            SandboxTokenRequest request) =>
            throw new NotSupportedException();
    }
}
