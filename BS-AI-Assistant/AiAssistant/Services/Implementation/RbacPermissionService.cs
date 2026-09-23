using AiAssistant.Services.Interfaces;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Authorizes process actions using sec.t_com_user_group_menu permissions.
/// Cached for 1-5 minutes to reduce repetitive DB lookups.
/// </summary>
public class RbacPermissionService : IRbacPermissionService
{
    private readonly string _connectionString;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RbacPermissionService> _logger;
    private readonly int _cacheMinutes;

    public RbacPermissionService(
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<RbacPermissionService> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection", "Database connection string is required.");

        _cache = cache;
        _logger = logger;

        var configuredMinutes = configuration.GetValue<int?>("AiSecurity:RbacCacheMinutes") ?? 2;
        _cacheMinutes = Math.Clamp(configuredMinutes, 1, 5);
    }

    public async Task<RbacAuthorizationResult> AuthorizeAsync(string userId, string process, string action)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new RbacAuthorizationResult
            {
                IsAllowed = false,
                Reason = "Missing user id."
            };
        }

        if (string.IsNullOrWhiteSpace(process))
        {
            return new RbacAuthorizationResult
            {
                IsAllowed = false,
                Reason = "Missing process."
            };
        }

        var normalizedAction = NormalizeAction(action);
        if (normalizedAction is null)
        {
            return new RbacAuthorizationResult
            {
                IsAllowed = false,
                Reason = "Unsupported action."
            };
        }

        var cacheKey = $"rbac:{userId.Trim().ToLowerInvariant()}:{process.Trim().ToLowerInvariant()}";
        if (!_cache.TryGetValue(cacheKey, out PermissionSnapshot? snapshot) || snapshot is null)
        {
            snapshot = await LoadPermissionSnapshotAsync(userId, process);
            _cache.Set(
                cacheKey,
                snapshot,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheMinutes)
                });
        }

        var isAllowed = normalizedAction switch
        {
            "view" => snapshot.IsView,
            "insert" => snapshot.IsAddView,
            "update" => snapshot.IsEditView,
            "delete" => snapshot.IsDeleteView,
            _ => false
        };

        return isAllowed
            ? new RbacAuthorizationResult { IsAllowed = true, Reason = "Allowed" }
            : new RbacAuthorizationResult
            {
                IsAllowed = false,
                Reason = $"Permission denied for action '{normalizedAction}' on process '{process}'."
            };
    }

    private async Task<PermissionSnapshot> LoadPermissionSnapshotAsync(string userId, string process)
    {
        const string sql = @"
SELECT TOP 1
    CAST(ISNULL(ugm.is_view, 0) AS bit) AS IsView,
    CAST(ISNULL(ugm.is_add_view, 0) AS bit) AS IsAddView,
    CAST(ISNULL(ugm.is_edit_view, 0) AS bit) AS IsEditView,
    CAST(ISNULL(ugm.is_delete_view, 0) AS bit) AS IsDeleteView
FROM sec.t_com_user u
INNER JOIN sec.t_com_user_group_menu ugm ON ugm.user_group_id = u.user_group_id
INNER JOIN sec.t_com_menu m ON m.menu_id = ugm.menu_id
WHERE u.user_id = @UserId
  AND (
      m.process = @Process
      OR m.menu_name = @Process
  );";

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var result = await connection.QueryFirstOrDefaultAsync<PermissionSnapshot>(sql, new
            {
                UserId = userId,
                Process = process
            });

            return result ?? PermissionSnapshot.DenyAll;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load RBAC permissions. User={UserId}, Process={Process}", userId, process);
            return PermissionSnapshot.DenyAll;
        }
    }

    private static string? NormalizeAction(string? action)
    {
        var normalized = action?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "view" => "view",
            "insert" => "insert",
            "update" => "update",
            "delete" => "delete",
            _ => null
        };
    }

    private sealed class PermissionSnapshot
    {
        public static PermissionSnapshot DenyAll { get; } = new();

        public bool IsView { get; init; }
        public bool IsAddView { get; init; }
        public bool IsEditView { get; init; }
        public bool IsDeleteView { get; init; }
    }
}
