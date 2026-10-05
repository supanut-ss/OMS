using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;

namespace ApiCore.Services.Implementation
{
    public sealed class ConnectorService : IConnectorService
    {
        private const string CredentialTable = "[OMS].[oms].[t_oms_platform_credential]";
        private const string SelectColumns = """
            platform_credential_id AS PlatformCredentialId,
            platform AS Platform,
            shop_id AS ShopId,
            shop_name AS ShopName,
            CASE WHEN access_token_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAccessToken,
            CASE WHEN refresh_token_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasRefreshToken,
            CASE WHEN app_key_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppKey,
            CASE WHEN app_secret_encrypted IS NOT NULL THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasAppSecret,
            redirect_url AS RedirectUrl,
            service_id AS ServiceId,
            access_token_expires_date AS AccessTokenExpiresDate,
            refresh_token_expires_date AS RefreshTokenExpiresDate,
            CASE WHEN is_active = N'YES' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsActive,
            CASE WHEN requires_reauthorization = N'YES' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS RequiresReauthorization,
            last_refresh_date AS LastRefreshDate,
            last_use_date AS LastUseDate,
            last_error AS LastError,
            create_date AS CreateDate,
            update_date AS UpdateDate
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
        private readonly IDataProtector _tokenProtector;
        private readonly ILogger<ConnectorService> _logger;

        public ConnectorService(
            ISqlConnectionFactory connectionFactory,
            IDataProtectionProvider dataProtectionProvider,
            ILogger<ConnectorService> logger)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _tokenProtector = (dataProtectionProvider ?? throw new ArgumentNullException(nameof(dataProtectionProvider)))
                .CreateProtector("OmsApi.PlatformCredentials.v1");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<IReadOnlyList<ConnectorResponse>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
                var rows = await connection.QueryAsync<ConnectorResponse>(new CommandDefinition($"""
                    SELECT {SelectColumns}
                    FROM {CredentialTable}
                    ORDER BY platform, shop_name, shop_id
                    """, cancellationToken: cancellationToken));
                return rows.AsList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load platform connectors");
                throw;
            }
        }

        public async Task<ConnectorResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            if (id <= 0)
                throw new ArgumentException("platform_credential_id must be greater than zero.");

            try
            {
                await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
                return await LoadByIdAsync(connection, id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load platform connector {ConnectorId}", id);
                throw;
            }
        }

        public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
        {
            if (id <= 0)
                throw new ArgumentException("platform_credential_id must be greater than zero.");

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var connector = await connection.QuerySingleOrDefaultAsync<ConnectorDeleteTarget>(
                new CommandDefinition($"""
                    SELECT platform AS Platform, shop_id AS ShopId
                    FROM {CredentialTable} WITH (UPDLOCK, HOLDLOCK)
                    WHERE platform_credential_id = @Id
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

