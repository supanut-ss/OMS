using System.Threading;
using OmsApi.Models.Auth;
using OmsApi.Models.Common;

namespace OmsApi.Services.Implementation;

/// <summary>Holds decrypted app credentials only for the lifetime of one platform API operation.</summary>
internal static class PlatformCredentialExecutionContext
{
    private static readonly AsyncLocal<PlatformAccessCredential?> CurrentCredential = new();

    public static IDisposable Push(PlatformAccessCredential credential)
    {
        var previous = CurrentCredential.Value;
        CurrentCredential.Value = credential;
        return new Restore(previous);
    }

    public static PlatformAccessCredential Require(PlatformType platform) =>
        CurrentCredential.Value is { } credential && credential.Platform == platform
            ? credential
            : throw new InvalidOperationException($"No active {platform} credential context is available.");

    private sealed class Restore(PlatformAccessCredential? previous) : IDisposable
    {
        public void Dispose() => CurrentCredential.Value = previous;
    }
}
