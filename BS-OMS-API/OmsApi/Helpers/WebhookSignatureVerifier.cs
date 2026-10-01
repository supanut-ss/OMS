using System.Security.Cryptography;
using System.Text;

namespace OmsApi.Helpers;

/// <summary>
/// Verifiers for marketplace webhook signatures. These are deliberately
/// separate from the API-request signature helpers because webhook signing
/// uses the exact raw request bytes and a different signing string.
/// </summary>
public static class WebhookSignatureVerifier
{
    public static bool VerifyShopee(
        byte[] rawBody,
        string? authorization,
        string callbackUrl,
        string partnerKey)
    {
        if (string.IsNullOrWhiteSpace(authorization) ||
            string.IsNullOrWhiteSpace(callbackUrl) ||
            string.IsNullOrWhiteSpace(partnerKey))
            return false;

        var prefix = Encoding.UTF8.GetBytes(callbackUrl);
        return CompareHex(authorization, ComputeHex(partnerKey, prefix, rawBody));
    }

    public static bool VerifyLazada(
        byte[] rawBody,
        string? authorization,
        string appKey,
        string appSecret) => VerifyAppKeyAndBody(rawBody, authorization, appKey, appSecret);

    public static bool VerifyTikTok(
        byte[] rawBody,
        string? authorization,
        string appKey,
        string appSecret) => VerifyAppKeyAndBody(rawBody, authorization, appKey, appSecret);

    public static string ComputeShopee(string callbackUrl, byte[] rawBody, string partnerKey) =>
        ComputeHex(partnerKey, Encoding.UTF8.GetBytes(callbackUrl), rawBody);

    public static string ComputeAppKeyAndBody(string appKey, byte[] rawBody, string appSecret) =>
        ComputeHex(appSecret, Encoding.UTF8.GetBytes(appKey), rawBody);

    private static bool VerifyAppKeyAndBody(
        byte[] rawBody,
        string? authorization,
        string appKey,
        string appSecret)
    {
        if (string.IsNullOrWhiteSpace(authorization) ||
            string.IsNullOrWhiteSpace(appKey) ||
            string.IsNullOrWhiteSpace(appSecret))
            return false;

        return CompareHex(authorization, ComputeAppKeyAndBody(appKey, rawBody, appSecret));
    }

    private static string ComputeHex(string key, byte[] prefix, byte[] body)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var input = new byte[prefix.Length + body.Length];
        Buffer.BlockCopy(prefix, 0, input, 0, prefix.Length);
        Buffer.BlockCopy(body, 0, input, prefix.Length, body.Length);
        return Convert.ToHexString(hmac.ComputeHash(input)).ToLowerInvariant();
    }

    private static bool CompareHex(string actual, string expected)
    {
        var normalized = actual.Trim();
        if (normalized.StartsWith("SHA256 ", StringComparison.OrdinalIgnoreCase))
            normalized = normalized["SHA256 ".Length..].Trim();
        normalized = normalized.ToLowerInvariant();

        var actualBytes = Encoding.ASCII.GetBytes(normalized);
        var expectedBytes = Encoding.ASCII.GetBytes(expected);
        return actualBytes.Length == expectedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }
}
