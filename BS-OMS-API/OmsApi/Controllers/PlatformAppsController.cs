using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OmsApi.Extensions;
using OmsApi.Models.Common;
using OmsApi.Models.Persistence;

namespace OmsApi.Controllers;

/// <summary>Administrative creation of marketplace applications.</summary>
[ApiController]
[Route("api/platform-apps")]
public class PlatformAppsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IDataProtector _protector;

    public PlatformAppsController(ApplicationDbContext db, IDataProtectionProvider protectionProvider)
    {
        _db = db;
        _protector = protectionProvider.CreateProtector("OmsApi.PlatformCredentials.v1");
    }

    /// <summary>Create an app. App credentials are encrypted before storage.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePlatformAppRequest request, CancellationToken cancellationToken)
    {
        var platform = (request.Platform ?? "").Trim();
        if (!Enum.TryParse<PlatformType>(platform, true, out var platformType) ||
            !Enum.IsDefined(platformType) || !string.Equals(platform, platformType.ToString(), StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<string>.Fail("Platform must be Shopee, Lazada, or TikTok."));

        var appName = (request.AppName ?? "").Trim();
        var appKey = (request.AppKey ?? "").Trim();
        var appSecret = (request.AppSecret ?? "").Trim();
        var country = (request.CountryCode ?? "").Trim().ToUpperInvariant();
        var environment = (request.Environment ?? "").Trim().ToUpperInvariant();
        if (appName.Length == 0 || appKey.Length == 0 || appSecret.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("App name, app key, and app secret are required."));
        if (country.Length != 2 || country.Any(c => c < 'A' || c > 'Z'))
            return BadRequest(ApiResponse<string>.Fail("Country code must be two letters."));
        if (environment != "SANDBOX" && environment != "PRODUCTION")
            return BadRequest(ApiResponse<string>.Fail("Environment must be SANDBOX or PRODUCTION."));
        if (!Uri.TryCreate(request.RedirectUrl?.Trim(), UriKind.Absolute, out var redirect) ||
            (redirect.Scheme != Uri.UriSchemeHttps && redirect.Scheme != Uri.UriSchemeHttp) ||
            !string.IsNullOrEmpty(redirect.UserInfo))
            return BadRequest(ApiResponse<string>.Fail("Redirect URL must be an absolute HTTP or HTTPS URL."));
        if (platformType == PlatformType.Shopee && (!long.TryParse(appKey, out var partnerId) || partnerId <= 0))
            return BadRequest(ApiResponse<string>.Fail("Shopee app key must be a positive partner ID."));

        var platformName = platformType.ToString();
        if (await _db.PlatformApps.AnyAsync(x => x.Platform == platformName && x.AppName == appName, cancellationToken))
            return Conflict(ApiResponse<string>.Fail("An app with this name already exists for the platform."));
        if (request.IsDefault && await _db.PlatformApps.AnyAsync(x => x.Platform == platformName && x.CountryCode == country &&
            x.Environment == environment && x.IsActive == "YES" && x.IsDefault == "YES", cancellationToken))
            return Conflict(ApiResponse<string>.Fail("An active default app already exists for this platform, country, and environment."));

        var app = new PlatformApp
        {
            Platform = platformName, AppName = appName,
            AppKeyEncrypted = _protector.Protect(appKey), AppSecretEncrypted = _protector.Protect(appSecret),
            RedirectUrl = request.RedirectUrl!.Trim(), ServiceId = string.IsNullOrWhiteSpace(request.ServiceId) ? null : request.ServiceId.Trim(),
            CountryCode = country, Environment = environment, IsDefault = request.IsDefault ? "YES" : "NO",
            IsActive = "YES", CreateBy = "OMS API", CreateDate = DateTime.UtcNow
        };
        _db.PlatformApps.Add(app);
        try { await _db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
        {
            return Conflict(ApiResponse<string>.Fail("An app with the same name or active default already exists."));
        }

        return StatusCode(201, ApiResponse<object>.Ok(new
        {
            app.PlatformAppId, app.Platform, app.AppName, app.RedirectUrl, app.ServiceId,
            app.CountryCode, app.Environment, app.IsDefault, app.IsActive
        }, "Platform app created."));
    }

    /// <summary>Update an app. Empty credential fields preserve the current encrypted values.</summary>
    [HttpPut("{platformAppId:long}")]
    public async Task<IActionResult> Update(
        long platformAppId,
        [FromBody] UpdatePlatformAppRequest request,
        CancellationToken cancellationToken)
    {
        var app = await _db.PlatformApps.SingleOrDefaultAsync(
            x => x.PlatformAppId == platformAppId, cancellationToken);
        if (app == null)
            return NotFound(ApiResponse<string>.Fail("Platform app was not found."));

        var appName = (request.AppName ?? "").Trim();
        var country = (request.CountryCode ?? "").Trim().ToUpperInvariant();
        var environment = (request.Environment ?? "").Trim().ToUpperInvariant();
        if (appName.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("App name is required."));
        if (country.Length != 2 || country.Any(c => c < 'A' || c > 'Z'))
            return BadRequest(ApiResponse<string>.Fail("Country code must be two letters."));
        if (environment != "SANDBOX" && environment != "PRODUCTION")
            return BadRequest(ApiResponse<string>.Fail("Environment must be SANDBOX or PRODUCTION."));
        if (!Uri.TryCreate(request.RedirectUrl?.Trim(), UriKind.Absolute, out var redirect) ||
            (redirect.Scheme != Uri.UriSchemeHttps && redirect.Scheme != Uri.UriSchemeHttp) ||
            !string.IsNullOrEmpty(redirect.UserInfo))
            return BadRequest(ApiResponse<string>.Fail("Redirect URL must be an absolute HTTP or HTTPS URL."));

        var appKey = (request.AppKey ?? "").Trim();
        var appSecret = (request.AppSecret ?? "").Trim();
        if (app.Platform == PlatformType.Shopee.ToString() && appKey.Length > 0 &&
            (!long.TryParse(appKey, out var partnerId) || partnerId <= 0))
            return BadRequest(ApiResponse<string>.Fail("Shopee app key must be a positive partner ID."));

        if (await _db.PlatformApps.AnyAsync(x => x.PlatformAppId != platformAppId &&
            x.Platform == app.Platform && x.AppName == appName, cancellationToken))
            return Conflict(ApiResponse<string>.Fail("An app with this name already exists for the platform."));
        if (request.IsDefault && request.IsActive && await _db.PlatformApps.AnyAsync(x =>
            x.PlatformAppId != platformAppId && x.Platform == app.Platform &&
            x.CountryCode == country && x.Environment == environment &&
            x.IsActive == "YES" && x.IsDefault == "YES", cancellationToken))
            return Conflict(ApiResponse<string>.Fail(
                "An active default app already exists for this platform, country, and environment."));

        app.AppName = appName;
        app.RedirectUrl = request.RedirectUrl!.Trim();
        app.ServiceId = string.IsNullOrWhiteSpace(request.ServiceId) ? null : request.ServiceId.Trim();
        app.CountryCode = country;
        app.Environment = environment;
        app.IsDefault = request.IsDefault ? "YES" : "NO";
        app.IsActive = request.IsActive ? "YES" : "NO";
        app.UpdateBy = "OMS API";
        app.UpdateDate = DateTime.UtcNow;
        if (appKey.Length > 0)
            app.AppKeyEncrypted = _protector.Protect(appKey);
        if (appSecret.Length > 0)
            app.AppSecretEncrypted = _protector.Protect(appSecret);

        try { await _db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        {
            return Conflict(ApiResponse<string>.Fail(
                "An app with the same name or active default already exists."));
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            app.PlatformAppId, app.Platform, app.AppName, app.RedirectUrl, app.ServiceId,
            app.CountryCode, app.Environment, app.IsDefault, app.IsActive
        }, "Platform app updated."));
    }
}

