namespace OmsApi.Models.Common;

public class PlatformApiException : InvalidOperationException
{
    public PlatformApiException(string platform, string code, string message, string? requestId = null)
        : base($"{platform} API error '{code}': {message}" +
               (string.IsNullOrWhiteSpace(requestId) ? string.Empty : $" (request_id: {requestId})"))
    {
        Platform = platform;
        Code = code;
        RequestId = requestId;
    }

    public string Platform { get; }
    public string Code { get; }
    public string? RequestId { get; }
}
