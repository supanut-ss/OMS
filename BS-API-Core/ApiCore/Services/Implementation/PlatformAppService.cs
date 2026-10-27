using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Data.Common;

namespace ApiCore.Services.Implementation
{
    public sealed class PlatformAppService : IPlatformAppService
    {
        private const string PlatformAppsTable = "[OMS].[oms].[t_oms_platform_apps]";
        private const string PlatformAppShopsTable = "[OMS].[oms].[t_oms_platform_app_shops]";
        private const string CredentialTable = "[OMS].[oms].[t_oms_platform_credential]";
        private const string OAuthSessionTable = "[OMS].[oms].[t_oms_oauth_session]";
        private const string SelectColumns = """
            app.platform_app_id AS PlatformAppId,
            app.platform AS Platform,
            app.app_name AS AppName,
            app.country_code AS CountryCode,
            app.environment AS Environment,
            app.redirect_url AS RedirectUrl,
            app.service_id AS ServiceId,
            CASE WHEN app.app_key_encrypted IS NOT NULL AND DATALENGTH(app.app_key_encrypted) > 0
                 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppKey,
            CASE WHEN app.app_secret_encrypted IS NOT NULL AND DATALENGTH(app.app_secret_encrypted) > 0
                 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppSecret,
            CASE WHEN app.is_default = N'YES' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsDefault,
            CASE WHEN app.is_active = N'YES' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsActive,
            (SELECT COUNT(1) FROM [OMS].[oms].[t_oms_platform_app_shops] linked
             WHERE linked.platform_app_id = app.platform_app_id) AS ShopCount,
            app.create_date AS CreateDate,
            app.create_by AS CreateBy,
            app.update_date AS UpdateDate,
            app.update_by AS UpdateBy
            """;

        private static readonly IReadOnlyDictionary<string, string> SupportedPlatforms =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Shopee"] = "Shopee",
                ["Lazada"] = "Lazada",
                ["TikTok"] = "TikTok",
                ["TikTok Shop"] = "TikTok",
            };

        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly IDataProtector _credentialProtector;
        private readonly ILogger<PlatformAppService> _logger;

        public PlatformAppService(
            ISqlConnectionFactory connectionFactory,
            IDataProtectionProvider dataProtectionProvider,
            ILogger<PlatformAppService> logger)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _credentialProtector = (dataProtectionProvider ?? throw new ArgumentNullException(nameof(dataProtectionProvider)))
                .CreateProtector("OmsApi.PlatformCredentials.v1");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<IReadOnlyList<PlatformAppResponse>> GetAllAsync(
            string? platform,
            CancellationToken cancellationToken = default)
        {
            var normalizedPlatform = string.IsNullOrWhiteSpace(platform)
                ? null
                : NormalizePlatform(platform);
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var rows = await connection.QueryAsync<PlatformAppResponse>(new CommandDefinition($"""
                SELECT {SelectColumns}
                FROM {PlatformAppsTable} app
                WHERE @Platform IS NULL OR app.platform = @Platform
                ORDER BY app.platform, app.country_code, app.environment,
                         CASE WHEN app.is_default = N'YES' THEN 0 ELSE 1 END, app.app_name
                """, new { Platform = normalizedPlatform }, cancellationToken: cancellationToken));
            return rows.AsList();
        }

        public async Task<PlatformAppResponse?> GetByIdAsync(
            long id,
            CancellationToken cancellationToken = default)
        {
            ValidateId(id);
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            return await LoadByIdAsync(connection, id, cancellationToken);
        }

