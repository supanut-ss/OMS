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
    public sealed class ConnectorService : IConnectorService
    {
        private const string PlatformAppsTable = "[OMS].[oms].[t_oms_platform_apps]";
        private const string PlatformAppShopsTable = "[OMS].[oms].[t_oms_platform_app_shops]";
        private const string CredentialTable = "[OMS].[oms].[t_oms_platform_credential]";
        private const string SelectColumns = """
            shop.platform_app_shop_id AS PlatformAppShopId,
            shop.platform_app_id AS PlatformAppId,
            app.app_name AS AppName,
            shop.platform AS Platform,
            shop.shop_id AS ShopId,
            shop.shop_name AS ShopName,
            CASE WHEN credential.access_token_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAccessToken,
            CASE WHEN credential.refresh_token_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasRefreshToken,
            CASE WHEN app.app_key_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppKey,
            CASE WHEN app.app_secret_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppSecret,
            credential.access_token_expires_date AS AccessTokenExpiresDate,
            credential.refresh_token_expires_date AS RefreshTokenExpiresDate,
            CASE WHEN shop.is_active = N'YES' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsActive,
            CASE WHEN credential.platform_credential_id IS NULL OR credential.access_token_encrypted IS NULL OR credential.requires_reauthorization = N'YES'
                 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS RequiresReauthorization,
            credential.last_refresh_date AS LastRefreshDate,
            credential.last_use_date AS LastUseDate,
            credential.last_error AS LastError,
            shop.create_date AS CreateDate,
            shop.update_date AS UpdateDate
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
        private readonly ILogger<ConnectorService> _logger;

        public ConnectorService(
            ISqlConnectionFactory connectionFactory,
            IDataProtectionProvider dataProtectionProvider,
            ILogger<ConnectorService> logger)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _credentialProtector = (dataProtectionProvider ?? throw new ArgumentNullException(nameof(dataProtectionProvider)))
                .CreateProtector("OmsApi.PlatformCredentials.v1");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<IReadOnlyList<ConnectorResponse>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var rows = await connection.QueryAsync<ConnectorResponse>(new CommandDefinition($"""
                SELECT {SelectColumns}
                FROM {PlatformAppShopsTable} shop
                INNER JOIN {PlatformAppsTable} app ON app.platform_app_id = shop.platform_app_id
                LEFT JOIN {CredentialTable} credential ON credential.platform = shop.platform AND credential.shop_id = shop.shop_id
                ORDER BY shop.platform, shop.shop_name, shop.shop_id
                """, cancellationToken: cancellationToken));
            return rows.AsList();
        }

        public async Task<IReadOnlyList<PlatformAppOptionResponse>> GetPlatformAppsAsync(
            string? platform,
            CancellationToken cancellationToken = default)
        {
            var normalizedPlatform = string.IsNullOrWhiteSpace(platform) ? null : NormalizePlatform(platform);
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var rows = await connection.QueryAsync<PlatformAppOptionResponse>(new CommandDefinition($"""
                SELECT app.platform_app_id AS PlatformAppId,
                       app.platform AS Platform,
                       app.app_name AS AppName,
                       CAST(1 AS bit) AS IsActive,
                       COUNT(shop.platform_app_shop_id) AS ShopCount
                FROM {PlatformAppsTable} app
                LEFT JOIN {PlatformAppShopsTable} shop
                    ON shop.platform_app_id = app.platform_app_id AND shop.is_active = N'YES'
                WHERE (@Platform IS NULL OR app.platform = @Platform) AND app.is_active = N'YES'
                GROUP BY app.platform_app_id, app.platform, app.app_name
                ORDER BY app.platform, app.app_name
                """, new { Platform = normalizedPlatform }, cancellationToken: cancellationToken));
            return rows.AsList();
        }

        public async Task<ConnectorResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            if (id <= 0)
                throw new ArgumentException("platform_app_shop_id must be greater than zero.");

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            return await LoadByIdAsync(connection, id, cancellationToken);
        }

        public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
        {
            if (id <= 0)
                throw new ArgumentException("platform_app_shop_id must be greater than zero.");

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var connector = await connection.QuerySingleOrDefaultAsync<ConnectorDeleteTarget>(
                new CommandDefinition($"""
                    SELECT platform AS Platform, shop_id AS ShopId
                    FROM {PlatformAppShopsTable} WITH (UPDLOCK, HOLDLOCK)
                    WHERE platform_app_shop_id = @Id
                    """,
                    new { Id = id },
                    transaction,
                    cancellationToken: cancellationToken));

            if (connector is null)
                throw new KeyNotFoundException($"Connector '{id}' was not found.");

            var hasOrders = await connection.ExecuteScalarAsync<bool>(new CommandDefinition($"""
                SELECT CASE WHEN EXISTS (
                    SELECT 1
                    FROM [OMS].[oms].[t_oms_order] WITH (UPDLOCK, HOLDLOCK)
                    WHERE platform = @Platform AND shop_id = @ShopId
                ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
                """,
                new { connector.Platform, connector.ShopId },
                transaction,
                cancellationToken: cancellationToken));

            if (hasOrders)
                throw new InvalidOperationException(
                    "ไม่สามารถลบ Connector นี้ได้ เนื่องจากพบข้อมูลคำสั่งซื้อของร้านนี้ในระบบ");

            await connection.ExecuteAsync(new CommandDefinition($"""
                DELETE FROM {CredentialTable}
                WHERE platform = @Platform
                  AND shop_id = @ShopId
                """,
                new { connector.Platform, connector.ShopId },
                transaction,
                cancellationToken: cancellationToken));

            var deleted = await connection.ExecuteAsync(new CommandDefinition($"""
                DELETE FROM {PlatformAppShopsTable}
                WHERE platform_app_shop_id = @Id
                  AND platform = @Platform
                  AND shop_id = @ShopId
                """,
                new { Id = id, connector.Platform, connector.ShopId },
                transaction,
                cancellationToken: cancellationToken));

            if (deleted == 0)
                throw new KeyNotFoundException($"Connector '{id}' was not found.");

            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation(
                "Deleted connector {ConnectorId} for platform {Platform}, shop {ShopId}",
                id,
                connector.Platform,
                connector.ShopId);
        }

        public async Task<ConnectorResponse> SaveAsync(
            SaveConnectorRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            var platform = NormalizePlatform(request.Platform);
            var shopId = RequiredTrimmed(request.ShopId, "shop_id", 128);
            var isNew = !request.PlatformAppShopId.HasValue;
            if (request.PlatformAppId.HasValue && request.NewApp is not null)
                throw new ArgumentException("Choose an existing App Master or create a new one, not both.");
            if (!request.PlatformAppId.HasValue && request.NewApp is null)
                throw new ArgumentException("An App Master is required.");

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                var appId = request.NewApp is not null
                    ? await CreatePlatformAppAsync(connection, transaction, platform, request.NewApp, updateBy, cancellationToken)
                    : await EnsurePlatformAppAsync(connection, transaction, request.PlatformAppId!.Value, platform, cancellationToken);
                long platformAppShopId;

                if (isNew)
                {
                    platformAppShopId = await connection.ExecuteScalarAsync<long>(new CommandDefinition($"""
                        INSERT INTO {PlatformAppShopsTable}
                            (platform_app_id, platform, shop_id, shop_name, is_active, create_by, create_date, update_by, update_date)
                        OUTPUT INSERTED.platform_app_shop_id
                        VALUES
                            (@PlatformAppId, @Platform, @ShopId, @ShopName, @IsActive,
                             @UpdateBy, SYSUTCDATETIME(), @UpdateBy, SYSUTCDATETIME())
                        """,
                        new
                        {
                            PlatformAppId = appId,
                            Platform = platform,
                            ShopId = shopId,
                            ShopName = NullIfWhiteSpace(request.ShopName),
                            IsActive = request.IsActive == false ? "NO" : "YES",
                            UpdateBy = updateBy,
                        }, transaction: transaction, cancellationToken: cancellationToken));
                }
                else
                {
                    platformAppShopId = request.PlatformAppShopId!.Value;
                    if (platformAppShopId <= 0)
                        throw new ArgumentException("platform_app_shop_id must be greater than zero.");

                    var previousAppId = await connection.QuerySingleOrDefaultAsync<long?>(new CommandDefinition($"""
                        SELECT platform_app_id FROM {PlatformAppShopsTable} WHERE platform_app_shop_id = @Id
                        """, new { Id = platformAppShopId }, transaction: transaction, cancellationToken: cancellationToken));
                    if (!previousAppId.HasValue)
                        throw new KeyNotFoundException($"Connector '{platformAppShopId}' was not found.");

                    var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                        UPDATE {PlatformAppShopsTable}
                        SET platform_app_id = @PlatformAppId,
                            platform = @Platform,
                            shop_id = @ShopId,
                            shop_name = @ShopName,
                            is_active = COALESCE(@IsActive, is_active),
                            update_by = @UpdateBy,
                            update_date = SYSUTCDATETIME()
                        WHERE platform_app_shop_id = @Id
                        """,
                        new
                        {
                            Id = platformAppShopId,
                            PlatformAppId = appId,
                            Platform = platform,
                            ShopId = shopId,
                            ShopName = NullIfWhiteSpace(request.ShopName),
                            IsActive = request.IsActive.HasValue ? (request.IsActive.Value ? "YES" : "NO") : null,
                            UpdateBy = updateBy,
                        }, transaction: transaction, cancellationToken: cancellationToken));

                    if (affected == 0)
                        throw new KeyNotFoundException($"Connector '{platformAppShopId}' was not found.");

                    if (previousAppId.Value != appId)
                    {
                        await connection.ExecuteAsync(new CommandDefinition($"""
                            UPDATE credential
                            SET requires_reauthorization = N'YES', last_error = NULL,
                                update_by = @UpdateBy, update_date = SYSUTCDATETIME()
                            FROM {CredentialTable} credential
                            INNER JOIN {PlatformAppShopsTable} shop ON shop.platform = credential.platform AND shop.shop_id = credential.shop_id
                            WHERE shop.platform_app_shop_id = @Id
                            """, new { Id = platformAppShopId, UpdateBy = updateBy }, transaction: transaction, cancellationToken: cancellationToken));
                    }
                }

                // A connector is actionable before its first OAuth callback. Keep one
                // token record per platform/shop so the UI and reauthorization flow can
                // represent that initial "OAuth required" state without storing tokens.
                await EnsureCredentialPlaceholderAsync(
                    connection,
                    transaction,
                    platform,
                    shopId,
                    NullIfWhiteSpace(request.ShopName),
                    updateBy,
                    cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return (await LoadByIdAsync(connection, platformAppShopId, cancellationToken))
                    ?? throw new InvalidOperationException("The saved connector could not be loaded.");
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw new InvalidOperationException("A connector for this platform and shop already exists, or the App Master name is already in use.", ex);
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        public async Task<ConnectorResponse> SetActiveAsync(
            SetConnectorActiveRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            if (request.PlatformAppShopId <= 0)
                throw new ArgumentException("A valid platform_app_shop_id is required."); 

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                UPDATE {PlatformAppShopsTable}
                SET is_active = @IsActive,
                    update_date = SYSUTCDATETIME(),
                    update_by = @UpdateBy
                WHERE platform_app_shop_id = @Id
                """,
                new
                {
                    Id = request.PlatformAppShopId,
                    IsActive = request.IsActive ? "YES" : "NO",
                    UpdateBy = updateBy,
                }, cancellationToken: cancellationToken));

            return await GetUpdatedOrThrowAsync(connection, request.PlatformAppShopId, affected, cancellationToken);
        }

        public async Task<ConnectorResponse> SetReauthorizationAsync(
            SetConnectorReauthorizationRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            if (request.PlatformAppShopId <= 0)
                throw new ArgumentException("A valid platform_app_shop_id is required.");
             
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                UPDATE credential
                SET requires_reauthorization = @RequiresReauthorization,
                    last_error = @LastError,
                    update_date = SYSUTCDATETIME(),
                    update_by = @UpdateBy
                FROM {CredentialTable} credential
                INNER JOIN {PlatformAppShopsTable} shop ON shop.platform = credential.platform AND shop.shop_id = credential.shop_id
                WHERE shop.platform_app_shop_id = @Id
                """,
                new
                {
                    Id = request.PlatformAppShopId,
                    RequiresReauthorization = request.RequiresReauthorization ? "YES" : "NO",
                    LastError = NullIfWhiteSpace(request.RequiresReauthorization ? request.LastError : null),
                    UpdateBy = updateBy, 
                }, cancellationToken: cancellationToken));

            if (affected == 0)
            {
                var connector = await LoadByIdAsync(connection, request.PlatformAppShopId, cancellationToken);
                if (connector is null)
                    throw new KeyNotFoundException($"Connector '{request.PlatformAppShopId}' was not found.");
                return connector;
            }

            return await GetUpdatedOrThrowAsync(connection, request.PlatformAppShopId, affected, cancellationToken);
        }

        private async Task<ConnectorResponse> GetUpdatedOrThrowAsync(
            DbConnection connection,
            long id,
            int affected,
            CancellationToken cancellationToken)
        {
            if (affected == 0)
                throw new KeyNotFoundException($"Connector '{id}' was not found.");

            return (await LoadByIdAsync(connection, id, cancellationToken))
                ?? throw new InvalidOperationException("The updated connector could not be loaded.");
        }

        private async Task<ConnectorResponse?> LoadByIdAsync(
            DbConnection connection,
            long id,
            CancellationToken cancellationToken)
        {
            return await connection.QuerySingleOrDefaultAsync<ConnectorResponse>(new CommandDefinition($"""
                SELECT {SelectColumns}
                FROM {PlatformAppShopsTable} shop
                INNER JOIN {PlatformAppsTable} app ON app.platform_app_id = shop.platform_app_id
                LEFT JOIN {CredentialTable} credential ON credential.platform = shop.platform AND credential.shop_id = shop.shop_id
                WHERE shop.platform_app_shop_id = @Id
                """, new { Id = id }, cancellationToken: cancellationToken));
        }

        private async Task<long> CreatePlatformAppAsync(
            DbConnection connection,
            DbTransaction transaction,
            string platform,
            NewPlatformAppRequest request,
            string updateBy,
            CancellationToken cancellationToken)
        {
            var appName = RequiredTrimmed(request.AppName, "app_name", 128);
            var appKey = RequiredTrimmed(request.AppKey, "app_key", 2048);
            var appSecret = RequiredTrimmed(request.AppSecret, "app_secret", 4096);
            var redirectUrl = ValidateRedirectUrl(request.RedirectUrl);

            return await connection.ExecuteScalarAsync<long>(new CommandDefinition($"""
                INSERT INTO {PlatformAppsTable}
                    (platform, app_name, app_key_encrypted, app_secret_encrypted, redirect_url, service_id,
                     is_active, create_by, create_date, update_by, update_date)
                OUTPUT INSERTED.platform_app_id
                VALUES
                    (@Platform, @AppName, @AppKeyEncrypted, @AppSecretEncrypted, @RedirectUrl, @ServiceId,
                     N'YES', @UpdateBy, SYSUTCDATETIME(), @UpdateBy, SYSUTCDATETIME())
                """, new
            {
                Platform = platform,
                AppName = appName,
                AppKeyEncrypted = _credentialProtector.Protect(appKey),
                AppSecretEncrypted = _credentialProtector.Protect(appSecret),
                RedirectUrl = redirectUrl,
                ServiceId = NullIfWhiteSpace(request.ServiceId),
                UpdateBy = updateBy,
            }, transaction: transaction, cancellationToken: cancellationToken));
        }

        private static async Task<long> EnsurePlatformAppAsync(
            DbConnection connection,
            DbTransaction transaction,
            long appId,
            string platform,
            CancellationToken cancellationToken)
        {
            if (appId <= 0)
                throw new ArgumentException("platform_app_id must be greater than zero.");

            var matchedId = await connection.QuerySingleOrDefaultAsync<long?>(new CommandDefinition($"""
                SELECT platform_app_id
                FROM {PlatformAppsTable}
                WHERE platform_app_id = @Id AND platform = @Platform AND is_active = N'YES'
                """, new { Id = appId, Platform = platform }, transaction: transaction, cancellationToken: cancellationToken));
            return matchedId ?? throw new ArgumentException("The selected App Master is unavailable for this platform.");
        }

        private static async Task EnsureCredentialPlaceholderAsync(
            DbConnection connection,
            DbTransaction transaction,
            string platform,
            string shopId,
            string? shopName,
            string updateBy,
            CancellationToken cancellationToken)
        {
            await connection.ExecuteAsync(new CommandDefinition($"""
                INSERT INTO {CredentialTable}
                    (platform, shop_id, shop_name, is_active, requires_reauthorization,
                     create_by, create_date, update_by, update_date)
                SELECT @Platform, @ShopId, @ShopName, N'YES', N'YES',
                       @UpdateBy, SYSUTCDATETIME(), @UpdateBy, SYSUTCDATETIME()
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM {CredentialTable} WITH (UPDLOCK, HOLDLOCK)
                    WHERE platform = @Platform AND shop_id = @ShopId
                )
                """,
                new
                {
                    Platform = platform,
                    ShopId = shopId,
                    ShopName = shopName,
                    UpdateBy = updateBy,
                }, transaction: transaction, cancellationToken: cancellationToken));
        }

        private sealed class ConnectorDeleteTarget
        {
            public string Platform { get; set; } = string.Empty;
            public string ShopId { get; set; } = string.Empty;
        }

        private static string NormalizePlatform(string? value)
        {
            if (!string.IsNullOrWhiteSpace(value) && SupportedPlatforms.TryGetValue(value.Trim(), out var platform))
                return platform;
            throw new ArgumentException("platform must be Shopee, Lazada, or TikTok.");
        }

        private static string? NullIfWhiteSpace(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string RequiredTrimmed(string? value, string name, int maxLength)
        {
            var trimmed = NullIfWhiteSpace(value);
            if (trimmed is null)
                throw new ArgumentException($"{name} is required.");
            if (trimmed.Length > maxLength)
                throw new ArgumentException($"{name} cannot exceed {maxLength} characters.");
            return trimmed;
        }

        private static string ValidateRedirectUrl(string? value)
        {
            var redirectUrl = RequiredTrimmed(value, "redirect_url", 2048);
            if (!Uri.TryCreate(redirectUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
                throw new ArgumentException("redirect_url must be an absolute HTTP or HTTPS URL.");
            return redirectUrl;
        }
    }
}
