using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
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
            var hasAccessToken = !string.IsNullOrWhiteSpace(request.AccessToken);
            var hasRefreshToken = !string.IsNullOrWhiteSpace(request.RefreshToken);
            if (isNew && (!hasAccessToken || !request.AccessTokenExpiresDate.HasValue))
                throw new ArgumentException("access_token and access_token_expires_date are required when creating an authorized connector.");
            if (hasAccessToken && !request.AccessTokenExpiresDate.HasValue)
                throw new ArgumentException("access_token_expires_date is required when access_token is supplied.");
            if (hasAccessToken && request.AccessTokenExpiresDate!.Value <= DateTime.UtcNow)
                throw new ArgumentException("access_token_expires_date must be in the future.");
            if (hasRefreshToken && !request.RefreshTokenExpiresDate.HasValue)
                throw new ArgumentException("refresh_token_expires_date is required when refresh_token is supplied.");
            if (hasRefreshToken && request.RefreshTokenExpiresDate!.Value <= DateTime.UtcNow)
                throw new ArgumentException("refresh_token_expires_date must be in the future.");
             
            try
            {
                await using var connection = await _connectionFactory.CreateAndOpenConnectionAsync();
                long connectorId;

                if (isNew)
                {
                    connectorId = await connection.ExecuteScalarAsync<long>(new CommandDefinition($"""
                        INSERT INTO {CredentialTable}
                            (platform, shop_id, shop_name, access_token_encrypted, refresh_token_encrypted,
                             access_token_expires_date, refresh_token_expires_date, is_active,
                             requires_reauthorization, create_date, update_date, create_by, update_by)
                        OUTPUT INSERTED.platform_credential_id
                        VALUES
                            (@Platform, @ShopId, @ShopName, @AccessTokenEncrypted, @RefreshTokenEncrypted,
                             @AccessTokenExpiresDate, @RefreshTokenExpiresDate, @IsActive,
                             N'NO', SYSUTCDATETIME(), SYSUTCDATETIME(), @UpdateBy, @UpdateBy)
                        """,
                        new
                        {
                            Platform = platform,
                            ShopId = shopId,
                            ShopName = NullIfWhiteSpace(request.ShopName),
                            AccessTokenEncrypted = _tokenProtector.Protect(request.AccessToken!),
                            RefreshTokenEncrypted = hasRefreshToken ? _tokenProtector.Protect(request.RefreshToken!) : null,
                            AccessTokenExpiresDate = AsUtc(request.AccessTokenExpiresDate!.Value),
                            RefreshTokenExpiresDate = hasRefreshToken
                                ? AsUtc(request.RefreshTokenExpiresDate!.Value)
                                : (DateTime?)null,
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
                            access_token_encrypted = COALESCE(@AccessTokenEncrypted, access_token_encrypted),
                            refresh_token_encrypted = CASE WHEN @HasRefreshToken = 1 THEN @RefreshTokenEncrypted ELSE refresh_token_encrypted END,
                            access_token_expires_date = COALESCE(@AccessTokenExpiresDate, access_token_expires_date),
                            refresh_token_expires_date = CASE WHEN @HasRefreshToken = 1 THEN @RefreshTokenExpiresDate ELSE refresh_token_expires_date END,
                            is_active = COALESCE(@IsActive, is_active),
                            requires_reauthorization = CASE WHEN @AccessTokenEncrypted IS NOT NULL THEN N'NO' ELSE requires_reauthorization END,
                            last_error = CASE WHEN @AccessTokenEncrypted IS NOT NULL THEN NULL ELSE last_error END,
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
                            AccessTokenEncrypted = hasAccessToken ? _tokenProtector.Protect(request.AccessToken!) : null,
                            RefreshTokenEncrypted = hasRefreshToken ? _tokenProtector.Protect(request.RefreshToken!) : null,
                            HasRefreshToken = hasRefreshToken,
                            AccessTokenExpiresDate = request.AccessTokenExpiresDate.HasValue
                                ? AsUtc(request.AccessTokenExpiresDate.Value)
                                : (DateTime?)null,
                            RefreshTokenExpiresDate = hasRefreshToken && request.RefreshTokenExpiresDate.HasValue
                                ? AsUtc(request.RefreshTokenExpiresDate.Value)
                                : (DateTime?)null,
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
