using System.Security.Cryptography;
using System.Text;
using OmsApi.Helpers;

namespace OmsApi.Tests;

public class WebhookSignatureTests
{
    [Fact]
    public void Shopee_UsesCallbackUrlAndExactRawBody()
    {
        var body = Encoding.UTF8.GetBytes("{\"code\":3,\"amount\":10.50}");
        const string callback = "https://example.test/api/webhooks/shopee";
        const string key = "partner-key";
        var expected = Hmac(key, callback, body);

        Assert.Equal(expected, WebhookSignatureVerifier.ComputeShopee(callback, body, key));
        Assert.True(WebhookSignatureVerifier.VerifyShopee(body, expected.ToUpperInvariant(), callback, key));

        var reformatted = Encoding.UTF8.GetBytes("{ \"code\": 3, \"amount\": 10.5 }");
        Assert.False(WebhookSignatureVerifier.VerifyShopee(reformatted, expected, callback, key));
    }

    [Fact]
    public void Shopee_AcceptsPipeSeparatedUrlAndBody()
    {
        var body = Encoding.UTF8.GetBytes("{\"code\":0}");
        const string callback = "https://example.test/api/webhooks/shopee";
        var signature = Hmac("partner-key", callback + "|", body);

        Assert.True(WebhookSignatureVerifier.VerifyShopee(body, signature, callback, "partner-key"));
        Assert.False(WebhookSignatureVerifier.VerifyShopee(body, signature, callback, "wrong-key"));
    }

    [Fact]
    public void Lazada_UsesAppKeyAndRawBody()
    {
        var body = Encoding.UTF8.GetBytes("{\"message_type\":0}");
        var signature = WebhookSignatureVerifier.ComputeAppKeyAndBody("app-key", body, "app-secret");

        Assert.True(WebhookSignatureVerifier.VerifyLazada(body, signature, "app-key", "app-secret"));
        Assert.False(WebhookSignatureVerifier.VerifyLazada(body, signature, "wrong-key", "app-secret"));
    }

    [Fact]
    public void TikTok_UsesAppKeyAndRawBody_NotApiRequestSigning()
    {
        var body = Encoding.UTF8.GetBytes("{\"type\":1}");
        var signature = WebhookSignatureVerifier.ComputeAppKeyAndBody("app-key", body, "app-secret");

        Assert.True(WebhookSignatureVerifier.VerifyTikTok(body, signature, "app-key", "app-secret"));
        Assert.False(WebhookSignatureVerifier.VerifyTikTok(body, "Bearer " + signature, "app-key", "app-secret"));
    }

    private static string Hmac(string key, string prefix, byte[] body)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(prefix).Concat(body).ToArray()))
            .ToLowerInvariant();
    }
}