public sealed class CreatePlatformAppRequest
{
    [Required, StringLength(32)] public string Platform { get; set; } = string.Empty;
    [Required, StringLength(128)] public string AppName { get; set; } = string.Empty;
    [Required, StringLength(4096)] public string AppKey { get; set; } = string.Empty;
    [Required, StringLength(4096)] public string AppSecret { get; set; } = string.Empty;
    [Required, StringLength(2048)] public string RedirectUrl { get; set; } = string.Empty;
    [StringLength(255)] public string? ServiceId { get; set; }
    [Required, StringLength(2, MinimumLength = 2)] public string CountryCode { get; set; } = "TH";
    [Required, StringLength(16)] public string Environment { get; set; } = "PRODUCTION";
    public bool IsDefault { get; set; }
}

public sealed class UpdatePlatformAppRequest
{
    [Required, StringLength(128)] public string AppName { get; set; } = string.Empty;
    [StringLength(4096)] public string? AppKey { get; set; }
    [StringLength(4096)] public string? AppSecret { get; set; }
    [Required, StringLength(2048)] public string RedirectUrl { get; set; } = string.Empty;
    [StringLength(255)] public string? ServiceId { get; set; }
    [Required, StringLength(2, MinimumLength = 2)] public string CountryCode { get; set; } = "TH";
    [Required, StringLength(16)] public string Environment { get; set; } = "PRODUCTION";
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}
