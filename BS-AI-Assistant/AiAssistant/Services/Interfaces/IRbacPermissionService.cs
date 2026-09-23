namespace AiAssistant.Services.Interfaces;

/// <summary>
/// RBAC authorization result for a specific process/action request.
/// </summary>
public sealed class RbacAuthorizationResult
{
    public bool IsAllowed { get; init; }
    public string Reason { get; init; } = string.Empty;
}

/// <summary>
/// Checks whether a user can perform an action on a process by reading menu permissions.
/// </summary>
public interface IRbacPermissionService
{
    Task<RbacAuthorizationResult> AuthorizeAsync(string userId, string process, string action);
}