            var deleted = await connection.ExecuteAsync(new CommandDefinition($"""
                DELETE FROM {CredentialTable}
                WHERE platform_credential_id = @Id
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
            var shopId = request.ShopId?.Trim();
            if (string.IsNullOrWhiteSpace(shopId))
                throw new ArgumentException("shop_id is required.");
            if (shopId.Length > 128)
                throw new ArgumentException("shop_id cannot exceed 128 characters.");

            var isNew = !request.PlatformCredentialId.HasValue;
            var hasAppKey = !string.IsNullOrWhiteSpace(request.AppKey);
            var hasAppSecret = !string.IsNullOrWhiteSpace(request.AppSecret);
            if (isNew && (!hasAppKey || !hasAppSecret))
                throw new ArgumentException("app_key and app_secret are required when creating a connector.");
            if (string.IsNullOrWhiteSpace(request.RedirectUrl) ||
                !Uri.TryCreate(request.RedirectUrl.Trim(), UriKind.Absolute, out var redirectUri) ||
                (redirectUri.Scheme != Uri.UriSchemeHttps && redirectUri.Scheme != Uri.UriSchemeHttp))
                throw new ArgumentException("redirect_url must be an absolute HTTP or HTTPS URL.");
             
            try
            {
                await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
                long connectorId;

                if (isNew)
                {
                    connectorId = await connection.ExecuteScalarAsync<long>(new CommandDefinition($"""
                        INSERT INTO {CredentialTable}
                            (platform, shop_id, shop_name, app_key_encrypted, app_secret_encrypted, redirect_url, service_id,
                             access_token_encrypted, refresh_token_encrypted, access_token_expires_date, refresh_token_expires_date, is_active,
                             requires_reauthorization, create_date, update_date, create_by, update_by)
                        OUTPUT INSERTED.platform_credential_id
                        VALUES
                            (@Platform, @ShopId, @ShopName, @AppKeyEncrypted, @AppSecretEncrypted, @RedirectUrl, @ServiceId,
                             NULL, NULL, NULL, NULL, @IsActive,
                             N'YES', SYSUTCDATETIME(), SYSUTCDATETIME(), @UpdateBy, @UpdateBy)
                        """,
                        new
                        {
                            Platform = platform,
                            ShopId = shopId,
                            ShopName = NullIfWhiteSpace(request.ShopName),
                            AppKeyEncrypted = _tokenProtector.Protect(request.AppKey!.Trim()),
                            AppSecretEncrypted = _tokenProtector.Protect(request.AppSecret!.Trim()),
                            RedirectUrl = request.RedirectUrl.Trim(),
                            ServiceId = NullIfWhiteSpace(request.ServiceId),
                            IsActive = request.IsActive == false ? "NO" : "YES",
                            UpdateBy = updateBy,
                        }, cancellationToken: cancellationToken));
                }
                else
                {
                    connectorId = request.PlatformCredentialId!.Value;
                    if (connectorId <= 0)
                        throw new ArgumentException("platform_credential_id must be greater than zero.");

                    var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                        UPDATE {CredentialTable}
                        SET platform = @Platform,
                            shop_id = @ShopId,
                            shop_name = @ShopName,
                            app_key_encrypted = COALESCE(@AppKeyEncrypted, app_key_encrypted),
                            app_secret_encrypted = COALESCE(@AppSecretEncrypted, app_secret_encrypted),
                            redirect_url = @RedirectUrl,
                            service_id = @ServiceId,
                            is_active = COALESCE(@IsActive, is_active),
                            access_token_encrypted = CASE WHEN @CredentialChanged = 1 THEN NULL ELSE access_token_encrypted END,
                            refresh_token_encrypted = CASE WHEN @CredentialChanged = 1 THEN NULL ELSE refresh_token_encrypted END,
                            access_token_expires_date = CASE WHEN @CredentialChanged = 1 THEN NULL ELSE access_token_expires_date END,
                            refresh_token_expires_date = CASE WHEN @CredentialChanged = 1 THEN NULL ELSE refresh_token_expires_date END,
                            requires_reauthorization = CASE WHEN @CredentialChanged = 1 THEN N'YES' ELSE requires_reauthorization END,
                            last_error = CASE WHEN @CredentialChanged = 1 THEN NULL ELSE last_error END,
                            update_date = SYSUTCDATETIME(),
                            update_by = @UpdateBy
                        WHERE platform_credential_id = @Id 
                        """,
                        new
                        {
                            Id = connectorId,
                            Platform = platform,
                            ShopId = shopId,
                            ShopName = NullIfWhiteSpace(request.ShopName),
                            AppKeyEncrypted = hasAppKey ? _tokenProtector.Protect(request.AppKey!.Trim()) : null,
                            AppSecretEncrypted = hasAppSecret ? _tokenProtector.Protect(request.AppSecret!.Trim()) : null,
                            RedirectUrl = request.RedirectUrl.Trim(),
                            ServiceId = NullIfWhiteSpace(request.ServiceId),
                            CredentialChanged = hasAppKey || hasAppSecret,
                            IsActive = request.IsActive.HasValue ? (request.IsActive.Value ? "YES" : "NO") : null,
                            UpdateBy = updateBy, 
                        }, cancellationToken: cancellationToken));

                    if (affected == 0)
                        throw new KeyNotFoundException($"Connector '{connectorId}' was not found.");
                }

                return (await LoadByIdAsync(connection, connectorId, cancellationToken))
                    ?? throw new InvalidOperationException("The saved connector could not be loaded.");
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                throw new InvalidOperationException("A connector for this platform and shop already exists.", ex);
            }
            catch (Exception ex) when (ex is not ArgumentException and not InvalidOperationException and not KeyNotFoundException)
            {
                _logger.LogError(ex, "Failed to save connector for platform {Platform}, shop {ShopId}", platform, shopId);
                throw;
            }
        }

        public async Task<ConnectorResponse> SetActiveAsync(
            SetConnectorActiveRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            if (request.PlatformCredentialId <= 0)
                throw new ArgumentException("A valid platform_credential_id is required."); 

            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                UPDATE {CredentialTable}
                SET is_active = @IsActive,
                    update_date = SYSUTCDATETIME(),
                    update_by = @UpdateBy
                WHERE platform_credential_id = @Id
                """,
                new
                {
                    Id = request.PlatformCredentialId,
                    IsActive = request.IsActive ? "YES" : "NO",
                    UpdateBy = updateBy,
                }, cancellationToken: cancellationToken));

            return await GetUpdatedOrThrowAsync(connection, request.PlatformCredentialId, affected, cancellationToken);
        }

        public async Task<ConnectorResponse> SetReauthorizationAsync(
            SetConnectorReauthorizationRequest request,
            string updateBy,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            if (request.PlatformCredentialId <= 0)
                throw new ArgumentException("A valid platform_credential_id is required.");
             
            await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
            var affected = await connection.ExecuteAsync(new CommandDefinition($"""
                UPDATE {CredentialTable}
                SET requires_reauthorization = @RequiresReauthorization,
                    last_error = @LastError,
                    update_date = SYSUTCDATETIME(),
                    update_by = @UpdateBy
                WHERE platform_credential_id = @Id
                """,
                new
                {
                    Id = request.PlatformCredentialId,
                    RequiresReauthorization = request.RequiresReauthorization ? "YES" : "NO",
                    LastError = NullIfWhiteSpace(request.RequiresReauthorization ? request.LastError : null),
                    UpdateBy = updateBy, 
                }, cancellationToken: cancellationToken));

            return await GetUpdatedOrThrowAsync(connection, request.PlatformCredentialId, affected, cancellationToken);
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
                FROM {CredentialTable}
                WHERE platform_credential_id = @Id
                """, new { Id = id }, cancellationToken: cancellationToken));
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

        private static DateTime AsUtc(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        }; 
    }
}
