using System.Reflection;
using System.Text.Json;
using OmsApi.Services.Implementation;

namespace OmsApi.Tests;

public class LazadaTokenMappingTests
{
    [Fact]
    public void ReadLazadaShop_MapsSellerIdAndShopName()
    {
        const string json = """
        {
          "account": "seller@example.test",
          "country_user_info": [
            {
              "country": "th",
              "user_id": "111",
              "seller_id": "222",
              "short_code": "THABC123"
            }
          ]
        }
        """;

        using var document = JsonDocument.Parse(json);
        var method = typeof(PlatformAuthService).GetMethod(
            "ReadLazadaShop", BindingFlags.NonPublic | BindingFlags.Static);

        var result = ((string ShopId, string? ShopName))method!.Invoke(
            null, [document.RootElement, null])!;

        Assert.Equal("222", result.ShopId);
        Assert.Equal("THABC123 (TH)", result.ShopName);
    }

    [Fact]
    public void ReadLazadaShop_PrefersRequestedSellerOnRefresh()
    {
        const string json = """
        {
          "country_user_info": [
            { "country": "sg", "seller_id": "111", "short_code": "SHOPSG" },
            { "country": "th", "seller_id": "222", "short_code": "SHOPTH" }
          ]
        }
        """;

        using var document = JsonDocument.Parse(json);
        var method = typeof(PlatformAuthService).GetMethod(
            "ReadLazadaShop", BindingFlags.NonPublic | BindingFlags.Static);

        var result = ((string ShopId, string? ShopName))method!.Invoke(
            null, [document.RootElement, "222"])!;

        Assert.Equal("222", result.ShopId);
        Assert.Equal("SHOPTH (TH)", result.ShopName);
    }

    [Theory]
    [InlineData("https://x.test/cb", "https://x.test/cb?state=a%2Bb%3D")]
    [InlineData("https://x.test/cb?v=1", "https://x.test/cb?v=1&state=a%2Bb%3D")]
    public void ShopeeRedirect_CarriesEscapedState(string redirect, string expected)
    {
        var method = typeof(PlatformAuthService).GetMethod(
            "BuildShopeeRedirectUrl", BindingFlags.NonPublic | BindingFlags.Static);

        Assert.Equal(expected, (string)method!.Invoke(null, [redirect, "a+b="])!);
    }
}
