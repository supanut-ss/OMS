namespace OmsApi.Models.Common;

/// <summary>
/// Raised when OMS cannot obtain a usable stored credential for a platform shop.
/// </summary>
public sealed class PlatformCredentialException : InvalidOperationException
{
    public PlatformCredentialException(string code, string message, Exception? innerException = null)
        : base(message, innerException)
    {
        Code = code;
    }

    public string Code { get; }
}
