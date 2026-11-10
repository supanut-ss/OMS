using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OmsApi.Controllers;
using OmsApi.Extensions;

namespace OmsApi.Tests;

public class PlatformAppsControllerTests
{
    [Fact]
    public async Task Create_encrypts_credentials_and_rejects_duplicate_default()
    {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
            await using var db = new ApplicationDbContext(options);
            var protection = new EphemeralDataProtectionProvider();
            var controller = new PlatformAppsController(db, protection);
            var request = new CreatePlatformAppRequest
            {
                Platform = "lazada", AppName = "Main", AppKey = "key-value", AppSecret = "secret-value",
                RedirectUrl = "https://example.com/callback", CountryCode = "th", Environment = "production", IsDefault = true
            };

            var result = Assert.IsType<ObjectResult>(await controller.Create(request, default));
            Assert.Equal(201, result.StatusCode);
            var app = Assert.Single(db.PlatformApps);
            Assert.Equal("Lazada", app.Platform);
            Assert.Equal("TH", app.CountryCode);
            Assert.NotEqual(request.AppKey, app.AppKeyEncrypted);
            Assert.NotEqual(request.AppSecret, app.AppSecretEncrypted);
            var protector = protection.CreateProtector("OmsApi.PlatformCredentials.v1");
            Assert.Equal(request.AppKey, protector.Unprotect(app.AppKeyEncrypted));
            Assert.Equal(request.AppSecret, protector.Unprotect(app.AppSecretEncrypted));

            request.AppName = "Another";
            Assert.IsType<ConflictObjectResult>(await controller.Create(request, default));
            Assert.Single(db.PlatformApps);
    }

    [Fact]
    public async Task Update_preserves_credentials_when_they_are_not_reentered()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        var protection = new EphemeralDataProtectionProvider();
        var protector = protection.CreateProtector("OmsApi.PlatformCredentials.v1");
        var app = new OmsApi.Models.Persistence.PlatformApp
        {
            Platform = "Lazada", AppName = "Old", AppKeyEncrypted = protector.Protect("key"),
            AppSecretEncrypted = protector.Protect("secret"), RedirectUrl = "https://example.com/old",
            CountryCode = "TH", Environment = "PRODUCTION", IsDefault = "YES", IsActive = "YES",
            CreateDate = DateTime.UtcNow
        };
        db.PlatformApps.Add(app);
        await db.SaveChangesAsync();
        var controller = new PlatformAppsController(db, protection);

        var result = Assert.IsType<OkObjectResult>(await controller.Update(app.PlatformAppId,
            new UpdatePlatformAppRequest
            {
                AppName = "New", RedirectUrl = "https://example.com/new", CountryCode = "TH",
                Environment = "PRODUCTION", IsDefault = true, IsActive = true
            }, default));

        Assert.Equal("New", app.AppName);
        Assert.Equal("key", protector.Unprotect(app.AppKeyEncrypted));
        Assert.Equal("secret", protector.Unprotect(app.AppSecretEncrypted));
    }
}