        public async Task<PlatformAppResponse> SaveAsync(
            SavePlatformAppRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            var platform = NormalizePlatform(request.Platform);
            var appName = RequiredTrimmed(request.AppName, "app_name", 128);
            var countryCode = NormalizeCountryCode(request.CountryCode);
            var environment = NormalizeEnvironment(request.Environment);
            var redirectUrl = ValidateRedirectUrl(request.RedirectUrl);
            var serviceId = OptionalTrimmed(request.ServiceId, "service_id", 255);
            var appKey = OptionalTrimmed(request.AppKey, "app_key", 2048);
            var appSecret = OptionalTrimmed(request.AppSecret, "app_secret", 4096);
            var auditUser = string.IsNullOrWhiteSpace(updateBy) ? "SYSTEM" : updateBy.Trim();

            if (request.IsDefault && !request.IsActive)
                throw new ArgumentException("A default App Master must be active.");

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            try
            {
                var requestedAppId = request.PlatformAppId.GetValueOrDefault();
                if (request.IsDefault)
                {
                    // Clear the current default before writing the new one so the
                    // filtered unique index is never violated inside this transaction.
                    await connection.ExecuteAsync(new CommandDefinition($"""
                        UPDATE {PlatformAppsTable}
                        SET is_default = N'NO', update_by = @UpdateBy, update_date = SYSUTCDATETIME()
                        WHERE platform = @Platform
                          AND country_code = @CountryCode
                          AND environment = @Environment
                          AND platform_app_id <> @Id
                          AND is_default = N'YES'
                        """, new
                    {
                        Id = requestedAppId,
                        Platform = platform,
                        CountryCode = countryCode,
                        Environment = environment,
                        UpdateBy = auditUser,
                    }, transaction, cancellationToken: cancellationToken));
                }

                long appId;
                var credentialChanged = false;
                if (request.PlatformAppId.HasValue)
                {
                    appId = request.PlatformAppId.Value;
                    ValidateId(appId);
                    var current = await connection.QuerySingleOrDefaultAsync<PlatformAppIdentity>(new CommandDefinition($"""
                        SELECT platform AS Platform,
                               CASE WHEN app_key_encrypted IS NOT NULL AND DATALENGTH(app_key_encrypted) > 0
                                    THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppKey,
                               CASE WHEN app_secret_encrypted IS NOT NULL AND DATALENGTH(app_secret_encrypted) > 0
                                    THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppSecret
                        FROM {PlatformAppsTable} WITH (UPDLOCK, HOLDLOCK)
                        WHERE platform_app_id = @Id
                        """, new { Id = appId }, transaction, cancellationToken: cancellationToken));
                    if (current is null)
                        throw new KeyNotFoundException($"App Master '{appId}' was not found.");
                    if (!string.Equals(current.Platform, platform, StringComparison.OrdinalIgnoreCase))
                        throw new ArgumentException("The platform cannot be changed after an App Master is created.");
                    if (request.IsDefault &&
                        ((!current.HasAppKey && appKey is null) ||
                         (!current.HasAppSecret && appSecret is null)))
                        throw new ArgumentException("A default App Master must have both App Key and App Secret.");

                    credentialChanged = appKey is not null || appSecret is not null;
                    var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                        UPDATE {PlatformAppsTable}
                        SET app_name = @AppName,
                            app_key_encrypted = COALESCE(@AppKeyEncrypted, app_key_encrypted),
                            app_secret_encrypted = COALESCE(@AppSecretEncrypted, app_secret_encrypted),
                            redirect_url = @RedirectUrl,
                            service_id = @ServiceId,
                            country_code = @CountryCode,
                            environment = @Environment,
                            is_default = @IsDefault,
                            is_active = @IsActive,
                            update_by = @UpdateBy,
                            update_date = SYSUTCDATETIME()
                        WHERE platform_app_id = @Id
                        """, new
                    {
                        Id = appId,
                        AppName = appName,
                        AppKeyEncrypted = appKey is null ? null : _credentialProtector.Protect(appKey),
                        AppSecretEncrypted = appSecret is null ? null : _credentialProtector.Protect(appSecret),
                        RedirectUrl = redirectUrl,
                        ServiceId = serviceId,
                        CountryCode = countryCode,
                        Environment = environment,
                        IsDefault = request.IsDefault ? "YES" : "NO",
                        IsActive = request.IsActive ? "YES" : "NO",
                        UpdateBy = auditUser,
                    }, transaction, cancellationToken: cancellationToken));
                    if (affected == 0)
                        throw new KeyNotFoundException($"App Master '{appId}' was not found.");
                }
                else
                {
                    if (appKey is null || appSecret is null)
                        throw new ArgumentException("app_key and app_secret are required when creating an App Master.");

                    appId = await connection.ExecuteScalarAsync<long>(new CommandDefinition($"""
                        INSERT INTO {PlatformAppsTable}
                            (platform, app_name, app_key_encrypted, app_secret_encrypted,
                             redirect_url, service_id, country_code, environment,
                             is_default, is_active, create_by, create_date, update_by, update_date)
                        OUTPUT INSERTED.platform_app_id
                        VALUES
                            (@Platform, @AppName, @AppKeyEncrypted, @AppSecretEncrypted,
                             @RedirectUrl, @ServiceId, @CountryCode, @Environment,
                             @IsDefault, @IsActive, @UpdateBy, SYSUTCDATETIME(), @UpdateBy, SYSUTCDATETIME())
                        """, new
                    {
                        Platform = platform,
                        AppName = appName,
                        AppKeyEncrypted = _credentialProtector.Protect(appKey),
                        AppSecretEncrypted = _credentialProtector.Protect(appSecret),
                        RedirectUrl = redirectUrl,
                        ServiceId = serviceId,
                        CountryCode = countryCode,
                        Environment = environment,
                        IsDefault = request.IsDefault ? "YES" : "NO",
                        IsActive = request.IsActive ? "YES" : "NO",
                        UpdateBy = auditUser,
                    }, transaction, cancellationToken: cancellationToken));
                }

                if (!request.IsActive)
                {
                    await MarkConnectorsForReauthorizationAsync(
                        connection,
                        transaction,
                        appId,
                        auditUser,
                        "App Master is inactive.",
                        cancellationToken);
                }
                else if (credentialChanged)
                {
                    await MarkConnectorsForReauthorizationAsync(
                        connection,
                        transaction,
                        appId,
                        auditUser,
                        null,
                        cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                _logger.LogInformation("Saved App Master {PlatformAppId} for {Platform}/{CountryCode}/{Environment}",
                    appId, platform, countryCode, environment);
                return await LoadByIdAsync(connection, appId, cancellationToken)
                    ?? throw new InvalidOperationException("The saved App Master could not be loaded.");
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw new InvalidOperationException(
                    "An App Master with this name already exists, or another default App is already configured for this platform, market, and environment.",
                    ex);
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
        {
            ValidateId(id);
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var usage = await connection.QuerySingleOrDefaultAsync<PlatformAppUsage>(new CommandDefinition($"""
                SELECT app.platform_app_id AS PlatformAppId,
                       (SELECT COUNT(1) FROM {PlatformAppShopsTable} shop
                        WHERE shop.platform_app_id = app.platform_app_id) AS ShopCount,
                       (SELECT COUNT(1) FROM {OAuthSessionTable} oauth
                        WHERE oauth.platform_app_id = app.platform_app_id) AS OAuthSessionCount
                FROM {PlatformAppsTable} app WITH (UPDLOCK, HOLDLOCK)
                WHERE app.platform_app_id = @Id
                """, new { Id = id }, transaction, cancellationToken: cancellationToken));

            if (usage is null)
                throw new KeyNotFoundException($"App Master '{id}' was not found.");
            if (usage.ShopCount > 0 || usage.OAuthSessionCount > 0)
                throw new InvalidOperationException(
                    "This App Master is already referenced by a connector or OAuth history. Deactivate it instead of deleting it.");

            var deleted = await connection.ExecuteAsync(new CommandDefinition($"""
                DELETE FROM {PlatformAppsTable} WHERE platform_app_id = @Id
                """, new { Id = id }, transaction, cancellationToken: cancellationToken));
            if (deleted == 0)
                throw new KeyNotFoundException($"App Master '{id}' was not found.");

            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation("Deleted unused App Master {PlatformAppId}", id);
        }

        private static Task<int> MarkConnectorsForReauthorizationAsync(
            DbConnection connection,
            DbTransaction transaction,
            long appId,
            string updateBy,
            string? lastError,
            CancellationToken cancellationToken) =>
            connection.ExecuteAsync(new CommandDefinition($"""
                UPDATE {PlatformAppShopsTable}
                SET connection_status = 'REAUTHORIZATION_REQUIRED',
                    last_auth_error = @LastError,
                    update_by = @UpdateBy,
                    update_date = SYSUTCDATETIME()
                WHERE platform_app_id = @Id;

                UPDATE credential
                SET requires_reauthorization = N'YES',
                    last_error = @LastError,
                    update_by = @UpdateBy,
                    update_date = SYSUTCDATETIME()
                FROM {CredentialTable} credential
                INNER JOIN {PlatformAppShopsTable} shop
                    ON shop.platform_app_shop_id = credential.platform_app_shop_id
                WHERE shop.platform_app_id = @Id
                """, new { Id = appId, UpdateBy = updateBy, LastError = lastError },
                transaction, cancellationToken: cancellationToken));

        private static Task<PlatformAppResponse?> LoadByIdAsync(
            DbConnection connection,
            long id,
            CancellationToken cancellationToken) =>
            connection.QuerySingleOrDefaultAsync<PlatformAppResponse>(new CommandDefinition($"""
                SELECT {SelectColumns}
                FROM {PlatformAppsTable} app
                WHERE app.platform_app_id = @Id
                """, new { Id = id }, cancellationToken: cancellationToken));

        private static void ValidateId(long id)
        {
            if (id <= 0)
                throw new ArgumentException("platform_app_id must be greater than zero.");
        }

        private static string NormalizePlatform(string? value)
        {
            if (!string.IsNullOrWhiteSpace(value) && SupportedPlatforms.TryGetValue(value.Trim(), out var platform))
                return platform;
            throw new ArgumentException("platform must be Shopee, Lazada, or TikTok.");
        }

        private static string NormalizeCountryCode(string? value)
        {
            var normalized = RequiredTrimmed(value, "country_code", 2).ToUpperInvariant();
            if (normalized.Length != 2 || normalized.Any(character => character is < 'A' or > 'Z'))
                throw new ArgumentException("country_code must contain exactly two English letters.");
            return normalized;
        }

        private static string NormalizeEnvironment(string? value)
        {
            var normalized = RequiredTrimmed(value, "environment", 16).ToUpperInvariant();
            return normalized is "SANDBOX" or "PRODUCTION"
                ? normalized
                : throw new ArgumentException("environment must be SANDBOX or PRODUCTION.");
        }

        private static string ValidateRedirectUrl(string? value)
        {
            var redirectUrl = RequiredTrimmed(value, "redirect_url", 2048);
            if (!Uri.TryCreate(redirectUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
                throw new ArgumentException("redirect_url must be an absolute HTTP or HTTPS URL.");
            return redirectUrl;
        }

        private static string RequiredTrimmed(string? value, string name, int maxLength)
        {
            var trimmed = OptionalTrimmed(value, name, maxLength);
            return trimmed ?? throw new ArgumentException($"{name} is required.");
        }

        private static string? OptionalTrimmed(string? value, string name, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var trimmed = value.Trim();
            if (trimmed.Length > maxLength)
                throw new ArgumentException($"{name} cannot exceed {maxLength} characters.");
            return trimmed;
        }

        private sealed class PlatformAppIdentity
        {
            public string Platform { get; set; } = string.Empty;
            public bool HasAppKey { get; set; }
            public bool HasAppSecret { get; set; }
        }

        private sealed class PlatformAppUsage
        {
            public long PlatformAppId { get; set; }
            public int ShopCount { get; set; }
            public int OAuthSessionCount { get; set; }
        }
    }
}
