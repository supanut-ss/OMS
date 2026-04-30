using OmsApi.Helpers;

namespace OmsApi.Tests;

public class SignatureHelperTests
{
    // ─── HmacSha256 ──────────────────────────────────────

    [Fact]
    public void HmacSha256_KnownInput_ReturnsCorrectHex()
    {
        // Verified against https://www.devglan.com/online-tools/hmac-sha256-online
        var result = SignatureHelper.HmacSha256("secret", "hello");
        Assert.Equal("88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b", result);
    }

    [Fact]
    public void HmacSha256_EmptyData_DoesNotThrow()
    {
        var result = SignatureHelper.HmacSha256("key", "");
        Assert.NotNull(result);
        Assert.Equal(64, result.Length); // 32 bytes hex = 64 chars
    }

    [Fact]
    public void HmacSha256_ResultIsLowercase()
    {
        var result = SignatureHelper.HmacSha256("key", "data");
        Assert.Equal(result, result.ToLowerInvariant());
    }

    [Fact]
    public void HmacSha256_ResultHasNoHyphens()
    {
        var result = SignatureHelper.HmacSha256("k", "d");
        Assert.DoesNotContain("-", result);
    }

    // ─── GenerateShopeeSignature ──────────────────────────

    [Fact]
    public void GenerateShopeeSignature_WithoutTokenAndShop_UsesBaseFields()
    {
        var result = SignatureHelper.GenerateShopeeSignature("key", 123L, "/api/path", 1000L);
        Assert.NotNull(result);
        Assert.Equal(64, result.Length);
    }

    [Fact]
    public void GenerateShopeeSignature_WithTokenAndShop_IncludesThemInSignature()
    {
        var withoutToken = SignatureHelper.GenerateShopeeSignature("key", 1L, "/path", 100L);
        var withToken = SignatureHelper.GenerateShopeeSignature("key", 1L, "/path", 100L, "token123");
        var withBoth = SignatureHelper.GenerateShopeeSignature("key", 1L, "/path", 100L, "token123", 999L);

        Assert.NotEqual(withoutToken, withToken);
        Assert.NotEqual(withToken, withBoth);
    }

    [Fact]
    public void GenerateShopeeSignature_SameInputs_ReturnsSameResult()
    {
        var r1 = SignatureHelper.GenerateShopeeSignature("k", 1L, "/p", 100L, "t", 10L);
        var r2 = SignatureHelper.GenerateShopeeSignature("k", 1L, "/p", 100L, "t", 10L);
        Assert.Equal(r1, r2);
    }

    // ─── GenerateLazadaSignature ──────────────────────────

    [Fact]
    public void GenerateLazadaSignature_SortsParamsAlphabetically()
    {
        var paramsAbc = new Dictionary<string, string> { { "a", "1" }, { "b", "2" }, { "c", "3" } };
        var paramsCba = new Dictionary<string, string> { { "c", "3" }, { "b", "2" }, { "a", "1" } };

        var sig1 = SignatureHelper.GenerateLazadaSignature("secret", "/path", paramsAbc);
        var sig2 = SignatureHelper.GenerateLazadaSignature("secret", "/path", paramsCba);

        Assert.Equal(sig1, sig2);
    }

    [Fact]
    public void GenerateLazadaSignature_DifferentParams_DifferentSignature()
    {
        var params1 = new Dictionary<string, string> { { "app_key", "123" } };
        var params2 = new Dictionary<string, string> { { "app_key", "456" } };

        var sig1 = SignatureHelper.GenerateLazadaSignature("secret", "/path", params1);
        var sig2 = SignatureHelper.GenerateLazadaSignature("secret", "/path", params2);

        Assert.NotEqual(sig1, sig2);
    }

    // ─── GenerateTikTokSignature ──────────────────────────

    [Fact]
    public void GenerateTikTokSignature_WithoutBody_DoesNotThrow()
    {
        var parameters = new Dictionary<string, string> { { "app_key", "key" }, { "timestamp", "1000" } };
        var result = SignatureHelper.GenerateTikTokSignature("secret", "/path", parameters);
        Assert.NotNull(result);
        Assert.Equal(64, result.Length);
    }

    [Fact]
    public void GenerateTikTokSignature_WithBody_DifferentFromWithoutBody()
    {
        var parameters = new Dictionary<string, string> { { "timestamp", "1000" } };
        var sigWithout = SignatureHelper.GenerateTikTokSignature("secret", "/path", parameters);
        var sigWith = SignatureHelper.GenerateTikTokSignature("secret", "/path", parameters, "{\"test\":1}");

        Assert.NotEqual(sigWithout, sigWith);
    }
}
