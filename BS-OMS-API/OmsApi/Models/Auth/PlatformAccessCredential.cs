using OmsApi.Models.Common;

namespace OmsApi.Models.Auth;

/// <summary>
/// A decrypted, short-lived credential context for one platform operation.
/// This object must never be serialized or logged.
/// </summary>
public sealed record PlatformAccessCredential(
    long PlatformCredentialId,
    PlatformType Platform,
    string ShopId,
    string AccessToken);

/// <summary>
/// Identifies one active platform shop without exposing its token.
/// </summary>
public sealed record PlatformCredentialSelection(
    PlatformType Platform,
    string ShopId);
